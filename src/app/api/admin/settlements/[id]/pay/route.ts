/**
 * POST /api/admin/settlements/[id]/pay — Mark a settlement as paid
 *
 * This records the bank transfer to the restaurant. The actual transfer
 * happens outside the system (admin does OPay/bank transfer manually),
 * then calls this endpoint with the transfer reference for audit trail.
 *
 * In Phase 2 (Paystack Transfer API integration): this will initiate an
 * automated payout via Paystack and auto-populate the payment_reference
 * from the transfer response.
 *
 * ── Idempotency ───────────────────────────────────────────────────────────────
 * Already-paid settlements return 409 with the existing payment_reference.
 * This prevents accidental double-payment via UI double-click or retried requests.
 *
 * ── Audit Trail ───────────────────────────────────────────────────────────────
 * Every mark-paid records: admin user ID, timestamp, payment reference, amount.
 * This gives DFIR a complete chain: created_by, approved_by, paid_by, paid_at.
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-guard';
import { createClient } from '@/lib/supabase/server';
import { markSettlementPaidSchema } from '@/lib/validations';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const guard = await requireRole('admin');
  if (guard.response) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = markSettlementPaidSchema.safeParse({
    settlement_id: id,
    ...body,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const supabase = await createClient();

  // ── Fetch existing settlement ─────────────────────────────────────────────
  const { data: settlement, error: fetchError } = await supabase
    .from('settlements')
    .select('id, status, net_payout, restaurant_id, payment_reference, period_start, period_end')
    .eq('id', id)
    .single();

  if (fetchError || !settlement) {
    return NextResponse.json({ error: 'Settlement not found' }, { status: 404 });
  }

  // ── Idempotency guard ─────────────────────────────────────────────────────
  if (settlement.status === 'paid') {
    return NextResponse.json(
      {
        error: 'Settlement already marked as paid',
        paid_reference: settlement.payment_reference,
      },
      { status: 409 }
    );
  }

  // ── Mark as paid ──────────────────────────────────────────────────────────
  const { error: updateError } = await supabase
    .from('settlements')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_reference: parsed.data.payment_reference,
      paid_by: guard.user.id,
    })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // ── Audit trail ───────────────────────────────────────────────────────────
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1';
  await supabase.rpc('log_audit', {
    p_action: 'settlement_paid',
    p_actor_id: guard.user.id,
    p_target_type: 'settlements',
    p_target_id: id,
    p_ip_address: ip,
    p_metadata: {
      restaurant_id:     settlement.restaurant_id,
      net_payout:        settlement.net_payout,
      payment_reference: parsed.data.payment_reference,
      period_start:      settlement.period_start,
      period_end:        settlement.period_end,
    },
  });

  return NextResponse.json({ ok: true, paid_at: new Date().toISOString() });
}
