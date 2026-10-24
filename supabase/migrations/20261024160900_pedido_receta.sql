-- El pedido de lentes lleva la receta recibida del cliente autenticado.
-- El laboratorio usa ese archivo para la graduación; no hay OCR de dioptrías.

alter table public.pedido
  add column if not exists documento_id bigint;

alter table public.pedido
  drop constraint if exists pedido_documento_id_fkey;

alter table public.pedido
  add constraint pedido_documento_id_fkey
  foreign key (documento_id) references public.documento (id) on delete restrict;

create index if not exists pedido_documento_id_idx
  on public.pedido (documento_id);

comment on column public.pedido.documento_id is
  'Receta recibida del cliente. El archivo es la referencia de graduación para elaborar los lentes.';

create or replace function public.pedido_exige_receta_recibida()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  receta public.documento%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión para registrar el pedido';
  end if;

  if new.documento_id is null then
    raise exception 'El pedido requiere una receta recibida';
  end if;

  select *
    into receta
    from public.documento
   where id = new.documento_id;

  if not found
     or receta.usuario_id is distinct from auth.uid()
     or receta.tipo is distinct from 'receta'
     or receta.estado_recepcion is distinct from 'recibida' then
    raise exception 'La receta no pertenece al cliente o no está recibida';
  end if;

  return new;
end;
$$;

revoke all on function public.pedido_exige_receta_recibida() from public;
grant execute on function public.pedido_exige_receta_recibida() to authenticated, service_role;

drop trigger if exists pedido_exige_receta_recibida on public.pedido;

create trigger pedido_exige_receta_recibida
before insert on public.pedido
for each row
execute function public.pedido_exige_receta_recibida();

drop policy if exists "el cliente registra sus pedidos pendientes" on public.pedido;

create policy "el cliente registra sus pedidos pendientes"
on public.pedido
for insert
to authenticated
with check (
  usuario_id = (select auth.uid())
  and estado = 'pendiente de pago'
  and documento_id is not null
  and exists (
    select 1
    from public.documento
    where documento.id = documento_id
      and documento.usuario_id = (select auth.uid())
      and documento.tipo = 'receta'
      and documento.estado_recepcion = 'recibida'
  )
);
