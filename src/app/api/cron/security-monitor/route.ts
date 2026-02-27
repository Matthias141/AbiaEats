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
    p_metadata: {
      period: '5m',
      action_summary: actionCounts,
      payment_confirmations: paymentConfirmations,
      auto_cancellations: autoCancellations,
    },
  });

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    period: '5m',
    actionCounts,
  });
}
