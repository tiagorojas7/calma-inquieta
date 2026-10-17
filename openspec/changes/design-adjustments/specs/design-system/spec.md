# Delta for Design System

Unchanged: Single token source, Palette and primary color, Contrast gate, Type scale and fluid sizing, Self-hosted typography stand-ins, Button and link atoms, Component test harness, Empty state molecule.

## MODIFIED Requirements

### Requirement: Component inventory and layering

The delivery layer (`src/app/ui/`) MUST provide the atoms, molecules, organisms and templates listed in the proposal for this change. Presentational components MUST receive data only through props and MUST NOT read loaders, `site-content` or the environment. Route modules and small containers MUST own data access. Fixtures MUST NOT be imported by any production route.

Inventory (scope item 4): Atoms: Button, ButtonLink (primary, outline, text-with-arrow), Heading, Text, Eyebrow, Icon, Pill/Badge, Image, Picture (art-directed image; MAY be implemented as an additive mode of Image), Divider, CordDivider, Butterfly, VisuallyHidden, SkipLink. Molecules: NavLink, ContactItem, TrustItem, ActivityCard, DateBadge, UpcomingItem, TestimonialCard, FaqItem, VideoFacade, VideoLoop, EmptyState. Organisms: SiteHeader, MobileNav, SiteFooter, HeroCollage (replaced in place by the hero composition of `home-page`), ActivityShowcase, UpcomingList, TestimonialsSection, ValuesRow, GalleryGrid, FaqList, ContactBand. Templates: PublicPage, ComingSoonPage.
(Previously: the inventory had no Picture, CordDivider, Butterfly or VideoLoop.)

#### Scenario: Presentational purity

- GIVEN any component under `src/app/ui/`
- WHEN its imports are checked by lint or the architecture test
- THEN it imports no module from `src/modules` and no loader

#### Scenario: No fixtures in production

- GIVEN the production route modules
- WHEN their import graph is checked
- THEN no test fixture file is reachable

#### Scenario: New components are presentational

- GIVEN Picture, VideoLoop, CordDivider and Butterfly
- WHEN their imports are checked
- THEN each imports only React, other `ui` files and (for props typing) nothing from `src/modules`

#### Scenario: New components are classified

- GIVEN the new files under `src/app/ui/`
- WHEN the boundary lint runs
- THEN every file is classified as `ui` and no unknown-file error is raised

### Requirement: Image atom

Image MUST require an `alt` prop (empty string allowed only for explicitly decorative images), reserve a fixed aspect ratio, and load lazily unless marked as above the fold. Image MUST support art direction: an ordered list of sources, each with a media condition, `srcset`, `sizes`, format and its own `width` and `height`, plus a fallback `img` that also has `width` and `height`. Every source and the fallback MUST declare intrinsic `width` and `height` so the browser reserves the box for the active breakpoint. At most ONE image per page MAY be marked above the fold with `loading="eager"` and `fetchpriority="high"`; every other image, including images hidden at some breakpoints, MUST be `loading="lazy"`. The `ImageRef` shape and the Image props MUST change additively only (new fields optional), so existing call sites compile unchanged.
(Previously: Image had no art direction, no per-source dimensions, no limit on high-priority images and no additivity rule.)

#### Scenario: Missing alt is rejected

- GIVEN an Image used without `alt`
- WHEN the project is type-checked
- THEN type checking fails

#### Scenario: Aspect ratio reserved

- GIVEN an Image with aspect ratio 4:3
- WHEN rendered
- THEN its box declares that ratio before the image loads

#### Scenario: Every source has dimensions

- GIVEN an art-directed Image with a 4:5 phone source and a 3:2 desktop source
- WHEN rendered
- THEN each `source` and the fallback `img` carry `width` and `height`, and the box ratio matches the active source

#### Scenario: Sources are ordered and responsive

- GIVEN an art-directed Image with two sources
- WHEN rendered
- THEN the `source` elements appear in the declared order, each with `media`, `srcset` and `sizes`

#### Scenario: One high-priority image per page

- GIVEN Inicio rendered
- WHEN images with `fetchpriority="high"` or `loading="eager"` are counted
- THEN exactly one exists and it is the hero still photo

#### Scenario: Other images are lazy

- GIVEN any rendered public page
- WHEN images other than the hero still are inspected
- THEN each has `loading="lazy"`

#### Scenario: Additive change keeps old call sites valid

- GIVEN call sites that use `ImageRef` and Image with only the pre-change fields
- WHEN the project is type-checked after this change
- THEN type checking passes with those call sites unmodified

### Requirement: Accessibility baseline

Every interactive element MUST show a visible focus indicator that meets 3:1 contrast. Animations and transitions MUST be disabled or reduced under `prefers-reduced-motion: reduce`. This applies to CSS animations, to JavaScript-driven playback and to video: a component MUST NOT start motion or media playback by script when `prefers-reduced-motion: reduce` matches, and MUST re-check the preference when it changes. Where the Save-Data signal is on, components that fetch optional media (loops) MUST NOT request it. Each component test MUST include an axe-core check that reports no violations.
(Previously: reduced motion covered CSS transitions and animations only; Save-Data was not mentioned.)

#### Scenario: Focus visible

- GIVEN the stylesheet
- WHEN a keyboard user focuses a link or button
- THEN a focus-visible style is applied

#### Scenario: Reduced motion

- GIVEN `prefers-reduced-motion: reduce`
- WHEN a transition-bearing component renders
- THEN its motion duration resolves to zero or a non-animating alternative

#### Scenario: Reduced motion in script

- GIVEN `prefers-reduced-motion: reduce` matches
- WHEN a component that can start playback by script mounts
- THEN it makes no `play()` call and starts no scripted animation

#### Scenario: Preference changes at runtime

- GIVEN a component is animating or playing
- WHEN the media query starts matching `reduce`
- THEN the component stops

#### Scenario: Save-Data

- GIVEN the Save-Data signal is on
- WHEN a component that fetches optional media mounts
- THEN it issues no request for that media

#### Scenario: Keyframes scoped

- GIVEN the built stylesheet
- WHEN decorative keyframe animations (cord, butterfly) are located
- THEN each is declared inside `@media (prefers-reduced-motion: no-preference)`

#### Scenario: axe check

- GIVEN any component rendered with fixture props
- WHEN axe-core runs
- THEN zero violations are reported

## ADDED Requirements

### Requirement: Icon coverage and TrustItem fidelity

The Icon atom MUST provide the glyphs `hands`, `leaf`, `heart` and `group` in addition to its current set, all decorative by default (`aria-hidden`). TrustItem MUST render the icon named by its claim and MUST NOT fall back to a generic arrow when a named icon exists.

#### Scenario: New glyphs

- GIVEN the Icon atom
- WHEN rendered with each of `hands`, `leaf`, `heart` and `group`
- THEN each renders an `svg` with `aria-hidden="true"`

#### Scenario: Trust item icon

- GIVEN a trust claim with icon `leaf`
- WHEN TrustItem renders
- THEN the leaf glyph is shown and no arrow glyph is present

### Requirement: Change-4 non-collision

This change MUST NOT modify the catalog files owned by change 4: `src/app/ui/molecules/{activity-card,taller-card,intensivo-card}.tsx`, `src/app/ui/organisms/catalog-grid.tsx`, `src/app/ui/templates/catalog-listing-page.tsx`, the catalog loaders and mappers, `src/modules/site-content/infrastructure/content/catalog.ts`, the `workshops` and `media` modules, and `src/app/seo/{sitemap,json-ld}.ts`. Shared surfaces (`Image`, `ImageRef`) MUST change additively only. A check per PR MUST list these paths in the diff and fail when any is present.

#### Scenario: Protected paths untouched

- GIVEN the diff of any slice PR (S0 to S5)
- WHEN the changed paths are compared with the protected list
- THEN none matches

#### Scenario: Change-4 components compile

- GIVEN change-4 components that consume `Image` and `ImageRef`
- WHEN the project is type-checked on this change
- THEN no change-4 file needs editing to compile
