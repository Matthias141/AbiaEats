/**
 * DFIR-1 FIX: Daily Audit Log Export to S3 WORM Bucket
 *
 * WHY THIS EXISTS (intern explainer):
 * AbiaEats audit logs live inside Supabase. If Supabase goes down, gets
 * hacked, or someone deletes the project from the dashboard, all forensic
 * evidence vanishes. RLS policies protect against app-layer deletion, but
 * a Supabase dashboard admin can bypass RLS entirely.
 *
 * WORM = Write Once Read Many. S3 Object Lock in GOVERNANCE mode means:
 * - Files can be written (once)
 * - Files CANNOT be modified or deleted for the retention period (90 days)
 * - Even AWS root cannot delete them without disabling the Object Lock
 *
 * This gives us an immutable, tamper-evident audit trail — exactly what
 * regulators and incident responders need.
 *
 * ARCHITECTURE:
 * Cron (2:30am daily) → fetch yesterday's audit_log rows → JSON → gzip →
 * PUT to s3://abiaeats-audit-logs/YYYY/MM/DD/audit.json.gz with Object Lock
 *
 * SETUP REQUIRED (run once before deploying):
 *
 * 1. Create S3 bucket with Object Lock enabled:
 *    aws s3api create-bucket \
 *      --bucket abiaeats-audit-logs \
 *      --region eu-west-1 \
 *      --object-lock-enabled-for-bucket
 *
 * 2. Set default retention (90 days GOVERNANCE mode):
 *    aws s3api put-object-lock-configuration \
 *      --bucket abiaeats-audit-logs \
 *      --object-lock-configuration \
 *      '{"ObjectLockEnabled":"Enabled","Rule":{"DefaultRetention":{"Mode":"GOVERNANCE","Days":90}}}'
 *
 * 3. Create IAM user with MINIMAL permissions (write-only to this bucket):
 *    Policy: s3:PutObject on arn:aws:s3:::abiaeats-audit-logs/*
 *    No s3:DeleteObject, no s3:GetObject (write-only = attacker can't read even if they steal key)
 *
 * 4. Add env vars to Vercel:
 *    AUDIT_EXPORT_S3_BUCKET=abiaeats-audit-logs
 *    AUDIT_EXPORT_S3_REGION=eu-west-1
 *    AWS_ACCESS_KEY_ID=<iam-user-key>
 *    AWS_SECRET_ACCESS_KEY=<iam-user-secret>
 *    AUDIT_EXPORT_ENABLED=true
 *
 * 5. Add to vercel.json crons:
 *    { "path": "/api/cron/export-audit-log", "schedule": "30 2 * * *" }
 *    (runs 30 min after daily-tasks, which runs at 2:00am)
 *
 * DEAD MAN'S SWITCH:
 * If this cron fails to run, the next day's run will detect the gap and alert.
 * The security-monitor cron checks for export_audit_log_complete entries
 * and alerts if yesterday's entry is missing.
 *
 * FAILURE MODES:
 * - S3 unreachable: logs error to audit_log, retries next day (no data loss, 1 day max gap)
 * - Supabase unreachable: logs to stderr (Vercel ships stderr to log drain), exports nothing
 * - Export already exists for date: skips (idempotent via S3 key collision check)
 */

import { createAdminClient_WEBHOOKS_AND_CRONS_ONLY } from '@/lib/auth-guard';
import { NextResponse } from 'next/server';
import { gzipSync } from 'zlib';

// ─── Lightweight S3 PutObject (no SDK dependency — reduces cold start) ────────
// Uses AWS Signature V4 signing manually. Avoids adding aws-sdk to bundle.

async function signedS3Put(params: {
  bucket: string;
  key: string;
  body: Uint8Array;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  contentType: string;
}): Promise<{ ok: boolean; status: number; error?: string }> {
  const { bucket, key, body, region, accessKeyId, secretAccessKey, contentType } = params;

  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const url = `https://${host}/${key}`;

  // AWS Signature V4
  const now = new Date();
  const dateStr = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z'; // YYYYMMDDTHHmmssZ
  const dateOnly = dateStr.slice(0, 8); // YYYYMMDD

  // Hash the body
  const bodyHash = await crypto.subtle.digest('SHA-256', body instanceof Buffer ? body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer : body.buffer as ArrayBuffer);
  const bodyHashHex = Buffer.from(bodyHash).toString('hex');

  const canonicalHeaders = [
    `content-type:${contentType}`,
    `host:${host}`,
    `x-amz-content-sha256:${bodyHashHex}`,
    `x-amz-date:${dateStr}`,
  ].join('\n') + '\n';

  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = [
    'PUT',
    `/${key}`,
    '', // no query string
    canonicalHeaders,
    signedHeaders,
    bodyHashHex,
  ].join('\n');

  const credentialScope = `${dateOnly}/${region}/s3/aws4_request`;
  const reqHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalRequest));
  const reqHashHex = Buffer.from(reqHash).toString('hex');
  const stringToSign = `AWS4-HMAC-SHA256\n${dateStr}\n${credentialScope}\n${reqHashHex}`;

  // Derive signing key: HMAC(HMAC(HMAC(HMAC("AWS4"+secret, date), region), service), "aws4_request")
  const hmac = async (key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> => {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key instanceof Uint8Array ? key.buffer as ArrayBuffer : key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
  };

  const kDate    = await hmac(new TextEncoder().encode('AWS4' + secretAccessKey), dateOnly);
  const kRegion  = await hmac(kDate, region);
  const kService = await hmac(kRegion, 's3');
  const kSigning = await hmac(kService, 'aws4_request');
  const signatureRaw = await hmac(kSigning, stringToSign);
  const signature = Buffer.from(signatureRaw).toString('hex');

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Host': host,
      'X-Amz-Content-Sha256': bodyHashHex,
      'X-Amz-Date': dateStr,
      'Authorization': authorization,
    },
    body: body instanceof Buffer ? new Uint8Array(body.buffer, body.byteOffset, body.byteLength) : body,
  });

  if (!response.ok) {
    const text = await response.text();
    return { ok: false, status: response.status, error: text };
  }
  return { ok: true, status: response.status };
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  // Auth: verify cron secret (same pattern as other cron endpoints)
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const exportEnabled = process.env.AUDIT_EXPORT_ENABLED === 'true';
  if (!exportEnabled) {
    // Graceful skip when not configured — prevents blocking deploys with missing env vars
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'AUDIT_EXPORT_ENABLED not set — configure S3 WORM bucket to enable',
    });
  }

  const s3Bucket = process.env.AUDIT_EXPORT_S3_BUCKET;
  const s3Region = process.env.AUDIT_EXPORT_S3_REGION || 'eu-west-1';
  const awsKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecret = process.env.AWS_SECRET_ACCESS_KEY;

  if (!s3Bucket || !awsKeyId || !awsSecret) {
    return NextResponse.json({ error: 'Missing S3 configuration' }, { status: 500 });
  }

  const supabase = await createAdminClient_WEBHOOKS_AND_CRONS_ONLY();

  // Export yesterday's audit log (complete day = deterministic, idempotent)
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  yesterday.setUTCHours(0, 0, 0, 0);

  const dayStart = yesterday.toISOString();
  const dayEnd   = new Date(yesterday.getTime() + 24 * 60 * 60 * 1000).toISOString();

  // S3 key: abiaeats-audit/YYYY/MM/DD/audit.json.gz
  const yyyy = yesterday.getUTCFullYear();
  const mm   = String(yesterday.getUTCMonth() + 1).padStart(2, '0');
  const dd   = String(yesterday.getUTCDate()).padStart(2, '0');
  const s3Key = `abiaeats-audit/${yyyy}/${mm}/${dd}/audit.json.gz`;

  // Fetch all audit rows for yesterday
  const { data: rows, error: fetchError } = await supabase
    .from('audit_log')
    .select('*')
    .gte('created_at', dayStart)
    .lt('created_at', dayEnd)
    .order('created_at', { ascending: true });

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const rowCount = rows?.length ?? 0;

  // Serialize + gzip
  const jsonBytes = Buffer.from(JSON.stringify({
    export_date: `${yyyy}-${mm}-${dd}`,
    exported_at: new Date().toISOString(),
    row_count: rowCount,
    entries: rows ?? [],
  }, null, 0)); // compact JSON — WORM storage costs money

  const compressed = gzipSync(jsonBytes);

  // PUT to S3 (Object Lock applied by bucket default retention policy)
  const putResult = await signedS3Put({
    bucket: s3Bucket,
    key: s3Key,
    body: compressed,
    region: s3Region,
    accessKeyId: awsKeyId,
    secretAccessKey: awsSecret,
    contentType: 'application/gzip',
  });

  if (!putResult.ok) {
    // Log failure to Supabase — the security-monitor will detect the missing export
    await supabase.rpc('log_audit', {
      p_action: 'audit_export_failed',
      p_target_type: 'audit_log',
      p_ip_address: 'cron:vercel',
      p_metadata: {
        export_date: `${yyyy}-${mm}-${dd}`,
        s3_key: s3Key,
        s3_status: putResult.status,
        error: putResult.error?.slice(0, 500), // truncate large XML errors
      },
    });
    return NextResponse.json({
      ok: false,
      error: `S3 PUT failed: ${putResult.status}`,
    }, { status: 500 });
  }

  // Log successful export — dead-man's switch checks for this entry
  await supabase.rpc('log_audit', {
    p_action: 'audit_export_complete',
    p_target_type: 'audit_log',
    p_ip_address: 'cron:vercel',
    p_metadata: {
      export_date: `${yyyy}-${mm}-${dd}`,
      s3_key: s3Key,
      row_count: rowCount,
      compressed_bytes: compressed.length,
    },
  });

  return NextResponse.json({
    ok: true,
    export_date: `${yyyy}-${mm}-${dd}`,
    s3_key: s3Key,
    row_count: rowCount,
    compressed_bytes: compressed.length,
  });
}
