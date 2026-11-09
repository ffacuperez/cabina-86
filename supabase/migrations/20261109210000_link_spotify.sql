-- Cabina 86 · HU-13 · Link de Spotify sin "/albums"
-- La app de Spotify del teléfono toma el último tramo de /search/<búsqueda>/albums como la búsqueda,
-- así que buscaba "albums". Los discos ya guardados quedan con /search/<búsqueda>.
update public.discos
set link_spotify = left(link_spotify, length(link_spotify) - length('/albums'))
where link_spotify like 'https://open.spotify.com/search/%/albums';
