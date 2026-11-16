-- Cabina 86 · HU-19 · El resumen de cada pasillo (pgTAP)
-- Correr con: npm run db:test  (necesita Supabase local: npm run db:start)
begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

-- Birrinhas con Facu y Maxi; Los de Sistemas solo con Agus.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000019a1', 'facu@res.com', '{"full_name":"Facu"}'),
  ('00000000-0000-0000-0000-0000000019a2', 'maxi@res.com', '{"full_name":"Maxi"}'),
  ('00000000-0000-0000-0000-0000000019a3', 'agus@res.com', '{"full_name":"Agus"}');
insert into public.rondas (id, nombre, creada_por) values
  ('10000000-0000-0000-0000-0000000019c1', 'Birrinhas', '00000000-0000-0000-0000-0000000019a1'),
  ('10000000-0000-0000-0000-0000000019c2', 'Sistemas',  '00000000-0000-0000-0000-0000000019a3');
insert into public.miembros_ronda (ronda_id, usuario_id, sigla) values
  ('10000000-0000-0000-0000-0000000019c1', '00000000-0000-0000-0000-0000000019a1', 'FAC'),
  ('10000000-0000-0000-0000-0000000019c1', '00000000-0000-0000-0000-0000000019a2', 'MAX'),
  ('10000000-0000-0000-0000-0000000019c2', '00000000-0000-0000-0000-0000000019a3', 'AGU');

-- La función escribe con la clave secreta (acá, como postgres)
insert into public.resumenes_pasillo (ronda_id, pasado_por, texto, tanda_hasta, generado_en) values
  ('10000000-0000-0000-0000-0000000019c1', '00000000-0000-0000-0000-0000000019a2', 'Maxi viene en modo rock nacional.', now(), now());

create function pg_temp.como(p_usuario uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

select pg_temp.como('00000000-0000-0000-0000-0000000019a1');
select is(
  (select texto from public.resumenes_pasillo where pasado_por = '00000000-0000-0000-0000-0000000019a2'),
  'Maxi viene en modo rock nacional.',
  'HU-19: Facu ve el resumen del pasillo de Maxi'
);
select throws_ok(
  $$insert into public.resumenes_pasillo (ronda_id, pasado_por, texto, tanda_hasta)
    values ('10000000-0000-0000-0000-0000000019c1', '00000000-0000-0000-0000-0000000019a1', 'Me lo escribo yo', now())$$,
  '42501', null,
  'Desde la app no se escribe un resumen: lo escribe solo la función'
);
select throws_ok(
  $$update public.resumenes_pasillo set texto = 'cambiado'$$,
  '42501', null,
  'Ni se edita'
);
select throws_ok(
  $$delete from public.resumenes_pasillo$$,
  '42501', null,
  'Ni se borra'
);

select pg_temp.como('00000000-0000-0000-0000-0000000019a3');
select is(
  (select count(*)::int from public.resumenes_pasillo where ronda_id = '10000000-0000-0000-0000-0000000019c1'),
  0,
  'RN-05: Agus no está en Birrinhas y no ve sus resúmenes'
);

-- Si se borra la ronda, el resumen se va en cascada (#105)
reset role;
delete from public.rondas where id = '10000000-0000-0000-0000-0000000019c1';
select is(
  (select count(*)::int from public.resumenes_pasillo where ronda_id = '10000000-0000-0000-0000-0000000019c1'),
  0,
  'Al borrar la ronda se borran sus resúmenes'
);
select throws_ok(
  $$insert into public.resumenes_pasillo (ronda_id, pasado_por, texto, tanda_hasta)
    values ('10000000-0000-0000-0000-0000000019c2', '00000000-0000-0000-0000-0000000019a1', 'x', now())$$,
  '23503', null,
  'Solo hay resumen de alguien que está en la ronda'
);

select * from finish();
rollback;
