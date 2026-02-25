# CLAUDE.md — AbiaEats Development Guide

## What Is This File?

This file gives you (Claude Code or any AI coding agent) the full context to build, modify, and extend AbiaEats. Read this ENTIRE file before writing any code. Every business rule, security constraint, and architectural decision is documented here. If something contradicts this file, this file wins.

---

## 1. PRODUCT OVERVIEW

**AbiaEats** is a marketplace-model food delivery platform for Aba and Umuahia, Abia State, Nigeria. We connect local restaurants with customers through a mobile-first PWA with WhatsApp notifications and transfer-verified payments.

**What we are:** A technology marketplace. We do NOT employ riders. We do NOT handle food. We connect demand (customers) to supply (restaurants with their own delivery riders).

**What we are NOT:** A logistics company. A fintech. A ride-hailing app. We are a food delivery marketplace with a payment layer.

### Key Numbers
- Target market: Aba (1.5M people) + Umuahia
- Month 6 target: 50–80 orders/day, 25–40 restaurants
- Revenue: 8% blended commission + 30% delivery fee share + featured listings
- Break-even: ~18 orders/day
- Total startup cost: ₦372,000 (~$230 USD)

---

## 2. USERS & ROLES

There are exactly 4 user roles. Every feature you build must respect this hierarchy.

### Customer
- **Auth:** Email/password or Phone OTP
- **Can:** Browse restaurants, view menus, place orders, pay via OPay transfer, track their own orders, rate delivered orders
- **Cannot:** See other customers' orders, access admin panel, access restaurant dashboard, modify restaurants or menus
- **Key behavior:** Mobile-first. Likely on a ₦15,000–₦50,000 Android phone. Possibly 2G/3G network. UI must be fast, lightweight, and work offline where possible

### Restaurant Owner
- **Auth:** Email/password (invited by admin)
- **Can:** View orders for THEIR restaurant only, accept/reject orders, mark orders as preparing/ready/delivered, manage THEIR menu items, see THEIR revenue and settlement history, toggle open/closed
- **Cannot:** See other restaurants' data, access admin panel, create their own account (admin creates it), modify commission rates, access customer personal data except during active orders
- **Key behavior:** Operates from a phone or cheap tablet in a busy kitchen. Dashboard must be dead simple — big buttons, clear status, minimal clicks

### Rider
- **Auth:** Phone OTP or email/password
- **Can:** See deliveries assigned to them, view delivery address + customer phone (active order only), mark orders as picked up / delivered
- **Cannot:** See order prices, access restaurant dashboard, access admin panel
- **Note:** At launch, riders are restaurant-employed. They use the restaurant dashboard, not a separate rider app. A dedicated rider app is a future Phase 3 feature

### Admin (Founder Only)
- **Auth:** Email/password. Role can ONLY be assigned via direct database UPDATE. No signup flow creates admin accounts. This is an intentional security constraint — never build an admin signup page.
- **Can:** Everything. View all orders across all restaurants, confirm payments, manage all restaurants, manage all riders, view all revenue, manage settlements, view audit logs, deactivate accounts
- **Cannot:** Nothing is restricted for admin
- **Key behavior:** Operates from phone AND laptop. Dashboard must work on both. The admin IS the business at launch — this dashboard is the command center

---

## 3. CANONICAL ORDER FLOW

This is the single most important section. Every order follows this exact flow. Do not deviate.

```
STEP 1: Customer browses + orders
  └─ Customer selects restaurant → adds items → enters delivery address + landmark → reviews total
  └─ UI: Customer PWA

STEP 2: Customer pays via OPay transfer
  └─ Customer transfers to AbiaEats OPay account ONLY
  └─ No direct-to-restaurant payments (simplified from earlier dual-channel model)
  └─ OPay confirms in under 10 seconds
  └─ Order status: AWAITING_PAYMENT
  └─ Customer sees: OPay account details + exact amount + order number

STEP 3: Admin verifies payment
  └─ Admin checks OPay app for incoming transfer matching order amount
  └─ Admin clicks "Confirm Payment" in admin dashboard
  └─ Order status: AWAITING_PAYMENT → CONFIRMED
  └─ Phase 2 (future): Automated via Paystack webhook — no manual step
  └─ CRITICAL: No food leaves the kitchen until this step is complete

STEP 4: Restaurant is notified
  └─ Automatic WhatsApp message to restaurant: "New order confirmed — 2x Jollof Rice, delivery to Faulks Road. View in dashboard."
  └─ Restaurant acts in their dashboard, NOT via WhatsApp reply
  └─ Order status remains: CONFIRMED (waiting for restaurant acceptance)

STEP 5: Restaurant accepts + prepares
  └─ Restaurant clicks "Accept" in dashboard
  └─ Order status: CONFIRMED → PREPARING
  └─ Customer receives WhatsApp: "Your order is being prepared"

STEP 6: Restaurant dispatches their own rider
  └─ Restaurant marks order as "Out for Delivery" in dashboard
  └─ Rider sees delivery address + landmark notes
  └─ Customer phone number becomes visible to restaurant for delivery coordination ONLY
  └─ Order status: PREPARING → OUT_FOR_DELIVERY
  └─ Customer receives WhatsApp: "Your rider is on the way"

STEP 7: Delivery confirmed
  └─ Rider delivers food
  └─ Restaurant marks order "Delivered" in dashboard
  └─ Order status: OUT_FOR_DELIVERY → DELIVERED
  └─ Customer receives WhatsApp: "Your food has been delivered! Rate your experience."

STEP 8: Weekly settlement
  └─ AbiaEats holds ALL customer payments in OPay account
  └─ Every 7 days: deduct commission at source, transfer restaurant's net share
  └─ Commission is NEVER invoiced after the fact — it is DEDUCTED before the restaurant receives anything
  └─ Settlement record created in settlements table with full audit trail
```

### Order Status Enum (exact values)
```
awaiting_payment → confirmed → preparing → out_for_delivery → delivered
                                                                    ↘ cancelled (from any pre-delivered status)
```

### VALID Status Transitions (enforced by database trigger)
| From | Can go to |
|------|-----------|
| `awaiting_payment` | `confirmed`, `cancelled` |
| `confirmed` | `preparing`, `cancelled` |
| `preparing` | `out_for_delivery`, `cancelled` |
| `out_for_delivery` | `delivered`, `cancelled` |
| `delivered` | NOTHING (terminal state) |
| `cancelled` | NOTHING (terminal state) |

**Any other transition MUST be rejected.** The database trigger `validate_order_status_transition` enforces this. Never bypass it.

---

## 4. PAYMENT MODEL

### Transfer-First (NOT Cash on Delivery)
We deliberately reject cash on delivery. Every order is paid via bank transfer before food is prepared.

**Why:**
- Fraud elimination: no fake orders, no refused payments, no rider theft
- Accurate revenue tracking: every naira traceable through bank records
- Restaurant trust: money confirmed before cooking begins
- Scalability: transfer verification automates via API; cash never does

### Payment Flow (Phase 1 — Manual Verification)
```
Customer places order → sees AbiaEats OPay account details + amount
Customer opens OPay app → transfers exact amount
Admin sees transfer in OPay → clicks "Confirm Payment" in dashboard
Order moves to CONFIRMED → restaurant notified
```

### Payment Flow (Phase 2 — Automated)
```
Customer places order → redirected to Paystack payment page
Paystack processes card/USSD/bank transfer
Paystack webhook hits /api/webhooks/paystack
Server verifies HMAC-SHA512 signature → auto-confirms order
```

### Settlement (Weekly)
```
Every Sunday:
  For each restaurant:
    1. Sum all DELIVERED orders in past 7 days
    2. Calculate total GMV (sum of subtotals)
    3. Calculate commission: GMV × restaurant's commission rate
    4. Calculate restaurant payout: GMV - commission
    5. Transfer payout to restaurant's bank account
    6. Create settlement record with full breakdown
    7. Log in audit trail
```

### Commission Structure (Tiered)
| Tier | Rate | Condition |
|------|------|-----------|
| Launch Partner | 6% | First 15 restaurants, Months 1-3 |
| Standard | 10% | All restaurants from Month 4+ |
| High Volume | 13% | Restaurants doing 20+ orders/day |
| Featured + Placement | 8% + ₦10,000/mo subscription | Homepage placement + push notifications |

**Blended rate assumption for calculations: 8% in Year 1**

---

## 5. TECH STACK

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 14 (App Router) | NOT Pages Router. Use `src/app/` directory |
| Language | TypeScript | Strict mode. No `any` types except audit_log JSONB fields |
| Styling | Tailwind CSS | Custom theme in `tailwind.config.ts`. Dark mode default. |
| Database | PostgreSQL via Supabase | RLS on every table. Free tier to start |
| Auth | Supabase Auth | Email + Phone OTP. JWT-based. Role in `profiles` table |
| Real-time | Supabase Realtime | For live order updates in admin + restaurant dashboards |
| Validation | Zod | Every API input validated. Schemas in `src/lib/validations.ts` |
| Hosting | Vercel | Free tier. Auto-deploy from GitHub |
| Payments (Phase 1) | OPay manual transfer | Admin verifies in OPay app |
| Payments (Phase 2) | Paystack | Webhook-based auto-verification |
| Notifications | WhatsApp Cloud API | Order status updates to customers + restaurants |
| Storage | Supabase Storage | Restaurant images, food photos |

### Fonts
- Headings: `Playfair Display` (serif, editorial feel)
- Body: `Outfit` (clean sans-serif)
- Monospace/Numbers: `JetBrains Mono`

### Brand Colors
- Primary: `#F26522` (orange)
- Background (dark): `#0C0A09`
- Background (light): `#FAF7F3`
- Success: `#22C55E`
- Error: `#EF4444`
- Warning/Amber: `#F59E0B`
- Info: `#3B82F6`

---

## 6. PROJECT STRUCTURE

```
abiaeats/
├── CLAUDE.md                   ← YOU ARE HERE
├── README.md                   ← Setup guide for humans
├── supabase/
│   └── schema.sql              ← Complete database schema (run in Supabase SQL Editor)
├── public/
│   └── manifest.json           ← PWA manifest
├── src/
│   ├── app/                    ← Next.js App Router pages
│   │   ├── layout.tsx          ← Root layout (dark mode, fonts, meta)
│   │   ├── page.tsx            ← Landing / entry point
│   │   ├── auth/
│   │   │   ├── login/page.tsx  ← Login (email/password + phone OTP)
│   │   │   ├── signup/page.tsx ← Customer + restaurant signup
│   │   │   └── callback/route.ts ← Supabase auth callback handler
│   │   ├── (customer)/         ← Customer-facing pages (route group)
│   │   │   ├── restaurants/    ← Restaurant listing + detail + menu
│   │   │   ├── order/          ← Order placement + tracking
│   │   │   └── profile/        ← Customer profile + order history
│   │   ├── (admin)/            ← Admin dashboard (route group, protected)
│   │   │   ├── admin/
│   │   │   │   ├── page.tsx    ← Admin overview (stats + live orders)
│   │   │   │   ├── orders/     ← Order management + payment confirmation
│   │   │   │   ├── revenue/    ← Revenue tracking + settlement ledger
│   │   │   │   ├── restaurants/← Restaurant management (add/edit/disable)
│   │   │   │   └── riders/     ← Rider management
│   │   ├── (restaurant)/       ← Restaurant dashboard (route group, protected)
│   │   │   ├── restaurant/
│   │   │   │   ├── page.tsx    ← Restaurant overview (incoming orders)
│   │   │   │   ├── orders/     ← Order accept/prepare/dispatch flow
│   │   │   │   ├── menu/       ← Menu item management (CRUD)
│   │   │   │   └── settings/   ← Restaurant profile + bank details
│   │   └── api/                ← API routes
│   │       ├── auth/           ← Auth endpoints
│   │       ├── orders/         ← Order CRUD + status transitions
│   │       ├── restaurants/    ← Restaurant management
│   │       ├── menu-items/     ← Menu CRUD
│   │       ├── riders/         ← Rider management
│   │       ├── settlements/    ← Settlement calculations
│   │       └── webhooks/       ← Paystack webhook (Phase 2)
│   ├── components/
│   │   ├── ui/                 ← Shared UI primitives (Button, Card, Badge, Input, Modal)
│   │   ├── customer/           ← Customer-specific components
│   │   ├── admin/              ← Admin-specific components
│   │   └── restaurant/         ← Restaurant-specific components
│   ├── hooks/
│   │   ├── useAuth.ts          ← Auth state + role detection
│   │   ├── useOrders.ts        ← Real-time order subscriptions
│   │   └── useRestaurant.ts    ← Restaurant data hook
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts       ← Browser-side Supabase client (anon key, RLS enforced)
│   │   │   ├── server.ts       ← Server-side client (for API routes + Server Components)
│   │   │   └── middleware.ts   ← Auth session refresh + route protection logic
│   │   ├── validations.ts      ← Zod schemas for ALL API inputs
│   │   └── utils.ts            ← Shared helpers (formatPrice, timeAgo, status configs)
│   ├── middleware.ts            ← Next.js middleware entry point (calls lib/supabase/middleware.ts)
│   └── types/
│       └── database.ts         ← TypeScript types for all DB tables
├── tailwind.config.ts
├── tsconfig.json
├── next.config.js
├── package.json
└── .env.example
```

---

## 7. DATABASE SCHEMA

The complete schema is in `supabase/schema.sql`. Here's the summary:

### Tables
| Table | Purpose | RLS |
|-------|---------|-----|
| `profiles` | Extends Supabase Auth. Stores role, name, phone, address | Users see own; admins see all |
| `restaurants` | Restaurant details, commission rate, bank info, stats | Public read (active only); owners update own; admins manage all |
| `menu_items` | Food/drink items with prices, categories, availability | Public read; owners manage own; admins manage all |
| `riders` | Delivery riders (restaurant-attached) | Owners see their restaurant's riders; admins see all |
| `orders` | Core order table. Status, payment, amounts, timestamps | Customers see own; restaurants see theirs; admins see all |
| `order_items` | Individual items in each order (snapshot at order time) | Same access as parent order |
| `settlements` | Weekly commission settlement records | Restaurants see own; admins manage all |
| `audit_log` | Immutable log of all critical actions | Admins only |

### Key Relationships
```
profiles (1) ← owns → (many) restaurants
restaurants (1) ← has → (many) menu_items
restaurants (1) ← has → (many) riders
restaurants (1) ← receives → (many) orders
profiles (1) ← places → (many) orders [as customer]
orders (1) ← contains → (many) order_items
restaurants (1) ← has → (many) settlements
```

### Database Triggers (auto-fire, don't replicate in code)
1. **`on_auth_user_created`** — Auto-creates profile row when user signs up
2. **`set_order_number`** — Generates `ABIA-YYYYMMDD-NNN` order numbers on INSERT
3. **`validate_order_transition`** — Blocks invalid status changes (BEFORE UPDATE)
4. **`handle_order_status_change`** — Auto-sets timestamps when status changes (BEFORE UPDATE)
5. **`update_restaurant_stats`** — Increments restaurant order count + revenue on delivery (AFTER UPDATE)
6. **`update_updated_at`** — Auto-updates `updated_at` on all tables (BEFORE UPDATE)

### Critical: Commission is calculated in the trigger
When an order is INSERTED, the trigger calculates:
- `commission_amount = ROUND(subtotal * commission_rate / 100)`
- `total = subtotal + delivery_fee`

**Never calculate these client-side.** Pass `subtotal`, `delivery_fee`, and `commission_rate` — the database computes the rest.

---

## 8. SECURITY MODEL

### Principle: Defense in Depth
Security is enforced at 5 layers. If any single layer fails, the others still protect the system.

```
Layer 1: Next.js Middleware    → Route protection (redirect unauthenticated users)
Layer 2: API Input Validation  → Zod schemas reject malformed data
Layer 3: Supabase Auth (JWT)   → Verifies user identity on every request
Layer 4: RLS Policies          → Database blocks unauthorized data access
Layer 5: DB Triggers           → Enforce business rules (status transitions, calculations)
```

### RLS Policy Summary (16 policies)
- **profiles**: Users read/update own; admins read/update all; users CANNOT change their own role
- **restaurants**: Public reads active ones; owners manage own; admins manage all
- **menu_items**: Public reads available items at active restaurants; owners manage own
- **riders**: Owners see their restaurant's riders; admins see all
- **orders**: Customers see own; restaurants see their orders; admins see all
- **order_items**: Access follows parent order
- **settlements**: Restaurants see own; admins manage all
- **audit_log**: Admins read only; inserts via SECURITY DEFINER function

### Security Rules (Never Violate)
1. **No admin self-enrollment.** Admin role is set via direct SQL `UPDATE profiles SET role = 'admin' WHERE email = '...'`. Never build a UI or API endpoint that creates admin accounts.
2. **Customer phone numbers are private.** Only visible to the restaurant owner AFTER payment is confirmed AND only for the duration of that active order. Strip from all other API responses.
3. **Bank account details are private.** Only visible to the restaurant owner themselves + admin. Never exposed to customers.
4. **Order status transitions are one-way.** Delivered and cancelled are terminal. The DB trigger enforces this. Never try to bypass it.
5. **Commission is calculated server-side.** The database trigger computes it. Never trust client-sent commission amounts.
6. **All money-related actions are audit-logged.** Payment confirmations, status transitions, settlement payouts. Call `log_audit()` DB function.
7. **Passwords are never stored by us.** Supabase Auth handles bcrypt hashing.
8. **HTTPS everywhere.** Vercel enforces this by default.
9. **API rate limiting.** Implement 60 requests/minute per user on write endpoints.

---

## 9. UI/UX GUIDELINES

### Design Philosophy
- **Dark mode by default** with light mode toggle
- **Glassmorphism cards**: `backdrop-filter: blur(16px)` + translucent borders
- **Editorial typography**: Playfair Display for headings, Outfit for body
- **Mobile-first**: Max-width 480px for customer app, responsive for admin/restaurant
- **Nigerian context**: Naira formatting (₦), Nigerian phone validation, OPay-first payment UX

### Critical UX Rules
1. **No horizontal scroll.** All containers must have `overflow-x: hidden`. This has been a recurring bug — always check.
2. **Big tap targets.** Minimum 44px height for all interactive elements. Kitchen staff have flour on their fingers.
3. **Instant feedback.** Every button press must show visual response (scale animation, loading state). Network in Aba can be slow — never leave users wondering if their tap registered.
4. **Naira formatting.** Always use `₦` prefix with comma separators: `₦2,500` not `N2500` or `2500`. The util function `formatPrice()` in `src/lib/utils.ts` handles this.
5. **Status colors are consistent everywhere:**
   - Awaiting payment: Amber `#F59E0B`
   - Confirmed: Blue `#3B82F6`
   - Preparing: Purple `#A855F7`
   - Out for delivery: Orange `#F26522`
   - Delivered: Green `#22C55E`
   - Cancelled: Red `#EF4444`
6. **WhatsApp-style timestamps.** Use `timeAgo()` from utils: "5m ago", "2h ago", "Yesterday"
7. **Order numbers are always monospace.** Display `ABIA-20260216-001` in JetBrains Mono.
8. **Empty states are branded.** Never show a blank page. Use relevant emoji + helpful message + action button.

### Customer App Specific
- Must work on 2G/3G — lazy load images, minimal JS bundle
- Must be installable as PWA (add to homescreen)
- Search and tag filtering on restaurant list
- Floating cart bar at bottom when items are added
- Checkout flow: Cart → Delivery details → Payment instructions → Confirmation

### Admin Dashboard Specific
- Stats bar at top: Today's orders, revenue, pending payments, active restaurants
- Tab navigation: Orders | Revenue | Restaurants | Riders
- Order cards show: order number, customer name, restaurant, total, payment status, time ago
- Pending payment orders show inline "Confirm Payment" button (no need to open detail)
- Order detail opens as bottom sheet modal
- Settlement ledger shows per-restaurant breakdown

### Restaurant Dashboard Specific
- Incoming orders are the HERO element — big, prominent, with accept/reject buttons
- Order queue organized by status: New → Preparing → Out for Delivery → Done
- Menu management: add/edit/remove items, toggle availability, set prices
- Simple revenue view: today's orders, this week's total, pending settlement
- One-tap "Toggle Open/Closed" in header

---

## 10. API DESIGN PATTERNS

### Authentication Check (every protected endpoint)
```typescript
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check role if needed
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ... proceed with logic
}
```

### Input Validation Pattern
```typescript
import { createOrderSchema } from '@/lib/validations';

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createOrderSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data; // Fully typed and validated
  // ... proceed
}
```

### Supabase Query Pattern (with RLS)
```typescript
// RLS policies automatically filter results based on the authenticated user
// Customers only see their orders; restaurants only see theirs
const { data: orders, error } = await supabase
  .from('orders')
  .select('*, order_items(*), restaurants(name, phone)')
  .order('created_at', { ascending: false });
// No WHERE clause needed for user filtering — RLS handles it
```

### Error Response Format
```json
{
  "error": "Human-readable error message",
  "details": {},
  "code": "ERROR_CODE"
}
```

---

## 11. WHAT'S ALREADY BUILT

| Component | Status | Location |
|-----------|--------|----------|
| Database schema (9 tables, triggers, RLS) | Complete | `supabase/schema.sql` |
| TypeScript types | Complete | `src/types/database.ts` |
| Zod validation schemas | Complete | `src/lib/validations.ts` |
| Supabase clients (browser + server + admin) | Complete | `src/lib/supabase/` |
| Auth middleware (route protection) | Complete | `src/middleware.ts` + `src/lib/supabase/middleware.ts` |
| useAuth hook | Complete | `src/hooks/useAuth.ts` |
| Utils (formatPrice, timeAgo, status configs) | Complete | `src/lib/utils.ts` |
| Tailwind theme | Complete | `tailwind.config.ts` |
| Project scaffold | Complete | All config files |
| Root layout + globals CSS | Complete | `src/app/layout.tsx` + `globals.css` |
| Customer PWA (React artifact, not yet in project) | Prototype | Needs integration |
| Admin dashboard (React artifact, not yet in project) | Prototype | Needs integration |

### What Needs Building
| Component | Priority | Notes |
|-----------|----------|-------|
| Auth pages (login/signup) | P0 | Email/password + phone OTP |
| Customer restaurant browsing | P0 | Connected to Supabase, not mock data |
| Customer order placement + payment flow | P0 | OPay transfer instructions |
| Admin order management + payment confirmation | P0 | Real-time updates |
| Restaurant order acceptance/management | P0 | Accept → prepare → dispatch flow |
| Restaurant menu management | P1 | CRUD for menu items |
| Admin revenue + settlement views | P1 | Per-restaurant breakdown |
| Admin restaurant management | P1 | Add/edit/disable restaurants |
| WhatsApp notification integration | P1 | Order status updates |
| Paystack automated payments | P2 | Replace manual OPay verification |
| Rider management | P2 | Low priority until rider fleet added |
| Customer order tracking page | P1 | Real-time status display |
| Rating system | P2 | Post-delivery star rating |

---

## 12. BUSINESS RULES (ENFORCE IN CODE)

### Orders
1. Minimum order: no minimum (any amount accepted)
2. Maximum items per order: 20
3. Customer can only order from ONE restaurant per order
4. If customer has items from Restaurant A and adds from Restaurant B → confirm clear cart
5. Order number format: `ABIA-YYYYMMDD-NNN` (auto-generated by DB trigger)
6. Delivery fee is set by the restaurant, not the platform
7. Commission rate is snapshotted at order time (if restaurant's rate changes later, existing orders are unaffected)

### Payments
8. ALL payments flow through AbiaEats OPay account (no direct-to-restaurant in Phase 1)
9. No food leaves kitchen until payment is confirmed by admin
10. Payment confirmation must be logged in audit trail with admin user ID + timestamp
11. If payment not confirmed within 2 hours, order auto-cancels (implement as cron/scheduled function)

### Restaurants
12. New restaurants start at 6% commission (Launch Partner tier)
13. Commission moves to 10% after Month 3
14. Restaurants can toggle open/closed but cannot deactivate themselves (admin only)
15. Restaurant bank details can only be changed by admin (fraud prevention)

### Settlements
16. Weekly settlement every Sunday
17. Commission is DEDUCTED at source, never invoiced after the fact
18. Settlement record must include: period, order count, total GMV, commission, net payout
19. Settlement must be marked as "paid" by admin with transfer reference number

### Customer Data
20. Customer phone is ONLY visible to restaurant during active order (after payment confirmed, before delivery)
21. Customer delivery address is persisted as `default_address` for convenience
22. Customer can see full order history with status + rating

---

## 13. ENVIRONMENT VARIABLES

```env
# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # Server-only. NEVER expose to client.

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Change to production URL on deploy
NEXT_PUBLIC_APP_NAME=AbiaEats

# OPay Account Details (shown to customers during payment)
NEXT_PUBLIC_OPAY_ACCOUNT_NAME=AbiaEats    # Display name
NEXT_PUBLIC_OPAY_ACCOUNT_NUMBER=xxxx      # OPay account number

# Paystack (Phase 2)
# PAYSTACK_SECRET_KEY=sk_test_xxxxx
# NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxxxx

# WhatsApp Business API (Phase 2)
# WHATSAPP_API_TOKEN=your-token
# WHATSAPP_PHONE_NUMBER_ID=your-phone-id
```

---

## 14. TESTING EXPECTATIONS

### Before Shipping Any Feature
1. Order flow: Can a customer browse → add to cart → checkout → see payment instructions?
2. Admin flow: Can admin see pending orders → confirm payment → order moves to confirmed?
3. Restaurant flow: Can restaurant owner see confirmed orders → accept → mark preparing → mark delivered?
4. RLS test: If logged in as Customer A, can I see Customer B's orders? (Must be NO)
5. Status transitions: Does the DB reject invalid transitions? (e.g., `delivered → preparing`)
6. Mobile: Does it work on a 360px-wide screen?
7. Empty states: What happens with zero orders, zero restaurants, zero riders?

---

## 15. NAMING CONVENTIONS

- **Files:** kebab-case (`order-detail.tsx`, `use-auth.ts`)
- **Components:** PascalCase (`OrderCard`, `RestaurantList`)
- **Functions:** camelCase (`formatPrice`, `createOrder`)
- **Database columns:** snake_case (`customer_phone`, `delivery_fee`)
- **API routes:** kebab-case paths (`/api/orders/[id]/status`)
- **CSS classes:** Tailwind utilities. No custom CSS files except `globals.css`
- **Types:** PascalCase (`Order`, `Restaurant`, `OrderWithDetails`)

---

## 16. COMMON MISTAKES TO AVOID

1. **Don't calculate commission client-side.** The DB trigger does it. Pass `subtotal` + `commission_rate` and let the trigger compute `commission_amount` and `total`.
2. **Don't build an admin signup page.** Admin role is DB-only.
3. **Don't use `any` types.** The database types in `src/types/database.ts` cover everything.
4. **Don't fetch without RLS.** Always use the Supabase client (which enforces RLS), never the admin client (which bypasses RLS) — unless you're in a webhook or cron context.
5. **Don't forget `overflow-x: hidden`.** This has caused horizontal scroll bugs before.
6. **Don't show customer phone numbers globally.** Only during active orders, only to the assigned restaurant.
7. **Don't let orders skip status steps.** `awaiting_payment` cannot jump to `preparing`. The DB trigger blocks it, but your UI should also make invalid transitions impossible.
8. **Don't store prices in kobo.** We use whole Naira (₦2,500 not 250000 kobo). This is a deliberate choice for readability in the Nigerian market.
9. **Don't forget to log audit actions.** Every payment confirmation and settlement payout needs a `log_audit()` call.
10. **Don't use Pages Router.** This is an App Router (`src/app/`) project. No `pages/` directory.
