import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-guard';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

interface Params { params: Promise<{ id: string }> }

const reviewSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve'), commission_rate: z.number().min(0).max(100).default(10) }),
  z.object({ action: z.literal('reject'), rejection_reason: z.string().min(5, 'Provide a rejection reason') }),
]);

export async function POST(request: Request, { params }: Params) {
  const guard = await requireRole('admin');
  if (guard.response) return guard.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const supabase = await createClient();

  const { data: app } = await supabase
    .from('restaurant_applications')
    .select('*')
    .eq('id', id)
    .single();

  if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  if (app.status !== 'pending') return NextResponse.json({ error: 'Application already reviewed' }, { status: 422 });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1';

  if (parsed.data.action === 'reject') {
    await supabase.from('restaurant_applications').update({
      status: 'rejected',
      reviewed_by: guard.user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: parsed.data.rejection_reason,
    }).eq('id', id);

    await supabase.rpc('log_audit', {
      p_action: 'application_rejected',
      p_actor_id: guard.user.id,
      p_target_type: 'restaurant_applications',
      p_target_id: id,
      p_ip_address: ip,
      p_metadata: { reason: parsed.data.rejection_reason },
    });

    return NextResponse.json({ ok: true, status: 'rejected' });
  }

  // APPROVE: create the restaurant record
  const slug = app.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const { data: restaurant, error: rErr } = await supabase
    .from('restaurants')
    .insert({
      owner_id: app.applicant_id,
      name: app.name,
      slug: `${slug}-${Date.now()}`,
      description: app.description,
      phone: app.phone,
      address: app.address,
      city: app.city,
      cuisine_tags: app.cuisine_tags,
      delivery_fee: app.delivery_fee,
      min_delivery_time: app.min_delivery_time,
      max_delivery_time: app.max_delivery_time,
      commission_rate: parsed.data.commission_rate,
      bank_name: app.bank_name,
      bank_account_number: app.bank_account_number,
      bank_account_name: app.bank_account_name,
      is_open: false,
      is_active: true,
    })
    .select('id')
    .single();

  if (rErr || !restaurant) return NextResponse.json({ error: 'Failed to create restaurant' }, { status: 500 });

  // Update applicant role to restaurant_owner
  await supabase.from('profiles').update({ role: 'restaurant_owner' }).eq('id', app.applicant_id);

  // Mark application approved
  await supabase.from('restaurant_applications').update({
    status: 'approved',
    reviewed_by: guard.user.id,
    reviewed_at: new Date().toISOString(),
    restaurant_id: restaurant.id,
  }).eq('id', id);

  await supabase.rpc('log_audit', {
    p_action: 'application_approved',
    p_actor_id: guard.user.id,
    p_target_type: 'restaurant_applications',
    p_target_id: id,
    p_ip_address: ip,
    p_metadata: { restaurant_id: restaurant.id, commission_rate: parsed.data.commission_rate },
  });

  return NextResponse.json({ ok: true, status: 'approved', restaurant_id: restaurant.id });
}
