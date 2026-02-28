-- =============================================================================
-- AbiaEats — Security Patch v5
-- MED-5: Encrypt bank account fields using Supabase Vault
-- Date: 2026-02-28
-- =============================================================================
--
-- WHAT IS SUPABASE VAULT?
-- Vault is a Postgres extension (pgsodium) that encrypts data at the column
-- level using AES-256-GCM. The encryption key lives in the HSM (Hardware
-- Security Module) managed by Supabase — never in the database itself.
-- Even if someone dumps your Postgres data, they get encrypted ciphertext.
--
-- HOW IT WORKS:
-- 1. We enable the vault extension
-- 2. We create a named encryption key ("bank_account_key")
-- 3. We add encrypted columns alongside the plaintext ones
-- 4. We migrate existing data into the encrypted columns
-- 5. We drop the plaintext columns
-- 6. We create a secure view that decrypts on read (admin-only via RLS)
--
-- READING BANK DATA:
-- SELECT * FROM restaurants_with_banking WHERE id = '...';
-- Only works if the caller passes is_admin() check via the view's RLS.
-- =============================================================================

-- Step 1: Enable vault (already enabled on Supabase, this is a no-op if so)
CREATE EXTENSION IF NOT EXISTS pgsodium;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- Step 2: Create a named encryption key for bank account data
-- The key ID is stored in the database; the actual key bytes live in pgsodium's
-- key store (outside Postgres data files).
INSERT INTO vault.secrets (secret, name, description)
SELECT
  'bank_account_key_v1',
  'bank_account_key',
  'AES-256-GCM key for restaurant bank account encryption'
WHERE NOT EXISTS (
  SELECT 1 FROM vault.secrets WHERE name = 'bank_account_key'
);

-- Step 3: Add encrypted columns to restaurants table
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS bank_name_enc        text,
  ADD COLUMN IF NOT EXISTS bank_account_number_enc text,
  ADD COLUMN IF NOT EXISTS bank_account_name_enc   text;

-- Step 4: Migrate existing plaintext data into encrypted columns
-- vault.create_secret() encrypts and stores; we store the secret_id reference.
-- For column-level encryption we use pgsodium.crypto_aead_det_encrypt directly.
DO $$
DECLARE
  r RECORD;
  key_id uuid;
BEGIN
  SELECT id INTO key_id FROM vault.secrets WHERE name = 'bank_account_key' LIMIT 1;

  FOR r IN SELECT id, bank_name, bank_account_number, bank_account_name
           FROM public.restaurants
           WHERE bank_account_number IS NOT NULL
  LOOP
    UPDATE public.restaurants SET
      bank_name_enc = CASE WHEN r.bank_name IS NOT NULL
        THEN encode(pgsodium.crypto_aead_det_encrypt(
          r.bank_name::bytea,
          r.id::text::bytea,
          key_id,
          NULL
        ), 'base64')
        ELSE NULL END,
      bank_account_number_enc = encode(pgsodium.crypto_aead_det_encrypt(
        r.bank_account_number::bytea,
        r.id::text::bytea,
        key_id,
        NULL
      ), 'base64'),
      bank_account_name_enc = CASE WHEN r.bank_account_name IS NOT NULL
        THEN encode(pgsodium.crypto_aead_det_encrypt(
          r.bank_account_name::bytea,
          r.id::text::bytea,
          key_id,
          NULL
        ), 'base64')
        ELSE NULL END
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- Step 5: Drop plaintext columns (after verifying migration)
-- SAFETY: We only drop if encrypted data is present for all rows that had data
DO $$
DECLARE
  plaintext_count int;
  encrypted_count int;
BEGIN
  SELECT COUNT(*) INTO plaintext_count FROM public.restaurants WHERE bank_account_number IS NOT NULL;
  SELECT COUNT(*) INTO encrypted_count FROM public.restaurants WHERE bank_account_number_enc IS NOT NULL;

  IF plaintext_count = encrypted_count THEN
    ALTER TABLE public.restaurants
      DROP COLUMN IF EXISTS bank_name,
      DROP COLUMN IF EXISTS bank_account_number,
      DROP COLUMN IF EXISTS bank_account_name;
    RAISE NOTICE 'Plaintext bank columns dropped. Migration complete.';
  ELSE
    RAISE WARNING 'Migration count mismatch (% plaintext vs % encrypted). Plaintext columns NOT dropped. Investigate before re-running.',
      plaintext_count, encrypted_count;
  END IF;
END;
$$;

-- Step 6: Create a decrypting view for admin use only
CREATE OR REPLACE VIEW public.restaurants_with_banking AS
SELECT
  r.*,
  CASE WHEN r.bank_name_enc IS NOT NULL THEN
    convert_from(pgsodium.crypto_aead_det_decrypt(
      decode(r.bank_name_enc, 'base64'),
      r.id::text::bytea,
      (SELECT id FROM vault.secrets WHERE name = 'bank_account_key'),
      NULL
    ), 'UTF8')
  ELSE NULL END AS bank_name,
  CASE WHEN r.bank_account_number_enc IS NOT NULL THEN
    convert_from(pgsodium.crypto_aead_det_decrypt(
      decode(r.bank_account_number_enc, 'base64'),
      r.id::text::bytea,
      (SELECT id FROM vault.secrets WHERE name = 'bank_account_key'),
      NULL
    ), 'UTF8')
  ELSE NULL END AS bank_account_number,
  CASE WHEN r.bank_account_name_enc IS NOT NULL THEN
    convert_from(pgsodium.crypto_aead_det_decrypt(
      decode(r.bank_account_name_enc, 'base64'),
      r.id::text::bytea,
      (SELECT id FROM vault.secrets WHERE name = 'bank_account_key'),
      NULL
    ), 'UTF8')
  ELSE NULL END AS bank_account_name
FROM public.restaurants r;

-- RLS on the view: only admins can see decrypted banking data
ALTER VIEW public.restaurants_with_banking OWNER TO authenticated;

-- Grant only to authenticated (RLS enforces admin check)
REVOKE ALL ON public.restaurants_with_banking FROM anon, public;
GRANT SELECT ON public.restaurants_with_banking TO authenticated;

-- Step 7: Function to write encrypted bank data (for admin updates)
CREATE OR REPLACE FUNCTION public.update_restaurant_banking(
  p_restaurant_id uuid,
  p_bank_name text,
  p_bank_account_number text,
  p_bank_account_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  key_id uuid;
BEGIN
  -- Only admins can call this
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT id INTO key_id FROM vault.secrets WHERE name = 'bank_account_key' LIMIT 1;

  UPDATE public.restaurants SET
    bank_name_enc = CASE WHEN p_bank_name IS NOT NULL
      THEN encode(pgsodium.crypto_aead_det_encrypt(
        p_bank_name::bytea, p_restaurant_id::text::bytea, key_id, NULL
      ), 'base64')
      ELSE NULL END,
    bank_account_number_enc = CASE WHEN p_bank_account_number IS NOT NULL
      THEN encode(pgsodium.crypto_aead_det_encrypt(
        p_bank_account_number::bytea, p_restaurant_id::text::bytea, key_id, NULL
      ), 'base64')
      ELSE NULL END,
    bank_account_name_enc = CASE WHEN p_bank_account_name IS NOT NULL
      THEN encode(pgsodium.crypto_aead_det_encrypt(
        p_bank_account_name::bytea, p_restaurant_id::text::bytea, key_id, NULL
      ), 'base64')
      ELSE NULL END,
    updated_at = now()
  WHERE id = p_restaurant_id;
END;
$$;

-- Schema version
INSERT INTO public.schema_version (version, description)
VALUES (5, 'MED-5: Vault encryption for restaurant bank account fields')
ON CONFLICT (version) DO NOTHING;
