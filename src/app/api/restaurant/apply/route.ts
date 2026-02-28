import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { createClient } from '@/lib/supabase/server';
import { createRestaurantSchema } from '@/lib/validations';

export async function POST(request: Request) {
  const guard = await requireAuth();
  if (guard.response) return guard.response;

  const body = await request.json().catch(() => null);

  // Use restaurant schema but strip commission_rate (admin sets that on approval)
  const parsed = createRestaurantSchema.omit({ commission_rate: true }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const supabase = await createClient();

  // Check for existing pending application from this user
  const { data: existing } = await supabase
    .from('restaurant_applications')
    .select('id, status')
    .eq('applicant_id', guard.user.id)
    .eq('status', 'pending')
    .single();

  if (existing) {
    return NextResponse.json({ error: 'You already have a pending application' }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('restaurant_applications')
    .insert({
      applicant_id: guard.user.id,
      ...parsed.data,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1';
  await supabase.rpc('log_audit', {
    p_action: 'restaurant_application_submitted',
    p_actor_id: guard.user.id,
    p_target_type: 'restaurant_applications',
    p_target_id: data.id,
    p_ip_address: ip,
    p_metadata: { name: parsed.data.name, city: parsed.data.city },
  });

  return NextResponse.json({ ok: true, application_id: data.id }, { status: 201 });
}
