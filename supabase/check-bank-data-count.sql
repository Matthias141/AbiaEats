-- Read-only check: how many restaurants currently have plaintext bank data?
-- Run this BEFORE schema-patch-v5-vault.sql to know what's at stake.
SELECT
  COUNT(*) AS total_restaurants,
  COUNT(*) FILTER (WHERE bank_account_number IS NOT NULL) AS restaurants_with_bank_data,
  COUNT(*) FILTER (WHERE bank_account_number IS NULL) AS restaurants_without_bank_data
FROM public.restaurants;
