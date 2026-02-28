import { createAdminClient_WEBHOOKS_AND_CRONS_ONLY } from '@/lib/auth-guard';
import { NextResponse } from 'next/server';

// Daily cron — auto-cancel stale orders + audit log export check.
// Schedule: 0 2 * * * (2am daily) — set in vercel.json
//
// Security monitoring is handled by /api/cron/security-monitor, which an
// external cron service (e.g. cron-job.org) calls every 5 minutes.
// This restores the 5-min detection window that was lost when consolidating
// to a single Vercel Hobby cron job (NEW-3 fix).

export async function GET(request: Request) {
  // Verify the request comes from Vercel Cron.
  // Guard against null-bypass: if CRON_SECRET is unset, reject ALL requests —
  // never match on "Bearer undefined".
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createAdminClient_WEBHOOKS_AND_CRONS_ONLY();
  const results: Record<string, unknown> = {};

  // ─── Task 1: Cancel orders unpaid for 2+ hours ────────────────────────────
  // Business rule: orders not confirmed within 2h auto-cancel (CLAUDE.md §12)
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data: staleOrders, error: fetchError } = await supabase
      .from('orders')
      .select('id')
      .eq('status', 'awaiting_payment')
      .lt('created_at', twoHoursAgo);

    if (fetchError) throw fetchError;

    if (staleOrders && staleOrders.length > 0) {
      const staleIds = staleOrders.map((o) => o.id);

      const { error: cancelError } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .in('id', staleIds);

      if (cancelError) throw cancelError;

      // Audit log each cancellation
      await Promise.all(
        staleIds.map((orderId) =>
          supabase.rpc('log_audit', {
            p_action: 'order_auto_cancelled',
            p_target_type: 'orders',
            p_target_id: orderId,
            p_ip_address: 'cron:vercel',
            p_metadata: { status: 'cancelled', reason: 'payment_timeout_2h' },
          })
        )
      );

      results.cancelledOrders = staleIds.length;
    } else {
      results.cancelledOrders = 0;
    }
  } catch (err) {
    results.cancelOrdersError = err instanceof Error ? err.message : 'unknown';
  }

  // ─── Task 2: Export / archive audit logs older than 30 days ──────────────
  // Previously handled by /api/cron/export-logs (ran at 2am daily)
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { count, error: countError } = await supabase
      .from('audit_log')
      .select('id', { count: 'exact', head: true })
      .lt('created_at', thirtyDaysAgo);

    if (countError) throw countError;

    // Record the snapshot — actual export/archival is handled by Supabase backups.
    // This log entry confirms the daily job ran and what volume is eligible.
    await supabase.rpc('log_audit', {
      p_action: 'daily_log_export_check',
      p_target_type: 'audit_log',
      p_ip_address: 'cron:vercel',
      p_metadata: { eligible_for_archive: count, cutoff: thirtyDaysAgo },
    });

    results.auditLogsEligibleForArchive = count;
  } catch (err) {
    results.exportLogsError = err instanceof Error ? err.message : 'unknown';
  }

  // Security monitoring is intentionally NOT here — it runs at 5-min intervals
  // via /api/cron/security-monitor called by an external cron service.

  // ─── Task 3: Auto-generate weekly settlements (Sundays only) ─────────────
  // Runs every Sunday at 2am. Generates one settlement per active restaurant
  // covering Mon–Sun of the previous week.
  // Idempotent: skip if a settlement already exists for the period.
  try {
    const today = new Date();
    if (today.getUTCDay() === 0) { // 0 = Sunday
      const prevSunday = new Date(today);
      prevSunday.setUTCDate(today.getUTCDate() - 7);
      const prevSaturday = new Date(today);
      prevSaturday.setUTCDate(today.getUTCDate() - 1);

      const periodStart = prevSunday.toISOString().split('T')[0];   // YYYY-MM-DD
      const periodEnd   = prevSaturday.toISOString().split('T')[0];

      // Fetch all active restaurants
      const { data: restaurants } = await supabase
        .from('restaurants')
        .select('id')
        .eq('is_active', true);

      let created = 0;
      let skipped = 0;

      for (const restaurant of restaurants ?? []) {
        // Idempotency: skip if settlement already exists
        const { data: exists } = await supabase
          .from('settlements')
          .select('id')
          .eq('restaurant_id', restaurant.id)
          .eq('period_start', periodStart)
          .eq('period_end', periodEnd)
          .maybeSingle();

        if (exists) { skipped++; continue; }

        // Aggregate delivered orders for the period
        const { data: orders } = await supabase
          .from('orders')
          .select('subtotal, delivery_fee, commission_amount')
          .eq('restaurant_id', restaurant.id)
          .eq('status', 'delivered')
          .gte('delivered_at', `${periodStart}T00:00:00.000Z`)
          .lte('delivered_at', `${periodEnd}T23:59:59.999Z`);

        if (!orders || orders.length === 0) { skipped++; continue; }

        const totals = orders.reduce(
          (acc, o) => ({
            order_count:         acc.order_count + 1,
            total_gmv:           acc.total_gmv + o.subtotal,
            total_commission:    acc.total_commission + o.commission_amount,
            total_delivery_fees: acc.total_delivery_fees + o.delivery_fee,
          }),
          { order_count: 0, total_gmv: 0, total_commission: 0, total_delivery_fees: 0 }
        );

        const net_payout = totals.total_gmv - totals.total_commission;

        const { data: settlement } = await supabase
          .from('settlements')
          .insert({ restaurant_id: restaurant.id, period_start: periodStart, period_end: periodEnd, ...totals, net_payout, status: 'pending' })
          .select('id')
          .single();

        if (settlement) {
          await supabase.rpc('log_audit', {
            p_action: 'settlement_auto_generated',
            p_target_type: 'settlements',
            p_target_id: settlement.id,
            p_ip_address: 'cron:vercel',
            p_metadata: { restaurant_id: restaurant.id, period_start: periodStart, period_end: periodEnd, net_payout },
          });
          created++;
        }
      }

      results.settlements = { period: `${periodStart} → ${periodEnd}`, created, skipped };
    } else {
      results.settlements = 'skipped (not Sunday)';
    }
  } catch (err) {
    results.settlementsError = err instanceof Error ? err.message : 'unknown';
  }

  return NextResponse.json({ ok: true, timestamp: new Date().toISOString(), results });
}
