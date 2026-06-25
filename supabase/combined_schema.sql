-- =====================================================================
-- RESET SCHEMA (Limpa estrutura anterior)
-- =====================================================================
drop schema public cascade;
create schema public;
grant all on schema public to postgres;
grant all on schema public to public;

-- Clean existing storage policies
drop policy if exists "lead_files_select" on storage.objects;
drop policy if exists "lead_files_insert" on storage.objects;
drop policy if exists "lead_files_delete" on storage.objects;
drop policy if exists "tenant_logos_select" on storage.objects;
drop policy if exists "tenant_logos_insert" on storage.objects;
drop policy if exists "tenant_logos_update" on storage.objects;
drop policy if exists "tenant_logos_delete" on storage.objects;

-- Re-grant schema usage to standard Supabase roles
grant usage on schema public to postgres, anon, authenticated, service_role;

-- Grant privileges on all existing tables/functions/sequences in public schema
grant all privileges on all tables in schema public to postgres, anon, authenticated, service_role;
grant all privileges on all functions in schema public to postgres, anon, authenticated, service_role;
grant all privileges on all sequences in schema public to postgres, anon, authenticated, service_role;

-- Setup default privileges for all future tables/functions/sequences
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;

-- =====================================================================

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

create table public.whatsapp_groups (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  whatsapp_account_id uuid references public.whatsapp_accounts(id) on delete set null,
  provider_group_id text not null,
  subject text not null,
  description text,
  owner_jid text,
  participant_count int,
  last_event_type text,
  last_event_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, provider_group_id)
);

alter table public.whatsapp_groups enable row level security;
create policy "whatsapp_groups_tenant_all" on public.whatsapp_groups
  for all using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

create table public.whatsapp_group_labels (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  color text not null default '#94a3b8',
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

alter table public.whatsapp_group_labels enable row level security;
create policy "whatsapp_group_labels_tenant_all" on public.whatsapp_group_labels
  for all using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

create table public.whatsapp_group_label_assignments (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  group_id uuid not null references public.whatsapp_groups(id) on delete cascade,
  label_id uuid not null references public.whatsapp_group_labels(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, label_id)
);

alter table public.whatsapp_group_label_assignments enable row level security;
create policy "whatsapp_group_label_assignments_tenant_all" on public.whatsapp_group_label_assignments
  for all using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

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


-- ==========================================

-- =====================================================================
-- RLS policies - todas as tabelas isoladas por tenant
-- =====================================================================

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.tenant_members enable row level security;
alter table public.pipelines enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;
alter table public.whatsapp_accounts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.files enable row level security;
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;

-- Tenants: usuario ve apenas tenants em que e membro
create policy "tenants_select_member" on public.tenants
  for select using (public.is_tenant_member(id));

create policy "tenants_update_admin" on public.tenants
  for update using (public.has_tenant_role(id, array['owner','admin']::public.member_role[]));

-- Profiles: cada um ve/edita o proprio
create policy "profiles_self_select" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_self_upsert" on public.profiles
  for insert with check (id = auth.uid());

create policy "profiles_self_update" on public.profiles
  for update using (id = auth.uid());

-- Tenant members: visivel para membros do mesmo tenant
create policy "members_select" on public.tenant_members
  for select using (public.is_tenant_member(tenant_id));

create policy "members_admin_write" on public.tenant_members
  for all using (public.has_tenant_role(tenant_id, array['owner','admin']::public.member_role[]))
  with check (public.has_tenant_role(tenant_id, array['owner','admin']::public.member_role[]));

-- Padrao para tabelas tenant-scoped: SELECT/INSERT/UPDATE/DELETE para membros
do $$
declare
  t text;
  tenant_tables text[] := array[
    'pipelines','pipeline_stages','leads','lead_activities',
    'whatsapp_accounts','conversations','messages','files',
    'products','stock_movements'
  ];
begin
  foreach t in array tenant_tables loop
    execute format($f$
      create policy "%1$s_tenant_select" on public.%1$s
        for select using (public.is_tenant_member(tenant_id));
      create policy "%1$s_tenant_insert" on public.%1$s
        for insert with check (public.is_tenant_member(tenant_id));
      create policy "%1$s_tenant_update" on public.%1$s
        for update using (public.is_tenant_member(tenant_id))
        with check (public.is_tenant_member(tenant_id));
      create policy "%1$s_tenant_delete" on public.%1$s
        for delete using (public.has_tenant_role(tenant_id, array['owner','admin']::public.member_role[]));
    $f$, t);
  end loop;
end $$;

-- Realtime publication
alter publication supabase_realtime add table public.leads;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;


-- ==========================================

-- =====================================================================
-- Auto-criar profile + tenant default no signup
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_tenant_id uuid;
  pipeline_id uuid;
  base_slug text;
  final_slug text;
  i int := 0;
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));

  base_slug := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'company_name', split_part(new.email, '@', 1)), '[^a-z0-9]+', '-', 'g'));
  final_slug := base_slug;
  while exists (select 1 from public.tenants where slug = final_slug) loop
    i := i + 1;
    final_slug := base_slug || '-' || i;
  end loop;

  insert into public.tenants (name, slug)
  values (coalesce(new.raw_user_meta_data->>'company_name', 'Minha Empresa'), final_slug)
  returning id into new_tenant_id;

  insert into public.tenant_members (tenant_id, user_id, role)
  values (new_tenant_id, new.id, 'owner');

  update public.profiles set default_tenant_id = new_tenant_id where id = new.id;

  insert into public.pipelines (tenant_id, name, is_default)
  values (new_tenant_id, 'Pipeline Principal', true)
  returning id into pipeline_id;

  insert into public.pipeline_stages (tenant_id, pipeline_id, name, position, color, is_won, is_lost) values
    (new_tenant_id, pipeline_id, 'Novo Lead',     0, '#3b82f6', false, false),
    (new_tenant_id, pipeline_id, 'Em Atendimento', 1, '#a855f7', false, false),
    (new_tenant_id, pipeline_id, 'Proposta',       2, '#eab308', false, false),
    (new_tenant_id, pipeline_id, 'Negociacao',     3, '#f97316', false, false),
    (new_tenant_id, pipeline_id, 'Ganho',          4, '#22c55e', true,  false),
    (new_tenant_id, pipeline_id, 'Perdido',        5, '#ef4444', false, true );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Storage bucket para arquivos
insert into storage.buckets (id, name, public)
values ('lead-files', 'lead-files', false)
on conflict (id) do nothing;

create policy "lead_files_select" on storage.objects
  for select using (
    bucket_id = 'lead-files'
    and (storage.foldername(name))[1]::uuid in (select public.user_tenant_ids())
  );

create policy "lead_files_insert" on storage.objects
  for insert with check (
    bucket_id = 'lead-files'
    and (storage.foldername(name))[1]::uuid in (select public.user_tenant_ids())
  );

create policy "lead_files_delete" on storage.objects
  for delete using (
    bucket_id = 'lead-files'
    and (storage.foldername(name))[1]::uuid in (select public.user_tenant_ids())
  );


-- ==========================================

-- Campanhas de disparo WhatsApp (estilo Zenvia) + templates

create type public.campaign_status as enum (
  'draft',
  'scheduled',
  'running',
  'completed',
  'cancelled',
  'failed'
);

create type public.campaign_message_mode as enum ('template', 'text');

create type public.campaign_recipient_status as enum (
  'pending',
  'sent',
  'failed',
  'skipped'
);

create table public.message_templates (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  channel text not null default 'whatsapp',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.message_templates (tenant_id);

create table public.campaigns (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  status public.campaign_status not null default 'draft',
  message_mode public.campaign_message_mode not null default 'template',
  template_id uuid references public.message_templates(id) on delete set null,
  body_text text,
  filters jsonb not null default '{}'::jsonb,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  max_per_run int not null default 20,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.campaigns (tenant_id, status);
create index on public.campaigns (tenant_id, scheduled_at);

create table public.campaign_recipients (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  phone text not null,
  status public.campaign_recipient_status not null default 'pending',
  error text,
  sent_at timestamptz,
  external_message_id text,
  created_at timestamptz not null default now(),
  unique (campaign_id, lead_id)
);

create index on public.campaign_recipients (campaign_id, status);
create index on public.campaign_recipients (tenant_id);

create or replace function public.touch_campaigns_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger campaigns_touch
  before update on public.campaigns
  for each row execute function public.touch_campaigns_updated_at();

create or replace function public.touch_message_templates_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger message_templates_touch
  before update on public.message_templates
  for each row execute function public.touch_message_templates_updated_at();

alter table public.message_templates enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_recipients enable row level security;

create policy "message_templates_tenant_select" on public.message_templates
  for select using (public.is_tenant_member(tenant_id));
create policy "message_templates_tenant_insert" on public.message_templates
  for insert with check (public.is_tenant_member(tenant_id));
create policy "message_templates_tenant_update" on public.message_templates
  for update using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));
create policy "message_templates_tenant_delete" on public.message_templates
  for delete using (public.has_tenant_role(tenant_id, array['owner','admin']::public.member_role[]));

create policy "campaigns_tenant_select" on public.campaigns
  for select using (public.is_tenant_member(tenant_id));
create policy "campaigns_tenant_insert" on public.campaigns
  for insert with check (public.is_tenant_member(tenant_id));
create policy "campaigns_tenant_update" on public.campaigns
  for update using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));
create policy "campaigns_tenant_delete" on public.campaigns
  for delete using (public.has_tenant_role(tenant_id, array['owner','admin']::public.member_role[]));

create policy "campaign_recipients_tenant_select" on public.campaign_recipients
  for select using (public.is_tenant_member(tenant_id));
create policy "campaign_recipients_tenant_insert" on public.campaign_recipients
  for insert with check (public.is_tenant_member(tenant_id));
create policy "campaign_recipients_tenant_update" on public.campaign_recipients
  for update using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));
create policy "campaign_recipients_tenant_delete" on public.campaign_recipients
  for delete using (public.has_tenant_role(tenant_id, array['owner','admin']::public.member_role[]));


-- ==========================================

-- WhatsApp @lid (Linked ID) para contatos sem telefone exposto no webhook
alter table public.leads
  add column if not exists whatsapp_lid text;

create index if not exists leads_tenant_whatsapp_lid_idx
  on public.leads (tenant_id, whatsapp_lid)
  where whatsapp_lid is not null;

-- Log bruto de webhooks Z-API (diagnóstico; service role only)
create table if not exists public.whatsapp_webhook_logs (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  whatsapp_account_id uuid references public.whatsapp_accounts(id) on delete set null,
  event_type text,
  from_me boolean,
  contact_phone text,
  contact_lid text,
  parsed_count int not null default 0,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index on public.whatsapp_webhook_logs (tenant_id, created_at desc);

alter table public.whatsapp_webhook_logs enable row level security;

create policy "webhook_logs_tenant_select" on public.whatsapp_webhook_logs
  for select using (public.is_tenant_member(tenant_id));


-- ==========================================

-- Evita leads duplicados com o mesmo telefone no tenant (condição de corrida no webhook).
create unique index if not exists leads_tenant_phone_unique
  on public.leads (tenant_id, phone)
  where phone is not null;


-- ==========================================

-- Corrige slug da empresa no signup (evita slug vazio ou começando com hífen).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_tenant_id uuid;
  pipeline_id uuid;
  base_slug text;
  final_slug text;
  i int := 0;
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));

  base_slug := lower(
    regexp_replace(
      coalesce(new.raw_user_meta_data->>'company_name', split_part(new.email, '@', 1)),
      '[^a-z0-9]+',
      '-',
      'g'
    )
  );
  base_slug := trim(both '-' from base_slug);
  if base_slug = '' or base_slug is null then
    base_slug := 'empresa';
  end if;

  final_slug := base_slug;
  while exists (select 1 from public.tenants where slug = final_slug) loop
    i := i + 1;
    final_slug := base_slug || '-' || i;
  end loop;

  insert into public.tenants (name, slug)
  values (coalesce(new.raw_user_meta_data->>'company_name', 'Minha Empresa'), final_slug)
  returning id into new_tenant_id;

  insert into public.tenant_members (tenant_id, user_id, role)
  values (new_tenant_id, new.id, 'owner');

  update public.profiles set default_tenant_id = new_tenant_id where id = new.id;

  insert into public.pipelines (tenant_id, name, is_default)
  values (new_tenant_id, 'Pipeline Principal', true)
  returning id into pipeline_id;

  insert into public.pipeline_stages (tenant_id, pipeline_id, name, position, color, is_won, is_lost) values
    (new_tenant_id, pipeline_id, 'Novo Lead',      0, '#3b82f6', false, false),
    (new_tenant_id, pipeline_id, 'Em Atendimento', 1, '#a855f7', false, false),
    (new_tenant_id, pipeline_id, 'Proposta',       2, '#eab308', false, false),
    (new_tenant_id, pipeline_id, 'Negociacao',     3, '#f97316', false, false),
    (new_tenant_id, pipeline_id, 'Ganho',          4, '#22c55e', true,  false),
    (new_tenant_id, pipeline_id, 'Perdido',        5, '#ef4444', false, true);

  return new;
end;
$$;


-- ==========================================

-- Colunas de identidade (se ainda nao existirem no remoto)
alter table public.tenants add column if not exists tagline text;
alter table public.tenants add column if not exists email text;
alter table public.tenants add column if not exists phone text;
alter table public.tenants add column if not exists website text;

-- Mensagens rapidas por empresa
create table if not exists public.quick_messages (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  body text not null,
  sort_order int not null default 0,
  is_preset boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quick_messages_tenant_sort_idx
  on public.quick_messages (tenant_id, sort_order, created_at);

alter table public.quick_messages enable row level security;

drop policy if exists "quick_messages_select" on public.quick_messages;
create policy "quick_messages_select" on public.quick_messages
  for select using (public.is_tenant_member(tenant_id));

create policy "quick_messages_insert" on public.quick_messages
  for insert with check (public.has_tenant_role(tenant_id, array['owner','admin']::public.member_role[]));

create policy "quick_messages_update" on public.quick_messages
  for update using (public.has_tenant_role(tenant_id, array['owner','admin']::public.member_role[]))
  with check (public.has_tenant_role(tenant_id, array['owner','admin']::public.member_role[]));

create policy "quick_messages_delete" on public.quick_messages
  for delete using (public.has_tenant_role(tenant_id, array['owner','admin']::public.member_role[]));

-- Bucket publico para logos
insert into storage.buckets (id, name, public)
values ('tenant-logos', 'tenant-logos', true)
on conflict (id) do nothing;

create policy "tenant_logos_select" on storage.objects
  for select using (bucket_id = 'tenant-logos');

create policy "tenant_logos_insert" on storage.objects
  for insert with check (
    bucket_id = 'tenant-logos'
    and (storage.foldername(name))[1]::uuid in (select public.user_tenant_ids())
    and public.has_tenant_role((storage.foldername(name))[1]::uuid, array['owner','admin']::public.member_role[])
  );

create policy "tenant_logos_update" on storage.objects
  for update using (
    bucket_id = 'tenant-logos'
    and (storage.foldername(name))[1]::uuid in (select public.user_tenant_ids())
    and public.has_tenant_role((storage.foldername(name))[1]::uuid, array['owner','admin']::public.member_role[])
  );

create policy "tenant_logos_delete" on storage.objects
  for delete using (
    bucket_id = 'tenant-logos'
    and (storage.foldername(name))[1]::uuid in (select public.user_tenant_ids())
    and public.has_tenant_role((storage.foldername(name))[1]::uuid, array['owner','admin']::public.member_role[])
  );


-- ==========================================

-- Vendedores tambem podem criar/editar/excluir mensagens rapidas da empresa
drop policy if exists "quick_messages_insert" on public.quick_messages;
create policy "quick_messages_insert" on public.quick_messages
  for insert with check (public.is_tenant_member(tenant_id));

drop policy if exists "quick_messages_update" on public.quick_messages;
create policy "quick_messages_update" on public.quick_messages
  for update using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

drop policy if exists "quick_messages_delete" on public.quick_messages;
create policy "quick_messages_delete" on public.quick_messages
  for delete using (public.is_tenant_member(tenant_id));


-- ==========================================

-- Corrige textos sem acento nos modelos padrão de mensagens rápidas
update public.quick_messages
set title = 'Saudação', body = 'Olá! Tudo bem? Como posso te ajudar hoje?'
where title = 'Saudacao' and body = 'Ola! Tudo bem? Como posso te ajudar hoje?';

update public.quick_messages
set body = 'Obrigado pelo contato! Qualquer dúvida, estou à disposição.'
where title = 'Agradecimento' and body = 'Obrigado pelo contato! Qualquer duvida, estou a disposicao.';

update public.quick_messages
set title = 'Horário comercial', body = 'Nosso horário de atendimento é de segunda a sexta, das 9h às 18h.'
where title = 'Horario comercial';

update public.quick_messages
set body = 'Perfeito! Vou preparar as informações e já te envio os próximos passos.'
where title = 'Confirmar interesse' and body like '%informacoes%';

update public.quick_messages
set body = 'Podemos agendar uma conversa rápida? Me diga dois horários que funcionam para você.'
where title = 'Agendar conversa' and body like '%rapida%';

update public.quick_messages
set body = 'Passando para saber se ficou alguma dúvida sobre nossa última conversa.'
where title = 'Follow-up' and body like '%duvida%';


-- ==========================================

-- Adicionar configurações do Meta Ads por empresa (Tenant) no CRM
alter table public.tenants add column if not exists meta_pixel_id text;
alter table public.tenants add column if not exists meta_capi_token text;
alter table public.tenants add column if not exists meta_ad_account_id text;


-- ==========================================

alter type public.member_role add value if not exists 'gerente';
alter type public.member_role add value if not exists 'atendente';


-- ==========================================

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


-- ==========================================

-- =====================================================================
-- Instagram DM Integration
-- =====================================================================

create table public.instagram_accounts (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  page_id text not null,
  instagram_business_account_id text,
  page_access_token text not null,
  display_name text,
  is_active boolean not null default true,
  webhook_verify_token text,
  created_at timestamptz not null default now(),
  unique (tenant_id, page_id)
);

create index on public.instagram_accounts (tenant_id);

-- Identifier for leads that came via Instagram DM (PSID = Page-Scoped User ID)
alter table public.leads add column instagram_sender_id text;
create index on public.leads (tenant_id, instagram_sender_id);

-- RLS
alter table public.instagram_accounts enable row level security;

create policy "tenant members can view instagram accounts"
  on public.instagram_accounts for select
  using (is_tenant_member(tenant_id));

create policy "tenant admins can insert instagram accounts"
  on public.instagram_accounts for insert
  with check (has_tenant_role(tenant_id, array['owner','admin']::public.member_role[]));

create policy "tenant admins can update instagram accounts"
  on public.instagram_accounts for update
  using (has_tenant_role(tenant_id, array['owner','admin']::public.member_role[]));

create policy "tenant admins can delete instagram accounts"
  on public.instagram_accounts for delete
  using (has_tenant_role(tenant_id, array['owner','admin']::public.member_role[]));


-- ==========================================

-- =====================================================================
-- Automation Flows - Editor Visual + Motor de Execucao
-- =====================================================================

create table public.automation_flows (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  trigger_kind text not null,
  status text not null default 'draft' check (status in ('draft','active','paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.automation_flows (tenant_id, status);

create trigger automation_flows_touch
  before update on public.automation_flows
  for each row execute function public.touch_updated_at();

-- Versioned config: blocks (nodes) + connections (edges)
create table public.automation_versions (
  id uuid primary key default uuid_generate_v4(),
  flow_id uuid not null references public.automation_flows(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  version_number int not null default 1,
  config jsonb not null default '{"blocks":[],"connections":[]}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (flow_id, version_number)
);

create index on public.automation_versions (flow_id, version_number desc);

-- Each trigger creates one execution per lead
create table public.automation_executions (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  flow_id uuid not null references public.automation_flows(id) on delete cascade,
  version_id uuid not null references public.automation_versions(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  trigger_kind text not null,
  trigger_payload jsonb not null default '{}'::jsonb,
  status text not null default 'running' check (status in ('running','completed','failed','cancelled')),
  idempotency_key text not null unique,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error_message text
);

create index on public.automation_executions (tenant_id, flow_id, status);
create index on public.automation_executions (tenant_id, lead_id);

-- Individual block steps inside an execution
create table public.automation_execution_steps (
  id uuid primary key default uuid_generate_v4(),
  execution_id uuid not null references public.automation_executions(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  block_id text not null,
  block_type text not null,
  status text not null default 'pending'
    check (status in ('pending','running','done','failed','waiting')),
  resume_at timestamptz,
  input_payload jsonb not null default '{}'::jsonb,
  result_payload jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.automation_execution_steps (execution_id, status);
create index on public.automation_execution_steps (tenant_id, status, resume_at)
  where status = 'waiting';

create trigger automation_steps_touch
  before update on public.automation_execution_steps
  for each row execute function public.touch_updated_at();

-- RLS
alter table public.automation_flows enable row level security;
alter table public.automation_versions enable row level security;
alter table public.automation_executions enable row level security;
alter table public.automation_execution_steps enable row level security;

create policy "tenant members read flows"
  on public.automation_flows for select
  using (is_tenant_member(tenant_id));

create policy "tenant admins manage flows"
  on public.automation_flows for all
  using (has_tenant_role(tenant_id, array['owner','admin']::public.member_role[]));

create policy "tenant members read versions"
  on public.automation_versions for select
  using (is_tenant_member(tenant_id));

create policy "tenant admins manage versions"
  on public.automation_versions for all
  using (has_tenant_role(tenant_id, array['owner','admin']::public.member_role[]));

create policy "tenant members read executions"
  on public.automation_executions for select
  using (is_tenant_member(tenant_id));

create policy "tenant members read steps"
  on public.automation_execution_steps for select
  using (is_tenant_member(tenant_id));


-- ==========================================

-- Status de atendimento das conversas (estilo Datacrazy)
create type public.conversation_status as enum (
  'nao_iniciada',   -- lead escreveu, ninguem respondeu ainda
  'aguardando',     -- voce respondeu, aguardando o cliente
  'em_atendimento', -- conversa ativa em andamento
  'resolvida'       -- atendimento encerrado
);

alter table public.conversations
  add column status public.conversation_status not null default 'nao_iniciada';

create index on public.conversations (tenant_id, status);

-- Backfill: deriva o status inicial a partir das mensagens existentes
update public.conversations c
set status = sub.computed
from (
  select
    conv.id,
    case
      when last_dir is null then 'nao_iniciada'::public.conversation_status
      when last_dir = 'outbound' then 'aguardando'::public.conversation_status
      when has_outbound then 'em_atendimento'::public.conversation_status
      else 'nao_iniciada'::public.conversation_status
    end as computed
  from public.conversations conv
  left join lateral (
    select direction as last_dir
    from public.messages m
    where m.conversation_id = conv.id
    order by m.created_at desc
    limit 1
  ) lm on true
  left join lateral (
    select true as has_outbound
    from public.messages m
    where m.conversation_id = conv.id and m.direction = 'outbound'
    limit 1
  ) ob on true
) sub
where c.id = sub.id;


-- ==========================================

-- Permite desligar automações por lead (atendimento humano assume)
alter table public.leads
  add column if not exists automations_enabled boolean not null default true;


-- ==========================================

-- Mensagens agendadas (enviar no futuro)
create table if not exists public.scheduled_messages (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  body text,
  media_url text,
  media_type text,
  send_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','sent','failed','cancelled')),
  error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists scheduled_messages_due_idx
  on public.scheduled_messages (status, send_at);
create index if not exists scheduled_messages_tenant_idx
  on public.scheduled_messages (tenant_id, lead_id);

alter table public.scheduled_messages enable row level security;

drop policy if exists "tenant members read scheduled" on public.scheduled_messages;
create policy "tenant members read scheduled" on public.scheduled_messages
  for select using (is_tenant_member(tenant_id));

drop policy if exists "tenant members manage scheduled" on public.scheduled_messages;
create policy "tenant members manage scheduled" on public.scheduled_messages
  for all using (is_tenant_member(tenant_id)) with check (is_tenant_member(tenant_id));


-- ==========================================

-- Funil de reuniões de vendas + lembretes
alter table public.appointments
  add column if not exists outcome text
    check (outcome in ('pending','no_show','done','closed_on_call','closed_later'))
    default 'pending',
  add column if not exists closed_at timestamptz,
  add column if not exists deal_value_cents bigint not null default 0,
  add column if not exists cost_cents bigint not null default 0,
  add column if not exists reminders_sent jsonb not null default '[]'::jsonb;

create index if not exists appointments_outcome_idx on public.appointments (tenant_id, outcome);
create index if not exists appointments_starts_idx on public.appointments (tenant_id, starts_at);

-- Backfill: agendamentos já concluídos viram "feita"
update public.appointments set outcome = 'done'
  where status = 'completed' and (outcome is null or outcome = 'pending');
update public.appointments set outcome = 'no_show'
  where status = 'no_show' and (outcome is null or outcome = 'pending');


-- ==========================================

-- Mensagens rápidas de áudio (e outras mídias)
alter table public.quick_messages
  add column if not exists media_url text,
  add column if not exists media_type text;

-- body deixa de ser obrigatório (áudio pode não ter texto)
alter table public.quick_messages alter column body drop not null;


-- ==========================================

-- Desnormaliza a última mensagem no grupo (evita varrer milhares de logs no list)
alter table public.whatsapp_groups
  add column if not exists last_message_body text,
  add column if not exists last_message_direction text,
  add column if not exists last_message_at timestamptz;

-- Índice para a thread de um grupo específico
create index if not exists wwl_group_msg_idx
  on public.whatsapp_webhook_logs (tenant_id, contact_lid, created_at desc)
  where event_type = 'GROUP_MESSAGE';

-- Índice para o list de grupos por atividade
create index if not exists wg_last_msg_idx
  on public.whatsapp_groups (tenant_id, last_message_at desc nulls last);

-- Backfill: última mensagem de cada grupo a partir dos logs existentes
update public.whatsapp_groups g set
  last_message_body = sub.body,
  last_message_direction = sub.direction,
  last_message_at = sub.message_at
from (
  select distinct on (contact_lid)
    contact_lid,
    payload->>'body' as body,
    payload->>'direction' as direction,
    coalesce(nullif(payload->>'message_at','')::timestamptz, created_at) as message_at
  from public.whatsapp_webhook_logs
  where event_type = 'GROUP_MESSAGE'
  order by contact_lid, created_at desc
) sub
where g.provider_group_id = sub.contact_lid;


-- ==========================================

