-- Cabina 86 · HU-17 · Tablero de la ronda (pgTAP)
-- PROM: de los demás, los discos que ya califiqué; el mío, todo.
-- Correr con: npm run db:test  (necesita Supabase local: npm run db:start)
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

-- Ronda con Facu, Maxi y Manu. Lu se suma después de todos los pases (RN-06: no debe nada).
--   Maxi pasó MAX-1: Manu le puso 3, Facu todavía no.
--   Facu pasó FAC-1: Maxi le puso 8, Manu todavía no.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000017aa', 'facu@tab.com', '{"full_name":"Facu"}'),
  ('00000000-0000-0000-0000-0000000017bb', 'maxi@tab.com', '{"full_name":"Maxi"}'),
  ('00000000-0000-0000-0000-0000000017cc', 'manu@tab.com', '{"full_name":"Manu"}'),
  ('00000000-0000-0000-0000-0000000017dd', 'lu@tab.com',   '{"full_name":"Lu"}');
insert into public.rondas (id, nombre, creada_por) values
  ('10000000-0000-0000-0000-0000000017aa', 'Tablero', '00000000-0000-0000-0000-0000000017aa');
insert into public.miembros_ronda (ronda_id, usuario_id, sigla, se_unio_en) values
  ('10000000-0000-0000-0000-0000000017aa', '00000000-0000-0000-0000-0000000017aa', 'FAC', now() - interval '2 days'),
  ('10000000-0000-0000-0000-0000000017aa', '00000000-0000-0000-0000-0000000017bb', 'MAX', now() - interval '2 days'),
  ('10000000-0000-0000-0000-0000000017aa', '00000000-0000-0000-0000-0000000017cc', 'MAN', now() - interval '2 days'),
  ('10000000-0000-0000-0000-0000000017aa', '00000000-0000-0000-0000-0000000017dd', 'LUU', now());
insert into public.discos (id, deezer_id, titulo, artista) values
  ('20000000-0000-0000-0000-0000000017aa', 1701, 'Artaud', 'Pescado Rabioso'),
  ('20000000-0000-0000-0000-0000000017bb', 1702, 'Oktubre', 'Patricio Rey');
insert into public.pases (id, ronda_id, disco_id, pasado_por, tarjetita, creado_en) values
  ('30000000-0000-0000-0000-0000000017aa', '10000000-0000-0000-0000-0000000017aa',
   '20000000-0000-0000-0000-0000000017aa', '00000000-0000-0000-0000-0000000017bb', 'De noche', now() - interval '1 day'),
  ('30000000-0000-0000-0000-0000000017bb', '10000000-0000-0000-0000-0000000017aa',
   '20000000-0000-0000-0000-0000000017bb', '00000000-0000-0000-0000-0000000017aa', 'Fuerte', now() - interval '1 day');
insert into public.calificaciones (pase_id, usuario_id, puntaje) values
  ('30000000-0000-0000-0000-0000000017aa', '00000000-0000-0000-0000-0000000017cc', 3),
  ('30000000-0000-0000-0000-0000000017bb', '00000000-0000-0000-0000-0000000017bb', 8);

create function pg_temp.como(p_usuario uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

select pg_temp.como('00000000-0000-0000-0000-0000000017aa');

select results_eq(
  $$select sigla, pases_hechos, escuchados, deuda from public.tablero
     where ronda_id = '10000000-0000-0000-0000-0000000017aa' order by sigla$$,
  $$values ('FAC'::text, 1, 0, 1), ('LUU'::text, 0, 0, 0), ('MAN'::text, 0, 1, 1), ('MAX'::text, 1, 1, 0)$$,
  'HU-17: una ficha por integrante con lo que pasó, lo que escuchó y lo que debe (Lu, recién sumada, en 00)'
);
select is(
  (select promedio from public.tablero where sigla = 'MAX' and ronda_id = '10000000-0000-0000-0000-0000000017aa'),
  null,
  'RN-01: Facu no calificó el disco de Maxi, así que su PROM no adelanta la nota de Manu'
);
select is(
  (select promedio from public.tablero where sigla = 'FAC' and ronda_id = '10000000-0000-0000-0000-0000000017aa'),
  8.0,
  'Mi PROM cuenta todo lo que me pusieron, como TE PONEN en Perfil'
);
select is(
  (select promedio from public.tablero where sigla = 'LUU' and ronda_id = '10000000-0000-0000-0000-0000000017aa'),
  null,
  'Sin nada pasado no hay PROM'
);

-- Maxi ve mi PROM: ya calificó mi disco (aunque Manu todavía lo deba)
select pg_temp.como('00000000-0000-0000-0000-0000000017bb');
select is(
  (select promedio from public.tablero where sigla = 'FAC' and ronda_id = '10000000-0000-0000-0000-0000000017aa'),
  8.0,
  'Maxi ya calificó mi disco: ve mi PROM con esas notas, aunque Manu todavía lo deba'
);
-- Manu ve el PROM de Maxi apenas lo califica, sin esperar a Facu
select pg_temp.como('00000000-0000-0000-0000-0000000017cc');
select is(
  (select promedio from public.tablero where sigla = 'MAX' and ronda_id = '10000000-0000-0000-0000-0000000017aa'),
  3.0,
  'Manu ya calificó el disco de Maxi: ve su PROM sin esperar a que lo califique Facu'
);
select is(
  (select promedio from public.tablero where sigla = 'FAC' and ronda_id = '10000000-0000-0000-0000-0000000017aa'),
  null,
  'RN-01: Manu no calificó mi disco, así que no ve mi PROM (sería la nota de Maxi)'
);

-- Facu califica el de Maxi: se cierra
reset role;
insert into public.calificaciones (pase_id, usuario_id, puntaje) values
  ('30000000-0000-0000-0000-0000000017aa', '00000000-0000-0000-0000-0000000017aa', 9);

select pg_temp.como('00000000-0000-0000-0000-0000000017cc');
select is(
  (select promedio from public.tablero where sigla = 'MAX' and ronda_id = '10000000-0000-0000-0000-0000000017aa'),
  6.0,
  'Cuando Facu también lo califica, el PROM de Maxi junta las dos notas (3 y 9: 6,0)'
);
select is(
  (select deuda from public.tablero where sigla = 'FAC' and ronda_id = '10000000-0000-0000-0000-0000000017aa'),
  0,
  'La deuda baja al calificar'
);

select pg_temp.como('00000000-0000-0000-0000-0000000017dd');
select is(
  (select promedio from public.tablero where sigla = 'MAX' and ronda_id = '10000000-0000-0000-0000-0000000017aa'),
  null,
  'Lu se sumó después y no calificó ese disco (no ve sus notas): sin PROM de Maxi'
);
select is(
  (select escuchados from public.tablero where sigla = 'FAC' and ronda_id = '10000000-0000-0000-0000-0000000017aa'),
  1,
  'Los números se actualizan para todos'
);

-- De otra ronda no se ve nada (RN-05)
reset role;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000017ee', 'otro@tab.com', '{"full_name":"Otro"}');
select pg_temp.como('00000000-0000-0000-0000-0000000017ee');
select is(
  (select count(*)::int from public.tablero where ronda_id = '10000000-0000-0000-0000-0000000017aa'),
  0,
  'RN-05: si no estás en la ronda, no ves su tablero'
);

select * from finish();
rollback;
