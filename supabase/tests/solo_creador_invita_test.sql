-- Cabina 86 · #52 · Solo quien creó la ronda invita (pgTAP)
-- Correr con: npm run db:test  (necesita Supabase local: npm run db:start)
begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

-- Facu armó Birrinhas (con Maxi adentro); Agus armó Los de Sistemas (con Facu adentro).
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'facu@test.com', '{"full_name":"Facu Pérez"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'maxi@test.com', '{"full_name":"Maxi"}'),
  ('00000000-0000-0000-0000-0000000000a3', 'agus@test.com', '{"full_name":"Agus"}');

insert into public.rondas (id, nombre, codigo_invitacion, creada_por) values
  ('10000000-0000-0000-0000-0000000000c1', 'Birrinhas do Sabado', 'AAAA111111', '00000000-0000-0000-0000-0000000000a1'),
  ('10000000-0000-0000-0000-0000000000c2', 'Los de Sistemas',     'BBBB222222', '00000000-0000-0000-0000-0000000000a3');
insert into public.miembros_ronda (ronda_id, usuario_id, sigla) values
  ('10000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'FAC'),
  ('10000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', 'MAX'),
  ('10000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a3', 'AGU'),
  ('10000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a1', 'FAC');

create function pg_temp.como(p_usuario uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

-- Facu: integrante de las dos, creador de una
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
select results_eq(
  'select ronda_id, codigo from public.mis_codigos_de_invitacion()',
  $$values ('10000000-0000-0000-0000-0000000000c1'::uuid, 'AAAA111111'::text)$$,
  'Facu obtiene el link solo de la ronda que creó');
select throws_ok('select codigo_invitacion from public.rondas', '42501', null,
  'los integrantes no leen el código de la ronda');
select throws_ok('select * from public.rondas', '42501', null,
  'select * tampoco trae el código');
select results_eq('select nombre from public.rondas order by nombre',
  $$values ('Birrinhas do Sabado'::text), ('Los de Sistemas'::text)$$,
  'sigue viendo sus rondas');
select is((select creada_por from public.rondas where id = '10000000-0000-0000-0000-0000000000c2'),
  '00000000-0000-0000-0000-0000000000a3'::uuid, 've quién creó cada ronda');
reset role;

-- Maxi: integrante, no creó nada
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
select is((select count(*)::int from public.mis_codigos_de_invitacion()), 0,
  'Maxi no obtiene el link de una ronda que no creó');
select throws_ok('select codigo_invitacion from public.rondas', '42501', null,
  'Maxi no lee el código de Birrinhas');
reset role;

-- Agus: la suya
select pg_temp.como('00000000-0000-0000-0000-0000000000a3');
select results_eq('select codigo from public.mis_codigos_de_invitacion()', $$values ('BBBB222222'::text)$$,
  'Agus obtiene el link de Los de Sistemas');
reset role;

-- Sin sesión no hay códigos
select set_config('request.jwt.claims', '', true);
set local role anon;
select throws_ok('select * from public.mis_codigos_de_invitacion()', '42501', null,
  'anon no puede pedir códigos');
reset role;

-- Crear una ronda sigue devolviendo su link a quien la crea
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
select isnt((select codigo_invitacion from public.crear_ronda('La de Maxi')), null,
  'crear_ronda le devuelve el código a quien la crea');
reset role;

select * from finish();
rollback;
