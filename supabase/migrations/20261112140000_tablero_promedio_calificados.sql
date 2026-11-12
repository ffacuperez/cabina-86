-- PROM de La Ronda (HU-17): de los demás cuentan los discos que YO ya califiqué.
-- Antes contaban solo los discos cerrados (los habían calificado todos los que lo debían), y la ficha
-- de alguien quedaba en "--" aunque yo ya hubiera escuchado su disco. Las notas de un disco que califiqué
-- ya las veo en el detalle (HU-18), así que su promedio no adelanta ninguna nota (RN-01).
-- El mío sigue contando todo, como TE PONEN en Perfil (S-03). Cada uno ve el PROM de lo que escuchó.

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
        or exists (
          select 1 from public.calificaciones mia
           where mia.pase_id = p.id and mia.usuario_id = auth.uid()
        )
      )
  ) as promedio
from public.miembros_ronda m
join public.usuarios u on u.id = m.usuario_id
join public.deuda d on d.ronda_id = m.ronda_id and d.usuario_id = m.usuario_id
where public.es_miembro(m.ronda_id);
