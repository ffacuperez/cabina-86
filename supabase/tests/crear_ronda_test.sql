-- Cabina 86 · HU-03 · Crear una ronda (pgTAP)
-- Correr con: npm run db:test  (necesita Supabase local: npm run db:start)
begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000f1', 'facu@test.com',  '{"full_name":"Facundo Pérez"}'),
  ('00000000-0000-0000-0000-0000000000f2', 'angel@test.com', '{"full_name":"Ángel Ñúñez"}'),
  ('00000000-0000-0000-0000-0000000000f3', 'otro@test.com',  '{"full_name":"Facu Otro"}'),
  ('00000000-0000-0000-0000-0000000000f4', 'x@test.com',     '{"full_name":"X"}');

create function pg_temp.como(p_usuario uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create table pg_temp.creadas (n integer, id uuid, codigo text);
grant all on pg_temp.creadas to authenticated;

select pg_temp.como('00000000-0000-0000-0000-0000000000f1');

-- Escenario: Creo una ronda
insert into pg_temp.creadas
  select 1, r.id, r.codigo_invitacion from public.crear_ronda('  BIRRINHAS DO SABADO  ') r;

select results_eq(
  $$select usuario_id from public.miembros_ronda where ronda_id = (select id from pg_temp.creadas where n = 1)$$,
  $$values ('00000000-0000-0000-0000-0000000000f1'::uuid)$$,
  'HU-03: se crea la ronda conmigo como único integrante'
);
select is(
  (select nombre from public.rondas where id = (select id from pg_temp.creadas where n = 1)),
  'BIRRINHAS DO SABADO',
  'HU-03: el nombre se guarda sin espacios de más'
);
select matches(
  (select codigo from pg_temp.creadas where n = 1),
  '^[0-9A-F]{10}$',
  'HU-03: se genera un código de invitación para el link'
);
select is(
  (select sigla from public.miembros_ronda where ronda_id = (select id from pg_temp.creadas where n = 1)),
  'FAC',
  'S-02: la sigla son las 3 primeras letras del nombre'
);
select is(
  (select creada_por from public.rondas where id = (select id from pg_temp.creadas where n = 1)),
  '00000000-0000-0000-0000-0000000000f1'::uuid,
  'HU-03: la ronda queda creada por quien la armó'
);

-- Escenario: Nombre vacío
select throws_ok($$select public.crear_ronda('   ')$$, '23514', null, 'HU-03: no se puede crear con el nombre vacío');
select throws_ok($$select public.crear_ronda(repeat('A', 41))$$, '23514', null, 'HU-03: el nombre tiene hasta 40 caracteres');

-- Escenario: Puedo tener varias rondas
-- (en la prueba todo pasa en la misma transacción: la primera ronda se corre una hora para atrás)
reset role;
update public.miembros_ronda set ultima_entrada = now() - interval '1 hour', se_unio_en = now() - interval '1 hour'
 where ronda_id = (select id from pg_temp.creadas where n = 1);
select pg_temp.como('00000000-0000-0000-0000-0000000000f1');
insert into pg_temp.creadas
  select 2, r.id, r.codigo_invitacion from public.crear_ronda('Los de Sistemas') r;
select is(
  (select count(*)::int from public.miembros_ronda where usuario_id = auth.uid()),
  2,
  'HU-03: puedo estar en varias rondas'
);
select is(
  (select r.nombre from public.miembros_ronda m join public.rondas r on r.id = m.ronda_id
    where m.usuario_id = auth.uid() order by m.ultima_entrada desc, m.se_unio_en desc limit 1),
  'Los de Sistemas',
  'HU-03: la ronda recién creada es la última en la que entré'
);

-- Directo a las tablas no: solo con crear_ronda
select throws_ok(
  $$insert into public.rondas (nombre) values ('Por atrás')$$,
  '42501', null,
  'No se puede crear una ronda sin crear_ronda'
);

-- Siglas: tildes, nombres cortos y repetidas
select pg_temp.como('00000000-0000-0000-0000-0000000000f2');
insert into pg_temp.creadas select 3, r.id, r.codigo_invitacion from public.crear_ronda('Con tildes') r;
select is(
  (select sigla from public.miembros_ronda where usuario_id = auth.uid()),
  'ANG',
  'S-02: la sigla saca las tildes (Ángel → ANG)'
);

select pg_temp.como('00000000-0000-0000-0000-0000000000f4');
insert into pg_temp.creadas select 4, r.id, r.codigo_invitacion from public.crear_ronda('Corta') r;
select is(
  (select sigla from public.miembros_ronda where usuario_id = auth.uid()),
  'YO',
  'S-02: con un nombre de una letra la sigla es YO'
);

reset role;
select is(
  public.sigla_para('00000000-0000-0000-0000-0000000000f3', (select id from pg_temp.creadas where n = 1)),
  'FAC2',
  'S-02: si la sigla ya está en la ronda, sigue con FAC2'
);

-- Sin login no se puede
select set_config('request.jwt.claims', '', true);
set local role anon;
select throws_ok($$select public.crear_ronda('Anónima')$$, '42501', null, 'HU-03: anon no puede crear rondas');

select * from finish();
rollback;
