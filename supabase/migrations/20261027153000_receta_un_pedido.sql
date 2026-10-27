-- Una receta recibida solo puede usarse en un pedido nuevo.
-- No se tocan pedidos ya registrados con la misma receta.

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

  if exists (
    select 1
    from public.pedido
    where documento_id = new.documento_id
  ) then
    raise exception 'La receta ya está asociada a un pedido';
  end if;

  return new;
end;
$$;
