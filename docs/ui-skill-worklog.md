# Abia Eats UI skill implementation

Scope: the public landing → home/discovery → restaurant/menu → cart handoff, including loading, error, empty, focus, zoom and reduced-motion states. Payments, account permissions, menu upload APIs, and vendor/admin dashboard flows are excluded. Shared primitive changes can affect those dashboards; do not imply full dashboard review.

Requested skills and their upstream commits are recorded in `ui-skill-sources.json`. The ten instruction sources, Design Review checklist, shadcn composition/form/styling rules, and all six Better Interface domain skills were loaded. Adapt's current upstream combines its commands under Impeccable; its web adaptation reference owns that part of this pass.

Design direction: keep the Abia Eats orange identity and original cuisine illustrations. Use a neutral light canvas, food-led imagery, smaller browsing chrome, and stronger information hierarchy. Native sans-serif text serves frequent app tasks; Outfit carries the wordmark and landing display. Glass belongs on floating navigation and overlays, with opaque food content underneath. Exact Beautiful Shadows small/medium/large recipes define elevation. Quantity, selected-filter and cart changes leave a static cue; press motion is brief and opt-in.

Completed: 14 official shadcn primitives are installed through CLI 4.21.4 using the checked-out official Tailwind 3 new-york registry. Shared adapters, discovery, menu and cart use them. Browser review found and fixed contrast, sheet placement, cart hydration and text-resize layout problems. Cart deletion now requires confirmation and removes the complete selected item.

TypeScript and ESLint pass. All 241 tests in 13 files pass. Production build passes with 44 routes. Chromium verification covers 17 layout cases, 18 axe state audits with no reported violations and 18 interaction assertions. Adapt's mechanical detector returned no findings. The consolidated six-domain review, ten-source mapping and practical verification limits are recorded in `ui-review.md` and `ui-evidence/`. No Pro audit, physical-device testing or screen-reader walkthrough is claimed. No third-party review telemetry was sent.

Screenshot disclosure was blocked by automatic approval review; screenshots remain local pending explicit user approval. Code and text evidence can be published independently.
