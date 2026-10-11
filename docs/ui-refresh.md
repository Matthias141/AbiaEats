# Abia Eats customer UI refresh

Scope: landing, customer home, restaurant discovery, menu entry controls, menu sheets, restaurant-switch confirmation, customer navigation, and shared UI tokens. Existing Next.js/Tailwind components and cart/payment interfaces are retained. Admin and restaurant dashboards receive shared token changes but have not been visually reviewed.

## Design decisions

The existing orange, Playfair Display, and Outfit identity is retained. A warm background supports translucent navigation, floating panels, dialogs, and selected shared surfaces; content-heavy cards remain legible with high-opacity fills. Layered warm-neutral shadows establish small, medium, and large elevations, while restrained orange glow identifies primary actions. Primary controls use dark orange endpoints that retain readable white text, and the darker text token uses #B4430B so small links remain readable against the warm background. Food imagery leads the landing page; browsing does not require an account. Restaurant cards use actual vendor images or cuisine icons, never generated imagery masquerading as a vendor meal.

| Before                                                     | After                                                               | Reason                                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Unstructured glass and identical shadows on most surfaces | Deliberate glass layers with small, medium, and large depth tokens  | Restore premium depth while keeping hierarchy and readable content       |
| Repeated restaurant cards                                  | One shared card                                                     | Keep fees, open state, image behavior, and ratings consistent           |
| Unlabelled search and city overlays                        | Labelled search, pressed filter states, native dialog               | Make controls understandable to keyboard and assistive technology users |
| Free-delivery and instant-payment claims                   | Accurate fee review and payment-verification copy                   | Match the implemented ordering contract                                 |
| Mock popularity on the landing page                        | Cuisine links to real discovery                                     | Avoid portraying invented vendors and ratings as live inventory         |
| Mobile-only home width                                     | Mobile-first layout with two/three-column discovery at wider widths | Use desktop space while preserving touch controls                       |
| Click-only menu cards                                      | Native details button and separate add button                       | Expose both actions to keyboard users                                   |

## Ten requested references

These references guide implementation; they are not permanently installed agent skills. Their project-specific instructions are reconciled with the repository's existing components and business rules.

| Reference                                                                          | Application                                                                                             |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [frontend-design](https://www.ui-skills.com/skills/anthropics/frontend-design)     | Food-led hero, local copy, coherent brand identity                                                      |
| [apple-design](https://www.ui-skills.com/skills/emilkowalski/apple-design)         | Instant press feedback, restrained navigation material, reduced transparency and motion support         |
| [beautiful-shadows](https://www.ui-skills.com/skills/mengto/beautiful-shadows)     | Warm-neutral layered shadow tokens, inner highlights, and restrained action glow                        |
| [accessibility](https://www.ui-skills.com/skills/addyosmani/accessibility)         | Label association, described errors, native dialog, keyboard menu controls, visible focus, zoom enabled |
| [design-review](https://www.ui-skills.com/skills/superfuture/design-review)        | Prioritize usability and truthful copy before polish; concrete before/after review                      |
| [emil-design-eng](https://www.ui-skills.com/skills/emilkowalski/emil-design-eng)   | Explicit transition properties, short action-driven motion, no pulsing CTA                              |
| [shadcn](https://www.ui-skills.com/skills/shadcn-ui/shadcn)                        | Reuse and compose existing primitives instead of adding a second component system                       |
| [adapt](https://www.ui-skills.com/skills/pbakaus/adapt)                            | Wrapping filters, touch targets, bottom sheets on phones and centered dialogs on desktop                |
| [better-interface](https://www.ui-skills.com/skills/jakubkrehel/better-interface)  | Define scope, retain conventions, track evidence and incomplete verification                            |
| [interaction-design](https://www.ui-skills.com/skills/wshobson/interaction-design) | Loading skeletons, error/retry states, active filters and cart feedback                                 |

This is an implementation and source review, not a completed holistic `better-interface` audit. Its six companion `better-*` skills were not loaded; their formal domain reviews are **not reviewed**. No third-party review telemetry was sent.

## Image provenance

`public/images/jollof-hero.webp` is generated brand imagery, not an actual restaurant menu photograph. Generated with the built-in image tool and compressed to WebP for delivery.

Prompt: Premium editorial photograph of authentic Nigerian jollof rice with grilled chicken and golden fried plantain in a ceramic bowl, warm pale peach table, three-quarter overhead closeup, natural food texture and soft daylight, square composition, no text/logos/watermarks. Brand imagery only.

## Verification and remaining checks

Validation: TypeScript `tsc --noEmit` passed; ESLint completed with zero findings; Vitest passed 238 tests in 11 files; production `next build` passed. Existing middleware-deprecation and Vitest configuration warnings remain. Component tests cover generated label/error association, safe button types, busy/disabled states, dialog naming/cancellation/scroll cleanup, and discovery filters. Dialog methods are stubbed in jsdom; tests do not establish browser focus containment or screen-reader usability.

Browser automation is unavailable in this managed environment. Before release, inspect 360px, 390px, 768px and desktop layouts; test 200% zoom, keyboard entry/exit and focus restoration for each dialog, reduced motion, VoiceOver/TalkBack, and a full authenticated order on a staging backend. No live payments or production data were used.

| Likely failure                                         | Early warning                                       | Residual risk / verification                                                          |
| ------------------------------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Long vendor names or translated text wrap awkwardly    | Cards/filters grow or obscure controls              | Inspect real inventory at 360px and 200% zoom                                         |
| Shared token changes alter dashboard appearance        | Changed overlays or weak visual separation          | Dashboard visual regression remains unverified                                        |
| Vendor images fail or use disallowed domains           | Broken thumbnails / Next image errors               | Existing allowed-host policy retained; test vendor uploads                            |
| Slow networks leave data loading for too long          | Persistent skeleton or fetch error                  | Home retry handles errors; live latency and offline behavior remain unverified        |
| Native dialog behavior differs on older WebViews       | Cannot open/close sheet or focus escapes            | Current-browser behavior expected; test supported Android devices                     |
| Production listing/detail falls back to mock inventory | Sample IDs or sample prices appear without a banner | Pre-existing server-side fallback remains outside this UI pass; resolve before launch |

## Review boundary

The implementation is published on draft PR #25 for review. Repository `CLAUDE.md` section 17 still requires explicit confirmation before merge; no merge is performed by this change.
