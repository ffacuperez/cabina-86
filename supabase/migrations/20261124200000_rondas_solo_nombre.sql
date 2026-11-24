-- Cabina 86 · #120 · De una ronda solo se edita el nombre
-- La política rondas_editar deja editar a quien la armó, pero el permiso de update era de toda la tabla:
-- podía cambiar creada_en (y volver a abrir las 24 horas de RN-06, #115), el código de invitación o el tope.
-- La app nunca edita rondas; queda solo el nombre, por si algún día se puede renombrar.

revoke update on public.rondas from authenticated;
grant update (nombre) on public.rondas to authenticated;
