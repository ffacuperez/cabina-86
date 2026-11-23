-- Cabina 86 · #115 · RN-06 con 24 horas de tolerancia (pgTAP)
-- Correr con: npm run db:test  (necesita Supabase local: npm run db:start)
begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000f1', 'facu@test.com', '{"full_name":"Facu"}'),
  ('00000000-0000-0000-0000-0000000000f2', 'manu@test.com', '{"full_name":"Manu"}'),
  ('00000000-0000-0000-0000-0000000000f3', 'maxi@test.com', '{"full_name":"Maxi"}'),
  ('00000000-0000-0000-0000-0000000000f4', 'joa@test.com',  '{"full_name":"Joa"}'),
  ('00000000-0000-0000-0000-0000000000f5', 'nico@test.com', '{"full_name":"Nico"}');

-- Birrinhas: Facu la armó hace 2 horas, Manu se sumó y ya se pasaron dos discos.
-- Viejos: la armó Facu hace 3 días, con un disco de hace 2 días.
insert into public.rondas (id, nombre, codigo_invitacion, creada_por, creada_en) values
  ('10000000-0000-0000-0000-0000000000b1', 'Birrinhas do Sabado', 'AAAAAAAAA1', '00000000-0000-0000-0000-0000000000f1', now() - interval '2 hours'),
  ('10000000-0000-0000-0000-0000000000b2', 'Los viejos',          'AAAAAAAAA2', '00000000-0000-0000-0000-0000000000f1', now() - interval '3 days');
insert into public.miembros_ronda (ronda_id, usuario_id, sigla, se_unio_en) values
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', 'FAC', now() - interval '2 hours'),
  ('10000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000f1', 'FAC', now() - interval '3 days');

create function pg_temp.como(p_usuario uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

-- Manu se suma con el link antes de que se pase nada
select pg_temp.como('00000000-0000-0000-0000-0000000000f2');
select public.sumarse_a_ronda('AAAAAAAAA1');
reset role;

insert into public.discos (id, deezer_id, titulo, artista) values
  ('20000000-0000-0000-0000-000000000001', 1, 'Artaud', 'Pescado Rabioso'),
  ('20000000-0000-0000-0000-000000000002', 2, 'Bocanada', 'Gustavo Cerati'),
  ('20000000-0000-0000-0000-000000000003', 3, 'Kid A', 'Radiohead');
insert into public.pases (ronda_id, disco_id, pasado_por, tarjetita, creado_en) values
  ('10000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f1', 'Un clásico', now() - interval '90 minutes'),
  ('10000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000f2', 'Escuchalo', now() - interval '60 minutes'),
  ('10000000-0000-0000-0000-0000000000b2', '20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000f1', 'Viejo',     now() - interval '2 days');

-- Escenario: Me sumo en las primeras 24 horas → heredo lo que ya se pasó
select pg_temp.como('00000000-0000-0000-0000-0000000000f3');
select public.sumarse_a_ronda('AAAAAAAAA1');
select is(
  (select pendientes from public.deuda where usuario_id = auth.uid() and ronda_id = '10000000-0000-0000-0000-0000000000b1'),
  2,
  'RN-06: si me sumo antes de las 24 horas, los dos discos que ya se pasaron me quedan pendientes'
);
select ok(
  (select se_unio_en from public.miembros_ronda where usuario_id = auth.uid() and ronda_id = '10000000-0000-0000-0000-0000000000b1')
    < (select min(creado_en) from public.pases where ronda_id = '10000000-0000-0000-0000-0000000000b1'),
  'RN-06: el exhibidor me muestra todo lo pasado (se_unio_en queda antes del primer disco)'
);

-- Escenario: Otro que se suma a tiempo también hereda, y el orden de llegada se mantiene
select pg_temp.como('00000000-0000-0000-0000-0000000000f4');
select public.sumarse_a_ronda('AAAAAAAAA1');
select is(
  (select pendientes from public.deuda where usuario_id = auth.uid() and ronda_id = '10000000-0000-0000-0000-0000000000b1'),
  2,
  'RN-06: Joa, que también llega a tiempo, debe los dos discos'
);
select is(
  (select array_agg(sigla order by se_unio_en) from public.miembros_ronda where ronda_id = '10000000-0000-0000-0000-0000000000b1'),
  array['FAC', 'MAN', 'MAX', 'JOA'],
  'Orden de llegada: quien la armó primero y después cada uno en el orden en que se sumó'
);

-- Escenario: Lo que se pasa después me llega igual
reset role;
insert into public.discos (id, deezer_id, titulo, artista) values ('20000000-0000-0000-0000-000000000004', 4, 'Clics modernos', 'Charly García');
insert into public.pases (ronda_id, disco_id, pasado_por, tarjetita) values
  ('10000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000f1', 'Para todos');
select pg_temp.como('00000000-0000-0000-0000-0000000000f3');
select is(
  (select pendientes from public.deuda where usuario_id = auth.uid() and ronda_id = '10000000-0000-0000-0000-0000000000b1'),
  3,
  'RN-06: lo que se pasa después de sumarme también me llega'
);

-- Escenario: Abrir el link de nuevo no cambia desde cuándo me cuentan
select public.sumarse_a_ronda('AAAAAAAAA1');
select is(
  (select count(*)::int from public.miembros_ronda where usuario_id = auth.uid() and ronda_id = '10000000-0000-0000-0000-0000000000b1'),
  1,
  'Ya soy integrante: abrir el link otra vez no me duplica'
);
select is(
  (select pendientes from public.deuda where usuario_id = auth.uid() and ronda_id = '10000000-0000-0000-0000-0000000000b1'),
  3,
  'Ya soy integrante: sigo debiendo lo mismo'
);

-- Escenario: Me sumo pasadas las 24 horas → arranco de cero
select pg_temp.como('00000000-0000-0000-0000-0000000000f5');
select public.sumarse_a_ronda('AAAAAAAAA2');
select is(
  (select pendientes from public.deuda where usuario_id = auth.uid() and ronda_id = '10000000-0000-0000-0000-0000000000b2'),
  0,
  'RN-06: pasadas las 24 horas, lo que ya se pasó no me queda pendiente'
);
select ok(
  (select se_unio_en from public.miembros_ronda where usuario_id = auth.uid() and ronda_id = '10000000-0000-0000-0000-0000000000b2')
    >= now(),
  'RN-06: pasadas las 24 horas, me cuentan desde que me sumé'
);

-- Quien pasa no debe su propio disco aunque herede
select pg_temp.como('00000000-0000-0000-0000-0000000000f2');
select is(
  (select pendientes from public.deuda where usuario_id = auth.uid() and ronda_id = '10000000-0000-0000-0000-0000000000b1'),
  2,
  'Manu debe Artaud y Clics modernos, no Bocanada, que lo pasó él'
);

select * from finish();
rollback;
