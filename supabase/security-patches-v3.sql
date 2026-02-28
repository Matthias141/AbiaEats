-- AbiaEats Security Patch v3
-- SECURITY DEFINER search_path hardening + schema_version table

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.profiles WHERE id = auth.uid(); $$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'); $$;

CREATE OR REPLACE FUNCTION owns_restaurant(restaurant_uuid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_uuid AND owner_id = auth.uid()); $$;

CREATE OR REPLACE FUNCTION log_audit(
  p_action text,
  p_actor_id uuid DEFAULT NULL,
  p_target_type text DEFAULT NULL,
  p_target_id uuid DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (action, actor_id, target_type, target_id, ip_address, metadata)
  VALUES (p_action, p_actor_id, p_target_type, p_target_id, p_ip_address, p_metadata);
END;
$$;

CREATE TABLE IF NOT EXISTS public.schema_version (
  version    integer PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now(),
  description text NOT NULL
);

INSERT INTO public.schema_version (version, description)
VALUES (3, 'SECURITY DEFINER search_path hardening + schema_version table')
ON CONFLICT (version) DO NOTHING;