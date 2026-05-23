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
