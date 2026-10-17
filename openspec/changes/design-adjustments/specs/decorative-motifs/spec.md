# Decorative Motifs Specification

## Purpose

Defines the two signature details of the site: the paper-cord ("encordado") divider between sections of Inicio, and one butterfly in the hero area. Both are decorative, light, built without JavaScript, and still under reduced motion.

Traceability: proposal scope item 7; OD-4; PD-2; PD-3; slice S4.

## Requirements

### Requirement: Cord divider placement

Inicio MUST show a cord divider at three boundaries only: (1) after the hero block; (2) between the activities block (or, when the catalog read failed, its absence) and the Quiénes somos teaser; (3) between the teaser (or the testimonials section when it renders) and the contact band. A section that does not render (for example an empty testimonials section) MUST NOT leave a stray divider. No divider MUST appear before the hero, directly above the footer, or adjacent to another divider. Other pages MAY keep the existing plain `Divider`.

#### Scenario: Between sections

- GIVEN Inicio renders with hero, activities, teaser and contact band
- WHEN the dividers are counted
- THEN exactly three cord dividers exist, at boundaries (1), (2) and (3)

#### Scenario: Hidden section leaves no divider

- GIVEN the testimonials section is not rendered
- WHEN Inicio renders
- THEN no two cord dividers are adjacent and none sits at the start of the main content or directly above the footer

#### Scenario: Catalog read failed

- GIVEN the activities block is absent because the catalog read failed
- WHEN Inicio renders
- THEN the divider after the hero and the divider before the contact band remain, and no two dividers are adjacent

#### Scenario: Plain divider elsewhere

- GIVEN a page that does not opt in to the cord divider
- WHEN the page renders
- THEN its dividers keep the existing plain rule

### Requirement: Cord divider semantics and weight

The cord divider MUST be a static inline SVG with no JavaScript and no network request. It MUST be decorative: `aria-hidden="true"`, not focusable, no accessible name. It MUST take its colour from `currentColor` or design tokens and MUST NOT contain colour literals that bypass the tokens. It MUST reserve a fixed height so it causes no layout shift.

#### Scenario: Decorative

- GIVEN a rendered cord divider
- WHEN its attributes are read
- THEN it has `aria-hidden="true"`, is not focusable and contains no `title` or text

#### Scenario: No external request

- GIVEN a rendered cord divider
- WHEN its markup is inspected
- THEN it contains no `href`, `src` or `url(` reference to an external resource

#### Scenario: Token colours

- GIVEN the divider source
- WHEN the token literal scan runs
- THEN no hex or rgb literal bypasses the tokens

#### Scenario: Reserved height

- GIVEN a cord divider before styles resolve
- WHEN its box is read
- THEN a height is declared by the component or the stylesheet

### Requirement: Cord divider motion

The cord divider MAY draw in with a CSS animation, and only inside `@media (prefers-reduced-motion: no-preference)`. Under `prefers-reduced-motion: reduce` it MUST be fully drawn and static. The animation MUST use only `opacity`, `transform` or stroke-dash properties and MUST NOT change layout. It SHOULD also be disabled where `prefers-reduced-data: reduce` is supported and set.

#### Scenario: Animation scoped to no-preference

- GIVEN the built stylesheet
- WHEN every rule that declares the divider animation is located
- THEN each one is inside `@media (prefers-reduced-motion: no-preference)`

#### Scenario: Reduce

- GIVEN `prefers-reduced-motion: reduce`
- WHEN the divider renders
- THEN no animation applies and the divider is fully visible

#### Scenario: No layout properties animated

- GIVEN the keyframes used by the divider
- WHEN their properties are listed
- THEN none is a layout property (width, height, margin, top, left)

### Requirement: Butterfly placement

Inicio MUST show exactly one butterfly in the hero area. It MUST be decorative, `aria-hidden="true"`, not focusable, and `pointer-events: none`. It MUST NOT cover the `h1`, the CTAs or the hero photo's focal subject, MUST NOT create horizontal scroll, and MUST NOT be part of the tab order. No other page renders a butterfly in this change.

#### Scenario: One butterfly on Inicio

- GIVEN Inicio renders
- WHEN butterflies are counted
- THEN exactly one exists, inside the hero area

#### Scenario: Not interactive

- GIVEN the rendered butterfly
- WHEN its attributes and styles are read
- THEN it has `aria-hidden="true"`, no tabindex and `pointer-events: none`

#### Scenario: No horizontal overflow

- GIVEN a 360 px viewport
- WHEN Inicio renders with the butterfly
- THEN the document does not scroll horizontally

#### Scenario: Other pages

- GIVEN `/quienes-somos` and `/contacto` render
- WHEN butterflies are counted
- THEN none exists

### Requirement: Butterfly weight and size on phones

The butterfly MUST be inline SVG with CSS-only animation, no JavaScript, no raster image and no video. On viewports below the `lg` breakpoint (64rem) it MUST be small (at most 56 px wide). It MUST animate only `transform` and `opacity`. It MUST NOT be eligible as the LCP element and MUST NOT shift the layout.

#### Scenario: Pure CSS and SVG

- GIVEN the butterfly component
- WHEN its imports and markup are inspected
- THEN it imports only React, has no `useEffect` timer and no `<img>`

#### Scenario: Phone size

- GIVEN a 360 px viewport
- WHEN the butterfly's rendered width is read
- THEN it is at most 56 px

#### Scenario: Absolutely positioned

- GIVEN the hero area with and without the butterfly
- WHEN their layout boxes are compared
- THEN the surrounding elements do not move

### Requirement: Butterfly motion

The butterfly MAY fly with CSS keyframes only inside `@media (prefers-reduced-motion: no-preference)`. Under `prefers-reduced-motion: reduce` it MUST be static, visible, at a fixed resting position. It SHOULD also be static where `prefers-reduced-data: reduce` is supported and set.

#### Scenario: Animation scoped to no-preference

- GIVEN the built stylesheet
- WHEN every rule that declares the butterfly animation is located
- THEN each one is inside `@media (prefers-reduced-motion: no-preference)`

#### Scenario: Reduce

- GIVEN `prefers-reduced-motion: reduce`
- WHEN Inicio renders
- THEN the butterfly is visible and has no animation

### Requirement: Accessibility of motifs

Every component test for the divider and the butterfly MUST run axe-core with zero violations. Neither motif MUST add landmarks, headings or text to the accessibility tree.

#### Scenario: axe

- GIVEN Inicio rendered with both motifs
- WHEN axe-core runs
- THEN zero violations are reported

#### Scenario: Accessibility tree unchanged

- GIVEN Inicio rendered with and without the motifs
- WHEN the accessible names and landmarks are listed
- THEN the two lists are equal
