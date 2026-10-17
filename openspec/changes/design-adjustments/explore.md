# Exploration: design-adjustments (full)

> Copied verbatim from Engram `sdd/design-adjustments/explore` (observation #378, revision 2, 2026-10-16) by the sdd-propose phase, because the explore executor could not write files. The Engram observation stays the primary copy. Owner decisions taken after this exploration (2026-10-15 and 2026-10-16) are recorded in `proposal.md`, not here.

## Current state
- Routes: public-layout (index, quienes-somos, contacto, *, plus talleres/intensivos/eventos as coming-soon until C4-F2). Home = HeroSection (lg:grid-cols-2) -> TrustRow -> activity/upcoming grid -> AboutTeaser (text only) -> TestimonialsSection (null when empty) -> ContactBand.
- HeroCollage: up to 3 Images, all aboveTheFold (eager); #2 and #3 are max-md:hidden but still eager (hidden eager images still download on mobile).
- Image atom: <img> only; srcSet/sizes pass through props; width/height + inline aspect-ratio. No <picture>, no variants model. ImageRef = {src, alt, width, height}.
- VideoFacade: YouTube nocookie, local poster, click-to-load. No self-hosted video component.
- Content: static TS in src/modules/site-content/infrastructure/content/{home,about,catalog}.ts. Images: /media/stand-ins/{hero-1..3,gallery-01,02}.jpg, about-teaser.svg (declared, not rendered), share-default.jpg (SHARE_IMAGE_PATH in seo/meta.ts), favicon.png (root.tsx), catalog fallbackImage=gallery-01.jpg.
- Launch gate: listStandInAssets().length must reach 0; content-rules rule unregistered-stand-in rejects any image not in the stand-in registry.
- Tokens: Tailwind 4.3 @theme, --color-*: initial; token literal scan test forbids hex/arbitrary lengths in src/app/ui/**/*.tsx. Motion: only a global prefers-reduced-motion CSS rule (does not stop JS/video).
- Icon has 12 paths; no hands/leaf/heart/group. TrustRow hardcodes icon="arrow" and drops claim.icon (bug). Divider = hr.
- public/_headers: /media/* cache 86400; no CSP on public pages.

## Gap vs mockups
Hero collage/note (high), trust icons (medium, bug), section transitions (medium), teaser image (medium), gallery mosaic (medium), contact photo (medium), photo cards depend on C4 catalog media (low). No mobile mockups exist.

## Integration points
1. Picture atom + ImageRef additive (srcSet, sizes, sources[]); hero split layout on desktop; one eager/high image on mobile; preload with imagesrcset via route links. Curated crops exist (curation/crops *-m45, *-d169) but optimized variants are 3:4.
2. VideoLoop molecule (React only): muted loop playsInline preload=none poster, IntersectionObserver play/pause, skip under reduced-motion and Save-Data, aria-hidden. Hero loop v50 ~1.2-1.7 MB in public/media/video. Section loops deferred to C4-F2/F4.
3. CordDivider inline SVG (pattern, currentColor), optional CSS draw under no-preference.
4. Butterfly inline SVG aria-hidden, CSS keyframes only under no-preference.
5. Content wiring: new MEDIA_ASSETS registry (path, variants, rights/consent, maxVariant), content-rules update, consent gate like Testimonial.consent; swap hero/teaser (render image)/about gallery/contact/OG/catalog fallback.

## Approaches
A layered slices (recommended); B one big pass (over budget, breaks pinned tests, blocks on consent); C single-asset object-position (cheap, no true art direction).

## Slicing (single-pr, <=400 lines excl. binaries)
S0 media registry + assets 150-220 (+6-8 MB binary); S1 Picture + art-directed hero 300-380; S2 content swap + retire stand-ins + pinned tests 250-350 (needs consent for faces); S3 VideoLoop + hero loop 220-300; S4 cord divider + butterfly 180-260 (independent); S5 fidelity polish (icons, TrustRow fix, teaser image+text, contact photo) 300-400. Deferred: section loops, testimonial media, R2 loops.

## Risks
Mobile LCP and hidden eager images; CLS on picture sources; reduced motion for JS/video; pinned tests (stand-in-assets.test, repository-content.test, hero.ui.test, root.test, coming-soon.test, content-rules.test); image rights (4 face photos: wa0030, wa0018, 144641667, 182047855; 6 hands-only); only 37/181 have 1600; OG webp crawler risk (prefer JPEG); collisions with C4-F2/F4/B5 (additive Image changes, do not touch ActivityCard/mappers, merge fallbackImage last); media:optimize unmerged and sharp not a dependency; mockup data contradictions (follow approved content); binary size in git.

## Owner questions
Desktop hero split vs collage and mobile order; wa0030 faces while consent pending; hero loop now or after R2; butterfly path/placement/mobile; cord divider placement and static vs drawn; Save-Data autoplay policy; testimonials layout-only; confirm wa0019 and wa0013 picks.

NOTE: the Write tool was unavailable to this executor, so openspec/changes/design-adjustments/explore.md was NOT written; this Engram entry is the only copy.
