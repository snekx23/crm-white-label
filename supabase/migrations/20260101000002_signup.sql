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
