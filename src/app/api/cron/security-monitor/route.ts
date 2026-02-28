/**
 * Security monitor endpoint — extracted from daily-tasks so it can run
 * on its own schedule via an external cron service.
 *
 * WHY THIS EXISTS:
 * The Vercel Hobby plan allows only 1 cron job running at most once per day.
 * The original security-monitor cron ran every 5 minutes. Consolidating into
 * daily-tasks degraded detection from 5 min → 24 h (NEW-3 finding).
 *
 * FIX:
 * This endpoint is called by an external cron service (e.g. cron-job.org,
 * EasyCron, or GitHub Actions) every 5 minutes. It requires the same
 * CRON_SECRET as the daily-tasks endpoint.
 *
 * SETUP:
 * 1. Go to https://cron-job.org (free tier supports 5-min intervals)
 * 2. Create a job: GET https://your-domain.vercel.app/api/cron/security-monitor
 * 3. Add header: Authorization: Bearer <your CRON_SECRET value>
 * 4. Set interval: every 5 minutes
 *
 * The daily-tasks cron continues to handle auto-cancel and log export.
 */

import { createAdminClient_WEBHOOKS_AND_CRONS_ONLY } from '@/lib/auth-guard';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createAdminClient_WEBHOOKS_AND_CRONS_ONLY();

  // Check the last 5 minutes of audit activity for anomalies
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: recentEntries, error: auditError } = await supabase
    .from('audit_log')
    .select('action, created_at')
    .gte('created_at', fiveMinutesAgo)
    .order('created_at', { ascending: false });

  if (auditError) {
    return NextResponse.json({ error: auditError.message }, { status: 500 });
  }

  const actionCounts: Record<string, number> = {};
  for (const entry of recentEntries ?? []) {
    actionCounts[entry.action] = (actionCounts[entry.action] ?? 0) + 1;
  }

  const paymentConfirmations = actionCounts['payment_confirmed'] ?? 0;
  const autoCancellations = actionCounts['order_auto_cancelled'] ?? 0;

  await supabase.rpc('log_audit', {
    p_action: 'security_monitor_check',
    p_target_type: 'audit_log',
    p_ip_address: 'cron:external',
    p_metadata: {
      period: '5m',
      action_summary: actionCounts,
      payment_confirmations: paymentConfirmations,
      auto_cancellations: autoCancellations,
    },
  });

  // ── Dead-man's switch: verify yesterday's audit export ran ─────────────────
  // DFIR-1: If the daily export-audit-log cron didn't fire, we lose WORM backup.
  // This runs once per day (only fires between 3am-3:05am) to minimize noise.
  const now = new Date();
  const isDailyCheckWindow = now.getUTCHours() === 3 && now.getUTCMinutes() < 5;

  if (isDailyCheckWindow && process.env.AUDIT_EXPORT_ENABLED === 'true') {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);
    const dayStart = yesterday.toISOString();
    const dayEnd   = new Date(yesterday.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const { data: exportEntry } = await supabase
      .from('audit_log')
      .select('id, created_at')
      .eq('action', 'audit_export_complete')
      .gte('created_at', dayStart)
      .lt('created_at', dayEnd)
      .limit(1)
      .single();

    if (!exportEntry) {
      // Dead-man triggered — yesterday's WORM export did not complete
      // Log a high-severity alert. Wire this to PagerDuty/Slack in production.
      await supabase.rpc('log_audit', {
        p_action: 'audit_export_missing_alert',
        p_target_type: 'audit_log',
        p_ip_address: 'cron:external',
        p_metadata: {
          severity: 'HIGH',
          missing_export_date: yesterday.toISOString().split('T')[0],
          message: 'DFIR-1: Daily audit log export did not complete. WORM backup gap detected.',
        },
      });
      console.error('[DFIR-1 ALERT] Audit export missing for:', yesterday.toISOString().split('T')[0]);
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    period: '5m',
    actionCounts,
  });
}
