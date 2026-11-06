-- Cabina 86 · Última ronda en la que entraste
-- Mis rondas destaca la última ronda en la que entraste (marino con filete mostaza).
--
-- También cierra un hueco de T-05: la política miembros_editar_sigla dejaba actualizar
-- cualquier columna de la fila propia. Con eso alguien podía mover su se_unio_en a hoy
-- y borrarse la deuda de la ronda (RN-06). Ahora de la fila propia solo se edita la sigla.

alter table public.miembros_ronda
  add column ultima_entrada timestamptz not null default now();

-- Quien ya estaba: su última entrada es cuando se sumó.
update public.miembros_ronda set ultima_entrada = se_unio_en;

-- De la fila propia solo se puede cambiar la sigla (la política ya limita a la fila propia).
revoke update on public.miembros_ronda from authenticated;
grant update (sigla) on public.miembros_ronda to authenticated;

-- HU-05: al entrar a una ronda se registra la entrada. La hora la pone la base.
-- Si no sos integrante de esa ronda, no hace nada.
create function public.entrar_a_ronda(p_ronda uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.miembros_ronda
     set ultima_entrada = now()
   where ronda_id = p_ronda
     and usuario_id = auth.uid();
$$;

revoke execute on function public.entrar_a_ronda(uuid) from public, anon;
grant execute on function public.entrar_a_ronda(uuid) to authenticated;
