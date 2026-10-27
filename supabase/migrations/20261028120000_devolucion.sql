-- Devolución de lentes (HU7).
--
-- 1. pedido: nuevo estado 'entregado' y columna fecha_entrega.
--    Lo marca el personal (service_role / SQL Editor); el cliente no puede
--    actualizar pedidos.
-- 2. devolucion: solicitud de devolución del cliente.
--
-- Reglas de negocio:
--   RN1 solo pedidos 'entregado'.
--   RN2 solicitud dentro de 8 días posteriores a la entrega.
--   RN3 el cliente confirma "sin uso y en empaque original".
--   RN4 una sola devolución activa por pedido (una 'rechazada' libera el pedido).
--   RN5 el motivo es obligatorio.
--
-- Si cambia el plazo, actualizar también RETURN_WINDOW_DAYS en
-- fudem-app/src/lib/returns/returnRules.ts.

-- ---------------------------------------------------------------- pedido

alter table public.pedido
  add column if not exists fecha_entrega timestamptz;

comment on column public.pedido.fecha_entrega is
  'Fecha en que el pedido se entregó al cliente. Obligatoria cuando estado = entregado.';

alter table public.pedido drop constraint if exists pedido_estado_check;
alter table public.pedido
  add constraint pedido_estado_check
  check (estado in ('pagado', 'pendiente de pago', 'entregado'));

alter table public.pedido drop constraint if exists pedido_entregado_fecha_check;
alter table public.pedido
  add constraint pedido_entregado_fecha_check
  check (estado <> 'entregado' or fecha_entrega is not null);

comment on column public.pedido.estado is
  'pendiente de pago: sin pago aprobado. pagado: tiene un pago aprobado (RN3). entregado: ya recibido por el cliente.';

-- ------------------------------------------------------------- devolucion

create table if not exists public.devolucion (
  id bigint generated always as identity primary key,
  pedido_id bigint not null references public.pedido (id) on delete restrict,
  usuario_id uuid not null default auth.uid() references public.usuario (id) on delete restrict,
  motivo text not null,
  forma text not null,
  comentarios text,
  condiciones_confirmadas boolean not null,
  estado text not null default 'en revision',
  fecha_solicitud timestamptz not null default now(),
  constraint devolucion_motivo_check
    check (char_length(btrim(motivo)) between 1 and 80),
  constraint devolucion_forma_check
    check (forma in ('reembolso', 'cambio')),
  constraint devolucion_comentarios_check
    check (comentarios is null or char_length(comentarios) <= 500),
  constraint devolucion_condiciones_check
    check (condiciones_confirmadas is true),
  constraint devolucion_estado_check
    check (estado in ('en revision', 'aprobada', 'rechazada', 'completada'))
);

comment on table public.devolucion is
  'Solicitud de devolución de un pedido entregado (HU7).';
comment on column public.devolucion.condiciones_confirmadas is
  'RN3: el cliente confirmó que los lentes están sin uso y en su empaque original.';
comment on column public.devolucion.forma is
  'reembolso o cambio.';
comment on column public.devolucion.estado is
  'en revision (inicial), aprobada, rechazada o completada. Solo el personal cambia el estado.';

create index if not exists devolucion_usuario_id_fecha_idx
  on public.devolucion (usuario_id, fecha_solicitud desc);

-- RN4: una sola devolución activa por pedido.
create unique index if not exists devolucion_una_activa_por_pedido_idx
  on public.devolucion (pedido_id)
  where estado <> 'rechazada';

-- usuario_id lo pone la sesión; valida RN1 y RN2 en el servidor.
create or replace function public.devolucion_valida_solicitud()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pedido_row record;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión para solicitar la devolución';
  end if;

  new.usuario_id := auth.uid();

  select usuario_id, estado, fecha_entrega
    into pedido_row
    from public.pedido
   where id = new.pedido_id;

  if not found or pedido_row.usuario_id <> auth.uid() then
    raise exception 'pedido_no_encontrado';
  end if;

  if pedido_row.estado <> 'entregado' then
    raise exception 'pedido_no_entregado';
  end if;

  if now() > pedido_row.fecha_entrega + interval '8 days' then
    raise exception 'plazo_vencido';
  end if;

  return new;
end;
$$;

revoke all on function public.devolucion_valida_solicitud() from public;
grant execute on function public.devolucion_valida_solicitud() to authenticated, service_role;

drop trigger if exists devolucion_valida_solicitud on public.devolucion;

create trigger devolucion_valida_solicitud
before insert on public.devolucion
for each row
execute function public.devolucion_valida_solicitud();

-- Seguridad por fila.

alter table public.devolucion enable row level security;

drop policy if exists "el cliente consulta sus devoluciones" on public.devolucion;

create policy "el cliente consulta sus devoluciones"
on public.devolucion
for select
to authenticated
using (usuario_id = (select auth.uid()));

drop policy if exists "el cliente solicita devoluciones en revision" on public.devolucion;

create policy "el cliente solicita devoluciones en revision"
on public.devolucion
for insert
to authenticated
with check (
  usuario_id = (select auth.uid())
  and estado = 'en revision'
);

revoke all on table public.devolucion from anon;
grant select, insert on table public.devolucion to authenticated;
grant select, insert, update, delete on table public.devolucion to service_role;

-- ------------------------------------------------- datos de prueba (manual)
-- Para probar la pantalla, marca un pedido pagado como entregado:
--
--   update public.pedido
--      set estado = 'entregado', fecha_entrega = now() - interval '2 days'
--    where numero_pedido = 'PED-000001';
