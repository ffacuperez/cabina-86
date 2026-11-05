-- Cabina 86 · T-08 · Latido
-- Supabase gratis pausa el proyecto tras 7 días sin actividad.
-- Una GitHub Action llama a esta función cada 3 días: es una consulta real a la base,
-- no expone ningún dato y la puede llamar cualquiera (incluso sin login).
create function public.latido()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select now();
$$;

revoke execute on function public.latido() from public;
grant execute on function public.latido() to anon, authenticated;
