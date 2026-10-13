# About Page Specification

## Purpose

Defines the "Quiénes somos" page at `/quienes-somos`: history and value proposition, values row, gallery (images and optional videos) and FAQ, with each section hidden when it has no content.

Traceability: proposal scope item 7; decisions D1, D6; owner decisions (label "Quiénes somos", URL `/quienes-somos`; scope adjustment to proposal A2, which used "Nosotros" and `/nosotros`); A3 (FAQ added, scope adjustment).

## Requirements

### Requirement: Route and title

The page MUST be served at `/quienes-somos` with `h1` "Quiénes somos" and a unique title and description. The menu label MUST be "Quiénes somos".

#### Scenario: Route and heading

- GIVEN a request to `/quienes-somos`
- WHEN the page renders
- THEN the `h1` is "Quiénes somos" and status is 200

### Requirement: History and value proposition

The page MUST render history and value-proposition text read from `site-content`. Copy MUST be drafted only from verified DMR evidence and flagged in the content file as pending client approval. Founders' names, founding dates or other facts MUST NOT appear unless present as confirmed content. Voice MUST be es-AR voseo with "nosotras".

#### Scenario: Unconfirmed facts absent

- GIVEN content without confirmed founding year
- WHEN the page renders
- THEN no year or founder name is shown

#### Scenario: Pending-approval flag

- GIVEN history content marked `approved: false`
- WHEN the content module is queried
- THEN the flag is exposed so tests and the launch checklist can find unapproved copy

### Requirement: Values row

The ValuesRow MUST render each value (title and short text) from `site-content`, and MUST NOT render if no values exist.

#### Scenario: Values rendered

- GIVEN three values in content
- WHEN the page renders
- THEN three value items appear in content order

#### Scenario: No values

- GIVEN an empty values list
- WHEN the page renders
- THEN the values section is absent

### Requirement: Gallery images

The gallery MUST render images from `site-content`, each with required descriptive `alt` text, in a GalleryGrid. Activating an image MUST open a lightbox. The lightbox MUST: expose a dialog role with an accessible name, trap focus while open, close on Escape and on a visible close button, return focus to the activating image, and offer previous/next controls operable by keyboard (arrow keys). When no images exist, the gallery section MUST NOT render.

#### Scenario: Open and close

- GIVEN a gallery with three images
- WHEN the user activates the first image and then presses Escape
- THEN the lightbox opens showing that image and then closes, with focus back on the first image

#### Scenario: Keyboard navigation

- GIVEN the lightbox open on image 1
- WHEN the user presses ArrowRight
- THEN image 2 is shown

#### Scenario: Edges

- GIVEN the lightbox open on the last image
- WHEN the user activates "next"
- THEN it wraps to the first image or the control is disabled (design decides; behavior is consistent and tested)

#### Scenario: Empty gallery

- GIVEN no gallery images
- WHEN the page renders
- THEN no gallery heading or grid is in the DOM

#### Scenario: Alt text required

- GIVEN a gallery item without alt in content
- WHEN content validation runs
- THEN validation fails

### Requirement: Video facade

Gallery videos MUST use a YouTube privacy-enhanced (`youtube-nocookie`) click-to-load facade (D6). Before the user activates the facade, the page MUST NOT load any third-party script, iframe or request. If no video URLs exist, no video UI MUST render.

#### Scenario: Nothing loaded before click

- GIVEN a VideoFacade with a video id
- WHEN rendered and not activated
- THEN the DOM contains no iframe and no third-party script

#### Scenario: Load on activation

- GIVEN the facade is rendered
- WHEN the user activates it
- THEN an iframe with the privacy-enhanced domain and the title attribute is inserted

#### Scenario: Keyboard

- GIVEN focus on the facade control
- WHEN the user presses Enter or Space
- THEN it activates

#### Scenario: Hidden until URLs exist

- GIVEN content with no video entries
- WHEN the page renders
- THEN no VideoFacade is rendered

### Requirement: FAQ

The FAQ MUST be built from native `<details>`/`<summary>` elements via FaqList and FaqItem, in content order. It MUST NOT emit FAQPage structured data. Answers MUST come only from `site-content` entries backed by evidence; no invented policy (seña, cancellations, make-ups) may appear. With no entries, the FAQ section MUST NOT render.

#### Scenario: Disclosure

- GIVEN a FAQ with two items
- WHEN the user activates the first summary
- THEN its answer is visible and the second stays collapsed

#### Scenario: No FAQPage JSON-LD

- GIVEN the About page head output
- WHEN scanned for structured data
- THEN no `FAQPage` type exists

#### Scenario: Empty FAQ

- GIVEN no FAQ entries
- WHEN the page renders
- THEN the FAQ section is absent

### Requirement: Hide-when-empty rule

Each of values, gallery, videos and FAQ MUST be omitted entirely, heading included, when it has no content. The page MUST remain valid (one `h1`, no axe violations) with all optional sections empty.

#### Scenario: All optional sections empty

- GIVEN content with only history text
- WHEN the page renders
- THEN only history is shown and axe reports no violations
