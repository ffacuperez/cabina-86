-- Cabina 86 · #135 · Métricas de la semana
-- Para correr a mano en el SQL Editor de Supabase (corre como administrador, ve todas las rondas).
-- Son solo números: no muestra notas ni comentarios de nadie (RN-01).
-- Fechas en hora de Argentina; las semanas arrancan el lunes.

-- 1. Gente nueva por semana y por origen (tiktok, ig, tarjeta, invitacion…; "sin ref" = entró directo)
select
  to_char(date_trunc('week', u.creado_en at time zone 'America/Argentina/Cordoba'), 'DD/MM') as semana,
  coalesce(o.origen, 'sin ref') as origen,
  count(*) as personas
from public.usuarios u
left join public.origenes o on o.usuario_id = u.id
group by 1, 2, date_trunc('week', u.creado_en at time zone 'America/Argentina/Cordoba')
order by date_trunc('week', u.creado_en at time zone 'America/Argentina/Cordoba') desc, personas desc;

-- 2. Rondas nuevas por semana y por origen de quien la armó
select
  to_char(date_trunc('week', r.creada_en at time zone 'America/Argentina/Cordoba'), 'DD/MM') as semana,
  coalesce(r.origen, 'sin ref') as origen,
  count(*) as rondas
from public.rondas r
group by 1, 2, date_trunc('week', r.creada_en at time zone 'America/Argentina/Cordoba')
order by date_trunc('week', r.creada_en at time zone 'America/Argentina/Cordoba') desc, rondas desc;

-- 3. La semana, de un vistazo: rondas activas (al menos un pase o una nota en 7 días), pases y notas
select
  (select count(distinct r.id)
     from public.rondas r
    where exists (select 1 from public.pases p where p.ronda_id = r.id and p.creado_en > now() - interval '7 days')
       or exists (select 1 from public.calificaciones c join public.pases p on p.id = c.pase_id
                   where p.ronda_id = r.id and c.creada_en > now() - interval '7 days')) as rondas_activas,
  (select count(*) from public.rondas) as rondas_total,
  (select count(*) from public.pases where creado_en > now() - interval '7 days') as pases_7_dias,
  (select count(*) from public.calificaciones where creada_en > now() - interval '7 days') as notas_7_dias,
  (select count(*) from public.usuarios where creado_en > now() - interval '7 days') as personas_nuevas_7_dias;

-- 4. Retención a 4 semanas: de las rondas que tienen entre 4 y 8 semanas, cuántas siguen activas
--    (es el número más importante: si las rondas se mueren solas, no sirve traer gente)
select
  count(*) as rondas_de_4_a_8_semanas,
  count(*) filter (where exists (
    select 1 from public.pases p where p.ronda_id = r.id and p.creado_en > now() - interval '7 days'
  ) or exists (
    select 1 from public.calificaciones c join public.pases p on p.id = c.pase_id
     where p.ronda_id = r.id and c.creada_en > now() - interval '7 days'
  )) as siguen_activas
from public.rondas r
where r.creada_en between now() - interval '8 weeks' and now() - interval '4 weeks';
