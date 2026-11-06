-- Cabina 86 · Última ronda en la que entraste y columnas editables de miembros_ronda (pgTAP)
-- Correr con: npm run db:test  (necesita Supabase local: npm run db:start)
begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

-- Ana está en dos rondas; Beto en otra.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@test.com',  '{"full_name":"Ana"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'beto@test.com', '{"full_name":"Beto"}');

insert into public.rondas (id, nombre, creada_por) values
  ('10000000-0000-0000-0000-0000000000a1', 'Primera', '00000000-0000-0000-0000-0000000000a1'),
  ('10000000-0000-0000-0000-0000000000a2', 'Segunda', '00000000-0000-0000-0000-0000000000a1'),
  ('10000000-0000-0000-0000-0000000000b1', 'De Beto', '00000000-0000-0000-0000-0000000000b1');

insert into public.miembros_ronda (ronda_id, usuario_id, sigla, se_unio_en, ultima_entrada) values
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'ANA', now() - interval '3 days', now() - interval '3 days'),
  ('10000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1', 'ANA', now() - interval '2 days', now() - interval '2 days'),
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'BET', now() - interval '3 days', now() - interval '3 days');

create function pg_temp.como(p_usuario uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

select pg_temp.como('00000000-0000-0000-0000-0000000000a1');

-- Entrar a la primera la vuelve la última en la que entré
select lives_ok(
  $$select public.entrar_a_ronda('10000000-0000-0000-0000-0000000000a1')$$,
  'entrar_a_ronda: un integrante registra su entrada'
);
select is(
  (select r.nombre from public.miembros_ronda m join public.rondas r on r.id = m.ronda_id
    where m.usuario_id = auth.uid() order by m.ultima_entrada desc limit 1),
  'Primera',
  'Mis rondas: la última ronda en la que entraste queda primera por ultima_entrada'
);

-- En una ronda ajena no hace nada
select public.entrar_a_ronda('10000000-0000-0000-0000-0000000000b1');
reset role;
select is(
  (select ultima_entrada < now() - interval '1 day' from public.miembros_ronda
    where usuario_id = '00000000-0000-0000-0000-0000000000b1'),
  true,
  'entrar_a_ronda: en una ronda ajena no cambia nada'
);

select pg_temp.como('00000000-0000-0000-0000-0000000000a1');

-- RN-06: no se puede correr la fecha de ingreso para borrarse la deuda
select throws_ok(
  $$update public.miembros_ronda set se_unio_en = now() where usuario_id = auth.uid()$$,
  '42501', null,
  'RN-06: un integrante no puede cambiar su se_unio_en'
);
select throws_ok(
  $$update public.miembros_ronda set ultima_entrada = now() + interval '1 year' where usuario_id = auth.uid()$$,
  '42501', null,
  'ultima_entrada solo se cambia con entrar_a_ronda'
);
select throws_ok(
  $$update public.miembros_ronda set ronda_id = '10000000-0000-0000-0000-0000000000b1' where usuario_id = auth.uid()$$,
  '42501', null,
  'Un integrante no puede mudar su fila a otra ronda'
);

-- La sigla se sigue pudiendo cambiar
select lives_ok(
  $$update public.miembros_ronda set sigla = 'ANI' where usuario_id = auth.uid() and ronda_id = '10000000-0000-0000-0000-0000000000a1'$$,
  'Un integrante puede cambiar su sigla'
);

-- Sin login no se puede llamar
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;
select throws_ok(
  $$select public.entrar_a_ronda('10000000-0000-0000-0000-0000000000a1')$$,
  '42501', null,
  'entrar_a_ronda: anon no la puede usar'
);

select * from finish();
rollback;
