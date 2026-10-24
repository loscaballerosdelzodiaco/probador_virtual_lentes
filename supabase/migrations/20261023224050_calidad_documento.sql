-- Calidad insuficiente: la receta no se marca recibida.
-- pendiente: validación de calidad o recepción aún no terminó.
-- calidad_insuficiente: borrosa, oscura o ilegible; hay que cargar otra imagen.
-- recibida: solo cuando formato, calidad y almacenamiento terminaron bien.

alter table public.documento
  drop constraint if exists documento_estado_recepcion_check;

alter table public.documento
  add constraint documento_estado_recepcion_check
  check (
    estado_recepcion in (
      'pendiente',
      'recibida',
      'rechazada',
      'calidad_insuficiente'
    )
  );

comment on column public.documento.estado_recepcion is
  'pendiente: validación en curso. calidad_insuficiente: no se lee bien, hay que cargar otra imagen. recibida: aceptada. rechazada: validación posterior no pasó.';

drop policy if exists "el cliente registra documentos recibidos" on public.documento;

create policy "el cliente registra documentos recibidos"
on public.documento
for insert
to authenticated
with check (
  usuario_id = (select auth.uid())
  and estado_recepcion = 'recibida'
);
