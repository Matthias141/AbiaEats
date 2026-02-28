/**
 * Image upload endpoint — generates a signed Supabase Storage upload URL.
 *
 * Flow:
 * 1. Client calls POST /api/restaurant/upload with { filename, content_type }
 * 2. Server validates ownership, generates a signed upload URL
 * 3. Client PUTs the image file directly to Supabase Storage using that URL
 * 4. Client saves the returned public_url to the menu item via PATCH /api/restaurant/menu/[id]
 *
 * This keeps the service role key server-side — the client never touches it.
 * Bucket: 'menu-images' (public bucket, create in Supabase Storage dashboard)
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-guard';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const uploadSchema = z.object({
  filename: z.string().min(1).max(200),
  content_type: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

const BUCKET = 'menu-images';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

export async function POST(request: Request) {
  const guard = await requireRole('restaurant_owner', 'admin');
  if (guard.response) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = uploadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const supabase = await createClient();

  // Confirm caller owns a restaurant
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_id', guard.user.id)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant found for this account' }, { status: 403 });

  // Build a safe storage path: restaurant_id/timestamp_filename
  const ext = parsed.data.filename.split('.').pop() ?? 'jpg';
  const safeName = `${Date.now()}.${ext}`;
  const storagePath = `${restaurant.id}/${safeName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Public URL the client can store after upload completes
  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  return NextResponse.json({
    upload_url: data.signedUrl,
    path: storagePath,
    public_url: publicData.publicUrl,
    max_size_bytes: MAX_FILE_SIZE,
  });
}
