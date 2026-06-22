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
