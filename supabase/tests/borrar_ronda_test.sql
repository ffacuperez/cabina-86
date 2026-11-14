-- Cabina 86 · #105 · Borrar una ronda (pgTAP)
-- Correr con: npm run db:test  (necesita Supabase local: npm run db:start)
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

-- Facu armó Birrinhas (con Maxi adentro, un pase y una nota); Agus armó Los de Sistemas (con Facu adentro).
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'facu@test.com', '{"full_name":"Facu Pérez"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'maxi@test.com', '{"full_name":"Maxi"}'),
  ('00000000-0000-0000-0000-0000000000a3', 'agus@test.com', '{"full_name":"Agus"}');

insert into public.rondas (id, nombre, codigo_invitacion, creada_por) values
  ('10000000-0000-0000-0000-0000000000c1', 'Birrinhas do Sabado', 'AAAA111111', '00000000-0000-0000-0000-0000000000a1'),
  ('10000000-0000-0000-0000-0000000000c2', 'Los de Sistemas',     'BBBB222222', '00000000-0000-0000-0000-0000000000a3');
insert into public.miembros_ronda (ronda_id, usuario_id, sigla, se_unio_en) values
  ('10000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'FAC', now() - interval '2 days'),
  ('10000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', 'MAX', now() - interval '2 days'),
  ('10000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a3', 'AGU', now() - interval '2 days'),
  ('10000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a1', 'FAC', now() - interval '2 days');

insert into public.discos (id, deezer_id, titulo, artista)
values ('20000000-0000-0000-0000-0000000000d1', 1, 'Artaud', 'Pescado Rabioso');
insert into public.pases (id, ronda_id, disco_id, pasado_por, tarjetita) values
  ('30000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-0000000000c1',
   '20000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a1', 'Escuchalo entero');
insert into public.calificaciones (pase_id, usuario_id, puntaje) values
  ('30000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a2', 9);

-- Un delete directo puede fallar por permisos o no borrar nada por RLS: en los dos casos, la ronda queda.
create function pg_temp.intentar_borrar(p_ronda uuid) returns void language plpgsql as $$
begin
  delete from public.rondas where id = p_ronda;
exception when insufficient_privilege then
  null;
end $$;

create function pg_temp.como(p_usuario uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

-- Sin sesión
select set_config('request.jwt.claims', '', true);
set local role anon;
select throws_ok($$select public.borrar_ronda('10000000-0000-0000-0000-0000000000c1', 'Birrinhas do Sabado')$$,
  '42501', null, 'anon no puede borrar rondas');
reset role;

-- Maxi está en Birrinhas pero no la armó
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
select throws_ok($$select public.borrar_ronda('10000000-0000-0000-0000-0000000000c1', 'Birrinhas do Sabado')$$,
  '42501', null, 'un integrante que no la armó no la puede borrar');
select lives_ok($$select pg_temp.intentar_borrar('10000000-0000-0000-0000-0000000000c1')$$,
  'Maxi intenta un delete directo...');
reset role;
select is((select count(*)::int from public.rondas where id = '10000000-0000-0000-0000-0000000000c1'), 1,
  '...y la ronda sigue ahí (no hay política de delete)');

-- Facu no armó Los de Sistemas
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$select public.borrar_ronda('10000000-0000-0000-0000-0000000000c2', 'Los de Sistemas')$$,
  '42501', null, 'Facu no puede borrar una ronda que armó otro');
select throws_ok($$select public.borrar_ronda('10000000-0000-0000-0000-0000000000ff', 'Cualquiera')$$,
  '42501', null, 'una ronda que no existe responde igual que una ajena');

-- El nombre tiene que coincidir
select throws_ok($$select public.borrar_ronda('10000000-0000-0000-0000-0000000000c1', 'Birrinhas')$$,
  '22023', null, 'con otro nombre no la borra');

-- Mayúsculas y espacios de los costados no importan
select lives_ok($$select public.borrar_ronda('10000000-0000-0000-0000-0000000000c1', '  BIRRINHAS DO SABADO ')$$,
  'Facu borra Birrinhas escribiendo el nombre');
reset role;

select is((select count(*)::int from public.rondas where id = '10000000-0000-0000-0000-0000000000c1'), 0,
  'la ronda ya no está');
select is((select count(*)::int from public.miembros_ronda where ronda_id = '10000000-0000-0000-0000-0000000000c1')
        + (select count(*)::int from public.pases where ronda_id = '10000000-0000-0000-0000-0000000000c1')
        + (select count(*)::int from public.calificaciones where pase_id = '30000000-0000-0000-0000-0000000000e1'), 0,
  'se fueron sus integrantes, pases y notas');
select is((select count(*)::int from public.discos where id = '20000000-0000-0000-0000-0000000000d1'), 1,
  'el disco queda (es compartido entre rondas)');
select is((select count(*)::int from public.miembros_ronda where ronda_id = '10000000-0000-0000-0000-0000000000c2'), 2,
  'las otras rondas no se tocan');

select * from finish();
rollback;
