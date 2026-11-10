-- HU-17 · La Ronda: el tablero suma el promedio de cada integrante (PROM, Figma 06).
-- Es el promedio de las notas que le pusieron a lo que pasó en esta ronda, con un cuidado por RN-01
-- (no ver una nota antes de calificar): de los demás solo cuentan sus discos cerrados, los que ya
-- calificaron todos los que lo debían (estaban en la ronda cuando se pasó, RN-06). Así nunca adelanta
-- una nota que todavía no podés ver. El mío cuenta todo, como "TE PONEN" en Perfil (HU-16): las notas
-- de lo que pasé ya las veo (S-03). Null si todavía no hay ninguna.

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
  d.pendientes as deuda,
  (select round(avg(c.puntaje), 1)
     from public.calificaciones c
     join public.pases p on p.id = c.pase_id
    where p.ronda_id = m.ronda_id
      and p.pasado_por = m.usuario_id
      and (
        m.usuario_id = auth.uid()
        or not exists (
          select 1 from public.miembros_ronda o
           where o.ronda_id = p.ronda_id
             and o.usuario_id <> p.pasado_por
             and p.creado_en > o.se_unio_en
             and not exists (
               select 1 from public.calificaciones c2
                where c2.pase_id = p.id and c2.usuario_id = o.usuario_id
             )
        )
      )
  ) as promedio
from public.miembros_ronda m
join public.usuarios u on u.id = m.usuario_id
join public.deuda d on d.ronda_id = m.ronda_id and d.usuario_id = m.usuario_id
where public.es_miembro(m.ronda_id);
