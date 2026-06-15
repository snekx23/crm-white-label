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
