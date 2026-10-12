# Abia Eats UI review — 12 October 2026

Scope: landing, discovery/home, restaurant/menu and cart, including their loading, error, empty and modal states. This is a source and rendered-browser review of those surfaces. Shared primitive changes also reach dashboards, whose complete layouts were not reviewed. Backend APIs, permissions, restaurant uploads and payments are outside this pass.

## Sources and installed components

All ten requested instruction sources were loaded from their upstream repositories. The manifest [ui-skill-sources.json](ui-skill-sources.json) records exact commits and instruction paths; Design Review's checklist and Better Interface's six owning domain skills were also loaded. These sources guide the implementation; they are not claimed as permanently installed personal agent skills.

| Requested skill | Applied work and evidence |
| --- | --- |
| Beautiful Shadows | Exact neutral small/medium/large recipes in `globals.css`; hierarchy assigns elevation to cards, image frame and overlays. |
| Accessibility | Field labels/errors, named Radix dialogs, real main-focus skip link, keyboard filters, visible focus, contrast fixes; axe and interaction results below. |
| Design Review | Standard checklist and consolidated findings below; no Pro audit or certification claimed. No third-party review telemetry sent. |
| Emil Design Engineering | Before/after findings, touch controls, explicit short transitions, press feedback, reduced-motion behavior and full text wrapping. |
| shadcn | CLI 4.21.4 installed 14 official Tailwind 3 new-york registry primitives; shared adapters and customer controls consume them. |
| Adapt | Current upstream Impeccable context and web-adaptation reference; phone sheets, wrapped filters/header, 320–1440px checks and text resizing. Mechanical detector ran once and returned `[]`. |
| Better Interface | Accessibility, layout, writing, typography, colors and UI domain instructions reviewed; each appears in the consolidated findings. |
| Interaction Design | Loading/error/empty recovery, persistent selections, quantity feedback, cancellation and confirmation; interaction evidence below. |
| Frontend Design | Food-led hierarchy, direct local copy, distinctive original food artwork, restrained browsing chrome. |
| Apple Design | Native app text, instant press feedback, familiar controls, readable glass and reduced transparency/motion fallbacks. |

The public shadcn registry was unreachable. Installation used the checked-out official registry served locally to the CLI, preserving upstream source rather than hand-writing imitation components. `components.json` configures Radix/new-york and aliases the primitives directory. CLI info/search/docs logs are retained. Installed files: Badge, Button, Dialog, Empty, Field, InputGroup, Input, Label, Separator, Skeleton, Spinner, Textarea, ToggleGroup and Toggle. Existing Button/Input/Modal APIs are compatibility adapters over these primitives, keeping callers stable. New discovery and cart controls compose the installed components. This is a scoped migration, not a claim that every pre-existing app control was migrated.

## Consolidated findings

Severity describes the issue before the fix. All rows below are resolved in this change; the review has no remaining HIGH finding in the inspected scope.

| Severity | Domain | Location | Before | After | Why / verification |
| --- | --- | --- | --- | --- | --- |
| HIGH | Accessibility / colors | `restaurant-detail.tsx`, shared tokens | Green status and pale rating metadata failed normal-text contrast in browser audit. | Dark green/red status text; readable muted text and primary tokens. | Final 18 axe state audits have no reported WCAG A/AA violations. |
| HIGH | UI / accessibility | `ui/modal.tsx`, `primitives/dialog.tsx` | Browser focus behavior had not been verified; initial responsive sheet classes positioned the sheet incorrectly. | Named Radix dialog, focus containment, Escape, trigger restoration and mobile bottom placement. | Browser keyboard checks pass; city and food sheets end at viewport bottom 844px. |
| HIGH | UI | `cart-context.tsx` | Persisted client cart could produce hydration mismatch and an early empty write. | Restore after mount and save only after hydration; initial loading state matches the server. | No browser page errors; two hydration regression tests cover restoration and invalid storage. |
| HIGH | Layout / typography | `restaurant-detail.tsx` | At 200% root text size and 320px, logo plus padding left a narrow column despite no horizontal overflow. | Header wraps the information below its logo when space is insufficient. | Text-resize screenshot is visually inspected as well as mechanically checked. |
| MEDIUM | Accessibility / layout | Shared inputs/buttons, menu/cart controls | Small or inconsistently named actions and unconstrained text wrapping. | 44px minimum action targets, 48px fields, associated labels and separate native menu actions; full food names wrap. | Unit tests plus 320/390/768/1440px layout checks. |
| MEDIUM | Accessibility | `ui/skip-link.tsx`, root layout | Hash navigation alone did not establish focus in main content. | Skip link focuses the actual main landmark. | Browser focus assertion passes. |
| MEDIUM | UI / writing | Cart confirmation and `cart-controls.test.tsx` | Removal could be accidental; single-decrement API did not match whole-item removal copy. | Clear/remove confirmation; cancellation preserves contents, whole-item removal uses quantity zero. | Browser clear/cancel checks; regression test confirms all two portions are removed only after confirmation. |
| MEDIUM | UI / accessibility | Discovery controls | Selection semantics and keyboard behavior were inconsistent. | Labelled Field/InputGroup and radio-style ToggleGroups with roving focus. | Arrow focus, keyboard selection and empty-search recovery pass. |
| MEDIUM | Typography / writing | Landing, home, menu and cart | Decorative display text and repeated campaign panels competed with finding food; full descriptions could be clipped. | Native app typography, Outfit brand/display, concise food-first copy and full wrapping; price figures use tabular numerals. | Mobile/desktop screenshots and text-resize inspection. |
| MEDIUM | Colors / UI | `globals.css`, card and overlay components | Repeated decorative elevation obscured hierarchy. | Exact neutral elevation recipes; restrained navigation/overlay glass and opaque content cards. | Visual inspection; reduced transparency/contrast fallbacks in source. |
| MEDIUM | UI | Press and menu scrolling rules | Motion could continue under reduced-motion preferences. | Short action feedback is opt-in; reduced motion removes press transforms and smooth category scroll. | Browser reduced-motion assertion plus source review. |
| MEDIUM | Writing / UI | Landing and shared restaurant cards | Generic cuisine imagery and unsupported promotional claims weakened credibility. | Original cuisine SVGs, accurate fees/payment-review copy and generated hero labelled as brand imagery in provenance. | Source/copy review; fixture food image never presented as actual vendor photography. |

## Verification

- `npx tsc --noEmit`: passed.
- `npm run lint`: passed.
- `npm test`: 241 tests in 13 files passed.
- Production Next build: passed, 44 routes. Existing middleware and Vitest configuration deprecation warnings remain.
- `BROWSER_EXECUTABLE_PATH=/tmp/chromium npm run test:ui`: production Chromium 153.0.8010.0 against an isolated local HTTP fixture; no production credentials or real transactions.
- 17 layout cases: landing, discovery, menu and cart at 320, 390, 768 and 1440px, plus menu with root text size 200% at 320px. No measured horizontal overflow/clipped controls.
- 18 state audits using axe WCAG A/AA tags: no reported violations; loading, empty, error, sheets and cart confirmation included.
- 18 interaction assertions passed: skip focus, filter keyboard/selection, recovery, dialog containment/Escape/return, quantity/price persistence, sheet placement, reduced motion and cart confirmation/cancellation.
- No captured browser page errors. Detailed cases and geometry: [audit.json](ui-evidence/audit.json).

The browser harness builds/starts Next and its fake backend in one process. It is reproducible with Playwright's Chromium installed (`npx playwright install chromium`), or a compatible Chromium supplied through `BROWSER_EXECUTABLE_PATH`. Sample authentication exercises real middleware routing; it does not verify production authentication or RLS. The generated hero is attached to one fixture item solely to inspect image layout. Final whole-item removal behavior additionally has a dedicated unit regression test.

## Rendered evidence

18 screenshots were generated and visually inspected locally. Their upload was stopped when automatic approval review rejected screenshot disclosure to this GitHub repository. Screenshots are not part of this published commit; the JSON results and CLI/build logs are included. The user requested that verification screenshots remain unpublished. Screenshots cover landing, discovery, home loading/error/empty states, city and food sheets, menu text resizing, and cart confirmation/recovery.

## Verdict and limits

Approve the inspected scope for human design review. Automated axe results are not WCAG conformance certification. Viewports are Chromium emulation, not physical device results. Real VoiceOver/NVDA/TalkBack, Safari/Firefox, physical iPhone/Android, every screen at browser zoom, dark/RTL layouts, dashboard flows, real network performance and live Supabase/payment/invitation behavior are **not verified**. The 200% check is root text resizing on the menu, not a claim of full cross-app browser zoom coverage.

The pre-existing server-side mock inventory fallback remains a separate launch risk. This pass does not claim an audit-clean dependency tree or remove existing noncritical advisories. PR #25 remains draft and unmerged.

## Home spacing follow-up

The desktop home heading and 128px photograph left an unbalanced open area. The heading and search now form the left column, alongside a 288×216px food image with rounded corners and neutral layered elevation. The mobile photograph remains 96px, with search below both columns; tablet imagery stays 128px. Image `sizes` matches these widths to avoid downloading desktop-sized imagery on a phone. No listings, data queries or availability behavior changed.

TypeScript, lint and all 241 tests in 13 files pass. The production browser run passes 21 layout cases, 19 axe state audits and 18 interactions with no reported violations/page errors; the four additional layout cases cover home at 320/390/768/1440px. Desktop and mobile renders were inspected locally. [Follow-up results](ui-evidence/home-spacing-audit.json) contain the exact cases. Screenshots are omitted at the user's request. Physical-device and other-browser limitations above still apply.

## Food imagery follow-up

The spacing-only pass was insufficient for the requested photographic direction. Landing and home now have a full food banner, landing has six image-led cuisine cards, and home/discovery use a horizontally scrollable photographic filter row. Eight new optimised WebP assets (about 452 KiB combined) join the existing jollof image, giving nine distinct brand/cuisine images. The banner is 1280px wide; new category assets are 480px wide. Next Image supplies responsive sizes and lazy-loads category/card images; only the banner is prioritised.

Restaurant card uploads retain priority. Without a vendor photo, a matching generic category image is visibly labelled “Cuisine inspiration”; unknown cuisines retain custom artwork. Named menu-item photos are never fabricated. Generated sources, final asset paths and exact prompts are recorded in [food-image-provenance.json](food-image-provenance.json). This is photorealistic generated brand imagery, not a claim of documentary restaurant photography.

TypeScript/lint and 241 tests in 13 files pass. Production Chromium checks pass 21 layout cases, 19 axe state audits and 18 interaction assertions with no reported violations or page errors; see [food-imagery-audit.json](ui-evidence/food-imagery-audit.json). Landing/home desktop and mobile screenshots were visually inspected locally and remain unpublished at the user's request. Horizontal cuisine scrolling is intentional and preserves radio keyboard controls. Physical-device, other-browser and live-data limitations remain as documented above.

Residual risk: inspiration images can still be mistaken for actual vendor meals if the label is overlooked; vendor-uploaded photography is the durable solution. The label is the early distinction, and upload preference is preserved. This pass cannot make a zero-restaurant dataset into genuine available inventory. Image bytes are bounded, but real mobile-network performance remains unmeasured.

## Guest cart and Explore routing follow-up

Guest cart access was incorrectly gated by sign-in even though its contents are local browsing state. Middleware now permits exactly `/cart`; checkout, profile, admin, restaurant-owner and operations routes retain their existing authentication/role boundaries. A new public `/explore` alias redirects to `/restaurants`, preserving only the supported city/tag/search parameters. The existing Explore navigation button still points directly to the canonical listing.

Password sign-in now honours known customer `redirectTo` destinations, including `/checkout`, rather than always going home. An exact allowlist rejects external URLs, unrecognised paths and injected queries. This does not grant access to protected routes or change order/payment logic.

Verification: TypeScript/lint pass; 258 tests in 14 files pass. Seventeen new unit cases cover public guest paths, protected routes and safe login return. Production Chromium passes 21 layouts, 19 axe state audits and 23 interaction checks. Five added browser checks exercise actual Explore/Cart navigation, alias filter preservation, checkout sign-in routing and cart persistence. [Results](ui-evidence/customer-routing-audit.json). Password-authentication itself remains outside the local fixture verification; the return-path helper is unit-tested. The `/explore` alias resolves a missing literal route; canonical Explore navigation was successful locally before/after and the user's reported hosted 404 could not be reproduced through direct HTTP because Vercel deployment protection intervenes.

Residual risk: an older deployment, stale client or different hostname can still produce a 404; the exact failing URL is needed if it persists on this commit. Cart access exposes only the browser's locally stored selection; protected APIs remain unchanged. Screenshots remain unpublished.
