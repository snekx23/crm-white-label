-- Create notifications table
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  description text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.notifications enable row level security;

-- Policies for RLS
create policy "tenant members can select notifications" on public.notifications
  for select using (public.is_tenant_member(tenant_id));

create policy "tenant members can update notifications" on public.notifications
  for update using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

-- Realtime publication
alter publication supabase_realtime add table public.notifications;
