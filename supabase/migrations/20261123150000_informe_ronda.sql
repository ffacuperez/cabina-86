-- Cabina 86 · HU-21 (#113) · El informe de la ronda
-- Una sola función que devuelve todo el informe en un jsonb (Figma 06f; ronda nueva, 06g).
--
-- Qué discos cuentan (RN-13): los cerrados, que no le quedan pendientes a nadie (vista pendientes,
-- que ya respeta RN-06) y tienen al menos una nota. Además, solo los que vos podrías ver en el detalle:
-- los que pasaste o calificaste (RN-01). Así el informe nunca muestra una nota que no podrías ver.
--
-- Mínimos (RN-12): cada bloque trae "faltan" (0 si ya alcanza) y la app muestra cuánto falta.
--   termómetro: 10 notas · tibiómetro: 5 notas de cada uno · podio, fondo, discordia y extremos:
--   3 discos cerrados · compatibilidad: 5 discos en común por par.
--
-- Compatibilidad = correlación de las notas del par × 100 (0 si es negativa).
-- Discordia = las dos notas del disco que más se alejan en la escala de cada uno: cuántos desvíos se
-- aleja cada nota del promedio de quien la puso (un 4 de alguien que vive en el 7 pesa más).
-- Si no sos integrante devuelve null. Es "create or replace": se puede aplicar a mano antes de mergear.

create or replace function public.informe_ronda(p_ronda uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
with
integrantes as (
  select m.usuario_id, m.sigla, u.nombre, m.se_unio_en
    from public.miembros_ronda m
    join public.usuarios u on u.id = m.usuario_id
   where m.ronda_id = p_ronda
),
cerrados as (
  select p.id as pase_id, p.pasado_por, d.titulo, d.artista, d.tapa_url
    from public.pases p
    join public.discos d on d.id = p.disco_id
   where p.ronda_id = p_ronda
     and exists (select 1 from public.calificaciones c where c.pase_id = p.id)
     and not exists (select 1 from public.pendientes pe where pe.pase_id = p.id)
     and (p.pasado_por = auth.uid()
          or exists (select 1 from public.calificaciones c where c.pase_id = p.id and c.usuario_id = auth.uid()))
),
notas as (
  select ce.pase_id, ce.titulo, ce.artista, ce.tapa_url,
         de.sigla as de_sigla, de.nombre as de_nombre,
         i.usuario_id, i.sigla, i.nombre, c.puntaje,
         nullif(btrim(c.comentario), '') as comentario
    from cerrados ce
    join public.calificaciones c on c.pase_id = ce.pase_id
    join integrantes i on i.usuario_id = c.usuario_id
    left join integrantes de on de.usuario_id = ce.pasado_por
),
escala as (
  select usuario_id, avg(puntaje) as prom, nullif(stddev_samp(puntaje), 0) as desvio
    from notas
   group by usuario_id
),
notas_z as (
  select n.*, (n.puntaje - e.prom) / e.desvio as z
    from notas n
    join escala e using (usuario_id)
),
por_disco as (
  select pase_id, titulo, artista, tapa_url, de_sigla, de_nombre,
         round(avg(puntaje), 1) as promedio,
         jsonb_agg(jsonb_build_object('sigla', sigla, 'puntaje', puntaje) order by sigla) as notas
    from notas
   group by pase_id, titulo, artista, tapa_url, de_sigla, de_nombre
),
disco_json as (
  select pd.*,
         jsonb_build_object('pase_id', pase_id, 'titulo', titulo, 'artista', artista, 'tapa_url', tapa_url,
                            'de', de_sigla, 'de_nombre', de_nombre, 'promedio', promedio, 'notas', notas) as j,
         dense_rank() over (order by promedio desc) as puesto,
         dense_rank() over (order by promedio) as puesto_desde_abajo
    from por_disco pd
),
totales as (
  select (select count(*) from cerrados)::int as discos,
         (select count(*) from notas)::int as notas
),
termometro as (
  select jsonb_build_object(
           'faltan', greatest(0, 10 - count(*))::int,
           'notas', count(*)::int,
           'promedio', round(avg(puntaje), 1),
           'uno_y_dos', count(*) filter (where puntaje <= 2)::int,
           'nueve_y_diez', count(*) filter (where puntaje >= 9)::int,
           'entre_6_y_8', count(*) filter (where puntaje between 6 and 8)::int,
           'la_que_mas', mode() within group (order by puntaje),
           'reparto', (select jsonb_agg(coalesce(x.c, 0) order by g)
                         from generate_series(1, 10) g
                         left join (select puntaje, count(*)::int as c from notas group by puntaje) x on x.puntaje = g)
         ) as j
    from notas
),
tibiometro as (
  select coalesce(jsonb_agg(fila.j order by fila.pct desc nulls last, fila.se_unio_en), '[]'::jsonb) as j
    from (
      select i.se_unio_en,
             case when count(n.puntaje) > 0
                  then round(100 * avg((n.puntaje between 6 and 8)::int))::int end as pct,
             jsonb_build_object(
               'sigla', i.sigla, 'nombre', i.nombre,
               'notas', count(n.puntaje)::int,
               'faltan', greatest(0, 5 - count(n.puntaje))::int,
               'entre_6_y_8_pct', case when count(n.puntaje) > 0
                                       then round(100 * avg((n.puntaje between 6 and 8)::int))::int end,
               'nueve_y_diez', count(*) filter (where n.puntaje >= 9)::int,
               'dieces', count(*) filter (where n.puntaje = 10)::int,
               'mas_alta', max(n.puntaje),
               'mas_baja', min(n.puntaje)
             ) as j
        from integrantes i
        left join notas n on n.usuario_id = i.usuario_id
       group by i.usuario_id, i.sigla, i.nombre, i.se_unio_en
    ) fila
),
discordia as (
  select coalesce(jsonb_agg(d.j order by d.desvios desc, d.titulo), '[]'::jsonb) as j
    from (
      select titulo,
             max(z) - min(z) as desvios,
             jsonb_build_object(
               'pase_id', pase_id, 'titulo', titulo, 'artista', artista, 'tapa_url', tapa_url,
               'de', de_sigla, 'de_nombre', de_nombre,
               'alta', (array_agg(jsonb_build_object('sigla', sigla, 'puntaje', puntaje) order by z desc, sigla))[1],
               'baja', (array_agg(jsonb_build_object('sigla', sigla, 'puntaje', puntaje) order by z, sigla))[1],
               'puntos', max(puntaje) filter (where z is not null) - min(puntaje) filter (where z is not null),
               'desvios', round((max(z) - min(z))::numeric, 1)
             ) as j
        from notas_z
       where z is not null
       group by pase_id, titulo, artista, tapa_url, de_sigla, de_nombre
      having count(*) >= 2 and max(z) > min(z)
       order by max(z) - min(z) desc, titulo
       limit 3
    ) d
),
pares as (
  select a.usuario_id as ua, a.sigla as sa, a.nombre as na,
         b.usuario_id as ub, b.sigla as sb, b.nombre as nb,
         row_number() over (order by a.se_unio_en, a.usuario_id, b.se_unio_en, b.usuario_id) as orden
    from integrantes a
    join integrantes b on (a.se_unio_en, a.usuario_id) < (b.se_unio_en, b.usuario_id)
),
en_comun as (
  select pr.orden, x.titulo, x.puntaje as pa, y.puntaje as pb
    from pares pr
    join notas x on x.usuario_id = pr.ua
    join notas y on y.usuario_id = pr.ub and y.pase_id = x.pase_id
),
compatibilidad as (
  select coalesce(jsonb_agg(c.j order by c.pct desc nulls last, c.orden), '[]'::jsonb) as j
    from (
      select pr.orden,
             case when count(ec.titulo) >= 5 and corr(ec.pa, ec.pb) is not null
                  then greatest(0, round(100 * corr(ec.pa, ec.pb)::numeric))::int end as pct,
             jsonb_build_object(
               'a', jsonb_build_object('sigla', pr.sa, 'nombre', pr.na),
               'b', jsonb_build_object('sigla', pr.sb, 'nombre', pr.nb),
               'discos', count(ec.titulo)::int,
               'faltan', greatest(0, 5 - count(ec.titulo))::int,
               'pct', case when count(ec.titulo) >= 5 and corr(ec.pa, ec.pb) is not null
                           then greatest(0, round(100 * corr(ec.pa, ec.pb)::numeric))::int end,
               'une', (array_agg(jsonb_build_object('titulo', ec.titulo, 'a', ec.pa, 'b', ec.pb)
                                 order by ec.pa + ec.pb desc, abs(ec.pa - ec.pb), ec.titulo)
                       filter (where ec.titulo is not null))[1],
               'separa', (array_agg(jsonb_build_object('titulo', ec.titulo, 'a', ec.pa, 'b', ec.pb)
                                    order by abs(ec.pa - ec.pb) desc, ec.titulo)
                          filter (where ec.titulo is not null and ec.pa <> ec.pb))[1]
             ) as j
        from pares pr
        left join en_comun ec on ec.orden = pr.orden
       group by pr.orden, pr.sa, pr.na, pr.sb, pr.nb
    ) c
),
extremos as (
  select coalesce(jsonb_agg(e.j order by e.se_unio_en), '[]'::jsonb) as j
    from (
      select i.se_unio_en,
             jsonb_build_object(
               'sigla', i.sigla, 'nombre', i.nombre,
               'alta', jsonb_build_object('puntaje', max(n.puntaje),
                         'discos', (select jsonb_agg(n2.titulo order by n2.titulo) from notas n2
                                     where n2.usuario_id = i.usuario_id
                                       and n2.puntaje = (select max(n3.puntaje) from notas n3 where n3.usuario_id = i.usuario_id))),
               'baja', jsonb_build_object('puntaje', min(n.puntaje),
                         'discos', (select jsonb_agg(n2.titulo order by n2.titulo) from notas n2
                                     where n2.usuario_id = i.usuario_id
                                       and n2.puntaje = (select min(n3.puntaje) from notas n3 where n3.usuario_id = i.usuario_id)))
             ) as j
        from integrantes i
        join notas n on n.usuario_id = i.usuario_id
       group by i.usuario_id, i.sigla, i.nombre, i.se_unio_en
    ) e
),
comentarios as (
  select n.*,
         n.comentario ~* '(oportunidad|volver a escuch|escucho m[aá]s|refresc|revisit|otra vuelta|otra pasada|me estoy perdiendo)' as promete
    from notas n
   where n.comentario is not null
),
cita as (
  select *, jsonb_build_object('sigla', sigla, 'nombre', nombre, 'puntaje', puntaje,
                               'titulo', titulo, 'de', de_sigla, 'comentario', comentario) as j
    from comentarios
),
oportunidad as (
  select jsonb_build_object(
           'comentarios', (select count(*) from comentarios)::int,
           'promesas', (select count(*) from comentarios where promete)::int,
           'citas', coalesce((select jsonb_agg(x.j order by x.puntaje, x.titulo, x.sigla)
                                from (select * from cita where promete order by puntaje, titulo, sigla limit 2) x), '[]'::jsonb)
         ) as j
),
picante as (
  select (select j from cita where not promete and puntaje <= 5
           order by puntaje, length(comentario) desc, titulo limit 1) as j
)
select jsonb_build_object(
         'discos', t.discos,
         'notas', t.notas,
         'faltan_cerrados', greatest(0, 3 - t.discos),
         'termometro', (select j from termometro),
         'tibiometro', (select j from tibiometro),
         'podio', coalesce((select jsonb_agg(j || jsonb_build_object('puesto', puesto) order by puesto, titulo)
                              from disco_json where puesto <= 3), '[]'::jsonb),
         'fondo', coalesce((select jsonb_agg(j order by titulo) from disco_json where puesto_desde_abajo = 1), '[]'::jsonb),
         'discordia', (select j from discordia),
         'compatibilidad', (select j from compatibilidad),
         'extremos', (select j from extremos),
         'oportunidad', (select j from oportunidad),
         'picante', (select j from picante)
       )
  from totales t
 where public.es_miembro(p_ronda);
$$;

revoke execute on function public.informe_ronda(uuid) from public, anon;
grant execute on function public.informe_ronda(uuid) to authenticated;
