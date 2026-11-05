-- Cabina 86 · T-08 · El latido responde sin login y no expone datos
begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

select function_returns('public', 'latido', array[]::text[], 'timestamp with time zone',
  'latido() devuelve solo la hora');

set local role anon;
select lives_ok('select public.latido()', 'anon puede llamar a latido()');
select throws_ok('select * from public.usuarios', '42501', null, 'anon sigue sin leer tablas');
reset role;

select * from finish();
rollback;
