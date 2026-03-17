-- ============================================================
-- Fix handle_new_user trigger + create admin user
-- ============================================================

-- Fix the handle_new_user function (remove SET LOCAL which can cause issues)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
  v_org_name TEXT;
  v_org_slug TEXT;
  v_base_slug TEXT;
BEGIN
  v_org_name := COALESCE(
    NEW.raw_user_meta_data->>'org_name',
    split_part(NEW.email, '@', 2)
  );
  v_base_slug := lower(regexp_replace(v_org_name, '[^a-zA-Z0-9]', '-', 'g'));
  v_org_slug := v_base_slug;

  -- Ensure unique slug
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = v_org_slug) LOOP
    v_org_slug := v_base_slug || '-' || substring(gen_random_uuid()::text, 1, 4);
  END LOOP;

  INSERT INTO public.organizations (name, slug)
  VALUES (v_org_name, v_org_slug)
  RETURNING id INTO v_org_id;

  INSERT INTO public.users (id, org_id, full_name, email, role)
  VALUES (
    NEW.id,
    v_org_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'admin'
  );

  PERFORM seed_default_pipelines(v_org_id);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
