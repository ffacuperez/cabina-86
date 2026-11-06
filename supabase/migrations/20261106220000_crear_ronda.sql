-- Cabina 86 · HU-03 · Crear una ronda
-- No hay política de insert en rondas ni en miembros_ronda: se crean con crear_ronda,
-- que hace todo junto (la ronda, quien la crea como único integrante y su link).

-- S-02: la sigla son las 3 primeras letras del nombre (FAC para Facu), sin tildes.
-- Si ya está tomada en esa ronda: FAC2, FAC3… La usa también HU-02 al sumarse por link.
create function public.sigla_para(p_usuario uuid, p_ronda uuid)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_base      text;
  v_candidata text;
  v_n         integer := 1;
begin
  select left(regexp_replace(
           upper(translate(nombre,
             'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
             'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC')),
           '[^A-Z0-9]', '', 'g'), 3)
    into v_base
    from public.usuarios
   where id = p_usuario;

  if v_base is null or char_length(v_base) < 2 then
    v_base := 'YO';
  end if;

  v_candidata := v_base;
  while exists (select 1 from public.miembros_ronda where ronda_id = p_ronda and sigla = v_candidata) loop
    v_n := v_n + 1;
    v_candidata := left(v_base, 4 - char_length(v_n::text)) || v_n;
  end loop;

  return v_candidata;
end $$;

revoke execute on function public.sigla_para(uuid, uuid) from public, anon, authenticated;

-- HU-03: crea la ronda con quien la arma como único integrante y genera su código de invitación.
-- Nombre vacío o de más de 40 caracteres: lo rechaza el check de rondas.nombre.
create function public.crear_ronda(p_nombre text)
returns public.rondas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ronda public.rondas;
begin
  if auth.uid() is null then
    raise exception 'Hay que iniciar sesión para armar una ronda' using errcode = '42501';
  end if;

  insert into public.rondas (nombre, creada_por)
  values (btrim(p_nombre), auth.uid())
  returning * into v_ronda;

  insert into public.miembros_ronda (ronda_id, usuario_id, sigla)
  values (v_ronda.id, auth.uid(), public.sigla_para(auth.uid(), v_ronda.id));

  return v_ronda;
end $$;

revoke execute on function public.crear_ronda(text) from public, anon;
grant execute on function public.crear_ronda(text) to authenticated;
