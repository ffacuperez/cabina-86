-- Cabina 86 · T-10 · Lista de temas del disco (pgTAP)
-- Correr con: npm run db:test  (necesita Supabase local: npm run db:start)
begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

select has_column('public', 'discos', 'temas', 'discos tiene la lista de temas');
select col_not_null('public', 'discos', 'temas', 'la lista de temas no es nula');

insert into public.discos (deezer_id, titulo, artista) values (901, 'Sin temas', 'Alguien');
select is((select temas from public.discos where deezer_id = 901), '[]'::jsonb, 'un disco sin temas arranca con la lista vacía');

insert into public.discos (deezer_id, titulo, artista, temas)
values (902, 'Artaud', 'Pescado Rabioso', '[{"titulo": "Todas las hojas son del viento", "duracion_seg": 157}]');
select is((select temas -> 0 ->> 'titulo' from public.discos where deezer_id = 902), 'Todas las hojas son del viento', 'guarda los temas en orden');

select throws_ok($$insert into public.discos (deezer_id, titulo, artista, temas) values (903, 'Mal', 'Alguien', '{"titulo": "x"}')$$,
  '23514', null, 'la lista de temas tiene que ser un arreglo');

select * from finish();
rollback;
