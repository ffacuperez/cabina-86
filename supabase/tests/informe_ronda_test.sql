-- Cabina 86 · HU-21 (#113) · El informe de la ronda (pgTAP)
-- Correr con: npm run db:test  (necesita Supabase local: npm run db:start)
begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000f1', 'facu@test.com', '{"full_name":"Facu"}'),
  ('00000000-0000-0000-0000-0000000000f2', 'manu@test.com', '{"full_name":"Manu"}'),
  ('00000000-0000-0000-0000-0000000000f3', 'maxi@test.com', '{"full_name":"Maxi"}'),
  ('00000000-0000-0000-0000-0000000000f4', 'joa@test.com',  '{"full_name":"Joa"}'),
  ('00000000-0000-0000-0000-0000000000f5', 'nico@test.com', '{"full_name":"Nico"}');

-- Birrinhas: Facu, Manu y Maxi desde que se armó, hace 10 días. Joa se sumó hoy (pasadas las 24 horas).
-- Nueva: Facu y Manu, con un solo disco escuchado.
insert into public.rondas (id, nombre, creada_por, creada_en) values
  ('10000000-0000-0000-0000-0000000000b1', 'Birrinhas do Sabado', '00000000-0000-0000-0000-0000000000f1', now() - interval '10 days'),
  ('10000000-0000-0000-0000-0000000000b2', 'Nueva',               '00000000-0000-0000-0000-0000000000f1', now() - interval '10 days');
insert into public.miembros_ronda (ronda_id, usuario_id, sigla, se_unio_en) values
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', 'FAC', now() - interval '10 days'),
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f2', 'MAN', now() - interval '10 days' + interval '1 millisecond'),
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f3', 'MAX', now() - interval '10 days' + interval '2 milliseconds'),
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f4', 'JOA', now() - interval '1 hour'),
  ('10000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000f1', 'FAC', now() - interval '10 days'),
  ('10000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000f2', 'MAN', now() - interval '10 days' + interval '1 millisecond');

insert into public.discos (id, deezer_id, titulo, artista)
select ('20000000-0000-0000-0000-0000000000' || lpad(g::text, 2, '0'))::uuid, g, 'Disco ' || g, 'Artista ' || g
  from generate_series(1, 8) g;

-- Facu pasa 6 discos en Birrinhas; Manu y Maxi los califican al revés uno del otro (correlación negativa).
-- El 6 tiene 7 de promedio (primer puesto) y los otros cinco empatan en 6,5.
insert into public.pases (id, ronda_id, disco_id, pasado_por, tarjetita, creado_en)
select ('30000000-0000-0000-0000-0000000000' || lpad(g::text, 2, '0'))::uuid, '10000000-0000-0000-0000-0000000000b1',
       ('20000000-0000-0000-0000-0000000000' || lpad(g::text, 2, '0'))::uuid, '00000000-0000-0000-0000-0000000000f1', 'Escuchalo',
       now() - interval '9 days' + g * interval '1 hour'
  from generate_series(1, 6) g;
insert into public.calificaciones (pase_id, usuario_id, puntaje, comentario)
select ('30000000-0000-0000-0000-0000000000' || lpad(g::text, 2, '0'))::uuid, '00000000-0000-0000-0000-0000000000f2',
       (array[9, 8, 7, 6, 5, 4])[g],
       case when g = 5 then 'Tengo que darle otra oportunidad' end
  from generate_series(1, 6) g;
insert into public.calificaciones (pase_id, usuario_id, puntaje, comentario)
select ('30000000-0000-0000-0000-0000000000' || lpad(g::text, 2, '0'))::uuid, '00000000-0000-0000-0000-0000000000f3',
       (array[4, 5, 6, 7, 8, 10])[g],
       case when g = 1 then 'Un embole' end
  from generate_series(1, 6) g;

-- Maxi pasa el 7: Manu ya lo calificó, Facu todavía no (no está cerrado).
insert into public.pases (id, ronda_id, disco_id, pasado_por, tarjetita, creado_en) values
  ('30000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-000000000007',
   '00000000-0000-0000-0000-0000000000f3', 'Para todos', now() - interval '2 days');
insert into public.calificaciones (pase_id, usuario_id, puntaje) values
  ('30000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-0000000000f2', 10);

-- En Nueva, Facu pasa el 8 y Manu lo califica.
insert into public.pases (id, ronda_id, disco_id, pasado_por, tarjetita, creado_en) values
  ('30000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-0000000000b2', '20000000-0000-0000-0000-000000000008',
   '00000000-0000-0000-0000-0000000000f1', 'El primero', now() - interval '9 days');
insert into public.calificaciones (pase_id, usuario_id, puntaje) values
  ('30000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-0000000000f2', 7);

create function pg_temp.como(p_usuario uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;
create function pg_temp.informe(p_ronda uuid) returns jsonb language sql as $$ select public.informe_ronda(p_ronda) $$;

-- Escenario: Solo los integrantes ven el informe
select pg_temp.como('00000000-0000-0000-0000-0000000000f5');
select is(pg_temp.informe('10000000-0000-0000-0000-0000000000b1'), null, 'HU-21: si no soy integrante, la base no devuelve nada');

-- Escenario: Solo cuentan los discos cerrados (RN-13)
select pg_temp.como('00000000-0000-0000-0000-0000000000f1');
select is((pg_temp.informe('10000000-0000-0000-0000-0000000000b1') ->> 'discos')::int, 6, 'RN-13: el disco que todavía debo no cuenta (6 de 7)');
select is((pg_temp.informe('10000000-0000-0000-0000-0000000000b1') ->> 'notas')::int, 12, 'RN-13: su nota tampoco suma');
select pg_temp.como('00000000-0000-0000-0000-0000000000f2');
select is((pg_temp.informe('10000000-0000-0000-0000-0000000000b1') ->> 'discos')::int, 6, 'RN-13: tampoco cuenta para Manu, que ya lo calificó');

-- Escenario: Alguien que se sumó pasadas las 24 horas no ve notas de discos que no escuchó (RN-01)
select pg_temp.como('00000000-0000-0000-0000-0000000000f4');
select is((pg_temp.informe('10000000-0000-0000-0000-0000000000b1') ->> 'discos')::int, 0, 'RN-01: Joa no pasó ni calificó nada, no ve ninguna nota');
select is((pg_temp.informe('10000000-0000-0000-0000-0000000000b1') -> 'podio'), '[]'::jsonb, 'RN-01: Joa ve el podio vacío');

-- Escenario: Empates en el podio
select pg_temp.como('00000000-0000-0000-0000-0000000000f1');
select is(
  (select jsonb_agg(d ->> 'titulo') from jsonb_array_elements(pg_temp.informe('10000000-0000-0000-0000-0000000000b1') -> 'podio') d where (d ->> 'puesto')::int = 1),
  '["Disco 6"]'::jsonb,
  'Podio: el de 7 de promedio, solo en el primer puesto'
);
select is(
  (select count(*)::int from jsonb_array_elements(pg_temp.informe('10000000-0000-0000-0000-0000000000b1') -> 'podio') d where (d ->> 'puesto')::int = 2),
  5,
  'Podio: los cinco de 6,5 comparten el segundo puesto'
);
select is(
  (select count(*)::int from jsonb_array_elements(pg_temp.informe('10000000-0000-0000-0000-0000000000b1') -> 'fondo')),
  5,
  'Fondo: los cinco del último puesto'
);

-- Compatibilidad: correlación negativa da 0
select is(
  (select c -> 'pct' from jsonb_array_elements(pg_temp.informe('10000000-0000-0000-0000-0000000000b1') -> 'compatibilidad') c
    where c -> 'a' ->> 'sigla' = 'MAN' and c -> 'b' ->> 'sigla' = 'MAX'),
  '0'::jsonb,
  'Compatibilidad: Manu y Maxi califican al revés, da 0 %'
);
select is(
  (select (c ->> 'discos')::int from jsonb_array_elements(pg_temp.informe('10000000-0000-0000-0000-0000000000b1') -> 'compatibilidad') c
    where c -> 'a' ->> 'sigla' = 'MAN' and c -> 'b' ->> 'sigla' = 'MAX'),
  6,
  'Compatibilidad: sobre los 6 discos cerrados que calificaron los dos'
);
select is(
  (select c -> 'pct' from jsonb_array_elements(pg_temp.informe('10000000-0000-0000-0000-0000000000b1') -> 'compatibilidad') c
    where c -> 'a' ->> 'sigla' = 'FAC' and c -> 'b' ->> 'sigla' = 'MAN'),
  'null'::jsonb,
  'Compatibilidad: Facu y Manu no tienen discos en común (los pasa Facu), sin porcentaje'
);

-- Discordia, comentarios
select is(jsonb_array_length(pg_temp.informe('10000000-0000-0000-0000-0000000000b1') -> 'discordia'), 3, 'Discordia: los tres discos más divididos');
select is((pg_temp.informe('10000000-0000-0000-0000-0000000000b1') -> 'oportunidad' ->> 'promesas')::int, 1, 'Otra oportunidad: cuenta los comentarios que prometen volver');
select is(pg_temp.informe('10000000-0000-0000-0000-0000000000b1') -> 'picante' ->> 'comentario', 'Un embole', 'La más picante: el comentario con la nota más baja que no es una promesa');

-- Escenario: Un bloque sin los datos mínimos (RN-12)
select is((pg_temp.informe('10000000-0000-0000-0000-0000000000b2') -> 'termometro' ->> 'faltan')::int, 9, 'RN-12: con 1 nota, al termómetro le faltan 9');
select is((pg_temp.informe('10000000-0000-0000-0000-0000000000b2') ->> 'faltan_cerrados')::int, 2, 'RN-12: con 1 disco cerrado, faltan 2 para el podio');
select is(
  (select (c ->> 'faltan')::int from jsonb_array_elements(pg_temp.informe('10000000-0000-0000-0000-0000000000b2') -> 'compatibilidad') c),
  5,
  'RN-12: sin discos en común, a la compatibilidad le faltan 5'
);
select is(
  (select jsonb_agg(t ->> 'faltan' order by t ->> 'sigla') from jsonb_array_elements(pg_temp.informe('10000000-0000-0000-0000-0000000000b2') -> 'tibiometro') t),
  '["5", "4"]'::jsonb,
  'RN-12: tibiómetro, a Facu le faltan 5 notas y a Manu 4'
);
select is((pg_temp.informe('10000000-0000-0000-0000-0000000000b2') -> 'termometro' -> 'reparto'), '[0,0,0,0,0,0,1,0,0,0]'::jsonb, 'Reparto: una nota de 7');

select * from finish();
rollback;
