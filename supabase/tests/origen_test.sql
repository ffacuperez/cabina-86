-- Cabina 86 · #135 · De dónde llega la gente (pgTAP)
-- Correr con: npm run db:test  (necesita Supabase local: npm run db:start)
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'nueva@test.com', '{"full_name":"Nueva"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'vieja@test.com', '{"full_name":"Vieja"}');
update public.usuarios set creado_en = now() - interval '3 days' where id = '00000000-0000-0000-0000-0000000000a2';

create function pg_temp.como(p_usuario uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

-- Escenario: una cuenta nueva llega desde TikTok
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
select is(public.anotar_origen('TikTok'), true, '#135: a una cuenta nueva se le anota el origen (en minúscula)');
select is(public.anotar_origen('ig'), false, '#135: vale el primero; otro link después no lo cambia');
select is(public.anotar_origen('<script>'), false, '#135: un origen raro no se anota');
select is((public.crear_ronda('La ronda nueva')).nombre, 'La ronda nueva', 'arma su ronda como siempre');
select throws_ok($$ select origen from public.rondas $$, '42501', null, '#135: la app no ve el origen de las rondas');
select throws_ok($$ select * from public.origenes $$, '42501', null, '#135: ni la tabla de orígenes');

-- Escenario: alguien que ya usaba la app entra por un link con ref
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
select is(public.anotar_origen('tiktok'), false, '#135: a una cuenta de antes no se le anota (no ensucia las métricas)');

reset role;
select is((select origen from public.origenes where usuario_id = '00000000-0000-0000-0000-0000000000a1'), 'tiktok', 'quedó tiktok');
select is((select origen from public.rondas where nombre = 'La ronda nueva'), 'tiktok', '#135: la ronda queda con el origen de quien la armó');

select * from finish();
rollback;
