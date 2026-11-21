# AbiaEats 🍽️

A food delivery marketplace for Aba and Umuahia, Abia State, Nigeria. Restaurants own their riders — AbiaEats handles discovery, ordering, and payments.

## Overview

AbiaEats is a marketplace-model food delivery platform where restaurants list their menus, customers place orders, and restaurant-owned riders handle fulfillment. Payments flow through Paystack with a transfer-first model — restaurants receive funds before delivery is confirmed.

Built during NYSC service in Aba, Abia State.

## Architecture

```
Customer → Next.js Frontend → Supabase (Auth + DB) → Paystack (Payments)
                                      ↓
                            WhatsApp Cloud API (Order notifications)
                                      ↓
                            Restaurant Dashboard → Rider Assignment
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) · TypeScript · Tailwind CSS |
| Database | Supabase (PostgreSQL) · Row-Level Security |
| Auth | Supabase Auth (customer + restaurant roles) |
| Payments | Paystack (card, bank transfer, USSD) |
| Notifications | WhatsApp Cloud API (order status updates) |
| Testing | Vitest |
| Security | Gitleaks (secret scanning) · CSP headers |

## Key Design Decisions

**Marketplace model, not aggregator** — Restaurants own and manage their riders. AbiaEats does not operate a central rider fleet, eliminating the logistics cold-start problem in a market with limited rider supply.

**Transfer-first payments** — Paystack transfers are initiated at order confirmation, not delivery. This reduces restaurant risk and increases onboarding conversion in a low-trust market.

**WhatsApp-first notifications** — Order status updates are delivered via WhatsApp Cloud API, not push notifications. WhatsApp penetration in Aba/Umuahia is near-universal; app push notifications are not.

**Zone-based pricing** — Delivery fees are calculated per zone, not per kilometre. This simplifies rider compensation and customer expectation-setting in a city without reliable address geocoding.

**Row-Level Security** — Supabase RLS policies enforce data isolation between restaurants at the database level, not just the application layer.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (customer)/         # Customer-facing pages
│   ├── (restaurant)/       # Restaurant dashboard
│   └── api/                # API routes (Paystack webhooks, WhatsApp)
├── components/             # Shared UI components
├── lib/                    # Supabase client, Paystack helpers, WhatsApp SDK
└── types/                  # TypeScript definitions
supabase/
├── schema.sql              # Base database schema and RLS policies
└── *patch*.sql             # Schema and security patches
infra/
└── audit-worm/             # AWS infrastructure audit tooling
```

## Status

Pre-revenue. Core ordering flow and payment integration complete. Rider supply acquisition is the current launch blocker — logistics company partnerships in negotiation.

## Running Locally

1. With Node.js 22, run `npm ci` and `cp .env.example .env.local`. Fill in the Supabase URL and keys from your development project. Keep the service role key server-only.
2. Set `NEXT_PUBLIC_OPAY_ACCOUNT_NAME` and `NEXT_PUBLIC_OPAY_ACCOUNT_NUMBER` in `.env.local` to the name and 10-digit account number customers should see. Use test values for local checkout; never send a transfer to a test account. These two values are public and must be set before starting or building Next.js. Restart local dev or rebuild and redeploy after changing them. Without a valid account, checkout won't accept orders.
3. Set up the database as shown below, then run `npm run dev` and open [http://localhost:3000](http://localhost:3000).

### Set up a fresh Supabase database

Use a new development Supabase project. In its **SQL Editor**, run each linked file in its own query, in this order. This repository ships SQL scripts rather than a Supabase CLI migrations directory, so `supabase db push` does not install the schema.

1. [Base schema](supabase/schema.sql)
2. [Initial security patches](supabase/security-patches.sql)
3. [v3: Function hardening](supabase/security-patches-v3.sql)
4. [v4: Restaurant applications](supabase/schema-patch-v4.sql)
5. [v6: RLS hardening](supabase/security-patches-v6-rls-hardening.sql)
6. [v7: Order and profile safeguards](supabase/security-patches-v7-remaining.sql)
7. [v8: Order idempotency](supabase/security-patches-v8-idempotency.sql)
8. [v9: View security](supabase/security-patches-v9-view-security-invoker.sql)
9. [v10: Vendor invites](supabase/schema-patch-v10-vendor-invites.sql)
10. [v11: Unique payment references](supabase/security-patches-v11-payment-reference-uniqueness.sql). Run the duplicate-reference pre-check at the top of the file first; proceed only if it returns no rows.

Skip the legacy v5 Vault patch; v9 uses the bank columns from the base schema and does not require that patch. Don't replay this fresh-install sequence against an existing or production database.

## Author

**Ifedayo Idowu**
- GitHub: [@Matthias141](https://github.com/Matthias141)
- LinkedIn: [linkedin.com/in/ifedayo-idowu](https://linkedin.com/in/ifedayo-idowu)
