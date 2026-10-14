# Food-first presentation and native task layouts — 14 October 2026

Follow-up to draft PR #29. The user chose a combination of food-first premium presentation and native-app precision. The aim is faster browsing and a clearer ordering workspace, while retaining Abia Eats photography and orange identity.

## Before and after

| Before | After | Purpose |
| --- | --- | --- |
| Search below the food banner | Search and a clear primary heading before the shorter banner | Make the immediate browsing task available sooner |
| Full-width vertical restaurant cards on mobile | Compact photo-and-information rows; larger vertical cards on desktop | Show more kitchens without abandoning photography |
| Mobile dock also used on desktop | Dedicated desktop rail outside the page content | Keep navigation available without covering food |
| Add action changes a menu card's height when quantity controls appear | Add and stepper occupy the same reserved footer | Prevent nearby items jumping when the order changes |
| Floating cart bar on every screen size | Desktop order panel beside the menu; mobile floating cart handoff | Match the ordering layout to available space |
| Single narrow cart column | Food list and sticky summary side by side on desktop | Keep the total visible while editing quantities |
| Checkout only at the end of the mobile cart | Persistent total and checkout action above the dock | Keep the next action available through long carts |
| City and cuisine filtering only | Open-now filter and delivery-fee/time sorting | Expose practical ways to narrow choices |

## Implementation boundaries

The new `OrderSummary` component reads subtotal, delivery fee and total from the existing cart context. It does not recalculate amounts or call payment APIs. The desktop preview shows the cart's actual restaurant and selections, including when a different restaurant is currently being browsed. Existing restaurant-switch confirmation remains in place.

Restaurant photos still prefer real uploads. Cuisine inspiration is explicitly labelled. Missing dish photographs remain identified as missing; this change does not manufacture vendor content or seed production restaurants.

Frontend-design guidance informed the composition and device-specific layouts. React review covers component boundaries, hooks and semantic controls. Verification follows discovery data through the real production Next routes and Supabase read clients to local fixture responses, then follows menu selection into persisted cart state and the protected checkout handoff. This does not exercise live payments or Supabase production policies.

## Verification

Commands: `npm run lint`, `npx tsc --noEmit`, `npm test`, and `BROWSER_EXECUTABLE_PATH=/path/to/chromium UI_AUDIT_OUTPUT=/tmp/abia-native-review npm run test:ui`.

The clean production build, TypeScript and lint pass. All 266 tests in 15 files pass. The final browser report is `ui-evidence/native-ui-audit.json`: 22 layouts, 23 axe audits with no violations, 42 interaction checks and zero page errors. It includes 200% menu/cart text, menu-card height stability, desktop navigation placement, open-now filtering, fee sorting, the populated order panel and checkout handoff. Screenshots remain local and unpublished.

Verification corrected a duplicate mobile checkout action and enlarged-text cart/summary wrapping. A new test now measures menu height before opening the modal, respecting its intentionally hidden background. Diagnostic inspection also found incremental build output retaining an earlier summary component; the generated build directory was moved aside and a clean production build was used for the final passing report.

## Failure modes and residual risk

| Failure | Early signal | Remaining limit |
| --- | --- | --- |
| Insufficient real vendor photography | Many “Photo coming soon” labels | Requires restaurant uploads; layout cannot replace genuine content |
| Fixed actions obscure content at large text sizes | Checkout or final content cannot fit/scroll clear | Enlarged-text checks reduce risk; physical-device testing remains needed |
| A restaurant closes after filtering | Detail shows closed despite an earlier open result | Current discovery sorting/filtering uses the loaded snapshot; ordering guards remain authoritative |
| Desktop order is from another kitchen | Preview restaurant differs from the page title | The actual cart restaurant is displayed; switching still requires confirmation |
| Different mobile font/blur rendering | Wrapping, scroll stutter or weak separation | Chromium does not establish Safari/Android rendering or frame pacing |

No physical device, real screen reader, production email, live data mutation or production payment verification is claimed. Automated accessibility audits are not certification. This code does not merge or promote its own deployment.
