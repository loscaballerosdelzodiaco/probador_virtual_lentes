-- Recetas y exámenes del cliente.
-- Una sola tabla: ambos documentos comparten archivo, fecha, ubicación y estado.
-- El tipo distingue receta de examen.
-- estado_recepcion:
--   pendiente  = cargado, todavía sin validar
--   recibida   = la validación lo aceptó
--   rechazada  = la validación lo rechazó

create table public.documento (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.usuario (id) on delete cascade,
  nombre_archivo text not null,
  tipo text not null,
  fecha_carga timestamptz not null default now(),
  ubicacion_archivo text not null,
  estado_recepcion text not null default 'pendiente',
  constraint documento_nombre_archivo_check
    check (
      char_length(btrim(nombre_archivo)) between 1 and 255
      and nombre_archivo !~ '[\\/]'
    ),
  constraint documento_tipo_check
    check (tipo in ('receta', 'examen')),
  constraint documento_ubicacion_archivo_check
    check (
      char_length(btrim(ubicacion_archivo)) > 0
      and ubicacion_archivo !~ '^/'
      and split_part(ubicacion_archivo, '/', 1) = usuario_id::text
    ),
  constraint documento_estado_recepcion_check
    check (estado_recepcion in ('pendiente', 'recibida', 'rechazada'))
);

comment on table public.documento is
  'Archivo clínico del cliente: receta o examen, con su estado de recepción.';

comment on column public.documento.tipo is
  'receta o examen.';

comment on column public.documento.ubicacion_archivo is
  'Ruta del objeto en el bucket privado documentos. La primera carpeta es el id del usuario.';

comment on column public.documento.estado_recepcion is
  'pendiente: sin revisar. recibida: validación aceptada. rechazada: validación rechazada.';

create index documento_usuario_id_fecha_carga_idx
  on public.documento (usuario_id, fecha_carga desc);

create index documento_pendientes_idx
  on public.documento (fecha_carga)
  where estado_recepcion = 'pendiente';

alter table public.documento enable row level security;

create policy "el cliente consulta sus documentos"
on public.documento
for select
to authenticated
using (usuario_id = (select auth.uid()));

create policy "el cliente registra sus documentos pendientes"
on public.documento
for insert
to authenticated
with check (
  usuario_id = (select auth.uid())
  and estado_recepcion = 'pendiente'
);

revoke all on table public.documento from anon;
grant select, insert on table public.documento to authenticated;
grant select, insert, update, delete on table public.documento to service_role;

-- La validación es otro hecho: quién decidió, cuándo y por qué.
-- Un documento tiene como máximo una validación. El trigger copia el
-- resultado al estado de recepción para no dejar las dos tablas desfasadas.

create table public.validacion_documento (
  id bigint generated always as identity primary key,
  documento_id bigint not null unique references public.documento (id) on delete cascade,
  resultado text not null,
  motivo text,
  fecha_validacion timestamptz not null default now(),
  validador_id uuid references public.usuario (id) on delete set null,
  constraint validacion_documento_resultado_check
    check (resultado in ('recibida', 'rechazada')),
  constraint validacion_documento_motivo_check
    check (
      (
        resultado = 'recibida'
        and motivo is null
      )
      or (
        resultado = 'rechazada'
        and motivo is not null
        and char_length(btrim(motivo)) > 0
      )
    )
);

comment on table public.validacion_documento is
  'Decisión de validación de un documento. recibida no lleva motivo; rechazada sí.';

comment on column public.validacion_documento.validador_id is
  'Usuario que validó el archivo. Queda vacío si la decisión no tiene un usuario asociado.';

create index validacion_documento_validador_id_idx
  on public.validacion_documento (validador_id);

create or replace function public.aplicar_resultado_validacion()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.documento
     set estado_recepcion = new.resultado
   where id = new.documento_id;

  return new;
end;
$$;

revoke all on function public.aplicar_resultado_validacion() from public;
grant execute on function public.aplicar_resultado_validacion() to service_role;

create trigger validacion_documento_aplica_estado
after insert on public.validacion_documento
for each row
execute function public.aplicar_resultado_validacion();

alter table public.validacion_documento enable row level security;

create policy "el cliente consulta la validacion de sus documentos"
on public.validacion_documento
for select
to authenticated
using (
  exists (
    select 1
    from public.documento
    where documento.id = validacion_documento.documento_id
      and documento.usuario_id = (select auth.uid())
  )
);

revoke all on table public.validacion_documento from anon;
grant select on table public.validacion_documento to authenticated;
grant select, insert, update, delete on table public.validacion_documento to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos',
  'documentos',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "el cliente sube sus documentos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documentos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "el cliente lee sus documentos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'documentos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "el cliente reemplaza sus documentos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'documentos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'documentos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
