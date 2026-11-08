-- Cabina 86 · HU-02 · Entrar por un link de invitación
-- El link es /r/<codigo_invitacion>. El código (40 bits al azar) es lo que da acceso:
-- con él se ve la invitación sin sesión y, ya logueado, uno se suma a la ronda.

-- "Te invitaron" (Figma 00b): lo que se ve antes de iniciar sesión.
-- Devuelve null si el código no existe. Quién invita = quien creó la ronda (el link es de la ronda, no de una persona).
create function public.ver_invitacion(p_codigo text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'nombre', r.nombre,
    'invito', (select u.nombre from public.usuarios u where u.id = r.creada_por),
    'integrantes', coalesce((
      select jsonb_agg(jsonb_build_object('nombre', u.nombre, 'es_quien_invito', m.usuario_id = r.creada_por)
                       order by m.se_unio_en)
        from public.miembros_ronda m
        join public.usuarios u on u.id = m.usuario_id
       where m.ronda_id = r.id
    ), '[]'::jsonb),
    'discos_pasados', (select count(*)::integer from public.pases p where p.ronda_id = r.id),
    'ultimos_discos', coalesce((
      select jsonb_agg(jsonb_build_object('titulo', d.titulo, 'artista', d.artista, 'tapa_url', d.tapa_url)
                       order by ult.creado_en desc)
        from (select p.disco_id, p.creado_en from public.pases p
               where p.ronda_id = r.id order by p.creado_en desc limit 3) ult
        join public.discos d on d.id = ult.disco_id
    ), '[]'::jsonb)
  )
  from public.rondas r
  where r.codigo_invitacion = upper(btrim(p_codigo));
$$;

revoke execute on function public.ver_invitacion(text) from public;
grant execute on function public.ver_invitacion(text) to anon, authenticated;

-- HU-02: sumarse a la ronda del link.
-- Si ya sos integrante, no cambia nada salvo tu última entrada (te lleva directo a la ronda).
-- RN-06: se_unio_en queda en el momento en que te sumás, así no heredás pases anteriores.
create function public.sumarse_a_ronda(p_codigo text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ronda   uuid;
  v_intento integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Hay que iniciar sesión para sumarse a una ronda' using errcode = '42501';
  end if;

  select id into v_ronda from public.rondas where codigo_invitacion = upper(btrim(p_codigo));
  if v_ronda is null then
    raise exception 'Este link no lleva a ninguna ronda' using errcode = 'P0002';
  end if;

  loop
    begin
      insert into public.miembros_ronda (ronda_id, usuario_id, sigla)
      values (v_ronda, auth.uid(), public.sigla_para(auth.uid(), v_ronda))
      on conflict (ronda_id, usuario_id) do update set ultima_entrada = now();
      return v_ronda;
    exception when unique_violation then
      -- Dos personas sumándose a la vez con la misma sigla: se vuelve a calcular
      v_intento := v_intento + 1;
      if v_intento >= 3 then raise; end if;
    end;
  end loop;
end $$;

revoke execute on function public.sumarse_a_ronda(text) from public, anon;
grant execute on function public.sumarse_a_ronda(text) to authenticated;
