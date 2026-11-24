-- Cabina 86 · #120 · De una ronda solo se edita el nombre (pgTAP)
-- Correr con: npm run db:test  (necesita Supabase local: npm run db:start)
begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000f1', 'facu@test.com', '{"full_name":"Facu"}'),
  ('00000000-0000-0000-0000-0000000000f2', 'manu@test.com', '{"full_name":"Manu"}');
insert into public.rondas (id, nombre, codigo_invitacion, creada_por, creada_en) values
  ('10000000-0000-0000-0000-0000000000b1', 'Birrinhas do Sabado', 'AAAAAAAAA1', '00000000-0000-0000-0000-0000000000f1', now() - interval '3 days');
insert into public.miembros_ronda (ronda_id, usuario_id, sigla, se_unio_en) values
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', 'FAC', now() - interval '3 days'),
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f2', 'MAN', now() - interval '3 days' + interval '1 millisecond');

create function pg_temp.como(p_usuario uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

-- Escenario: Quien armó la ronda intenta mover la fecha de creación
select pg_temp.como('00000000-0000-0000-0000-0000000000f1');
select throws_ok(
  $$ update public.rondas set creada_en = now() where id = '10000000-0000-0000-0000-0000000000b1' $$,
  '42501', null,
  '#120: quien la armó no puede mover la fecha de creación (no reabre las 24 horas de RN-06)'
);
select throws_ok(
  $$ update public.rondas set codigo_invitacion = 'BBBBBBBBB2' where id = '10000000-0000-0000-0000-0000000000b1' $$,
  '42501', null,
  '#120: tampoco el código de invitación'
);
select throws_ok(
  $$ update public.rondas set tope_pendientes = 1 where id = '10000000-0000-0000-0000-0000000000b1' $$,
  '42501', null,
  '#120: tampoco el tope de pendientes'
);

-- Escenario: Cambiar el nombre sigue permitido
select lives_ok(
  $$ update public.rondas set nombre = 'Los del sábado' where id = '10000000-0000-0000-0000-0000000000b1' $$,
  '#120: quien la armó puede cambiar el nombre'
);
reset role;
select is((select nombre from public.rondas where id = '10000000-0000-0000-0000-0000000000b1'), 'Los del sábado', '#120: el nombre cambió');

-- Un integrante que no la armó no cambia nada (la política lo filtra)
select pg_temp.como('00000000-0000-0000-0000-0000000000f2');
update public.rondas set nombre = 'Me la quedo' where id = '10000000-0000-0000-0000-0000000000b1';
reset role;
select is((select nombre from public.rondas where id = '10000000-0000-0000-0000-0000000000b1'), 'Los del sábado', '#120: un integrante que no la armó no puede renombrarla');

select * from finish();
rollback;
