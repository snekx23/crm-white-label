create table public.attendant_status (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_available boolean not null default true,
  last_assigned_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create table public.lead_assignment_history (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  from_user_id uuid references auth.users(id) on delete set null,
  to_user_id uuid references auth.users(id) on delete set null,
  assigned_by uuid references auth.users(id) on delete set null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table public.custom_field_definitions (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_type text not null check (entity_type in ('lead')),
  key text not null,
  label text not null,
  field_type text not null check (field_type in ('text','number','date','select','boolean','file')),
  options jsonb not null default '[]'::jsonb,
  is_required boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (tenant_id, entity_type, key)
);

create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  notes text,
  due_at timestamptz,
  status text not null default 'open' check (status in ('open','done','cancelled')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.professionals (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  phone text,
  color text default '#9d7e52',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  duration_minutes int not null check (duration_minutes > 0),
  price_cents bigint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  professional_id uuid references public.professionals(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  starts_at timestamptz not null,
  duration_minutes int not null check (duration_minutes > 0),
  status text not null default 'scheduled'
    check (status in ('scheduled','confirmed','completed','cancelled','no_show')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products
  add column if not exists tone text,
  add column if not exists length_cm int,
  add column if not exists texture text;

create table public.stock_reservations (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete cascade,
  quantity int not null check (quantity > 0),
  status text not null default 'active' check (status in ('active','released','consumed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index on public.attendant_status (tenant_id, is_available, last_assigned_at);
create index on public.lead_assignment_history (tenant_id, lead_id, created_at desc);
create index on public.custom_field_definitions (tenant_id, entity_type, sort_order);
create index on public.tasks (tenant_id, status, due_at);
create index on public.appointments (tenant_id, starts_at);
create index on public.stock_reservations (tenant_id, product_id, status);

create trigger attendant_status_touch
  before update on public.attendant_status
  for each row execute function public.touch_updated_at();

create trigger tasks_touch
  before update on public.tasks
  for each row execute function public.touch_updated_at();

create trigger appointments_touch
  before update on public.appointments
  for each row execute function public.touch_updated_at();

alter table public.attendant_status enable row level security;
alter table public.lead_assignment_history enable row level security;
alter table public.custom_field_definitions enable row level security;
alter table public.tasks enable row level security;
alter table public.professionals enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;
alter table public.stock_reservations enable row level security;

do $$
declare
  t text;
  operational_tables text[] := array[
    'attendant_status','lead_assignment_history','tasks','appointments','stock_reservations'
  ];
begin
  foreach t in array operational_tables loop
    execute format($f$
      create policy "%1$s_tenant_select" on public.%1$s
        for select using (public.is_tenant_member(tenant_id));
      create policy "%1$s_tenant_insert" on public.%1$s
        for insert with check (public.is_tenant_member(tenant_id));
      create policy "%1$s_tenant_update" on public.%1$s
        for update using (public.is_tenant_member(tenant_id))
        with check (public.is_tenant_member(tenant_id));
      create policy "%1$s_tenant_delete" on public.%1$s
        for delete using (
          public.has_tenant_role(
            tenant_id,
            array['owner','admin','gerente']::public.member_role[]
          )
        );
    $f$, t);
  end loop;
end $$;

do $$
declare
  t text;
  setup_tables text[] := array['custom_field_definitions','professionals','services'];
begin
  foreach t in array setup_tables loop
    execute format($f$
      create policy "%1$s_tenant_select" on public.%1$s
        for select using (public.is_tenant_member(tenant_id));
      create policy "%1$s_tenant_write" on public.%1$s
        for all using (
          public.has_tenant_role(
            tenant_id,
            array['owner','admin','gerente']::public.member_role[]
          )
        )
        with check (
          public.has_tenant_role(
            tenant_id,
            array['owner','admin','gerente']::public.member_role[]
          )
        );
    $f$, t);
  end loop;
end $$;

alter publication supabase_realtime add table public.appointments;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.attendant_status;

create or replace function public.seed_megas_perini_defaults(target_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pipeline_row record;
begin
  delete from public.pipelines
  where tenant_id = target_tenant_id
    and name = 'Pipeline Principal'
    and not exists (
      select 1 from public.leads where pipeline_id = public.pipelines.id
    );

  update public.pipelines set is_default = false where tenant_id = target_tenant_id;

  insert into public.pipelines (tenant_id, name, is_default)
  select target_tenant_id, seed.name, seed.is_default
  from (
    values
      ('Novas clientes', true),
      ('Aplicacoes', false),
      ('Manutencoes e retornos', false)
  ) as seed(name, is_default)
  where not exists (
    select 1 from public.pipelines
    where tenant_id = target_tenant_id and name = seed.name
  );

  update public.pipelines
  set is_default = (name = 'Novas clientes')
  where tenant_id = target_tenant_id;

  for pipeline_row in select id from public.pipelines where tenant_id = target_tenant_id loop
    if not exists (select 1 from public.pipeline_stages where pipeline_id = pipeline_row.id) then
      insert into public.pipeline_stages (tenant_id, pipeline_id, name, position, color, is_won, is_lost)
      values
        (target_tenant_id, pipeline_row.id, 'Novo lead', 0, '#9d7e52', false, false),
        (target_tenant_id, pipeline_row.id, 'Em atendimento', 1, '#7a6b58', false, false),
        (target_tenant_id, pipeline_row.id, 'Agendado', 2, '#4f6f61', false, false),
        (target_tenant_id, pipeline_row.id, 'Finalizado', 3, '#2f5d50', true, false),
        (target_tenant_id, pipeline_row.id, 'Perdido', 4, '#8b4b3a', false, true);
    end if;
  end loop;

  insert into public.custom_field_definitions
    (tenant_id, entity_type, key, label, field_type, sort_order)
  values
    (target_tenant_id, 'lead', 'metodo_aplicado', 'Metodo aplicado', 'text', 10),
    (target_tenant_id, 'lead', 'cor_tonalidade', 'Cor e tonalidade', 'text', 20),
    (target_tenant_id, 'lead', 'comprimento_cm', 'Comprimento', 'number', 30),
    (target_tenant_id, 'lead', 'textura', 'Textura', 'text', 40),
    (target_tenant_id, 'lead', 'volume', 'Volume', 'text', 50),
    (target_tenant_id, 'lead', 'data_aplicacao', 'Data da aplicacao', 'date', 60),
    (target_tenant_id, 'lead', 'proxima_manutencao', 'Proxima manutencao', 'date', 70)
  on conflict (tenant_id, entity_type, key) do nothing;
end;
$$;
