-- Cabina 86 · T-05 · Permisos (Row Level Security)
-- RN-05: todo es por ronda; para leer o escribir hay que ser integrante.
-- RN-01: las notas ajenas quedan ocultas hasta que calificás (o si el disco es tuyo).
-- anon (sin login) no ve nada.

-- ─────────────────────────────────────────────────────────────
-- Funciones de apoyo para las políticas.
-- security definer: leen las tablas sin pasar por RLS (evita recursión),
-- pero solo devuelven verdadero/falso sobre la persona logueada.
-- ─────────────────────────────────────────────────────────────
create function public.es_miembro(p_ronda uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.miembros_ronda m
     where m.ronda_id = p_ronda and m.usuario_id = auth.uid()
  );
$$;

-- ¿Comparto alguna ronda con esta persona? (para ver su nombre y foto)
create function public.comparte_ronda(p_usuario uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.miembros_ronda yo
      join public.miembros_ronda otro on otro.ronda_id = yo.ronda_id
     where yo.usuario_id = auth.uid() and otro.usuario_id = p_usuario
  );
$$;

-- ¿Puedo ver las notas de este pase? Sí si soy integrante y además lo pasé yo o ya lo califiqué.
create function public.puede_ver_notas(p_pase uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.pases p
     where p.id = p_pase
       and exists (select 1 from public.miembros_ronda m
                    where m.ronda_id = p.ronda_id and m.usuario_id = auth.uid())
       and (
         p.pasado_por = auth.uid()
         or exists (select 1 from public.calificaciones c
                     where c.pase_id = p.id and c.usuario_id = auth.uid())
       )
  );
$$;

-- ¿Soy integrante de la ronda de este pase?
create function public.es_miembro_del_pase(p_pase uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.pases p
      join public.miembros_ronda m on m.ronda_id = p.ronda_id
     where p.id = p_pase and m.usuario_id = auth.uid()
  );
$$;

-- RN-01: quién calificó un pase, sin puntaje ni comentario ("Manu calificó").
create function public.quienes_calificaron(p_pase uuid)
returns table (usuario_id uuid, creada_en timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.usuario_id, c.creada_en
    from public.calificaciones c
   where c.pase_id = p_pase
     and public.es_miembro_del_pase(p_pase)
   order by c.creada_en;
$$;

-- ─────────────────────────────────────────────────────────────
-- Políticas
-- ─────────────────────────────────────────────────────────────

-- usuarios: me veo a mí y a quienes comparten ronda conmigo; edito solo lo mío.
create policy usuarios_ver on public.usuarios
  for select to authenticated
  using (id = auth.uid() or public.comparte_ronda(id));

create policy usuarios_editar on public.usuarios
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- rondas: las veo si soy integrante; la edita quien la creó.
-- Crear y unirse se hace con funciones (HU-02, HU-03), no con insert directo.
create policy rondas_ver on public.rondas
  for select to authenticated
  using (public.es_miembro(id));

create policy rondas_editar on public.rondas
  for update to authenticated
  using (creada_por = auth.uid())
  with check (creada_por = auth.uid());

-- miembros_ronda: veo a los integrantes de mis rondas; cambio solo mi sigla.
create policy miembros_ver on public.miembros_ronda
  for select to authenticated
  using (public.es_miembro(ronda_id));

create policy miembros_editar_sigla on public.miembros_ronda
  for update to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

-- discos: catálogo compartido, solo lectura. Los guarda la Edge Function (T-09, T-10).
create policy discos_ver on public.discos
  for select to authenticated
  using (true);

-- pases: veo los de mis rondas; paso discos solo como yo y en rondas mías;
-- corrijo solo mi tarjetita (el trigger protege el resto).
create policy pases_ver on public.pases
  for select to authenticated
  using (public.es_miembro(ronda_id));

create policy pases_crear on public.pases
  for insert to authenticated
  with check (pasado_por = auth.uid() and public.es_miembro(ronda_id));

create policy pases_editar on public.pases
  for update to authenticated
  using (pasado_por = auth.uid())
  with check (pasado_por = auth.uid());

-- calificaciones (RN-01, RN-02)
create policy calificaciones_ver on public.calificaciones
  for select to authenticated
  using (usuario_id = auth.uid() or public.puede_ver_notas(pase_id));

create policy calificaciones_crear on public.calificaciones
  for insert to authenticated
  with check (usuario_id = auth.uid() and public.es_miembro_del_pase(pase_id));

create policy calificaciones_editar on public.calificaciones
  for update to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

-- Sin políticas de delete: nadie borra filas desde la API.

-- ─────────────────────────────────────────────────────────────
-- Vistas.
-- Con RLS, una vista "como quien consulta" contaría mal lo de los demás
-- (no ve sus notas). Estas corren con los permisos del dueño y filtran a mano:
-- solo devuelven conteos y datos de rondas donde sos integrante, nunca notas.
-- ─────────────────────────────────────────────────────────────

-- pendientes: los de mis rondas.
create or replace view public.pendientes
with (security_invoker = false, security_barrier = true) as
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
where public.es_miembro(m.ronda_id)
  and not exists (
    select 1 from public.calificaciones c
     where c.pase_id = p.id and c.usuario_id = m.usuario_id
  );

-- deuda y tablero: salen de pendientes, así que ya quedan limitadas a mis rondas.
alter view public.deuda set (security_invoker = false, security_barrier = true);

-- deuda_total: solo la mía (la de otros sumaría rondas donde no estoy).
create or replace view public.deuda_total
with (security_invoker = false, security_barrier = true) as
select usuario_id, sum(pendientes)::integer as pendientes
from public.deuda
where usuario_id = auth.uid()
group by usuario_id;

create or replace view public.tablero
with (security_invoker = false, security_barrier = true) as
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
join public.deuda d on d.ronda_id = m.ronda_id and d.usuario_id = m.usuario_id
where public.es_miembro(m.ronda_id);

-- lo_que_pasaste: solo mis pases (HU-16). Como los pasé yo, puedo ver sus notas.
create or replace view public.lo_que_pasaste
with (security_invoker = false, security_barrier = true) as
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
from public.pases p
where p.pasado_por = auth.uid()
  and public.es_miembro(p.ronda_id);

-- ─────────────────────────────────────────────────────────────
-- Grants: anon no toca nada; authenticated lee las vistas.
-- ─────────────────────────────────────────────────────────────
revoke all on public.usuarios, public.rondas, public.miembros_ronda,
              public.discos, public.pases, public.calificaciones from anon;
revoke all on public.pendientes, public.deuda, public.deuda_total,
              public.tablero, public.lo_que_pasaste from anon, authenticated;
grant select on public.pendientes, public.deuda, public.deuda_total,
                public.tablero, public.lo_que_pasaste to authenticated;

-- Solo authenticated usa las funciones de apoyo.
revoke execute on function public.es_miembro(uuid)          from public, anon;
revoke execute on function public.comparte_ronda(uuid)      from public, anon;
revoke execute on function public.puede_ver_notas(uuid)     from public, anon;
revoke execute on function public.es_miembro_del_pase(uuid) from public, anon;
revoke execute on function public.quienes_calificaron(uuid) from public, anon;
grant execute on function public.es_miembro(uuid),
                          public.comparte_ronda(uuid),
                          public.puede_ver_notas(uuid),
                          public.es_miembro_del_pase(uuid),
                          public.quienes_calificaron(uuid) to authenticated;
revoke execute on function public.generar_codigo_invitacion() from anon;
