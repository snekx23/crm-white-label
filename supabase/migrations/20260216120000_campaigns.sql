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
