# Restaurant menu photos

Owners open `/restaurant/menu`, add or edit an item, select a JPEG/PNG/WebP file no larger than 2MiB, enter its whole-naira price and save. One image per item is supported. Removing the photo and saving writes `image_url: null`; leaving the photo untouched preserves it. Uploading alone does not save the menu item.

## Deployment

1. Run and review the pre-check SELECTs at the top of `supabase/security-patches-v12-menu-image-storage.sql`. Check the bucket contains only public food photos and audit existing policies for broadly permitted uploads. Existing oversized objects are not removed.
2. Set server credentials in your shell without committing or printing them: `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Run `node scripts/setup-menu-image-storage.mjs`. This creates/updates the public `menu-images` bucket with a 2MiB limit and JPEG/PNG/WebP MIME restrictions. It refuses to make an existing private bucket public.
3. Apply the policy migration in the SQL file using Supabase SQL Editor. It requires the repository's existing `get_user_role()` function and restaurants RLS setup. Uploads are restricted to the authenticated owner's restaurant folder. Older overlapping permissive policies require review; this migration does not silently delete them.
4. Deploy the application fix. Test as an assigned owner: upload, save, reload, change photo, reload, remove photo, reload. Verify both owner/customer menus show the saved photo and correct price. Verify a second owner cannot upload into the first owner's folder.
5. Try a >2MiB file and unsupported format in both the UI and a direct Storage upload: both should fail. Bucket restrictions enforce actual file bytes even if request metadata lies.

## Boundaries

This change does not configure your live Supabase project. Automated tests do not prove live Storage configuration or owner assignment. Signed upload tokens retain the provider-defined lifetime. MIME limits validate declared media type; image decoding/malware scanning are not added. Food photos are public. Replacing/removing a photo or abandoning a form leaves uploaded objects in Storage; cleanup is a separate retention task. Existing price handling is unchanged.

## Failure diagnostics

| Symptom | Check | Residual limitation |
| --- | --- | --- |
| Upload URL request fails | Bucket exists, INSERT policy, owner assignment | Broad existing policies can weaken isolation |
| Upload fails after file selection | Bucket MIME/size limits, network | Failed uploads preserve the previous photo |
| Photo disappears after reload | Save response and stored image_url | Uploading is separate from item saving |
| Public URL works but thumbnail fails | Next image host allowlist, public bucket | Custom Supabase domains need explicit Next configuration |

## Separate finding

The existing partial update schema carries create defaults into PATCH requests (is_available, is_popular, sort_order). A narrowly scoped API update may reset those values. This predates the photo fix and is left out of this branch; the owner edit form sends its current values explicitly.
