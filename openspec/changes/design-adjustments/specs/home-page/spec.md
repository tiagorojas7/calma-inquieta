# Delta for Home Page

Unchanged by this change: Talleres mensuales showcase with empty state, Próximos intensivos list with empty state, Hidden-until-real testimonials, No invented facts. Change 4 (`public-catalog`) modifies those four and adds "Inicio survives a catalog read failure"; this delta touches disjoint requirements (Hero, Trust row, Quiénes somos teaser and contact band, Inicio metadata and structure) and adds Section rhythm.

## MODIFIED Requirements

### Requirement: Hero

Inicio MUST show a hero with an eyebrow, one `h1` with an italic accent word, a subtitle, two CTAs "Ver talleres" (to `/talleres`) and "Ver intensivos" (to `/intensivos`), and photography from the media registry (publishable assets only). The hero text MUST NOT overlap the photography on any viewport.

On phones, one art-directed 4:5 still photo (`img-20260819-174607732-hdr`) is the hero image. The self-hosted muted loop (see `ambient-video`) appears in a 4:5 tile placed right after the hero text.

On desktop (from the `lg` breakpoint, 64rem), the hero is a split layout: title, subtitle and CTAs on one side, and a photo column on the other. The photo column holds the main still photo plus one smaller secondary tile that holds the loop.

The hero still photo MUST be the LCP element on every viewport. It is the only image on the page with `loading="eager"` and `fetchpriority="high"`. The route MUST preload exactly that image through two mutually exclusive `<link rel="preload" as="image">` elements, one for the phone source and one for the desktop source, each with a `media` condition (the desktop one `(min-width: 64rem)`, the phone one its exact complement), so only one matches at any viewport. They MUST be emitted through the route `meta` export as descriptors with `tagName: "link"` (the route `links` export cannot read loader data), and their `imagesrcset` and `imagesizes` MUST equal the `srcset` and `sizes` of the corresponding `<picture>` source. No hero image MAY be hidden by CSS at a breakpoint while still loading there: any image not visible at a breakpoint MUST be `loading="lazy"` and not requested by a hidden element. The loop tile MUST exist once in the DOM (not duplicated per breakpoint). Every `source` and `img` in the hero MUST declare `width` and `height`.
(Previously: a collage of registered stand-in image slots that collapsed to one or two images on narrow viewports, with the hidden images still loading eagerly.)

#### Scenario: Hero CTAs

- GIVEN Inicio renders
- WHEN the hero CTAs are read
- THEN "Ver talleres" links to `/talleres` and "Ver intensivos" links to `/intensivos`

#### Scenario: Single h1

- GIVEN Inicio renders
- WHEN headings are counted
- THEN exactly one `h1` exists and it contains an emphasized (italic) word

#### Scenario: Hero images come from the registry

- GIVEN the hero image sources
- WHEN compared with the media registry
- THEN every source belongs to a publishable registry entry and none is in the stand-in manifest

#### Scenario: Phone hero

- GIVEN a 360 px viewport
- WHEN the hero renders
- THEN the active hero image is the 4:5 still photo, the loop tile follows the hero text, and no secondary photo is visible

#### Scenario: Desktop hero

- GIVEN a 1280 px viewport
- WHEN the hero renders
- THEN title and CTAs sit beside a photo column holding the main still photo and one secondary tile with the loop, and no text overlaps either

#### Scenario: Still photo is the only eager image

- GIVEN Inicio rendered
- WHEN images with `loading="eager"` or `fetchpriority="high"` are listed
- THEN only the hero still photo is listed

#### Scenario: Hero preload

- GIVEN the Inicio route `meta` output
- WHEN the preload descriptors (`tagName: "link"`, `rel: "preload"`) are read
- THEN exactly two image preloads exist, both for the hero still photo, with mutually exclusive `media` conditions, and each `imagesrcset` and `imagesizes` equals the `srcset` and `sizes` of the matching `picture` source

#### Scenario: No hero preload on error

- GIVEN the Inicio route renders its error branch
- WHEN the `meta` output is read
- THEN it contains no image preload

#### Scenario: Hidden images do not download on phones

- GIVEN a 360 px viewport
- WHEN the page loads and the network requests are listed
- THEN no image that is not displayed at that width is requested, and no hero image hidden by CSS has `loading="eager"`

#### Scenario: Loop is never the LCP

- GIVEN Inicio loaded at 360 px and at 1280 px
- WHEN the LCP element is determined
- THEN it is the hero still photo and not the loop or its poster

#### Scenario: Loop tile exists once

- GIVEN Inicio rendered
- WHEN loop elements are counted
- THEN exactly one exists

#### Scenario: Dimensions on every source

- GIVEN the hero markup
- WHEN every `source` and `img` is inspected
- THEN each has `width` and `height`

#### Scenario: Consent gate in the hero

- GIVEN a hero or teaser slot (a required single slot) that points at an asset that is `pending`, excluded or lacks a ledger record
- WHEN the site content is validated at build or CI time
- THEN validation fails naming the asset, so the content cannot ship and no fallback is rendered

#### Scenario: Optional loop slot is gated at read time

- GIVEN the hero loop points at an unpublishable asset
- WHEN Inicio is read
- THEN the loop is absent and the hero renders without error

### Requirement: Trust row

The trust row MUST render only claims present in `site-content` marked client-approved, each with its own icon from the claim (not a generic arrow). "Materiales incluidos" MUST apply to intensivos only. If no approved claim exists, the row MUST NOT render.
(Previously: the row did not require rendering each claim's own icon.)

#### Scenario: No approved claims

- GIVEN site-content has zero approved trust claims
- WHEN Inicio renders
- THEN no trust row appears

#### Scenario: Materiales incluidos scope

- GIVEN a claim "Materiales incluidos"
- WHEN content validation runs
- THEN the claim must be scoped to intensivos or validation fails

#### Scenario: Claim icon rendered

- GIVEN approved claims with icons `hands`, `leaf`, `heart` and `group`
- WHEN the trust row renders
- THEN each item shows the glyph of its own claim and no arrow glyph appears

### Requirement: Quiénes somos teaser and contact band

Inicio MUST include a teaser linking to `/quienes-somos` (copy from `site-content`, voice "nosotras") that shows the publishable photo `img-20260411-wa0013` from the media registry with its alt text, and a ContactBand with the WhatsApp CTA and Instagram link from the business profile. The teaser image MUST be lazy-loaded and have `width` and `height`.
(Previously: the teaser was text and link only; the `about-teaser` stand-in was declared but never rendered.)

#### Scenario: Teaser link

- GIVEN Inicio renders
- WHEN the teaser link is inspected
- THEN its href is `/quienes-somos`

#### Scenario: Teaser image

- GIVEN Inicio renders
- WHEN the teaser is inspected
- THEN it contains the image of `img-20260411-wa0013` with non-empty alt, `loading="lazy"`, `width` and `height`

#### Scenario: Teaser image not a stand-in

- GIVEN the teaser image source
- WHEN compared with the stand-in manifest
- THEN it is not listed there

#### Scenario: Contact band uses profile

- GIVEN the business profile
- WHEN the contact band renders
- THEN its WhatsApp and Instagram hrefs derive from the profile values

### Requirement: Inicio metadata and structure

Inicio MUST export a unique title and description, and expose LocalBusiness JSON-LD (see seo-foundation). Only the hero still photo MAY be above the fold with eager loading; every other image MUST be lazy-loaded.
(Previously: images above the fold must not be lazy-loaded, without limiting how many.)

#### Scenario: Meta present

- GIVEN the Inicio meta export
- WHEN evaluated
- THEN it contains a non-empty title and description distinct from other pages

#### Scenario: Lazy elsewhere

- GIVEN Inicio rendered
- WHEN images other than the hero still photo are inspected
- THEN each has `loading="lazy"`

## ADDED Requirements

### Requirement: Section rhythm with cord dividers and butterfly

Inicio MUST place the cord divider at the three section boundaries defined by `decorative-motifs` and MUST show one butterfly in the hero area, as defined by the `decorative-motifs` capability. These motifs MUST NOT change the text, order or links of any section.

#### Scenario: Dividers between sections

- GIVEN Inicio renders with hero, activities, teaser and contact band
- WHEN cord dividers are counted
- THEN exactly three exist: after the hero, between the activities block and the teaser, and between the teaser (or testimonials when present) and the contact band, and none sits directly above the footer

#### Scenario: Butterfly in the hero area

- GIVEN Inicio renders
- WHEN butterflies are counted
- THEN exactly one exists and it is inside the hero area

#### Scenario: Content unchanged by motifs

- GIVEN Inicio rendered with and without the motifs
- WHEN the text and links are compared
- THEN they are equal

#### Scenario: Reduced motion on Inicio

- GIVEN `prefers-reduced-motion: reduce`
- WHEN Inicio renders and the loop becomes visible
- THEN the butterfly and dividers are static, and the loop does not play
