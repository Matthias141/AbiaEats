# Abia Eats customer UI refresh

The landing → discovery/home → restaurant/menu → cart interface now uses installed shadcn primitives, native app typography, original cuisine illustrations, neutral layered shadows and restrained glass. Orange remains the brand accent. Browse controls lead the page; promotional chrome is reduced.

The implementation and review are recorded in [ui-review.md](ui-review.md). Exact upstream skill sources are pinned in [ui-skill-sources.json](ui-skill-sources.json). Reproducible browser evidence and CLI/build logs live in [ui-evidence](ui-evidence).

Custom cuisine artwork in `src/lib/cuisine-icons.tsx` includes jollof, pepper soup, skewers, shawarma, local dishes, juice, bread, burger and serving platter. These are original coloured SVG illustrations, with highlights, shaded layers and ground shadows. Labels provide names; the artwork is decorative. Navigation/action glyphs remain conventional for recognition.

## Image provenance

`public/images/jollof-hero.webp` is generated brand imagery, not an actual restaurant menu photograph. Generated with the built-in image tool and compressed to WebP for delivery.

Prompt: Premium editorial photograph of authentic Nigerian jollof rice with grilled chicken and golden fried plantain in a ceramic bowl, warm pale peach table, three-quarter overhead closeup, natural food texture and soft daylight, square composition, no text/logos/watermarks. Brand imagery only.

## Review boundary

PR #25 remains a draft for review; it has not been merged. Automated Chromium checks use isolated sample data. Physical devices, other browser engines, assistive technology, dashboard layouts and live payment/backend permissions remain unverified. Existing server-side mock inventory fallback is a separate launch risk.
