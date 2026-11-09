-- Cabina 86 · HU-14 · Reacciones de la calificación
-- Figma 04: "Temazo", "Me voló la cabeza", "No me llegó", "Lo voy a revisitar".
-- Algunas pasan los 16 caracteres que admitía reaccion: se guarda un código y la app muestra el texto.
update public.calificaciones
   set reaccion = null
 where reaccion is not null
   and reaccion not in ('temazo', 'me-volo', 'no-me-llego', 'revisitar');

alter table public.calificaciones drop constraint calificaciones_reaccion_check;
alter table public.calificaciones add constraint calificaciones_reaccion_check
  check (reaccion in ('temazo', 'me-volo', 'no-me-llego', 'revisitar'));
