/** Run with server credentials in the environment; never put this key in NEXT_PUBLIC_* variables. */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const options = { public: true, fileSizeLimit: 2097152, allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] };
const { data: buckets, error: listError } = await client.storage.listBuckets();
if (listError) throw new Error('Cannot inspect Storage buckets; check server credentials');
const bucket = buckets.find(bucket => bucket.id === 'menu-images');
console.log('Pre-check:', bucket ? { bucket: bucket.id, public: bucket.public, fileSizeLimit: bucket.file_size_limit, allowedMimeTypes: bucket.allowed_mime_types } : 'menu-images does not exist');
// Do not expose an existing private bucket without an explicit data review.
if (bucket && !bucket.public) throw new Error('Existing menu-images bucket is private. Review its contents before making it public.');
const { error } = bucket
  ? await client.storage.updateBucket('menu-images', options)
  : await client.storage.createBucket('menu-images', options);
if (error) throw new Error(`Storage setup failed: ${error.message}`);
console.log('menu-images configured: public food photos, 2MiB maximum, JPEG/PNG/WebP only. Apply the accompanying Storage policies next.');
