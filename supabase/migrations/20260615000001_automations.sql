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
