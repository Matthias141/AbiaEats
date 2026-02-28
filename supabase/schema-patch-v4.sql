-- =============================================================================
-- AbiaEats — Schema Patch v4
-- Adds: restaurant_applications table, storage RLS policies
-- Date: 2026-02-28
-- =============================================================================

-- -----------------------------------------------------------------------------
-- restaurant_applications: pending restaurant self-registrations
-- Restaurants submit here first; admin approves before they go live
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.restaurant_applications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name                text NOT NULL,
  description         text,
  phone               text NOT NULL,
  address             text NOT NULL,
  city                city_enum NOT NULL,
  cuisine_tags        text[] NOT NULL DEFAULT '{}',
  delivery_fee        integer NOT NULL DEFAULT 0,
  min_delivery_time   integer NOT NULL DEFAULT 30,
  max_delivery_time   integer NOT NULL DEFAULT 60,
  bank_name           text,
  bank_account_number text,
  bank_account_name   text,
  -- Review fields
  status              text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by         uuid REFERENCES public.profiles(id),
  reviewed_at         timestamptz,
  rejection_reason    text,
  -- Restaurant created from this application
  restaurant_id       uuid REFERENCES public.restaurants(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.restaurant_applications IS 'Pending restaurant self-registration applications awaiting admin approval';

-- RLS
ALTER TABLE public.restaurant_applications ENABLE ROW LEVEL SECURITY;

-- Applicants can see and create their own applications
CREATE POLICY app_select_own ON public.restaurant_applications
  FOR SELECT TO authenticated USING (applicant_id = auth.uid());

CREATE POLICY app_insert_own ON public.restaurant_applications
  FOR INSERT TO authenticated WITH CHECK (applicant_id = auth.uid());

-- Admins have full access
CREATE POLICY app_all_admin ON public.restaurant_applications
  FOR ALL TO authenticated USING (is_admin());

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS restaurant_applications_updated_at ON public.restaurant_applications;
CREATE TRIGGER restaurant_applications_updated_at
  BEFORE UPDATE ON public.restaurant_applications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Schema version
INSERT INTO public.schema_version (version, description)
VALUES (4, 'restaurant_applications table + storage policies')
ON CONFLICT (version) DO NOTHING;
