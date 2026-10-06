# Design System Specification

## Purpose

Defines the shared visual foundation: design tokens, the WCAG contrast gate, self-hosted typography stand-ins, and the atomic component library with its accessibility baseline. Later changes (catalog, enrollment, events, admin) add data, not styling.

Traceability: proposal scope items 1-4, 14; decisions D4, D5, D7; mockups-analysis 3.3; DMR 3.1.

## Requirements

### Requirement: Single token source

The system MUST define palette, type scale, spacing, radius, elevation and motion as tokens in ONE source that is consumed both by the stylesheet and by the contrast test. Components MUST NOT hardcode color, font-size or spacing literals that bypass the tokens.

#### Scenario: Contrast test reads the same tokens as the CSS

- GIVEN the token source declares a color token
- WHEN the contrast test and the build both read the tokens
- THEN both observe the same value for that token

#### Scenario: Token changed in one place

- GIVEN a color token value is edited in the token source
- WHEN the contrast test runs
- THEN the new value is evaluated without editing any other file

### Requirement: Palette and primary color

The palette MUST be based on the mockup system (sand `#E6D7C4`, cream page, warm surfaces, sage and olive accents, body text `#5E5B57`). The primary color MUST be the mockup clay `#936D53` darkened until white text on it passes 4.5:1 (decision D4). DMR colors that fail AA on cream (terracota rosada, tan, rosa empolvado) MUST be restricted to large text or decoration. Agency and partner blues MUST NOT appear in the palette.

#### Scenario: Primary button text is readable

- GIVEN the primary token and the on-primary (white) token
- WHEN the contrast ratio is computed
- THEN it is at least 4.5:1

#### Scenario: Failing DMR color is not used for body text

- GIVEN a DMR color whose ratio on cream is below 4.5:1
- WHEN the declared pairs table is inspected
- THEN that color appears only in pairs marked as large text or decorative

### Requirement: Contrast gate

A unit test MUST compute the WCAG 2.2 contrast ratio for every declared text/background pair and every declared UI-component/background pair. It MUST fail when a normal-text pair is below 4.5:1, or a large-text or non-text UI pair is below 3:1. The contrast function MUST be pure.

#### Scenario: All declared pairs pass

- GIVEN the declared pairs table
- WHEN the contrast test runs
- THEN every normal-text pair is at least 4.5:1 and every large-text or UI pair is at least 3:1

#### Scenario: A failing pair is introduced

- GIVEN a new pair declared as normal text with ratio 3.9:1
- WHEN the contrast test runs
- THEN the test fails and names the pair and its ratio

#### Scenario: Known reference values

- GIVEN black on white and identical colors
- WHEN the contrast function is called
- THEN it returns 21:1 and 1:1 respectively

### Requirement: Type scale and fluid sizing

The system MUST provide ONE type scale, fluid on public pages, with a light display serif for headings (italic accent supported) and a humanist sans for body text. Body text MUST be at least 16 px at every viewport.

#### Scenario: Body text minimum

- GIVEN a 360 px wide viewport
- WHEN the body text size token resolves
- THEN it is 16 px or larger

### Requirement: Self-hosted typography stand-ins

Fonts MUST be self-hosted WOFF2 files (Cormorant Garamond and Montserrat per D5). The system MUST NOT request any third-party font CDN. OFL licence files MUST be committed with the fonts. A font-metric fallback MUST be declared to limit layout shift. Swapping to the brand fonts MUST require changing one file.

#### Scenario: No third-party font requests

- GIVEN the built stylesheet and root document
- WHEN their font sources are inspected
- THEN every font URL is same-origin and none points to a font CDN

#### Scenario: Licences present

- GIVEN the fonts folder
- WHEN its contents are listed
- THEN each stand-in font family has an OFL licence file

#### Scenario: Fallback while font loads

- GIVEN the web font has not loaded
- WHEN text renders
- THEN a metric-adjusted fallback family is used

### Requirement: Component inventory and layering

The delivery layer (`src/app/ui/`) MUST provide the atoms, molecules, organisms and templates listed in the proposal for this change. Presentational components MUST receive data only through props and MUST NOT read loaders, `site-content` or the environment. Route modules and small containers MUST own data access. Fixtures MUST NOT be imported by any production route.

Inventory (scope item 4): Atoms: Button, ButtonLink (primary, outline, text-with-arrow), Heading, Text, Eyebrow, Icon, Pill/Badge, Image, Divider, VisuallyHidden, SkipLink. Molecules: NavLink, ContactItem, TrustItem, ActivityCard, DateBadge, UpcomingItem, TestimonialCard, FaqItem, VideoFacade, EmptyState. Organisms: SiteHeader, MobileNav, SiteFooter, HeroCollage, ActivityShowcase, UpcomingList, TestimonialsSection, ValuesRow, GalleryGrid, FaqList, ContactBand. Templates: PublicPage, ComingSoonPage.

#### Scenario: Presentational purity

- GIVEN any component under `src/app/ui/`
- WHEN its imports are checked by lint or the architecture test
- THEN it imports no module from `src/modules` and no loader

#### Scenario: No fixtures in production

- GIVEN the production route modules
- WHEN their import graph is checked
- THEN no test fixture file is reachable

### Requirement: Button and link atoms

Button and ButtonLink MUST offer primary, outline and text-with-arrow variants. Primary CTAs MUST have a touch target of at least 44 px height; all interactive controls MUST have at least 24 px targets. ButtonLink MUST render an anchor; Button MUST render a button element.

#### Scenario: Variant rendering

- GIVEN a ButtonLink with variant "outline" and an href
- WHEN rendered
- THEN an anchor with that href is present and no button element is created

#### Scenario: Disabled button

- GIVEN a Button with `disabled`
- WHEN the user clicks it
- THEN no click handler runs

### Requirement: Image atom

Image MUST require an `alt` prop (empty string allowed only for explicitly decorative images), reserve a fixed aspect ratio, and load lazily unless marked as above the fold.

#### Scenario: Missing alt is rejected

- GIVEN an Image used without `alt`
- WHEN the project is type-checked
- THEN type checking fails

#### Scenario: Aspect ratio reserved

- GIVEN an Image with aspect ratio 4:3
- WHEN rendered
- THEN its box declares that ratio before the image loads

### Requirement: Accessibility baseline

Every interactive element MUST show a visible focus indicator that meets 3:1 contrast. Animations and transitions MUST be disabled or reduced under `prefers-reduced-motion: reduce`. Each component test MUST include an axe-core check that reports no violations.

#### Scenario: Focus visible

- GIVEN the stylesheet
- WHEN a keyboard user focuses a link or button
- THEN a focus-visible style is applied

#### Scenario: Reduced motion

- GIVEN `prefers-reduced-motion: reduce`
- WHEN a transition-bearing component renders
- THEN its motion duration resolves to zero or a non-animating alternative

#### Scenario: axe check

- GIVEN any component rendered with fixture props
- WHEN axe-core runs
- THEN zero violations are reported

### Requirement: Component test harness

A `ui` Vitest project (DOM environment, Testing Library, axe-core) MUST run inside the single `pnpm test` command. Visual regression baselines MUST NOT be introduced in this change (D7; scope adjustment, deferred).

#### Scenario: One command

- GIVEN a clean checkout
- WHEN `pnpm test` runs
- THEN unit and ui projects both execute

### Requirement: Empty state molecule

EmptyState MUST accept a message and one or two call-to-action links, and render calm copy without cards, dates or prices.

#### Scenario: Empty state with CTA

- GIVEN EmptyState with a message and a WhatsApp link
- WHEN rendered
- THEN the message and the link are present and no list items exist
