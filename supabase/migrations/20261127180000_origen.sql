-- Cabina 86 · #135 · De dónde llega la gente (?ref=)
-- El primer origen de cada cuenta nueva (tiktok, ig, tarjeta, invitacion…) y el de quien armó cada ronda,
-- para saber qué trae gente. No lo ve nadie desde la app: se mira con supabase/consultas/metricas.sql.

-- Una fila por persona, en su propia tabla: authenticated no la lee ni la escribe (solo anotar_origen).
create table public.origenes (
  usuario_id uuid primary key references public.usuarios (id) on delete cascade,
  origen     text not null check (origen ~ '^[a-z0-9_-]{1,40}$'),
  anotado_en timestamptz not null default now()
);
alter table public.origenes enable row level security;
revoke all on public.origenes from public, anon, authenticated;

-- El de quien armó la ronda. No se suma al grant select (...) de rondas: la app no lo ve.
alter table public.rondas add column origen text check (origen ~ '^[a-z0-9_-]{1,40}$');

-- Anota el origen de quien llama, si su cuenta es nueva (menos de un día) y todavía no tiene uno.
-- Devuelve si lo anotó.
create function public.anotar_origen(p_origen text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_origen text := lower(btrim(coalesce(p_origen, '')));
begin
  if auth.uid() is null or v_origen !~ '^[a-z0-9_-]{1,40}$' then
    return false;
  end if;
  if not exists (select 1 from public.usuarios where id = auth.uid() and creado_en > now() - interval '1 day') then
    return false;
  end if;
  insert into public.origenes (usuario_id, origen) values (auth.uid(), v_origen)
  on conflict (usuario_id) do nothing;
  return found;
end $$;

revoke execute on function public.anotar_origen(text) from public, anon;
grant execute on function public.anotar_origen(text) to authenticated;

-- HU-03: crear_ronda como estaba, más el origen de quien la arma.
create or replace function public.crear_ronda(p_nombre text)
returns public.rondas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ronda public.rondas;
begin
  if auth.uid() is null then
    raise exception 'Hay que iniciar sesión para armar una ronda' using errcode = '42501';
  end if;

  insert into public.rondas (nombre, creada_por, origen)
  values (btrim(p_nombre), auth.uid(), (select o.origen from public.origenes o where o.usuario_id = auth.uid()))
  returning * into v_ronda;

  insert into public.miembros_ronda (ronda_id, usuario_id, sigla)
  values (v_ronda.id, auth.uid(), public.sigla_para(auth.uid(), v_ronda.id));

  return v_ronda;
end $$;

revoke execute on function public.crear_ronda(text) from public, anon;
grant execute on function public.crear_ronda(text) to authenticated;
