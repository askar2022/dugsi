-- Demo logins for the Noor sample school. Paste in the production SQL Editor.
-- Admin   admin@noor.dugsi    Dugsi123!
-- Teacher teacher@noor.dugsi  Dugsi123!
-- Parent  parent@noor.dugsi   Dugsi123!

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.ensure_noor_demo_login(
  p_email text,
  p_name text,
  p_role text,
  p_tenant text,
  p_password text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_id uuid;
  v_has_password_hash boolean;
  v_has_provider_id boolean;
BEGIN
  SELECT id INTO v_id FROM auth.users WHERE lower(email) = lower(p_email);
  IF v_id IS NULL THEN
    v_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_id,
      'authenticated',
      'authenticated',
      lower(p_email),
      crypt(p_password, gen_salt('bf')),
      now(),
      jsonb_build_object(
        'provider', 'email',
        'providers', ARRAY['email'],
        'role', p_role,
        'tenant_id', p_tenant,
        'tenant_slug', 'noor',
        'tenant_name', 'Masjid Al-Noor Weekend Dugsi'
      ),
      jsonb_build_object('name', p_name),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  ELSE
    UPDATE auth.users
    SET
      encrypted_password = crypt(p_password, gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_app_meta_data = jsonb_build_object(
        'provider', 'email',
        'providers', ARRAY['email'],
        'role', p_role,
        'tenant_id', p_tenant,
        'tenant_slug', 'noor',
        'tenant_name', 'Masjid Al-Noor Weekend Dugsi'
      ),
      raw_user_meta_data = jsonb_build_object('name', p_name),
      updated_at = now()
    WHERE id = v_id;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'provider_id'
  ) INTO v_has_provider_id;

  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_id AND provider = 'email') THEN
    IF v_has_provider_id THEN
      INSERT INTO auth.identities (
        user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
      ) VALUES (
        v_id,
        jsonb_build_object('sub', v_id::text, 'email', lower(p_email)),
        'email',
        v_id::text,
        now(),
        now(),
        now()
      );
    ELSE
      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) VALUES (
        v_id,
        v_id,
        jsonb_build_object('sub', v_id::text, 'email', lower(p_email)),
        'email',
        now(),
        now(),
        now()
      );
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'passwordHash'
  ) INTO v_has_password_hash;

  IF v_has_password_hash THEN
    INSERT INTO public."User" (id, "tenantId", email, name, role, status, "passwordHash")
    VALUES (v_id::text, p_tenant, lower(p_email), p_name, p_role, 'active', 'supabase-auth')
    ON CONFLICT (id) DO UPDATE
    SET "tenantId" = excluded."tenantId",
        email = excluded.email,
        name = excluded.name,
        role = excluded.role,
        status = 'active';
  ELSE
    INSERT INTO public."User" (id, "tenantId", email, name, role, status)
    VALUES (v_id::text, p_tenant, lower(p_email), p_name, p_role, 'active')
    ON CONFLICT (id) DO UPDATE
    SET "tenantId" = excluded."tenantId",
        email = excluded.email,
        name = excluded.name,
        role = excluded.role,
        status = 'active';
  END IF;

  RETURN v_id;
END;
$$;

DO $$
DECLARE
  v_tenant text;
  v_admin uuid;
  v_teacher uuid;
  v_parent uuid;
BEGIN
  SELECT id INTO v_tenant FROM public."Tenant" WHERE slug = 'noor';
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Noor school is missing. Run the sample Noor SQL first.';
  END IF;

  v_admin := public.ensure_noor_demo_login('admin@noor.dugsi', 'Imam Yusuf', 'ADMIN', v_tenant, 'Dugsi123!');
  v_teacher := public.ensure_noor_demo_login('teacher@noor.dugsi', 'Sister Maryam', 'TEACHER', v_tenant, 'Dugsi123!');
  v_parent := public.ensure_noor_demo_login('parent@noor.dugsi', 'Amina Hassan', 'PARENT', v_tenant, 'Dugsi123!');

  UPDATE public."Class"
  SET "teacherId" = v_teacher::text
  WHERE "tenantId" = v_tenant;

  UPDATE public."Student"
  SET "parentId" = v_parent::text
  WHERE "tenantId" = v_tenant
    AND id LIKE 'sample-noor-%';
END;
$$;

DROP FUNCTION public.ensure_noor_demo_login(text, text, text, text, text);
