-- Pedidos y pagos del cliente (HU5).
-- ANTES DE CORRER: verificar en el Table Editor que producto.id sea bigint
-- o integer. producto_id usa bigint y funciona con cualquiera de los dos.
--
-- Orden de uso:
--   1. Se inserta el pedido en 'pendiente de pago'.
--   2. Después se inserta el pago.
-- El cliente no puede insertar un pedido ya 'pagado' ni modificar pedidos.
-- Solo el trigger del pago aprobado lo pasa a 'pagado' (RN3).
--
-- pedido.estado:
--   pendiente de pago = sin pago aprobado (tarjeta en proceso o pago en tienda)
--   pagado            = tiene un pago aprobado
-- pago.estado:
--   aprobado  = la pasarela aceptó el pago
--   rechazado = la pasarela lo rechazó; el pedido puede tener otro intento
--
-- RN2: de la tarjeta solo se guardan los últimos 4 dígitos.
-- No hay columnas para el número completo ni para el CVV.

create table if not exists public.pedido (
  id bigint generated always as identity primary key,
  numero_pedido text not null unique,
  usuario_id uuid not null default auth.uid() references public.usuario (id) on delete restrict,
  producto_id bigint not null references public.producto (id) on delete restrict,
  monto numeric(10, 2) not null,
  forma_pago text not null,
  estado text not null default 'pendiente de pago',
  fecha_pedido timestamptz not null default now(),
  constraint pedido_monto_check
    check (monto > 0),
  constraint pedido_forma_pago_check
    check (forma_pago in ('tarjeta', 'tienda')),
  constraint pedido_estado_check
    check (estado in ('pagado', 'pendiente de pago'))
);

comment on table public.pedido is
  'Pedido de un producto del catálogo, con su forma de pago y estado.';

comment on column public.pedido.numero_pedido is
  'Número que se muestra al comprador, por ejemplo PED-000001. Lo asigna un trigger a partir del id.';

comment on column public.pedido.monto is
  'Precio del producto en el catálogo al crear el pedido (RN1). Lo copia un trigger; se ignora el valor que mande la app.';

comment on column public.pedido.forma_pago is
  'tarjeta o tienda.';

comment on column public.pedido.estado is
  'pendiente de pago: sin pago aprobado. pagado: tiene un pago aprobado (RN3).';

create index if not exists pedido_usuario_id_fecha_pedido_idx
  on public.pedido (usuario_id, fecha_pedido desc);

create index if not exists pedido_producto_id_idx
  on public.pedido (producto_id);

create table if not exists public.pago (
  id bigint generated always as identity primary key,
  pedido_id bigint not null references public.pedido (id) on delete restrict,
  monto numeric(10, 2) not null,
  estado text not null,
  fecha_pago timestamptz not null default now(),
  ultimos_digitos text not null,
  constraint pago_monto_check
    check (monto > 0),
  constraint pago_estado_check
    check (estado in ('aprobado', 'rechazado')),
  constraint pago_ultimos_digitos_check
    check (ultimos_digitos ~ '^[0-9]{4}$')
);

comment on table public.pago is
  'Intento de pago con tarjeta de un pedido. No guarda el número completo ni el CVV (RN2).';

comment on column public.pago.monto is
  'Monto del pedido. Lo copia un trigger desde pedido.';

comment on column public.pago.estado is
  'aprobado o rechazado. Un pedido tiene como máximo un pago aprobado.';

comment on column public.pago.ultimos_digitos is
  'Solo los últimos 4 dígitos de la tarjeta (RN2).';

create index if not exists pago_pedido_id_idx
  on public.pago (pedido_id);

-- CA7: un solo pago aprobado por pedido. Puede haber varios rechazados.
create unique index if not exists pago_un_aprobado_por_pedido_idx
  on public.pago (pedido_id)
  where estado = 'aprobado';

-- usuario_id lo pone la sesión, no un valor libre del cliente.

create or replace function public.pedido_fuerza_usuario_sesion()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión para registrar el pedido';
  end if;

  new.usuario_id := auth.uid();
  return new;
end;
$$;

revoke all on function public.pedido_fuerza_usuario_sesion() from public;
grant execute on function public.pedido_fuerza_usuario_sesion() to authenticated, service_role;

drop trigger if exists pedido_fuerza_usuario_sesion on public.pedido;

create trigger pedido_fuerza_usuario_sesion
before insert on public.pedido
for each row
execute function public.pedido_fuerza_usuario_sesion();

-- RN1: el monto es el precio del catálogo. security definer para leer el
-- producto aunque ya no esté visible para el cliente y dar un mensaje claro.

create or replace function public.pedido_fija_monto_catalogo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  precio_catalogo numeric;
  producto_disponible boolean;
begin
  select precio, disponible
    into precio_catalogo, producto_disponible
    from public.producto
   where id = new.producto_id;

  if not found then
    raise exception 'El producto % no existe', new.producto_id;
  end if;

  if precio_catalogo is null then
    raise exception 'El producto % no tiene precio en el catálogo', new.producto_id;
  end if;

  if producto_disponible is not true then
    raise exception 'El producto % no está disponible', new.producto_id;
  end if;

  new.monto := precio_catalogo;
  return new;
end;
$$;

revoke all on function public.pedido_fija_monto_catalogo() from public;
grant execute on function public.pedido_fija_monto_catalogo() to authenticated, service_role;

drop trigger if exists pedido_fija_monto_catalogo on public.pedido;

create trigger pedido_fija_monto_catalogo
before insert on public.pedido
for each row
execute function public.pedido_fija_monto_catalogo();

-- numero_pedido sale del id (PED-000001). El id de identidad no necesita
-- permisos extra, así authenticated inserta sin errores.

create or replace function public.pedido_asigna_numero()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.numero_pedido := 'PED-' || lpad(new.id::text, greatest(6, char_length(new.id::text)), '0');
  return new;
end;
$$;

revoke all on function public.pedido_asigna_numero() from public;
grant execute on function public.pedido_asigna_numero() to authenticated, service_role;

drop trigger if exists pedido_asigna_numero on public.pedido;

create trigger pedido_asigna_numero
before insert on public.pedido
for each row
execute function public.pedido_asigna_numero();

-- El monto del pago es el del pedido.

create or replace function public.pago_fija_monto_pedido()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  monto_pedido numeric(10, 2);
begin
  select monto
    into monto_pedido
    from public.pedido
   where id = new.pedido_id;

  if not found then
    raise exception 'El pedido % no existe', new.pedido_id;
  end if;

  new.monto := monto_pedido;
  return new;
end;
$$;

revoke all on function public.pago_fija_monto_pedido() from public;
grant execute on function public.pago_fija_monto_pedido() to authenticated, service_role;

drop trigger if exists pago_fija_monto_pedido on public.pago;

create trigger pago_fija_monto_pedido
before insert on public.pago
for each row
execute function public.pago_fija_monto_pedido();

-- RN3: un pago aprobado pasa el pedido a 'pagado'. security definer porque
-- el cliente no tiene permiso para actualizar pedido.

create or replace function public.pago_aprobado_marca_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'aprobado' then
    update public.pedido
       set estado = 'pagado'
     where id = new.pedido_id;
  end if;

  return new;
end;
$$;

revoke all on function public.pago_aprobado_marca_pedido() from public;
grant execute on function public.pago_aprobado_marca_pedido() to authenticated, service_role;

drop trigger if exists pago_aprobado_marca_pedido on public.pago;

create trigger pago_aprobado_marca_pedido
after insert on public.pago
for each row
execute function public.pago_aprobado_marca_pedido();

-- Seguridad por fila de pedido.

alter table public.pedido enable row level security;

drop policy if exists "el cliente consulta sus pedidos" on public.pedido;

create policy "el cliente consulta sus pedidos"
on public.pedido
for select
to authenticated
using (usuario_id = (select auth.uid()));

drop policy if exists "el cliente registra sus pedidos pendientes" on public.pedido;

create policy "el cliente registra sus pedidos pendientes"
on public.pedido
for insert
to authenticated
with check (
  usuario_id = (select auth.uid())
  and estado = 'pendiente de pago'
);

revoke all on table public.pedido from anon;
grant select, insert on table public.pedido to authenticated;
grant select, insert, update, delete on table public.pedido to service_role;

-- Seguridad por fila de pago. El navegador inserta el pago directo
-- (la pasarela simulada corre en el frontend).

alter table public.pago enable row level security;

drop policy if exists "el cliente consulta los pagos de sus pedidos" on public.pago;

create policy "el cliente consulta los pagos de sus pedidos"
on public.pago
for select
to authenticated
using (
  exists (
    select 1
    from public.pedido
    where pedido.id = pago.pedido_id
      and pedido.usuario_id = (select auth.uid())
  )
);

drop policy if exists "el cliente registra pagos de sus pedidos con tarjeta" on public.pago;

create policy "el cliente registra pagos de sus pedidos con tarjeta"
on public.pago
for insert
to authenticated
with check (
  exists (
    select 1
    from public.pedido
    where pedido.id = pago.pedido_id
      and pedido.usuario_id = (select auth.uid())
      and pedido.forma_pago = 'tarjeta'
      and pedido.estado = 'pendiente de pago'
  )
);

revoke all on table public.pago from anon;
grant select, insert on table public.pago to authenticated;
grant select, insert, update, delete on table public.pago to service_role;
