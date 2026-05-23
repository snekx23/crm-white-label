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
