-- La recepción del archivo solo queda persistida como "recibida" cuando
-- validación + almacenamiento terminan bien. usuario_id lo pone la sesión,
-- no un valor libre del cliente.

alter table public.documento
  alter column usuario_id set default auth.uid();

comment on column public.documento.estado_recepcion is
  'pendiente: no se usa en una recepción completa. recibida: archivo validado y guardado. rechazada: no pasó una validación posterior.';

drop policy if exists "el cliente registra sus documentos pendientes" on public.documento;

create policy "el cliente registra documentos recibidos"
on public.documento
for insert
to authenticated
with check (
  usuario_id = (select auth.uid())
  and estado_recepcion = 'recibida'
);

create or replace function public.documento_fuerza_usuario_sesion()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión para registrar el documento';
  end if;

  new.usuario_id := auth.uid();
  return new;
end;
$$;

revoke all on function public.documento_fuerza_usuario_sesion() from public;
grant execute on function public.documento_fuerza_usuario_sesion() to authenticated, service_role;

drop trigger if exists documento_fuerza_usuario_sesion on public.documento;

create trigger documento_fuerza_usuario_sesion
before insert on public.documento
for each row
execute function public.documento_fuerza_usuario_sesion();
