-- AbiaEats Security Patch v3
-- SECURITY DEFINER search_path hardening + schema_version table

-- Harden the functions installed by schema.sql without changing their signatures.
ALTER FUNCTION public.get_user_role() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;
ALTER FUNCTION public.owns_restaurant(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.log_audit(text, uuid, text, text, jsonb, text) SET search_path = public, pg_temp;

CREATE TABLE IF NOT EXISTS public.schema_version (
  version    integer PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now(),
  description text NOT NULL
);

INSERT INTO public.schema_version (version, description)
VALUES (3, 'SECURITY DEFINER search_path hardening + schema_version table')
ON CONFLICT (version) DO NOTHING;