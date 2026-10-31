-- Forma de entrega del pedido (HU6).
-- No cambia pedido ni pago. pedido.forma_pago sigue siendo la forma de pago
-- (tarjeta o tienda) y es obligatoria desde HU5.
--
-- Un pedido tiene como máximo una entrega. La entrega es a domicilio o
-- retiro en una sucursal activa.
--
-- Orden de uso:
--   1. Ya existe el pedido, con forma_pago.
--   2. Se inserta una fila en entrega.
--
-- Departamento y municipio son catálogos. La sucursal apunta a un municipio
-- para no copiar la dirección de la tienda en la entrega.

create table if not exists public.departamento (
  id bigint generated always as identity primary key,
  nombre text not null,
  constraint departamento_nombre_key unique (nombre),
  constraint departamento_nombre_check
    check (char_length(btrim(nombre)) between 1 and 80)
);

comment on table public.departamento is
  'Catálogo de departamentos. El municipio pertenece a uno de estos.';

comment on column public.departamento.nombre is
  'Nombre del departamento, por ejemplo San Salvador.';

create table if not exists public.municipio (
  id bigint generated always as identity primary key,
  departamento_id bigint not null references public.departamento (id) on delete restrict,
  nombre text not null,
  constraint municipio_departamento_nombre_key unique (departamento_id, nombre),
  constraint municipio_nombre_check
    check (char_length(btrim(nombre)) between 1 and 80)
);

comment on table public.municipio is
  'Catálogo de municipios. Cada municipio pertenece a un departamento.';

comment on column public.municipio.departamento_id is
  'Departamento al que pertenece el municipio.';

create index if not exists municipio_departamento_id_idx
  on public.municipio (departamento_id);

create table if not exists public.sucursal (
  id bigint generated always as identity primary key,
  nombre text not null,
  direccion text not null,
  municipio_id bigint not null references public.municipio (id) on delete restrict,
  activa boolean not null default true,
  constraint sucursal_nombre_key unique (nombre),
  constraint sucursal_nombre_check
    check (char_length(btrim(nombre)) between 1 and 120),
  constraint sucursal_direccion_check
    check (char_length(btrim(direccion)) between 1 and 300)
);

comment on table public.sucursal is
  'Sucursal de retiro. activa = false no puede usarse en una entrega nueva.';

comment on column public.sucursal.direccion is
  'Dirección de la sucursal. La entrega de retiro apunta a la sucursal y no copia esta dirección.';

comment on column public.sucursal.municipio_id is
  'Municipio donde está la sucursal. El departamento se obtiene por el municipio.';

comment on column public.sucursal.activa is
  'true: se puede elegir para un retiro. false: no aparece como opción de un pedido nuevo.';

create index if not exists sucursal_municipio_id_idx
  on public.sucursal (municipio_id);

create index if not exists sucursal_activa_idx
  on public.sucursal (id)
  where activa;

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

comment on table public.entrega is
  'Forma de entrega de un pedido. Una sola fila por pedido: domicilio o sucursal.';

comment on column public.entrega.pedido_id is
  'Pedido al que pertenece la entrega. Es único: la relación es uno a uno.';

comment on column public.entrega.tipo is
  'domicilio o sucursal.';

comment on column public.entrega.departamento_id is
  'Obligatorio en domicilio. Vacío en retiro en sucursal.';

comment on column public.entrega.municipio_id is
  'Obligatorio en domicilio y debe pertenecer al departamento. Vacío en retiro en sucursal.';

comment on column public.entrega.direccion is
  'Dirección de entrega a domicilio. Vacía en retiro en sucursal.';

comment on column public.entrega.telefono is
  'Teléfono de contacto del domicilio. Solo dígitos, con + opcional, de 8 a 15 dígitos.';

comment on column public.entrega.sucursal_id is
  'Obligatorio en retiro. La sucursal tiene que estar activa al registrar la entrega. Vacío en domicilio.';

comment on column public.entrega.fecha_registro is
  'Momento en que se registró la entrega. Lo asigna la base de datos.';

create index if not exists entrega_departamento_id_idx
  on public.entrega (departamento_id);

create index if not exists entrega_municipio_id_idx
  on public.entrega (municipio_id);

create index if not exists entrega_sucursal_id_idx
  on public.entrega (sucursal_id);

-- La relación municipio-departamento y la sucursal activa cruzan tablas:
-- un CHECK no puede ver otras filas. Este trigger cubre esas dos reglas
-- y vuelve a exigir la forma de pago del pedido.

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

  select forma_pago
    into forma
    from public.pedido
   where id = new.pedido_id;

  if not found then
    raise exception 'El pedido % no existe', new.pedido_id;
  end if;

  -- pedido.forma_pago ya es not null. La comprobación deja la regla de la
  -- HU6 junto a la entrega, con un mensaje propio.
  if forma is null or char_length(btrim(forma)) = 0 then
    raise exception 'El pedido % no tiene forma de pago registrada', new.pedido_id;
  end if;

  if new.tipo = 'domicilio' then
    if new.sucursal_id is not null then
      raise exception 'Una entrega a domicilio no lleva sucursal';
    end if;

    if new.departamento_id is null then
      raise exception 'La entrega a domicilio requiere un departamento';
    end if;

    if new.municipio_id is null then
      raise exception 'La entrega a domicilio requiere un municipio';
    end if;

    if new.direccion is not null then
      new.direccion := btrim(new.direccion);
    end if;

    if new.direccion is null or char_length(new.direccion) < 1 or char_length(new.direccion) > 300 then
      raise exception 'La entrega a domicilio requiere la dirección';
    end if;

    if new.telefono is not null then
      new.telefono := regexp_replace(new.telefono, '[^0-9+]', '', 'g');
    end if;

    if new.telefono is null or new.telefono !~ '^\+?[0-9]{8,15}$' then
      raise exception 'La entrega a domicilio requiere un teléfono de 8 a 15 dígitos';
    end if;

    if not exists (
      select 1
      from public.departamento
      where id = new.departamento_id
    ) then
      raise exception 'El departamento % no existe', new.departamento_id;
    end if;

    select departamento_id
      into departamento_del_municipio
      from public.municipio
     where id = new.municipio_id;

    if not found then
      raise exception 'El municipio % no existe', new.municipio_id;
    end if;

    if departamento_del_municipio is distinct from new.departamento_id then
      raise exception 'El municipio no pertenece al departamento de la entrega';
    end if;

  elsif new.tipo = 'sucursal' then
    if new.departamento_id is not null
       or new.municipio_id is not null
       or new.direccion is not null
       or new.telefono is not null then
      raise exception 'El retiro en sucursal no lleva datos de domicilio';
    end if;

    if new.sucursal_id is null then
      raise exception 'El retiro en sucursal requiere una sucursal';
    end if;

    select activa
      into sucursal_activa
      from public.sucursal
     where id = new.sucursal_id;

    if not found then
      raise exception 'La sucursal % no existe', new.sucursal_id;
    end if;

    if sucursal_activa is distinct from true then
      if tg_op = 'INSERT' then
        raise exception 'La sucursal % está inactiva y no puede elegirse para el retiro', new.sucursal_id;
      end if;

      if new.sucursal_id is distinct from old.sucursal_id then
        raise exception 'La sucursal % está inactiva y no puede elegirse para el retiro', new.sucursal_id;
      end if;
    end if;
  else
    raise exception 'El tipo de entrega debe ser domicilio o sucursal';
  end if;

  return new;
end;
$$;

revoke all on function public.entrega_valida_registro() from public;
grant execute on function public.entrega_valida_registro() to authenticated, service_role;

drop trigger if exists entrega_valida_registro on public.entrega;

create trigger entrega_valida_registro
before insert or update on public.entrega
for each row
execute function public.entrega_valida_registro();

-- Catálogos visibles para armar la pantalla. Solo service_role los modifica.

alter table public.departamento enable row level security;
alter table public.municipio enable row level security;
alter table public.sucursal enable row level security;
alter table public.entrega enable row level security;

drop policy if exists "cualquiera consulta los departamentos" on public.departamento;

create policy "cualquiera consulta los departamentos"
on public.departamento
for select
to anon, authenticated
using (true);

drop policy if exists "cualquiera consulta los municipios" on public.municipio;

create policy "cualquiera consulta los municipios"
on public.municipio
for select
to anon, authenticated
using (true);

drop policy if exists "cualquiera consulta las sucursales" on public.sucursal;

create policy "cualquiera consulta las sucursales"
on public.sucursal
for select
to anon, authenticated
using (true);

drop policy if exists "el cliente consulta la entrega de sus pedidos" on public.entrega;

create policy "el cliente consulta la entrega de sus pedidos"
on public.entrega
for select
to authenticated
using (
  exists (
    select 1
    from public.pedido
    where pedido.id = entrega.pedido_id
      and pedido.usuario_id = (select auth.uid())
  )
);

drop policy if exists "el cliente registra la entrega de sus pedidos" on public.entrega;

create policy "el cliente registra la entrega de sus pedidos"
on public.entrega
for insert
to authenticated
with check (
  exists (
    select 1
    from public.pedido
    where pedido.id = entrega.pedido_id
      and pedido.usuario_id = (select auth.uid())
      and pedido.forma_pago is not null
  )
  and (
    (
      entrega.tipo = 'domicilio'
      and entrega.sucursal_id is null
      and entrega.departamento_id is not null
      and entrega.municipio_id is not null
      and entrega.direccion is not null
      and entrega.telefono is not null
      and exists (
        select 1
        from public.municipio
        where municipio.id = entrega.municipio_id
          and municipio.departamento_id = entrega.departamento_id
      )
    )
    or (
      entrega.tipo = 'sucursal'
      and entrega.departamento_id is null
      and entrega.municipio_id is null
      and entrega.direccion is null
      and entrega.telefono is null
      and exists (
        select 1
        from public.sucursal
        where sucursal.id = entrega.sucursal_id
          and sucursal.activa = true
      )
    )
  )
);

revoke all on table public.departamento from public, anon, authenticated;
grant select on table public.departamento to anon, authenticated;
grant select, insert, update, delete on table public.departamento to service_role;

revoke all on table public.municipio from public, anon, authenticated;
grant select on table public.municipio to anon, authenticated;
grant select, insert, update, delete on table public.municipio to service_role;

revoke all on table public.sucursal from public, anon, authenticated;
grant select on table public.sucursal to anon, authenticated;
grant select, insert, update, delete on table public.sucursal to service_role;

revoke all on table public.entrega from public, anon, authenticated;
grant select, insert on table public.entrega to authenticated;
grant select, insert, update, delete on table public.entrega to service_role;

-- Catálogo alineado con las listas de la pantalla de entrega.
-- FUDEM Soyapango queda inactiva a propósito.

insert into public.departamento (nombre)
select catalogo.nombre
from (values ('San Salvador'), ('La Libertad')) as catalogo (nombre)
where not exists (
  select 1
  from public.departamento existente
  where existente.nombre = catalogo.nombre
);

insert into public.municipio (departamento_id, nombre)
select departamento.id, catalogo.municipio
from (
  values
    ('San Salvador', 'San Salvador'),
    ('San Salvador', 'Soyapango'),
    ('La Libertad', 'Santa Tecla')
) as catalogo (departamento, municipio)
join public.departamento on departamento.nombre = catalogo.departamento
where not exists (
  select 1
  from public.municipio existente
  where existente.departamento_id = departamento.id
    and existente.nombre = catalogo.municipio
);

insert into public.sucursal (nombre, direccion, municipio_id, activa)
select catalogo.nombre, catalogo.direccion, municipio.id, catalogo.activa
from (
  values
    (
      'FUDEM San Salvador',
      'Alameda Juan Pablo II, local 12, San Salvador',
      'San Salvador',
      'San Salvador',
      true::boolean
    ),
    (
      'FUDEM Santa Tecla',
      'Avenida Manuel Gallardo, centro comercial, Santa Tecla',
      'La Libertad',
      'Santa Tecla',
      true::boolean
    ),
    (
      'FUDEM Soyapango',
      'Boulevard del Ejército, kilómetro 4, Soyapango',
      'San Salvador',
      'Soyapango',
      false::boolean
    )
) as catalogo (nombre, direccion, departamento, municipio, activa)
join public.departamento on departamento.nombre = catalogo.departamento
join public.municipio
  on municipio.departamento_id = departamento.id
 and municipio.nombre = catalogo.municipio
where not exists (
  select 1
  from public.sucursal existente
  where existente.nombre = catalogo.nombre
);

-- Entregas de ejemplo. Hacen falta pedidos que ya tengan forma de pago.
-- No se crean pedidos aquí: insertar en pedido exige sesión, receta y
-- producto. Si no hay pedidos libres, el catálogo igual queda cargado.
-- Si ya hay entregas, no se agregan ejemplos otra vez.
-- El texto de la dirección empieza por "EJEMPLO HU6" para reconocerlas.

do $$
declare
  pedidos bigint[];
  depto_ss bigint;
  muni_ss bigint;
  depto_ll bigint;
  muni_tecla bigint;
  sucursal_ss bigint;
  sucursal_tecla bigint;
begin
  if (select count(*) from public.entrega) > 0 then
    raise notice 'HU6: ya hay entregas; no se agregaron ejemplos.';
    return;
  end if;

  select id into depto_ss from public.departamento where nombre = 'San Salvador';
  select id into muni_ss
    from public.municipio
   where nombre = 'San Salvador' and departamento_id = depto_ss;
  select id into depto_ll from public.departamento where nombre = 'La Libertad';
  select id into muni_tecla
    from public.municipio
   where nombre = 'Santa Tecla' and departamento_id = depto_ll;
  select id into sucursal_ss
    from public.sucursal
   where nombre = 'FUDEM San Salvador' and activa = true;
  select id into sucursal_tecla
    from public.sucursal
   where nombre = 'FUDEM Santa Tecla' and activa = true;

  if depto_ss is null or muni_ss is null or depto_ll is null
     or muni_tecla is null or sucursal_ss is null or sucursal_tecla is null then
    raise exception 'HU6: faltan departamentos, municipios o sucursales de ejemplo';
  end if;

  select array(
    select pedido.id
      from public.pedido
     where pedido.forma_pago is not null
       and not exists (
         select 1 from public.entrega where entrega.pedido_id = pedido.id
       )
     order by pedido.id
     limit 4
  ) into pedidos;

  if coalesce(array_length(pedidos, 1), 0) = 0 then
    raise notice 'HU6: no hay pedidos con forma de pago y sin entrega. No se insertaron entregas de ejemplo.';
    return;
  end if;

  insert into public.entrega (
    pedido_id, tipo, departamento_id, municipio_id, direccion, telefono
  ) values (
    pedidos[1],
    'domicilio',
    depto_ss,
    muni_ss,
    'EJEMPLO HU6. Colonia Escalón, calle El Mirador, casa 123',
    '+50370000001'
  );

  if array_length(pedidos, 1) >= 2 then
    insert into public.entrega (
      pedido_id, tipo, departamento_id, municipio_id, direccion, telefono
    ) values (
      pedidos[2],
      'domicilio',
      depto_ll,
      muni_tecla,
      'EJEMPLO HU6. Residencial Santa Elena, pasaje 3, casa 14',
      '+50370000002'
    );
  end if;

  if array_length(pedidos, 1) >= 3 then
    insert into public.entrega (pedido_id, tipo, sucursal_id)
    values (pedidos[3], 'sucursal', sucursal_ss);
  end if;

  if array_length(pedidos, 1) >= 4 then
    insert into public.entrega (pedido_id, tipo, sucursal_id)
    values (pedidos[4], 'sucursal', sucursal_tecla);
  end if;

  raise notice 'HU6: entregas de ejemplo registradas en los pedidos %.', pedidos;
end;
$$;

-- La sucursal inactiva no debe quedar asociada a un pedido.
-- Si hay al menos un pedido con forma de pago, se intenta y se espera el rechazo.

do $$
declare
  pedido_prueba bigint;
  sucursal_inactiva bigint;
begin
  select id
    into sucursal_inactiva
    from public.sucursal
   where nombre = 'FUDEM Soyapango'
     and activa = false;

  if sucursal_inactiva is null then
    raise exception 'HU6: falta la sucursal inactiva de ejemplo';
  end if;

  select pedido.id
    into pedido_prueba
    from public.pedido
   where pedido.forma_pago is not null
   order by pedido.id
   limit 1;

  if pedido_prueba is null then
    raise notice 'HU6: sin pedidos no se pudo probar el rechazo de la sucursal inactiva.';
    return;
  end if;

  begin
    insert into public.entrega (pedido_id, tipo, sucursal_id)
    values (pedido_prueba, 'sucursal', sucursal_inactiva);

    raise exception 'HU6: ese retiro fue aceptado y no debió guardarse';
  exception
    when others then
      if sqlerrm ilike '%inactiva%' then
        raise notice 'HU6: sucursal inactiva rechazada (%).', sqlerrm;
      else
        raise;
      end if;
  end;
end;
$$;
