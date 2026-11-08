-- Cabina 86 · HU-02 · Entrar por un link de invitación (pgTAP)
-- Correr con: npm run db:test  (necesita Supabase local: npm run db:start)
begin;
create extension if not exists pgtap with schema extensions;

select plan(17);

-- Facu armó Birrinhas con Manu adentro; Maxi recibe el link.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000f1', 'facu@test.com', '{"full_name":"Facu Pérez"}'),
  ('00000000-0000-0000-0000-0000000000f2', 'manu@test.com', '{"full_name":"Manu"}'),
  ('00000000-0000-0000-0000-0000000000f3', 'maxi@test.com', '{"full_name":"Maxi R"}');

insert into public.rondas (id, nombre, codigo_invitacion, creada_por) values
  ('10000000-0000-0000-0000-0000000000b1', 'Birrinhas do Sabado', '3F9A2C1B7E', '00000000-0000-0000-0000-0000000000f1');
insert into public.miembros_ronda (ronda_id, usuario_id, sigla, se_unio_en) values
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', 'FAC', now() - interval '5 days'),
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f2', 'MAN', now() - interval '4 days');

-- Dos discos pasados antes de que llegue Maxi
insert into public.discos (id, deezer_id, titulo, artista, tapa_url) values
  ('20000000-0000-0000-0000-000000000001', 1, 'Artaud', 'Pescado Rabioso', 'https://e-cdns-images.dzcdn.net/artaud.jpg'),
  ('20000000-0000-0000-0000-000000000002', 2, 'Bocanada', 'Gustavo Cerati', null),
  ('20000000-0000-0000-0000-000000000003', 3, 'Kid A', 'Radiohead', null);
insert into public.pases (ronda_id, disco_id, pasado_por, tarjetita, creado_en) values
  ('10000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000f1', 'Tenés que escucharlo', now() - interval '3 days'),
  ('10000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f2', 'Un clásico', now() - interval '2 days');

create function pg_temp.como(p_usuario uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

-- Escenario: Me sumo a una ronda → "Te invitaron" sin sesión
select set_config('request.jwt.claims', '', true);
set local role anon;

select is(public.ver_invitacion('3F9A2C1B7E') ->> 'nombre', 'Birrinhas do Sabado', 'HU-02: sin sesión veo el nombre de la ronda');
select is(public.ver_invitacion('3F9A2C1B7E') ->> 'invito', 'Facu Pérez', 'HU-02: veo quién me invitó (quien creó la ronda)');
select is(
  (select jsonb_agg(i ->> 'nombre') from jsonb_array_elements(public.ver_invitacion('3F9A2C1B7E') -> 'integrantes') i),
  '["Facu Pérez", "Manu"]'::jsonb,
  'HU-02: veo quiénes están, en el orden en que se sumaron'
);
select is((public.ver_invitacion('3F9A2C1B7E') ->> 'discos_pasados')::int, 2, 'Te invitaron: cuántos discos se pasaron en la ronda');
select is(public.ver_invitacion('3F9A2C1B7E') -> 'ultimos_discos' -> 0 ->> 'titulo', 'Artaud', 'Te invitaron: los últimos discos, el más reciente primero');
select is(public.ver_invitacion(' 3f9a2c1b7e ') ->> 'nombre', 'Birrinhas do Sabado', 'El código sirve en minúscula y con espacios');
select is(public.ver_invitacion('NOEXISTE00'), null, 'Link inválido: ver_invitacion devuelve null');
select throws_ok($$select public.sumarse_a_ronda('3F9A2C1B7E')$$, '42501', null, 'Sin sesión no se puede sumar');
select throws_ok($$select * from public.rondas$$, '42501', null, 'Sin sesión no se leen las rondas directo (solo con el código)');

-- Maxi entra con Google y se suma
select pg_temp.como('00000000-0000-0000-0000-0000000000f3');
select is(public.sumarse_a_ronda('3F9A2C1B7E'), '10000000-0000-0000-0000-0000000000b1'::uuid, 'HU-02: me sumo y devuelve la ronda');
select is(
  (select sigla from public.miembros_ronda where usuario_id = auth.uid()),
  'MAX',
  'HU-02: quedo como integrante con mi sigla'
);

-- Escenario: No heredo discos anteriores (RN-06)
select is(
  (select pendientes from public.deuda where usuario_id = auth.uid() and ronda_id = '10000000-0000-0000-0000-0000000000b1'),
  0,
  'RN-06: los discos pasados antes de sumarme no son pendientes (deuda 00)'
);

reset role;
insert into public.pases (ronda_id, disco_id, pasado_por, tarjetita, creado_en) values
  ('10000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000f2', 'Para Maxi', now() + interval '1 minute');
select pg_temp.como('00000000-0000-0000-0000-0000000000f3');
select is(
  (select pendientes from public.deuda where usuario_id = auth.uid() and ronda_id = '10000000-0000-0000-0000-0000000000b1'),
  1,
  'RN-06: lo que se pasa después de sumarme sí me llega'
);

-- Los demás me ven
select pg_temp.como('00000000-0000-0000-0000-0000000000f1');
select ok(
  exists(select 1 from public.miembros_ronda where ronda_id = '10000000-0000-0000-0000-0000000000b1' and usuario_id = '00000000-0000-0000-0000-0000000000f3'),
  'HU-02: los demás integrantes me ven en la ronda'
);

-- Escenario: Ya soy integrante → no se duplica ni cambia cuándo me sumé
reset role;
update public.miembros_ronda set ultima_entrada = now() - interval '1 day'
 where usuario_id = '00000000-0000-0000-0000-0000000000f1';
select pg_temp.como('00000000-0000-0000-0000-0000000000f1');
select public.sumarse_a_ronda('3F9A2C1B7E');
select results_eq(
  $$select count(*)::int, min(se_unio_en) < now() - interval '4 days', max(ultima_entrada) = now()
      from public.miembros_ronda where usuario_id = auth.uid()$$,
  $$values (1, true, true)$$,
  'Ya soy integrante: no se duplica, no cambia cuándo me sumé y queda como última entrada'
);

-- Escenario: Link inválido
select throws_ok($$select public.sumarse_a_ronda('NOEXISTE00')$$, 'P0002', null, 'Link inválido: sumarse_a_ronda avisa que no existe');

-- La sigla no choca con la de alguien que ya está
reset role;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000f4', 'otromax@test.com', '{"full_name":"Maximiliano"}');
select pg_temp.como('00000000-0000-0000-0000-0000000000f4');
select public.sumarse_a_ronda('3F9A2C1B7E');
select is((select sigla from public.miembros_ronda where usuario_id = auth.uid()), 'MAX2', 'S-02: si MAX ya está, el nuevo queda MAX2');

select * from finish();
rollback;
