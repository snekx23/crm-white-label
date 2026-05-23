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
