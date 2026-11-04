-- Cabina 86 · T-04 · Tablas, restricciones y vistas
-- Modelo: usuarios, rondas, miembros_ronda, discos, pases, calificaciones.
-- Las reglas viven acá; la app solo muestra y pide.
-- RLS queda activado y sin políticas (nadie lee nada por la API) hasta T-05.

-- ─────────────────────────────────────────────────────────────
-- usuarios: perfil creado al primer login con Google
-- ─────────────────────────────────────────────────────────────
create table public.usuarios (
  id        uuid primary key references auth.users (id) on delete cascade,
  nombre    text not null check (char_length(btrim(nombre)) between 1 and 80),
  foto_url  text,
  creado_en timestamptz not null default now()
);

-- Al crearse un usuario en Supabase Auth, se crea su perfil con los datos de Google.
create function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.usuarios (id, nombre, foto_url)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(coalesce(new.email, 'Sin nombre'), '@', 1)
    ),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- ─────────────────────────────────────────────────────────────
-- rondas: cada grupo, con su código de invitación
-- ─────────────────────────────────────────────────────────────
create function public.generar_codigo_invitacion()
returns text
language sql
volatile
set search_path = ''
as $$
  -- 10 caracteres hexadecimales en mayúscula (40 bits): imposible de adivinar a mano.
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
$$;

create table public.rondas (
  id                uuid primary key default gen_random_uuid(),
  nombre            text not null check (char_length(btrim(nombre)) between 1 and 40),
  codigo_invitacion text not null unique default public.generar_codigo_invitacion(),
  creada_por        uuid not null default auth.uid() references public.usuarios (id),
  creada_en         timestamptz not null default now(),
  -- RN-04: vacío = sin tope de pendientes
  tope_pendientes   integer check (tope_pendientes > 0)
);

-- ─────────────────────────────────────────────────────────────
-- miembros_ronda: quién está en qué ronda y desde cuándo
-- ─────────────────────────────────────────────────────────────
create table public.miembros_ronda (
  ronda_id   uuid not null references public.rondas (id) on delete cascade,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  -- Sigla tipo FAC: 2 a 4 letras o números, en mayúscula, única dentro de la ronda
  sigla      text not null check (sigla ~ '^[A-Z0-9]{2,4}$'),
  -- RN-06: quien se suma no hereda lo pasado antes
  se_unio_en timestamptz not null default now(),
  primary key (ronda_id, usuario_id),
  unique (ronda_id, sigla)
);

create index miembros_ronda_usuario_idx on public.miembros_ronda (usuario_id);

-- ─────────────────────────────────────────────────────────────
-- discos: datos de Deezer guardados una sola vez (RN-09)
-- Solo texto y la URL de la tapa, nunca la imagen (términos de Deezer).
-- ─────────────────────────────────────────────────────────────
create table public.discos (
  id             uuid primary key default gen_random_uuid(),
  deezer_id      bigint not null unique,
  titulo         text not null,
  artista        text not null,
  anio           smallint check (anio between 1900 and 2100),
  tapa_url       text,
  cantidad_temas smallint check (cantidad_temas >= 0),
  duracion_seg   integer check (duracion_seg >= 0),
  -- RN-10: links de búsqueda del álbum, no de un tema
  link_spotify   text,
  link_ytm       text,
  creado_en      timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- pases: un disco pasado a una ronda (el centro del modelo)
-- RN-03: no tiene destinatario, va a toda la ronda.
-- ─────────────────────────────────────────────────────────────
create table public.pases (
  id         uuid primary key default gen_random_uuid(),
  ronda_id   uuid not null references public.rondas (id) on delete cascade,
  disco_id   uuid not null references public.discos (id),
  pasado_por uuid not null default auth.uid(),
  -- S-02: el 05 de FAC-05, correlativo por persona dentro de la ronda (lo pone un trigger)
  numero     integer not null check (numero > 0),
  -- S-01: tarjetita obligatoria, hasta 200 caracteres
  tarjetita  text not null check (char_length(btrim(tarjetita)) between 1 and 200),
  creado_en  timestamptz not null default now(),
  -- Solo pasa quien es integrante de la ronda
  foreign key (ronda_id, pasado_por)
    references public.miembros_ronda (ronda_id, usuario_id) on delete cascade,
  -- RN-11: no se repiten discos en una ronda
  unique (ronda_id, disco_id),
  unique (ronda_id, pasado_por, numero)
);

create index pases_ronda_creado_idx on public.pases (ronda_id, creado_en desc);
create index pases_disco_idx on public.pases (disco_id);

-- Numera el pase: siguiente número de esa persona en esa ronda.
create function public.numerar_pase()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Serializa los pases de la misma persona en la misma ronda para no repetir número.
  perform pg_advisory_xact_lock(hashtext(new.ronda_id::text || new.pasado_por::text));
  select coalesce(max(p.numero), 0) + 1
    into new.numero
    from public.pases p
   where p.ronda_id = new.ronda_id
     and p.pasado_por = new.pasado_por;
  return new;
end;
$$;

create trigger numerar_pase
  before insert on public.pases
  for each row execute function public.numerar_pase();

-- Un pase no cambia de ronda, disco, autor ni número; solo se puede corregir la tarjetita.
create function public.proteger_pase()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.ronda_id <> old.ronda_id
     or new.disco_id <> old.disco_id
     or new.pasado_por <> old.pasado_por
     or new.numero <> old.numero
     or new.creado_en <> old.creado_en then
    raise exception 'Solo se puede editar la tarjetita de un pase'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger proteger_pase
  before update on public.pases
  for each row execute function public.proteger_pase();

-- ─────────────────────────────────────────────────────────────
-- calificaciones: el puntaje de una persona sobre un pase
-- ─────────────────────────────────────────────────────────────
create table public.calificaciones (
  pase_id       uuid not null references public.pases (id) on delete cascade,
  usuario_id    uuid not null default auth.uid() references public.usuarios (id) on delete cascade,
  puntaje       smallint not null check (puntaje between 1 and 10),
  tema_favorito text check (char_length(tema_favorito) <= 200),
  reaccion      text check (char_length(reaccion) <= 16),
  comentario    text check (char_length(comentario) <= 140),
  creada_en     timestamptz not null default now(),
  -- RN-02: si tiene valor, la app muestra "editado"
  editada_en    timestamptz,
  primary key (pase_id, usuario_id)
);

create index calificaciones_usuario_idx on public.calificaciones (usuario_id);

-- S-03: quien pasó el disco no lo califica; y hay que ser integrante de la ronda.
create function public.validar_calificacion()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_ronda uuid;
  v_autor uuid;
begin
  select p.ronda_id, p.pasado_por
    into v_ronda, v_autor
    from public.pases p
   where p.id = new.pase_id;

  if v_autor = new.usuario_id then
    raise exception 'No podés calificar un disco que pasaste vos'
      using errcode = 'check_violation';
  end if;

  if not exists (
    select 1 from public.miembros_ronda m
     where m.ronda_id = v_ronda and m.usuario_id = new.usuario_id
  ) then
    raise exception 'Solo califican los integrantes de la ronda'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger validar_calificacion
  before insert on public.calificaciones
  for each row execute function public.validar_calificacion();

-- RN-02: al editar, se marca editada_en; el pase y la persona no cambian.
create function public.editar_calificacion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.pase_id <> old.pase_id or new.usuario_id <> old.usuario_id then
    raise exception 'No se puede mover una calificación a otro pase o persona'
      using errcode = 'check_violation';
  end if;
  new.creada_en := old.creada_en;
  if (new.puntaje, new.tema_favorito, new.reaccion, new.comentario)
     is distinct from (old.puntaje, old.tema_favorito, old.reaccion, old.comentario) then
    new.editada_en := now();
  else
    new.editada_en := old.editada_en;
  end if;
  return new;
end;
$$;

create trigger editar_calificacion
  before update on public.calificaciones
  for each row execute function public.editar_calificacion();

-- ─────────────────────────────────────────────────────────────
-- Vistas calculadas: la deuda y los pendientes no se guardan.
-- security_invoker: respetan los permisos (RLS) de quien consulta.
-- ─────────────────────────────────────────────────────────────

-- pendientes: los pases que cada integrante tiene que escuchar (Exhibidor, HU-11).
-- Son los de otros, creados después de que se sumó y sin calificación suya.
create view public.pendientes
with (security_invoker = true) as
select
  m.ronda_id,
  m.usuario_id,
  p.id         as pase_id,
  p.disco_id,
  p.pasado_por,
  p.numero,
  p.creado_en
from public.miembros_ronda m
join public.pases p
  on p.ronda_id = m.ronda_id
 and p.pasado_por <> m.usuario_id
 and p.creado_en > m.se_unio_en
where not exists (
  select 1 from public.calificaciones c
   where c.pase_id = p.id and c.usuario_id = m.usuario_id
);

-- deuda: cuántos pendientes tiene cada integrante en cada ronda (Exhibidor, Mis rondas).
create view public.deuda
with (security_invoker = true) as
select
  m.ronda_id,
  m.usuario_id,
  count(pe.pase_id)::integer as pendientes
from public.miembros_ronda m
left join public.pendientes pe
  on pe.ronda_id = m.ronda_id and pe.usuario_id = m.usuario_id
group by m.ronda_id, m.usuario_id;

-- deuda_total: la suma de la deuda de una persona en todas sus rondas (Mis rondas, HU-05).
create view public.deuda_total
with (security_invoker = true) as
select usuario_id, sum(pendientes)::integer as pendientes
from public.deuda
group by usuario_id;

-- tablero: por integrante, pases hechos, escuchados y deuda (La Ronda, HU-17).
create view public.tablero
with (security_invoker = true) as
select
  m.ronda_id,
  m.usuario_id,
  m.sigla,
  u.nombre,
  u.foto_url,
  (select count(*) from public.pases p
    where p.ronda_id = m.ronda_id and p.pasado_por = m.usuario_id)::integer as pases_hechos,
  (select count(*) from public.calificaciones c
     join public.pases p on p.id = c.pase_id
    where p.ronda_id = m.ronda_id and c.usuario_id = m.usuario_id)::integer as escuchados,
  d.pendientes as deuda
from public.miembros_ronda m
join public.usuarios u on u.id = m.usuario_id
join public.deuda d on d.ronda_id = m.ronda_id and d.usuario_id = m.usuario_id;

-- lo_que_pasaste: por cada pase, quién falta, cuántos lo escucharon y el promedio (Perfil, HU-16).
create view public.lo_que_pasaste
with (security_invoker = true) as
select
  p.ronda_id,
  p.pasado_por,
  p.id        as pase_id,
  p.numero,
  p.disco_id,
  p.tarjetita,
  p.creado_en,
  (select count(*) from public.calificaciones c where c.pase_id = p.id)::integer as escucharon,
  (select round(avg(c.puntaje), 1) from public.calificaciones c where c.pase_id = p.id) as promedio,
  coalesce(
    (select array_agg(pe.usuario_id order by pe.usuario_id)
       from public.pendientes pe where pe.pase_id = p.id),
    '{}'
  ) as faltan
from public.pases p;

-- ─────────────────────────────────────────────────────────────
-- Permisos: RLS activo en todas las tablas, sin políticas todavía (T-05).
-- Hasta entonces la API no devuelve ni acepta nada.
-- ─────────────────────────────────────────────────────────────
alter table public.usuarios       enable row level security;
alter table public.rondas         enable row level security;
alter table public.miembros_ronda enable row level security;
alter table public.discos         enable row level security;
alter table public.pases          enable row level security;
alter table public.calificaciones enable row level security;

-- Las funciones internas no se llaman desde la API.
revoke execute on function public.crear_perfil()              from public, anon, authenticated;
revoke execute on function public.numerar_pase()              from public, anon, authenticated;
revoke execute on function public.proteger_pase()             from public, anon, authenticated;
revoke execute on function public.validar_calificacion()      from public, anon, authenticated;
revoke execute on function public.editar_calificacion()       from public, anon, authenticated;
