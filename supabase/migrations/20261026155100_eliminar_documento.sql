-- El cliente puede borrar sus recetas y exámenes.
-- validacion_documento se elimina en cascada. Un pedido con documento_id
-- sigue bloqueando el borrado (ON DELETE RESTRICT).

grant select, insert, delete on table public.documento to authenticated;

drop policy if exists "el cliente elimina sus documentos" on public.documento;

create policy "el cliente elimina sus documentos"
on public.documento
for delete
to authenticated
using (usuario_id = (select auth.uid()));

drop policy if exists "el cliente borra sus documentos" on storage.objects;

create policy "el cliente borra sus documentos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'documentos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
