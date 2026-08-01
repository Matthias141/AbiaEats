-- =============================================================================
-- AbiaEats — Schema Patch v10
-- Adds: vendor_invites table (tracks admin-initiated restaurant-owner invites
-- separately from the Supabase Auth account/email step)
-- Date: 2026-08-01
-- =============================================================================
--
-- WHY THIS TABLE EXISTS
-- Supabase's auth.admin.inviteUserByEmail() bundles "create the auth user"
-- and "send the invite email" into one atomic API call — there is no way to
-- write a DB row first and only send the email if that succeeds using that
-- call alone. This table is the thing we write to BEFORE calling
-- inviteUserByEmail, so the two steps (DB write, email send) are actually
-- separable and orderable:
--   1. INSERT into vendor_invites (status='pending')
--   2. Only if that succeeds, call inviteUserByEmail
--   3. If the DB insert fails → throw, no email is ever sent
--   4. If the DB insert succeeds but the email call fails → the row stays
--      exactly as inserted (status='pending') so the admin can retry
--
-- Duplicate-invite prevention: a partial unique index on lower(email) WHERE
-- status='pending' means a second invite attempt for an email that already
-- has a pending row fails at the DB level with a unique violation — the app
-- also pre-checks and marks expired rows 'expired' before that, but the
-- index is the actual guarantee against races.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.vendor_invites (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  full_name     text NOT NULL,
  phone         text,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  invited_by    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- failed_post_auth: the Supabase Auth user was created successfully, but
  -- the follow-up profiles.role flip or restaurant reassignment then failed.
  -- No automatic rollback or retry — this state exists purely so the ops
  -- panel can flag it for manual fixing (see vendors/page.tsx).
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'failed_post_auth')),
  expires_at    timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.vendor_invites IS 'Admin-initiated restaurant-owner invites — written before the Supabase Auth invite email is sent, so DB state and email delivery are separately orderable steps';

-- Only one active pending invite per email at a time (case-insensitive).
-- Predicate must be immutable, so expiry is handled in application code
-- (mark expired rows 'expired' before inserting a new one) — this index is
-- the hard guarantee against concurrent duplicate inserts.
CREATE UNIQUE INDEX IF NOT EXISTS vendor_invites_email_pending_idx
  ON public.vendor_invites (lower(email))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_vendor_invites_status ON public.vendor_invites(status);
CREATE INDEX IF NOT EXISTS idx_vendor_invites_restaurant_id ON public.vendor_invites(restaurant_id);

-- RLS: admin-only, same pattern as restaurant_applications (patch v4)
ALTER TABLE public.vendor_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY vendor_invites_all_admin ON public.vendor_invites
  FOR ALL TO authenticated USING (is_admin());

-- updated_at trigger — reuses the function added in patch v4
DROP TRIGGER IF EXISTS vendor_invites_updated_at ON public.vendor_invites;
CREATE TRIGGER vendor_invites_updated_at
  BEFORE UPDATE ON public.vendor_invites
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Schema version
INSERT INTO public.schema_version (version, description)
VALUES (10, 'vendor_invites table — separates DB write from invite email send')
ON CONFLICT (version) DO NOTHING;
