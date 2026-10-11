/**
 * Image upload endpoint — generates a signed Supabase Storage upload URL.
 *
 * Flow:
 * 1. Client calls POST /api/restaurant/upload with { filename, content_type, size }
 * 2. Server validates metadata and ownership, generates a signed upload URL
 * 3. Client uses uploadToSignedUrl to send the file to Supabase Storage
 * 4. Client saves the returned public_url to the menu item via PATCH /api/restaurant/menu/[id]
 *
 * This keeps the service role key server-side — the client never touches it.
 * Bucket: 'menu-images' (public bucket, create in Supabase Storage dashboard)
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-guard';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'node:crypto';
import { MENU_IMAGE_BUCKET, MENU_IMAGE_MAX_BYTES, menuImageUploadSchema } from '@/lib/menu-images';

export async function POST(request: Request) {
  const guard = await requireRole('restaurant_owner', 'admin');
  if (guard.response) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = menuImageUploadSchema.safeParse(body);
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
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[parsed.data.content_type];
  const safeName = `${randomUUID()}.${ext}`;
  const storagePath = `${restaurant.id}/${safeName}`;

  const { data, error } = await supabase.storage
    .from(MENU_IMAGE_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    console.error('[restaurant-upload] Storage error:', error?.message);
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }

  // Public URL the client can store after upload completes
  const { data: publicData } = supabase.storage.from(MENU_IMAGE_BUCKET).getPublicUrl(storagePath);

  return NextResponse.json({
    upload_url: data.signedUrl,
    token: data.token,
    path: storagePath,
    public_url: publicData.publicUrl,
    max_size_bytes: MENU_IMAGE_MAX_BYTES,
  });
}
