# Rollback Runbook

Production is Vercel, auto-deploying from pushes to `main`. There is no
GitHub Actions deploy step and no automated rollback tooling — this
document **is** the rollback procedure. Read this, don't improvise.

## 1. Confirm it's actually a bad deploy

Before rolling back, check:

- **Vercel dashboard** → Deployments tab → is the latest deploy's status
  "Ready" (built fine) or did the build itself fail? A failed build never
  goes live, so if it failed, production is still on the previous good
  deploy — you may not need to roll back at all.
- **`/dashboard/ops`** (internal ops dashboard, admin-only) — check for
  anomalies in whatever it surfaces (order volume, recent activity).
- **No third-party error monitoring is configured** (no Sentry or
  equivalent in `package.json`) — you will not get an alert. You're
  relying on user/restaurant/rider reports and manual checks. Treat any
  cluster of reports right after a deploy as a signal.
- **Vercel Function Logs** (Deployments → the deploy → Functions tab) for
  5xx spikes on API routes, especially `/api/admin/confirm-payment` and
  anything under `/api/`.

If confirmed bad, move to Option A or B below.

## 2. Option A — Vercel Instant Rollback (default choice, ~30 seconds)

Use this first unless you have a specific reason not to (see §4).

1. Vercel dashboard → project → **Deployments**
2. Find the last deployment you know was good (before the bad one)
3. Click its `⋯` menu → **Promote to Production**
4. Confirm. Production traffic switches to that build within seconds.

**What this does:** points production traffic at a previously-built
deployment. No new build runs, no code changes to the repo.

**What this does NOT do:**
- **Does not revert `main`** — the bad commit is still there. The next
  person who pushes to `main`, or the next manual redeploy, can bring
  the bad code back if nobody follows up with a real revert (§3).
- **Does not touch environment variables** — Vercel env vars are
  project-level, not tied to a specific deployment. If the bad deploy
  shipped alongside a bad env var change made in the Vercel dashboard,
  rolling back the deployment will NOT undo that — you have to revert
  the env var manually too.
- **Does not touch Supabase/database state** — any writes that happened
  during the bad window (orders created, payments confirmed, status
  changes) are still in the database. Rolling back the app does not roll
  back data. See §6.

## 3. Option B — git revert (use when you need `main` itself fixed)

Use this when Instant Rollback isn't enough — e.g., you need the bad
commit gone from history before more work stacks on top of it, or
Instant Rollback isn't available for some reason.

```bash
git checkout main
git pull origin main

# Find the bad commit if you don't already have the SHA
git log --oneline -10

# Revert it (creates a new commit undoing the changes, doesn't rewrite history)
git revert <bad-commit-sha>

# If the bad deploy was a merge commit, you need -m to pick which parent:
git revert -m 1 <bad-merge-commit-sha>

git push origin main
```

Pushing to `main` triggers a new Vercel build + auto-deploy of the
reverted state. This takes as long as a normal deploy (build time, not
instant) — check the Deployments tab until it shows "Ready" and is
promoted to Production.

If revert has conflicts (someone else shipped on top of the bad commit
first), resolve them like any merge conflict, then continue the revert
and push.

## 4. Which one, when

| | Instant Rollback | git revert |
|---|---|---|
| Speed | ~30 seconds | Full build time (minutes) |
| Fixes `main` | No — bad commit still there | Yes — new commit undoes it |
| Right for | Immediate incident, stop the bleeding | Once stable, to make the fix permanent |

**Default move during an active incident: Instant Rollback first, git
revert after**, once things are calm. Don't skip the revert — an
un-reverted `main` is a trap for the next deploy.

## 5. Post-rollback checklist

Don't consider this done until you've manually verified:

- [ ] **Payment flow**: place a test order (or check a real recent one)
  through to `awaiting_payment` → confirm via
  `/admin/orders` → `/api/admin/confirm-payment` works and moves status
  to `confirmed`.
- [ ] **Order status transitions**: a restaurant can advance an order
  through `confirmed → preparing → out_for_delivery → delivered`
  (or `cancelled`) via the restaurant dashboard.
- [ ] **Admin dashboard access**: `/admin` and `/admin/orders` load and
  auth correctly for an admin account.
- [ ] **Ops dashboard**: `/dashboard/ops` loads without errors.
- [ ] Spot-check `/dashboard/ops/restaurants` and `/dashboard/ops/vendors`
  if the bad deploy touched restaurant/vendor-facing code.

## 6. Check the blast radius — `audit_log` table

Query Supabase directly for anything that happened during the bad
deploy's live window (deploy time → rollback time):

```sql
select * from audit_log
where created_at between '<deploy_timestamp>' and '<rollback_timestamp>'
order by created_at desc;
```

`audit_log` columns: `action`, `actor_id`, `target_type`, `target_id`,
`metadata` (jsonb), `ip_address`, `created_at`. Table comment describes
it as covering "payment confirmations, settlements, and admin actions" —
specifically look for:

- `action` values related to payment confirmation or order status
  changes during the window — did any of them behave wrong (wrong
  amount, wrong order, duplicate confirmation)?
- Anything with an unfamiliar `action` value you don't recognize —
  could indicate the bad deploy introduced unexpected behavior that
  actually wrote to the database.

If you find bad writes, they need manual data correction — rolling back
the app doesn't undo them.

**Notify**: there is currently no team structure — you are the sole
point of contact. Update this section once that changes (who to loop in,
what channel to use). Until then, if any orders in the bad window were
affected, that follow-up (data correction, customer/restaurant
communication) is on you.
