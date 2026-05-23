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
