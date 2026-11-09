-- Cabina 86 · HU-13 · Link de Spotify sin "/albums" (pgTAP)
-- Correr con: npm run db:test  (necesita Supabase local: npm run db:start)
begin;
create extension if not exists pgtap with schema extensions;

select plan(2);

select is(
  (select count(*)::int from public.discos where link_spotify like '%/albums'),
  0,
  'ningún disco guardado queda con el link de Spotify terminado en /albums'
);

-- La misma corrección que aplica la migración, sobre un disco con el link viejo
insert into public.discos (deezer_id, titulo, artista, link_spotify)
values (911, 'Artaud', 'Pescado Rabioso', 'https://open.spotify.com/search/Artaud%20Pescado%20Rabioso/albums');
update public.discos
set link_spotify = left(link_spotify, length(link_spotify) - length('/albums'))
where link_spotify like 'https://open.spotify.com/search/%/albums';
select is(
  (select link_spotify from public.discos where deezer_id = 911),
  'https://open.spotify.com/search/Artaud%20Pescado%20Rabioso',
  'el link viejo queda como búsqueda del álbum, sin /albums'
);

select * from finish();
rollback;
