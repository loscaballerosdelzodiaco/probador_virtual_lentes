-- Completa HU6 sobre sucursal ya existente (solo id, nombre, activa).
-- Crea departamento, municipio y entrega; agrega dirección a sucursal.

create table if not exists public.departamento (
  id bigint generated always as identity primary key,
  nombre text not null,
  constraint departamento_nombre_key unique (nombre),
  constraint departamento_nombre_check
    check (char_length(btrim(nombre)) between 1 and 80)
);

create table if not exists public.municipio (
  id bigint generated always as identity primary key,
  departamento_id bigint not null references public.departamento (id) on delete restrict,
  nombre text not null,
  constraint municipio_departamento_nombre_key unique (departamento_id, nombre),
  constraint municipio_nombre_check
    check (char_length(btrim(nombre)) between 1 and 80)
);

create index if not exists municipio_departamento_id_idx
  on public.municipio (departamento_id);

alter table public.sucursal add column if not exists direccion text;
alter table public.sucursal add column if not exists municipio_id bigint;

create table if not exists public.entrega (
  id bigint generated always as identity primary key,
  pedido_id bigint not null unique references public.pedido (id) on delete restrict,
  tipo text not null,
  departamento_id bigint references public.departamento (id) on delete restrict,
  municipio_id bigint references public.municipio (id) on delete restrict,
  direccion text,
  telefono text,
  sucursal_id bigint references public.sucursal (id) on delete restrict,
  fecha_registro timestamptz not null default now(),
  constraint entrega_tipo_check
    check (tipo in ('domicilio', 'sucursal')),
  constraint entrega_direccion_check
    check (direccion is null or char_length(btrim(direccion)) between 1 and 300),
  constraint entrega_telefono_check
    check (telefono is null or telefono ~ '^\+?[0-9]{8,15}$'),
  constraint entrega_segun_tipo_check
    check (
      (
        tipo = 'domicilio'
        and departamento_id is not null
        and municipio_id is not null
        and direccion is not null
        and char_length(btrim(direccion)) between 1 and 300
        and telefono is not null
        and sucursal_id is null
      )
      or (
        tipo = 'sucursal'
        and sucursal_id is not null
        and departamento_id is null
        and municipio_id is null
        and direccion is null
        and telefono is null
      )
    )
);

insert into public.departamento (nombre)
select catalogo.nombre
from (
  values
    ('Ahuachapán'), ('Santa Ana'), ('Sonsonate'), ('Chalatenango'),
    ('La Libertad'), ('San Salvador'), ('Cuscatlán'), ('La Paz'),
    ('Cabañas'), ('San Vicente'), ('Usulután'), ('San Miguel'),
    ('Morazán'), ('La Unión')
) as catalogo (nombre)
where not exists (
  select 1 from public.departamento existente
  where existente.nombre = catalogo.nombre
);

insert into public.municipio (departamento_id, nombre)
select departamento.id, catalogo.municipio
from (
  values
    ('Ahuachapán', 'Ahuachapán Norte'),
    ('Ahuachapán', 'Ahuachapán Centro'),
    ('Ahuachapán', 'Ahuachapán Sur'),
    ('Santa Ana', 'Santa Ana Norte'),
    ('Santa Ana', 'Santa Ana Centro'),
    ('Santa Ana', 'Santa Ana Este'),
    ('Santa Ana', 'Santa Ana Oeste'),
    ('Sonsonate', 'Sonsonate Norte'),
    ('Sonsonate', 'Sonsonate Centro'),
    ('Sonsonate', 'Sonsonate Este'),
    ('Sonsonate', 'Sonsonate Oeste'),
    ('Chalatenango', 'Chalatenango Norte'),
    ('Chalatenango', 'Chalatenango Centro'),
    ('Chalatenango', 'Chalatenango Sur'),
    ('La Libertad', 'La Libertad Norte'),
    ('La Libertad', 'La Libertad Centro'),
    ('La Libertad', 'La Libertad Oeste'),
    ('La Libertad', 'La Libertad Este'),
    ('La Libertad', 'La Libertad Costa'),
    ('La Libertad', 'La Libertad Sur'),
    ('San Salvador', 'San Salvador Norte'),
    ('San Salvador', 'San Salvador Oeste'),
    ('San Salvador', 'San Salvador Este'),
    ('San Salvador', 'San Salvador Centro'),
    ('San Salvador', 'San Salvador Sur'),
    ('Cuscatlán', 'Cuscatlán Norte'),
    ('Cuscatlán', 'Cuscatlán Sur'),
    ('La Paz', 'La Paz Oeste'),
    ('La Paz', 'La Paz Centro'),
    ('La Paz', 'La Paz Este'),
    ('Cabañas', 'Cabañas Oeste'),
    ('Cabañas', 'Cabañas Este'),
    ('San Vicente', 'San Vicente Norte'),
    ('San Vicente', 'San Vicente Sur'),
    ('Usulután', 'Usulután Norte'),
    ('Usulután', 'Usulután Este'),
    ('Usulután', 'Usulután Oeste'),
    ('San Miguel', 'San Miguel Norte'),
    ('San Miguel', 'San Miguel Centro'),
    ('San Miguel', 'San Miguel Oeste'),
    ('Morazán', 'Morazán Norte'),
    ('Morazán', 'Morazán Sur'),
    ('La Unión', 'La Unión Norte'),
    ('La Unión', 'La Unión Sur')
) as catalogo (departamento, municipio)
join public.departamento on departamento.nombre = catalogo.departamento
where not exists (
  select 1 from public.municipio existente
  where existente.departamento_id = departamento.id
    and existente.nombre = catalogo.municipio
);

update public.sucursal as sucursal
set
  direccion = catalogo.direccion,
  municipio_id = municipio.id
from (
  values
    ('FUDEM San Salvador', 'Alameda Juan Pablo II, local 12, San Salvador', 'San Salvador', 'San Salvador Centro'),
    ('FUDEM Santa Tecla', 'Avenida Manuel Gallardo, centro comercial, Santa Tecla', 'La Libertad', 'La Libertad Centro'),
    ('FUDEM San Miguel', '4a calle poniente, San Miguel', 'San Miguel', 'San Miguel Centro'),
    ('FUDEM Soyapango (cerrada)', 'Boulevard del Ejército, Soyapango', 'San Salvador', 'San Salvador Este')
) as catalogo (nombre, direccion, departamento, municipio)
join public.departamento on departamento.nombre = catalogo.departamento
join public.municipio
  on municipio.departamento_id = departamento.id
 and municipio.nombre = catalogo.municipio
where sucursal.nombre = catalogo.nombre
  and (sucursal.direccion is null or sucursal.municipio_id is null);

update public.sucursal
set direccion = nombre
where direccion is null or btrim(direccion) = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sucursal_municipio_id_fkey'
  ) then
    alter table public.sucursal
      add constraint sucursal_municipio_id_fkey
      foreign key (municipio_id) references public.municipio (id) on delete restrict;
  end if;
end $$;

create or replace function public.entrega_valida_registro()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  forma text;
  departamento_del_municipio bigint;
  sucursal_activa boolean;
begin
  if tg_op = 'INSERT' then
    new.fecha_registro := now();
  end if;

  select forma_pago into forma from public.pedido where id = new.pedido_id;
  if not found then
    raise exception 'El pedido % no existe', new.pedido_id;
  end if;
  if forma is null or char_length(btrim(forma)) = 0 then
    raise exception 'El pedido % no tiene forma de pago registrada', new.pedido_id;
  end if;

  if new.tipo = 'domicilio' then
    if new.sucursal_id is not null then
      raise exception 'Una entrega a domicilio no lleva sucursal';
    end if;
    if new.direccion is not null then
      new.direccion := btrim(new.direccion);
    end if;
    if new.telefono is not null then
      new.telefono := regexp_replace(new.telefono, '[^0-9+]', '', 'g');
    end if;
    select departamento_id into departamento_del_municipio
      from public.municipio where id = new.municipio_id;
    if not found then
      raise exception 'El municipio % no existe', new.municipio_id;
    end if;
    if departamento_del_municipio is distinct from new.departamento_id then
      raise exception 'El municipio no pertenece al departamento de la entrega';
    end if;
  elsif new.tipo = 'sucursal' then
    select activa into sucursal_activa from public.sucursal where id = new.sucursal_id;
    if not found then
      raise exception 'La sucursal % no existe', new.sucursal_id;
    end if;
    if sucursal_activa is distinct from true and tg_op = 'INSERT' then
      raise exception 'La sucursal % está inactiva y no puede elegirse para el retiro', new.sucursal_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists entrega_valida_registro on public.entrega;
create trigger entrega_valida_registro
before insert or update on public.entrega
for each row
execute function public.entrega_valida_registro();

alter table public.departamento enable row level security;
alter table public.municipio enable row level security;
alter table public.entrega enable row level security;

drop policy if exists "cualquiera consulta los departamentos" on public.departamento;
create policy "cualquiera consulta los departamentos"
on public.departamento for select to anon, authenticated using (true);

drop policy if exists "cualquiera consulta los municipios" on public.municipio;
create policy "cualquiera consulta los municipios"
on public.municipio for select to anon, authenticated using (true);

drop policy if exists "el cliente consulta la entrega de sus pedidos" on public.entrega;
create policy "el cliente consulta la entrega de sus pedidos"
on public.entrega for select to authenticated
using (
  exists (
    select 1 from public.pedido
    where pedido.id = entrega.pedido_id
      and pedido.usuario_id = (select auth.uid())
  )
);

drop policy if exists "el cliente registra la entrega de sus pedidos" on public.entrega;
create policy "el cliente registra la entrega de sus pedidos"
on public.entrega for insert to authenticated
with check (
  exists (
    select 1 from public.pedido
    where pedido.id = entrega.pedido_id
      and pedido.usuario_id = (select auth.uid())
      and pedido.forma_pago is not null
  )
);

grant execute on function public.entrega_valida_registro() to authenticated, service_role;
grant select on table public.departamento to anon, authenticated;
grant select on table public.municipio to anon, authenticated;
grant select, insert on table public.entrega to authenticated;
grant select, insert, update, delete on table public.departamento to service_role;
grant select, insert, update, delete on table public.municipio to service_role;
grant select, insert, update, delete on table public.entrega to service_role;
