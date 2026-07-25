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
└── migrations/             # Database schema and RLS policies
infra/
└── audit-worm/             # AWS infrastructure audit tooling
```

## Status

Pre-revenue. Core ordering flow and payment integration complete. Rider supply acquisition is the current launch blocker — logistics company partnerships in negotiation.

## Running Locally

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in: Supabase URL/keys, Paystack keys, WhatsApp Cloud API credentials

# Run database migrations
npx supabase db push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Author

**Ifedayo Idowu**
- GitHub: [@Matthias141](https://github.com/Matthias141)
- LinkedIn: [linkedin.com/in/ifedayo-idowu](https://linkedin.com/in/ifedayo-idowu)
