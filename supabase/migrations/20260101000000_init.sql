-- =====================================================================
-- Avante CRM - Schema inicial multi-tenant
-- =====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =====================================================================
-- TENANTS & USERS
-- =====================================================================

create table public.tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  logo_url text,
  brand_color text default '#f97316',
  created_at timestamptz not null default now()
);

create type public.member_role as enum ('owner', 'admin', 'vendedor');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  default_tenant_id uuid references public.tenants(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.tenant_members (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'vendedor',
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create index on public.tenant_members (user_id);

-- Helper: retorna tenants do usuario logado
create or replace function public.user_tenant_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select tenant_id from public.tenant_members where user_id = auth.uid();
$$;

create or replace function public.is_tenant_member(t uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.tenant_members
    where user_id = auth.uid() and tenant_id = t
  );
$$;

create or replace function public.has_tenant_role(t uuid, roles public.member_role[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.tenant_members
    where user_id = auth.uid() and tenant_id = t and role = any(roles)
  );
$$;

-- =====================================================================
-- PIPELINES & STAGES (kanban)
-- =====================================================================

create table public.pipelines (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index on public.pipelines (tenant_id);

create table public.pipeline_stages (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  pipeline_id uuid not null references public.pipelines(id) on delete cascade,
  name text not null,
  position int not null default 0,
  color text default '#94a3b8',
  is_won boolean not null default false,
  is_lost boolean not null default false,
  created_at timestamptz not null default now()
);

create index on public.pipeline_stages (pipeline_id, position);

-- =====================================================================
-- LEADS
-- =====================================================================

create table public.leads (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  pipeline_id uuid references public.pipelines(id) on delete set null,
  stage_id uuid references public.pipeline_stages(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  name text not null,
  phone text,
  email text,
  source text,
  notes text,
  tags text[] not null default '{}',
  custom_fields jsonb not null default '{}'::jsonb,
  position int not null default 0,
  value_cents bigint default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.leads (tenant_id);
create index on public.leads (tenant_id, stage_id, position);
create index on public.leads (tenant_id, phone);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger leads_touch
  before update on public.leads
  for each row execute function public.touch_updated_at();

create table public.lead_activities (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index on public.lead_activities (lead_id, created_at desc);

-- =====================================================================
-- WHATSAPP & CHAT
-- =====================================================================

create type public.whatsapp_provider as enum ('cloud_api', 'evolution', 'zapi');

create table public.whatsapp_accounts (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider public.whatsapp_provider not null,
  phone_number text not null,
  display_name text,
  credentials jsonb not null default '{}'::jsonb,
  webhook_secret text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, phone_number)
);

create table public.conversations (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  whatsapp_account_id uuid references public.whatsapp_accounts(id) on delete set null,
  channel text not null default 'whatsapp',
  last_message_at timestamptz,
  unread_count int not null default 0,
  created_at timestamptz not null default now()
);

create index on public.conversations (tenant_id, last_message_at desc);
create unique index on public.conversations (tenant_id, lead_id, channel);

create type public.message_direction as enum ('inbound', 'outbound');
create type public.message_status as enum ('pending', 'sent', 'delivered', 'read', 'failed');

create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  direction public.message_direction not null,
  body text,
  media_url text,
  media_type text,
  external_id text,
  status public.message_status not null default 'pending',
  error text,
  created_at timestamptz not null default now()
);

create index on public.messages (conversation_id, created_at);
create index on public.messages (tenant_id, external_id);

-- =====================================================================
-- FILES (Fase 2)
-- =====================================================================

create table public.files (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create index on public.files (tenant_id, lead_id);

-- =====================================================================
-- ESTOQUE (Fase 3)
-- =====================================================================

create table public.products (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  sku text,
  name text not null,
  description text,
  price_cents bigint not null default 0,
  cost_cents bigint not null default 0,
  stock_quantity int not null default 0,
  min_stock int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, sku)
);

create index on public.products (tenant_id);

create trigger products_touch
  before update on public.products
  for each row execute function public.touch_updated_at();

create type public.stock_movement_kind as enum ('in', 'out', 'adjust');

create table public.stock_movements (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  kind public.stock_movement_kind not null,
  quantity int not null,
  reason text,
  created_at timestamptz not null default now()
);

create index on public.stock_movements (tenant_id, product_id, created_at desc);

create or replace function public.apply_stock_movement()
returns trigger language plpgsql as $$
begin
  if new.kind = 'in' then
    update public.products set stock_quantity = stock_quantity + new.quantity where id = new.product_id;
  elsif new.kind = 'out' then
    update public.products set stock_quantity = stock_quantity - new.quantity where id = new.product_id;
  elsif new.kind = 'adjust' then
    update public.products set stock_quantity = new.quantity where id = new.product_id;
  end if;
  return new;
end; $$;

create trigger stock_movements_apply
  after insert on public.stock_movements
  for each row execute function public.apply_stock_movement();
