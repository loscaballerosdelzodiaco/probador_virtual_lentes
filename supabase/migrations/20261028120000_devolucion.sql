-- Devolución de lentes (HU7).
--
-- 1. pedido: nuevo estado 'entregado' y columna fecha_entrega.
--    Lo marca el personal (service_role / SQL Editor); el cliente no puede
--    actualizar pedidos.
-- 2. devolucion: solicitud de devolución del cliente.
--
-- Se puede correr aunque la tabla ya exista: los constraints se borran y se
-- vuelven a crear, y el resto usa if not exists, create or replace o
-- drop ... if exists.
--
-- devolucion.estado:
--   en revision = estado inicial de toda solicitud (CA4)
--   aprobada    = el personal aceptó la devolución
--   rechazada   = el personal no la aceptó; el pedido queda libre (RN4)
--   completada  = ya se hizo el reembolso o el cambio
-- Flujo: en revision -> aprobada o rechazada; aprobada -> completada.
-- Solo el personal cambia el estado; aprobar o rechazar no es parte de HU7.
--
-- Reglas de negocio:
--   RN1 solo pedidos 'entregado'.
--   RN2 solicitud dentro de 8 días posteriores a la entrega.
--   RN3 el cliente confirma "sin uso y en empaque original".
--   RN4 una sola devolución activa por pedido (una 'rechazada' libera el pedido).
--   RN5 el motivo es obligatorio y sale de una lista.
--
-- Si cambia el plazo o la lista de motivos, actualizar también
-- RETURN_WINDOW_DAYS y RETURN_REASONS en fudem-app/src/lib/returns/returnRules.ts.

-- ---------------------------------------------------------------- pedido

alter table public.pedido
  add column if not exists fecha_entrega timestamptz;

comment on column public.pedido.fecha_entrega is
  'Fecha en que el pedido se entregó al cliente. Obligatoria cuando estado = entregado y vacía en los demás estados.';

alter table public.pedido drop constraint if exists pedido_estado_check;
alter table public.pedido
  add constraint pedido_estado_check
  check (estado in ('pagado', 'pendiente de pago', 'entregado'));

alter table public.pedido drop constraint if exists pedido_entregado_fecha_check;
alter table public.pedido
  add constraint pedido_entregado_fecha_check
  check (estado <> 'entregado' or fecha_entrega is not null);

-- El cliente no puede dejar una fecha_entrega propia al crear su pedido:
-- solo un pedido entregado tiene fecha de entrega (RN2 depende de ella).
alter table public.pedido drop constraint if exists pedido_fecha_entrega_solo_entregado_check;
alter table public.pedido
  add constraint pedido_fecha_entrega_solo_entregado_check
  check (fecha_entrega is null or estado = 'entregado');

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
  fecha_solicitud timestamptz not null default now()
);

-- RN5: los textos son los mismos de RETURN_REASONS.
alter table public.devolucion drop constraint if exists devolucion_motivo_check;
alter table public.devolucion
  add constraint devolucion_motivo_check
  check (
    motivo in (
      'Defecto de fábrica',
      'No me queda bien',
      'No me gusta el diseño',
      'Producto distinto al pedido',
      'Llegó dañado',
      'Otro'
    )
  );

alter table public.devolucion drop constraint if exists devolucion_forma_check;
alter table public.devolucion
  add constraint devolucion_forma_check
  check (forma in ('reembolso', 'cambio'));

alter table public.devolucion drop constraint if exists devolucion_comentarios_check;
alter table public.devolucion
  add constraint devolucion_comentarios_check
  check (comentarios is null or char_length(comentarios) <= 500);

-- Nombre anterior de la misma regla.
alter table public.devolucion drop constraint if exists devolucion_condiciones_check;
alter table public.devolucion drop constraint if exists devolucion_condiciones_confirmadas_check;
alter table public.devolucion
  add constraint devolucion_condiciones_confirmadas_check
  check (condiciones_confirmadas is true);

alter table public.devolucion drop constraint if exists devolucion_estado_check;
alter table public.devolucion
  add constraint devolucion_estado_check
  check (estado in ('en revision', 'aprobada', 'rechazada', 'completada'));

comment on table public.devolucion is
  'Solicitud de devolución de un pedido entregado (HU7).';

comment on column public.devolucion.pedido_id is
  'Pedido que se devuelve. Tiene que ser del cliente y estar entregado (RN1).';

comment on column public.devolucion.usuario_id is
  'Cliente que solicita. Lo pone un trigger con la sesión; se ignora el valor que mande la app.';

comment on column public.devolucion.motivo is
  'RN5: motivo obligatorio, uno de la lista de la pantalla.';

comment on column public.devolucion.forma is
  'reembolso o cambio.';

comment on column public.devolucion.comentarios is
  'Descripción opcional del motivo, máximo 500 caracteres.';

comment on column public.devolucion.condiciones_confirmadas is
  'RN3: el cliente confirmó que los lentes están sin uso y en su empaque original.';

comment on column public.devolucion.estado is
  'en revision (inicial), aprobada, rechazada o completada. Solo el personal cambia el estado.';

comment on column public.devolucion.fecha_solicitud is
  'Momento en que el cliente envió la solicitud. Lo asigna la base de datos.';

create index if not exists devolucion_usuario_id_fecha_idx
  on public.devolucion (usuario_id, fecha_solicitud desc);

create index if not exists devolucion_pedido_id_idx
  on public.devolucion (pedido_id);

-- RN4: una sola devolución activa por pedido.
create unique index if not exists devolucion_una_activa_por_pedido_idx
  on public.devolucion (pedido_id)
  where estado <> 'rechazada';

-- usuario_id lo pone la sesión; valida RN1 y RN2 en el servidor.
-- Los textos de error (pedido_no_encontrado, pedido_no_entregado,
-- plazo_vencido) los lee la app para mostrar el mensaje.
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
