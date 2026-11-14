-- Cabina 86 · #105 · Borrar una ronda
-- No hay política de delete en rondas: se borra solo con borrar_ronda, y solo quien la creó.
-- Pide el nombre de la ronda (sin importar mayúsculas ni espacios de los costados) como
-- confirmación, igual que la hoja de la app. Con la ronda se van en cascada sus integrantes,
-- pases y calificaciones; los discos quedan (son compartidos entre rondas, RN-09).
create function public.borrar_ronda(p_ronda uuid, p_nombre text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_creada_por uuid;
  v_nombre     text;
begin
  if auth.uid() is null then
    raise exception 'Hay que iniciar sesión para borrar una ronda' using errcode = '42501';
  end if;

  select creada_por, nombre into v_creada_por, v_nombre
    from public.rondas
   where id = p_ronda;

  -- Misma respuesta si no existe o si no la creaste: no se revela qué rondas hay
  if v_creada_por is distinct from auth.uid() then
    raise exception 'Solo quien armó la ronda puede borrarla' using errcode = '42501';
  end if;

  if lower(btrim(coalesce(p_nombre, ''))) <> lower(btrim(v_nombre)) then
    raise exception 'El nombre no coincide con el de la ronda' using errcode = '22023';
  end if;

  delete from public.rondas where id = p_ronda;
end $$;

revoke execute on function public.borrar_ronda(uuid, text) from public, anon;
grant execute on function public.borrar_ronda(uuid, text) to authenticated;
