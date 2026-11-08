-- Cabina 86 · T-10 · Lista de temas del disco
-- HU-08 guarda la lista de temas desde Deezer; HU-12 muestra "9 TEMAS · 37 MIN" y HU-14 elige el tema favorito.
-- Cada tema: { "titulo": "Bajan", "duracion_seg": 223 }, en el orden del disco.
alter table public.discos
  add column temas jsonb not null default '[]'::jsonb
  check (jsonb_typeof(temas) = 'array');
