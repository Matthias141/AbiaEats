import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-guard';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const guard = await requireRole('admin');
  if (guard.response) return guard.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'pending';

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('restaurant_applications')
    .select(`*, profiles!restaurant_applications_applicant_id_fkey(full_name, email, phone)`)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ applications: data });
}
