-- PRE-CHECK: run and review these SELECTs before the migration below.
-- Public bucket contents are visible to anyone with their URL.
SELECT id, public, file_size_limit, allowed_mime_types
FROM storage.buckets WHERE id = 'menu-images';
SELECT name, metadata->>'size' AS bytes, metadata->>'mimetype' AS mime_type
FROM storage.objects
WHERE bucket_id = 'menu-images'
  AND (COALESCE((metadata->>'size')::bigint, 0) > 2097152
       OR COALESCE(metadata->>'mimetype', '') NOT IN ('image/jpeg', 'image/png', 'image/webp'));
SELECT policyname, cmd, roles, qual, with_check FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects';
-- Review existing policies: permissive policies are ORed, so a broad existing
-- INSERT policy can bypass the folder restriction below. Narrow it separately.
-- Existing oversize/unsupported files are not deleted or changed by this patch.

-- MIGRATION: bucket provisioning/limits use the supported Storage API via
-- scripts/setup-menu-image-storage.mjs; only access policies are defined here.
BEGIN;
DROP POLICY IF EXISTS menu_images_owner_insert ON storage.objects;
CREATE POLICY menu_images_owner_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'menu-images'
  AND public.get_user_role() IN ('restaurant_owner', 'admin')
  AND EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id::text = (storage.foldername(name))[1] AND r.owner_id = auth.uid()
  )
  AND name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
);
DROP POLICY IF EXISTS menu_images_owner_select ON storage.objects;
CREATE POLICY menu_images_owner_select ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'menu-images'
  AND EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id::text = (storage.foldername(name))[1] AND r.owner_id = auth.uid()
  )
);
-- No overwrite/delete grants. New photos use random UUID filenames.
COMMIT;
