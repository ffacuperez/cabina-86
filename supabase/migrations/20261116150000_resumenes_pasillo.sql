-- HU-19 · La cabina dice: el resumen de cada pasillo (Figma 02h, variante B).
-- Un resumen por persona y por ronda, de la última tanda que pasó (los discos de los 3 días antes de su
-- último pase), con sus últimos discos como contexto. Es el mismo para toda la ronda: no depende de lo que
-- calificó cada uno, así que no adelanta ninguna nota (RN-01).
--
-- Lo escribe la Edge Function resumir_pasillo con la clave secreta: la app solo lee. Si la última tanda
-- cambió (tanda_hasta ya no es el último pase), la app muestra una frase armada y le pide a la función
-- que lo rehaga. intentado_en evita insistir cuando la IA falla.

create table public.resumenes_pasillo (
  ronda_id     uuid not null,
  pasado_por   uuid not null,
  -- null si el último intento falló y todavía no hay ninguno bueno
  texto        text check (char_length(texto) <= 300),
  -- creado_en del último pase que entró en el resumen: si no es el último de esa persona, está viejo
  tanda_hasta  timestamptz not null,
  generado_en  timestamptz,
  intentado_en timestamptz not null default now(),
  primary key (ronda_id, pasado_por),
  -- si la persona deja la ronda o se borra la ronda (#105), el resumen se va con ella
  foreign key (ronda_id, pasado_por) references public.miembros_ronda (ronda_id, usuario_id) on delete cascade
);

alter table public.resumenes_pasillo enable row level security;

-- Lo ven los de la ronda (RN-05). Nadie escribe desde la app: solo la función, con la clave secreta.
create policy resumenes_pasillo_ver on public.resumenes_pasillo
  for select to authenticated
  using (public.es_miembro(ronda_id));

revoke all on public.resumenes_pasillo from anon, authenticated;
grant select on public.resumenes_pasillo to authenticated;
