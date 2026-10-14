# Customer UI redesign — 13 October 2026

The first pass was published as commit `d6631b8` in draft PR #29 on `ui/abia-eats-polish`, based on `0f1d255` from the existing customer UI branch. This is separate from restaurant onboarding. The combined food-first/native-layout follow-up is described in `ui-native-review.md`. No merge or live deployment is claimed here.

## Design changes

| Before | After | Why |
| --- | --- | --- |
| Outfit across customer app text and dialogs | Platform sans-serif for tasks, Outfit retained for the wordmark | Clearer reading and a less rounded, more familiar app texture |
| Dark overlay obscuring the main food banner | White text area beside a bright, tightly cropped food photograph | Legible headings and visible food without competing layers |
| Small photographic pills | Larger square photo tiles with labels and selected outline | Easier visual scanning and a clearer selected cuisine |
| Flat restaurant cards with separate floating images | White cards with inset photographs, refined small elevation and consistent padding | Group related information and establish depth |
| Charcoal navigation bar | Light translucent dock with a full warm selected surface | Strong wayfinding with less visual weight |
| Narrow two-column desktop menu | Wider restaurant header and three-column desktop menu | Use available space while retaining one/two columns on small screens |
| Add-only meal control | Direct quantity stepper after a dish is added | Adjust an order without repeatedly opening its detail sheet |
| Clipboard actions fail silently | Visible and announced copy/share result | Confirm the action or give a concrete recovery instruction |
| Unframed cart total | Elevated summary surface and consistent food rows | Make the checkout decision easy to scan |

Palette: cloud `#f6f7f8`, white `#ffffff`, ink `#171a20`, muted text `#555c67`, orange `#b4430b`, selected orange wash `#ffebdf`. Display tracking is tight; body tracking stays neutral. Glass is used for floating navigation and chrome, with opaque food and text surfaces beneath it.

Source guidance: frontend-design informs the coherent direction and removal of competing treatments; Beautiful Shadows supplies the existing exact neutral elevation recipes; Emil design engineering informs press feedback, explicit transitions and this before/after review; Apple design informs platform typography, material hierarchy and responsive feedback. Existing shadcn InputGroup, ToggleGroup, Button and dialog semantics remain in use. The recorded source manifest is `docs/ui-skill-sources.json`; no new skill installation is claimed.

Motion answers input: short press feedback, pointer-only card lift/photo zoom, selected filter cues, existing short sheet transitions and a brief quantity-change cue. Reduced motion removes movement, while labels, counts and selected states remain. No animation package was added. The native horizontal category scroller remains touch/keyboard accessible.

## Data and scope

Actual restaurant uploads take precedence. Cuisine photographs used when a restaurant cover is missing are labelled “Cuisine inspiration”. Missing menu photographs remain explicitly identified; stock food is not presented as a named dish's photograph. Production catalog empty/error handling and real UUID detail routing are retained. Sample restaurants exist only in the isolated verification fixture and development fallback.

The quantity stepper calls the existing cart operations and retains the existing 20-portion limit. Price calculations, payment APIs and order validation are unchanged. Shared customer typography also reaches checkout/profile, but their complete backend flows are not claimed as audited. Restaurant/admin UI is outside this redesign.

## Verification and practical limits

Run `npm run lint`, `npx tsc --noEmit`, `npm test`, and `BROWSER_EXECUTABLE_PATH=/path/to/chromium UI_AUDIT_OUTPUT=/tmp/abia-polish-review npm run test:ui`. The browser harness builds the production Next app with an isolated HTTP fixture, not live credentials or orders. `UI_AUDIT_SKIP_BUILD=1` is only for repeating checks against an unchanged, already-built fixture; the default still rebuilds.

TypeScript, ESLint and 266 tests in 15 files pass. The production build passes. Final browser evidence is in `docs/ui-evidence/polish-ui-audit.json`: 21 responsive/enlarged-text layouts, 20 axe state audits, 34 interaction checks and zero page errors. All checks pass and the audits report no violations. Visual review includes mobile/desktop home and mobile menu/cart. Verification screenshots remain local and unpublished.

| Likely failure | Early signal | Residual risk |
| --- | --- | --- |
| Missing vendor photos limit menu richness | Repeated “Photo coming soon” labels | Requires real restaurant uploads; the UI does not manufacture vendor imagery |
| Fixed dock/cart action obscures content on short screens | Last item cannot scroll clear of floating controls | Existing clearance and 200% text checks reduce risk; physical-device testing remains needed |
| Mobile browser renders glass or font weights differently | Scroll stutter, weaker separation, unexpected wrapping | Chromium checks do not establish Safari/Android frame pacing or rendering |
| Horizontal cuisine controls are overlooked | Users never discover categories beyond the initial row | Native scrolling is intentional, but discoverability needs testing with users |
| Deployment serves the earlier branch | Hosted interface lacks these changes | Local completion is not a deployment; publication remains pending explicit approval |

No live Supabase, payments, real assistive technology or physical iPhone/Android testing is claimed. Automated axe checks are not accessibility certification or user approval of the aesthetic direction.
