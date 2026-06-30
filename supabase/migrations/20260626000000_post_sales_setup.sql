-- Rename existing 'Ganho' stage to 'Show Fechado'
UPDATE public.pipeline_stages
SET name = 'Show Fechado'
WHERE name = 'Ganho';

-- Update the handle_new_user function to create 'Show Fechado' for new tenants
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id uuid;
  pipeline_id uuid;
  base_slug text;
  final_slug text;
  i int := 0;
  fullname text;
  compname text;
BEGIN
  fullname := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, fullname);

  compname := coalesce(new.raw_user_meta_data->>'company_name', split_part(new.email, '@', 1));
  base_slug := lower(regexp_replace(compname, '[^a-z0-9]+', '-', 'g'));
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.tenants WHERE slug = final_slug) LOOP
    i := i + 1;
    final_slug := base_slug || '-' || i;
  END LOOP;

  INSERT INTO public.tenants (name, slug)
  VALUES (compname, final_slug)
  RETURNING id INTO new_tenant_id;

  INSERT INTO public.tenant_members (tenant_id, user_id, role)
  VALUES (new_tenant_id, new.id, 'owner');

  UPDATE public.profiles SET default_tenant_id = new_tenant_id WHERE id = new.id;

  INSERT INTO public.pipelines (tenant_id, name, is_default)
  VALUES (new_tenant_id, 'Pipeline Principal', true)
  RETURNING id INTO pipeline_id;

  INSERT INTO public.pipeline_stages (tenant_id, pipeline_id, name, position, color, is_won, is_lost) VALUES
    (new_tenant_id, pipeline_id, 'Novo Lead',     0, '#3b82f6', false, false),
    (new_tenant_id, pipeline_id, 'Em Atendimento', 1, '#a855f7', false, false),
    (new_tenant_id, pipeline_id, 'Proposta',       2, '#eab308', false, false),
    (new_tenant_id, pipeline_id, 'Negociacao',     3, '#f97316', false, false),
    (new_tenant_id, pipeline_id, 'Show Fechado',   4, '#22c55e', true,  false),
    (new_tenant_id, pipeline_id, 'Perdido',        5, '#ef4444', false, true );

  RETURN new;
END;
$$;
