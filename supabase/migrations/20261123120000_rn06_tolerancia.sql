-- Cabina 86 · #115 · RN-06 con 24 horas de tolerancia
-- Quien se suma en las primeras 24 horas desde que se armó la ronda hereda lo que ya se pasó:
-- lo ve en su exhibidor y lo debe. Pasadas las 24 horas, arranca de cero, como antes.
--
-- Cómo: se_unio_en es "desde cuándo te cuentan los discos" (vista pendientes, exhibidor, quién lo debe
-- en 03c y Perfil). Si te sumás a tiempo, queda pegado al de quien armó la ronda, más 1 ms por cada
-- integrante que ya estaba, para que el orden de llegada se mantenga (Mis rondas, Te invitaron, La Ronda).
-- Así no cambia ninguna vista ni la app: solo el momento que se guarda al sumarse.

create or replace function public.sumarse_a_ronda(p_codigo text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ronda   uuid;
  v_desde   timestamptz;
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
      -- RN-06: en las primeras 24 horas heredás todo; después, solo lo que se pase desde ahora.
      select case
               when now() < r.creada_en + interval '24 hours'
                 then c.se_unio_en + (select count(*) from public.miembros_ronda m where m.ronda_id = r.id)
                                     * interval '1 millisecond'
             end
        into v_desde
        from public.rondas r
        join public.miembros_ronda c on c.ronda_id = r.id and c.usuario_id = r.creada_por
       where r.id = v_ronda;

      insert into public.miembros_ronda (ronda_id, usuario_id, sigla, se_unio_en)
      values (v_ronda, auth.uid(), public.sigla_para(auth.uid(), v_ronda), coalesce(v_desde, now()))
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

-- Los que ya se sumaron en las primeras 24 horas de su ronda pasan a heredar lo de antes.
-- Solo se mueve para atrás (least): nadie pierde un disco que ya veía.
with a_tiempo as (
  select m.ronda_id,
         m.usuario_id,
         c.se_unio_en + row_number() over (partition by m.ronda_id order by m.se_unio_en, m.usuario_id)
                        * interval '1 millisecond' as desde
    from public.miembros_ronda m
    join public.rondas r on r.id = m.ronda_id
    join public.miembros_ronda c on c.ronda_id = r.id and c.usuario_id = r.creada_por
   where m.usuario_id <> r.creada_por
     and m.se_unio_en < r.creada_en + interval '24 hours'
)
update public.miembros_ronda m
   set se_unio_en = least(m.se_unio_en, a.desde)
  from a_tiempo a
 where a.ronda_id = m.ronda_id
   and a.usuario_id = m.usuario_id;
