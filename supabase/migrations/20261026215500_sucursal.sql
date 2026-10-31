-- Sucursales para retiro en tienda (HU6). Solo las activas son visibles.

create table public.sucursal (
  id bigint generated always as identity primary key,
  nombre text not null,
  activa boolean not null default true,
  constraint sucursal_nombre_check
    check (char_length(btrim(nombre)) between 1 and 120)
);

comment on table public.sucursal is
  'Punto de retiro. Las inactivas no se ofrecen al cliente.';

create index sucursal_activas_nombre_idx
  on public.sucursal (nombre)
  where activa;

alter table public.sucursal enable row level security;

create policy "lectura publica de sucursales activas"
on public.sucursal
for select
to anon, authenticated
using (activa);

revoke all on table public.sucursal from anon, authenticated;
grant select on table public.sucursal to anon, authenticated;
grant select, insert, update, delete on table public.sucursal to service_role;

insert into public.sucursal (nombre, activa) values
  ('FUDEM San Salvador', true),
  ('FUDEM Santa Tecla', true),
  ('FUDEM San Miguel', true),
  ('FUDEM Soyapango (cerrada)', false);
