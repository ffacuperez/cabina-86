-- Cabina 86 · #52 · Solo quien creó la ronda invita (HU-04)
-- El link de invitación es el código de la ronda: quien lo tiene puede sumarse.
-- Desde ahora los integrantes ven todo de sus rondas menos el código; solo quien la creó lo obtiene.

-- Los integrantes leen las rondas sin el código (RLS sigue limitando a las rondas donde están).
-- Ojo: con permisos por columna, una columna nueva en rondas hay que sumarla acá para que se pueda leer.
revoke select on public.rondas from authenticated;
grant select (id, nombre, creada_por, creada_en, tope_pendientes) on public.rondas to authenticated;

-- Los códigos de las rondas que creé y en las que sigo: Mis rondas muestra INVITAR solo en esas.
create function public.mis_codigos_de_invitacion()
returns table (ronda_id uuid, codigo text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.codigo_invitacion
    from public.rondas r
   where r.creada_por = auth.uid()
     and public.es_miembro(r.id);
$$;

revoke execute on function public.mis_codigos_de_invitacion() from public, anon;
grant execute on function public.mis_codigos_de_invitacion() to authenticated;
