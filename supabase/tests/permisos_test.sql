-- Cabina 86 · T-05 · Pruebas de permisos (pgTAP)
-- Correr con: npm run db:test  (necesita Supabase local: npm run db:start)
begin;
create extension if not exists pgtap with schema extensions;

select plan(37);

-- ─────────────────────────────────────────────────────────────
-- Datos de prueba (como postgres, sin RLS)
--   Ronda R: Facu (A), Manu (B), Eli (E).  Ronda R2: Lu (C).
--   Facu pasó P1. Eli ya calificó P1. Manu todavía no.
-- ─────────────────────────────────────────────────────────────
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'facu@test.com', '{"full_name":"Facu"}'),
  ('00000000-0000-0000-0000-00000000000b', 'manu@test.com', '{"full_name":"Manu"}'),
  ('00000000-0000-0000-0000-00000000000c', 'lu@test.com',   '{"full_name":"Lu"}'),
  ('00000000-0000-0000-0000-00000000000e', 'eli@test.com',  '{"full_name":"Eli"}');

insert into public.rondas (id, nombre, creada_por) values
  ('10000000-0000-0000-0000-000000000001', 'Los del 86', '00000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-000000000002', 'Otra ronda', '00000000-0000-0000-0000-00000000000c');

insert into public.miembros_ronda (ronda_id, usuario_id, sigla, se_unio_en) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'FAC', now() - interval '1 day'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'MAN', now() - interval '1 day'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000e', 'ELI', now() - interval '1 day'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000c', 'LUU', now() - interval '1 day');

insert into public.discos (id, deezer_id, titulo, artista) values
  ('20000000-0000-0000-0000-000000000001', 1, 'Kind of Blue', 'Miles Davis'),
  ('20000000-0000-0000-0000-000000000002', 2, 'Abbey Road', 'The Beatles'),
  ('20000000-0000-0000-0000-000000000003', 3, 'Clics modernos', 'Charly García');

insert into public.pases (id, ronda_id, disco_id, pasado_por, tarjetita) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Para la noche'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000c', 'De la otra ronda');

insert into public.calificaciones (pase_id, usuario_id, puntaje, comentario) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000e', 8, 'Muy bueno');

-- Cambia de persona dentro de la transacción
create function pg_temp.como(p_usuario uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create function pg_temp.sin_login() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
end $$;

-- ─────────────────────────────────────────────────────────────
-- Sin login: nada
-- ─────────────────────────────────────────────────────────────
select pg_temp.sin_login();
select throws_ok('select * from public.rondas',         '42501', null, 'anon no lee rondas');
select throws_ok('select * from public.pases',          '42501', null, 'anon no lee pases');
select throws_ok('select * from public.calificaciones', '42501', null, 'anon no lee calificaciones');
select throws_ok('select * from public.usuarios',       '42501', null, 'anon no lee usuarios');
select throws_ok('select * from public.deuda',          '42501', null, 'anon no lee la deuda');
reset role;

-- ─────────────────────────────────────────────────────────────
-- RN-05: todo es por ronda
-- ─────────────────────────────────────────────────────────────
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
select results_eq('select nombre from public.rondas', $$values ('Los del 86'::text)$$,
  'Facu ve solo su ronda');
select is((select count(*)::int from public.miembros_ronda), 3, 'Facu ve los 3 integrantes de su ronda');
select is((select count(*)::int from public.pases), 1, 'Facu ve solo los pases de su ronda');
select is((select count(*)::int from public.usuarios), 3, 'Facu ve su perfil y el de quienes comparten ronda');
select is((select count(*)::int from public.discos), 3, 'el catálogo de discos se lee completo');
reset role;

select pg_temp.como('00000000-0000-0000-0000-00000000000c');
select is((select count(*)::int from public.pases
            where ronda_id = '10000000-0000-0000-0000-000000000001'), 0,
  'Lu no ve los pases de una ronda ajena');
select is((select count(*)::int from public.pendientes), 0, 'Lu no tiene pendientes en ronda ajena');
select is((select count(*)::int from public.tablero
            where ronda_id = '10000000-0000-0000-0000-000000000001'), 0,
  'Lu no ve el tablero de una ronda ajena');
reset role;

-- ─────────────────────────────────────────────────────────────
-- Pasar discos
-- ─────────────────────────────────────────────────────────────
select pg_temp.como('00000000-0000-0000-0000-00000000000b');
select lives_ok($$insert into public.pases (ronda_id, disco_id, tarjetita)
  values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'Escuchalo entero')$$,
  'Manu pasa un disco a su ronda');
select throws_ok($$insert into public.pases (ronda_id, disco_id, pasado_por, tarjetita)
  values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
          '00000000-0000-0000-0000-00000000000a', 'En nombre de otro')$$,
  '42501', null, 'Manu no puede pasar un disco en nombre de Facu');
select throws_ok($$insert into public.pases (ronda_id, disco_id, tarjetita)
  values ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', 'Colado')$$,
  '42501', null, 'Manu no puede pasar a una ronda donde no está');
select throws_ok($$insert into public.discos (deezer_id, titulo, artista) values (99, 'x', 'y')$$,
  '42501', null, 'desde la app no se guardan discos (lo hace la Edge Function)');
select throws_ok($$insert into public.rondas (nombre) values ('Ronda directa')$$,
  '42501', null, 'las rondas no se crean con insert directo');

-- Editar el pase de otro no toca nada
update public.pases set tarjetita = 'Hackeado' where id = '30000000-0000-0000-0000-000000000001';
reset role;
select is((select tarjetita from public.pases where id = '30000000-0000-0000-0000-000000000001'),
  'Para la noche', 'Manu no puede cambiar la tarjetita de Facu');

-- ─────────────────────────────────────────────────────────────
-- RN-01: notas ocultas hasta calificar
-- ─────────────────────────────────────────────────────────────
select pg_temp.como('00000000-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.calificaciones
            where pase_id = '30000000-0000-0000-0000-000000000001'), 0,
  'Manu no ve la nota de Eli antes de calificar');
select is((select count(*)::int from public.quienes_calificaron('30000000-0000-0000-0000-000000000001')), 1,
  'Manu sí ve que Eli calificó (sin la nota)');
select is((select escuchados from public.tablero where sigla = 'ELI'), 1,
  'el tablero cuenta lo escuchado por Eli aunque Manu no vea la nota');
select is((select deuda from public.tablero where sigla = 'MAN'), 1,
  'el tablero muestra la deuda de Manu');

select lives_ok($$insert into public.calificaciones (pase_id, puntaje)
  values ('30000000-0000-0000-0000-000000000001', 6)$$, 'Manu califica el disco de Facu');
select is((select count(*)::int from public.calificaciones
            where pase_id = '30000000-0000-0000-0000-000000000001'), 2,
  'después de calificar, Manu ve las notas de los demás');
select is((select pendientes from public.deuda_total), 0, 'la deuda de Manu baja a 0');
select is((select count(*)::int from public.deuda_total), 1, 'deuda_total devuelve solo la propia');

select throws_ok($$insert into public.calificaciones (pase_id, usuario_id, puntaje)
  select id, '00000000-0000-0000-0000-00000000000e', 10 from public.pases
   where pasado_por = '00000000-0000-0000-0000-00000000000b'$$,
  '42501', null, 'Manu no puede calificar en nombre de Eli');

-- RN-02: edito mi nota, no la de otros; nadie borra
update public.calificaciones set puntaje = 7
 where pase_id = '30000000-0000-0000-0000-000000000001' and usuario_id = '00000000-0000-0000-0000-00000000000b';
update public.calificaciones set puntaje = 1
 where pase_id = '30000000-0000-0000-0000-000000000001' and usuario_id = '00000000-0000-0000-0000-00000000000e';
delete from public.calificaciones where pase_id = '30000000-0000-0000-0000-000000000001';
reset role;
select is((select puntaje::int from public.calificaciones
            where usuario_id = '00000000-0000-0000-0000-00000000000b'), 7, 'Manu edita su propio puntaje');
select ok((select editada_en is not null from public.calificaciones
            where usuario_id = '00000000-0000-0000-0000-00000000000b'), 'la edición queda marcada');
select is((select puntaje::int from public.calificaciones
            where usuario_id = '00000000-0000-0000-0000-00000000000e'), 8, 'Manu no puede cambiar el puntaje de Eli');
select is((select count(*)::int from public.calificaciones), 2, 'nadie borra calificaciones desde la API');

-- El que pasó el disco ve todas las notas y su perfil
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.calificaciones), 2, 'Facu ve todas las notas de su disco');
select results_eq('select escucharon, promedio from public.lo_que_pasaste',
  $$values (2, 7.5::numeric)$$, 'lo_que_pasaste de Facu: 2 escucharon, promedio 7.5');
reset role;

select pg_temp.como('00000000-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.lo_que_pasaste), 1, 'lo_que_pasaste de Manu muestra solo su pase');

-- usuarios: cada uno edita solo su perfil
update public.usuarios set nombre = 'Cambiado' where id = '00000000-0000-0000-0000-00000000000a';
update public.usuarios set nombre = 'Manuel' where id = '00000000-0000-0000-0000-00000000000b';
reset role;
select is((select nombre from public.usuarios where id = '00000000-0000-0000-0000-00000000000a'), 'Facu',
  'Manu no puede cambiar el nombre de Facu');
select is((select nombre from public.usuarios where id = '00000000-0000-0000-0000-00000000000b'), 'Manuel',
  'Manu cambia su propio nombre');

select * from finish();
rollback;
