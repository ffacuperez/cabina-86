-- Cabina 86 · HU-01 · Primer ingreso con Google (pgTAP)
-- "Entonces se crea mi usuario con el nombre y la foto de Google"
-- Correr con: npm run db:test  (necesita Supabase local: npm run db:start)
begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

-- Google manda full_name y avatar_url; algunas cuentas solo name y picture.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000f1', 'facu@test.com',
   '{"full_name":"Facu Pérez","avatar_url":"https://lh3.googleusercontent.com/a/facu"}'),
  ('00000000-0000-0000-0000-0000000000f2', 'manu@test.com',
   '{"name":"Manu","picture":"https://lh3.googleusercontent.com/a/manu"}'),
  ('00000000-0000-0000-0000-0000000000f3', 'maxi.r@test.com', '{"full_name":"   "}');

select results_eq(
  $$select nombre, foto_url from public.usuarios where id = '00000000-0000-0000-0000-0000000000f1'$$,
  $$values ('Facu Pérez'::text, 'https://lh3.googleusercontent.com/a/facu'::text)$$,
  'HU-01: el primer ingreso crea el usuario con el nombre y la foto de Google'
);

select results_eq(
  $$select nombre, foto_url from public.usuarios where id = '00000000-0000-0000-0000-0000000000f2'$$,
  $$values ('Manu'::text, 'https://lh3.googleusercontent.com/a/manu'::text)$$,
  'HU-01: si Google manda name y picture, también se usan'
);

select results_eq(
  $$select nombre, foto_url from public.usuarios where id = '00000000-0000-0000-0000-0000000000f3'$$,
  $$values ('maxi.r'::text, null::text)$$,
  'HU-01: sin nombre ni foto, el nombre sale del mail'
);

select is(
  (select count(*)::int from public.miembros_ronda where usuario_id = '00000000-0000-0000-0000-0000000000f1'),
  0,
  'HU-01: entrar sin link no suma a ninguna ronda (la app muestra "Armá la ronda")'
);

-- Lo que lee la app al entrar, con los permisos de quien entró
create function pg_temp.como(p_usuario uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

select pg_temp.como('00000000-0000-0000-0000-0000000000f1');

select results_eq(
  $$select nombre from public.usuarios where id = auth.uid()$$,
  $$values ('Facu Pérez'::text)$$,
  'HU-01: quien entró lee su propio perfil para el saludo'
);

select is(
  (select count(*)::int from public.miembros_ronda where usuario_id = auth.uid()),
  0,
  'HU-01: quien entró por primera vez no tiene rondas'
);

select is(
  (select count(*)::int from public.usuarios where id <> auth.uid()),
  0,
  'HU-01: sin rondas en común no ve el perfil de otros'
);

select * from finish();
rollback;
