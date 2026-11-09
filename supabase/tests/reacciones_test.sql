-- Cabina 86 · HU-14 · Reacciones de la calificación (pgTAP)
-- Correr con: npm run db:test  (necesita Supabase local: npm run db:start)
begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

-- Ronda con Facu (pasa) y Manu (califica)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000001aa', 'facu@reac.com', '{"full_name":"Facu"}'),
  ('00000000-0000-0000-0000-0000000001bb', 'manu@reac.com', '{"full_name":"Manu"}');
insert into public.rondas (id, nombre, creada_por) values
  ('10000000-0000-0000-0000-0000000001aa', 'Reacciones', '00000000-0000-0000-0000-0000000001aa');
insert into public.miembros_ronda (ronda_id, usuario_id, sigla, se_unio_en) values
  ('10000000-0000-0000-0000-0000000001aa', '00000000-0000-0000-0000-0000000001aa', 'FAC', now() - interval '1 day'),
  ('10000000-0000-0000-0000-0000000001aa', '00000000-0000-0000-0000-0000000001bb', 'MAN', now() - interval '1 day');
insert into public.discos (id, deezer_id, titulo, artista) values
  ('20000000-0000-0000-0000-0000000001aa', 9101, 'Artaud', 'Pescado Rabioso'),
  ('20000000-0000-0000-0000-0000000001bb', 9102, 'Kid A', 'Radiohead');
insert into public.pases (id, ronda_id, disco_id, pasado_por, tarjetita) values
  ('30000000-0000-0000-0000-0000000001aa', '10000000-0000-0000-0000-0000000001aa',
   '20000000-0000-0000-0000-0000000001aa', '00000000-0000-0000-0000-0000000001aa', 'De noche'),
  ('30000000-0000-0000-0000-0000000001bb', '10000000-0000-0000-0000-0000000001aa',
   '20000000-0000-0000-0000-0000000001bb', '00000000-0000-0000-0000-0000000001aa', 'Entero');

select lives_ok($$insert into public.calificaciones (pase_id, usuario_id, puntaje, reaccion)
  values ('30000000-0000-0000-0000-0000000001aa', '00000000-0000-0000-0000-0000000001bb', 9, 'me-volo')$$,
  'guarda la reacción "Me voló la cabeza" como código');
select lives_ok($$insert into public.calificaciones (pase_id, usuario_id, puntaje)
  values ('30000000-0000-0000-0000-0000000001bb', '00000000-0000-0000-0000-0000000001bb', 6)$$,
  'la reacción es opcional');
select throws_ok($$update public.calificaciones set reaccion = 'Me voló la cabeza'
  where pase_id = '30000000-0000-0000-0000-0000000001aa'$$,
  '23514', null, 'no guarda el texto: solo los códigos de las cuatro reacciones');
select throws_ok($$update public.calificaciones set reaccion = 'otra'
  where pase_id = '30000000-0000-0000-0000-0000000001aa'$$,
  '23514', null, 'una reacción que no está en el Figma no se guarda');
select lives_ok($$update public.calificaciones set reaccion = 'revisitar'
  where pase_id = '30000000-0000-0000-0000-0000000001bb'$$,
  'el código más largo (revisitar, no-me-llego) entra');

select * from finish();
rollback;
