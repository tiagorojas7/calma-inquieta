# Public UI overhaul

Status: source audit ready; visual viewport matrix pending
Branch: `feat/ui-public-overhaul-audit`
Baseline: `origin/main` at `265668f`

## Constraints

- Audit every public screen at 360, 768, 1024, and 1440 CSS px before changing UI code.
- Preserve the brand rules in `docs/design/**`; owner approval is required for brand-breaking changes.
- Keep public UI changes out of `src/app/ui/admin/**` and `src/app/routes/admin/**`.
- Implement reviewable slices of about 400 diff lines, with the icon component set as the first code slice.
- Preserve WCAG AA contrast, 44 px minimum touch targets, reduced-motion behavior, and zero horizontal overflow at 360 px.

## Skill and brand baseline

The audit applies the mandatory `ui-ux-pro-max` guidance and its web quick reference. Searches covered a coherent creative-workshop design system, mobile-first Tailwind, React forms, touch hierarchy, image layout stability, heading balance, reduced motion, validation focus, multi-step progress, and contextual icon semantics.

The generated design-system suggestion was treated as advice, not a replacement palette: its generic pink/black palette and Fredoka/Nunito pairing conflict with the established brand. The current clay/sand/sage palette and Cormorant/Montserrat/Caveat stand-ins remain authoritative under `docs/design/deviation-register.md` and `docs/design/brand-swap-guide.md`. Replacing brand fonts, the wordmark, abstract stand-ins, or the provisional social assets requires owner-provided licensed assets. `tan-400` remains decorative-only.

## Viewport evidence

Runtime capture was interrupted when the shared Docker/PostgreSQL service stopped accepting connections. The environment was later rebuilt successfully with an empty, migrated database. The owner explicitly instructed Terminal A to commit these 53 source findings as the first work unit, then seed test data and complete the viewport matrix before UI implementation.

| Screen                     | 360     | 768     | 1024    | 1440    |
| -------------------------- | ------- | ------- | ------- | ------- |
| Home                       | pending | pending | pending | pending |
| Talleres                   | pending | pending | pending | pending |
| Taller detail              | pending | pending | pending | pending |
| Intensivos                 | pending | pending | pending | pending |
| Intensivo detail           | pending | pending | pending | pending |
| Quiénes somos              | pending | pending | pending | pending |
| Contacto                   | pending | pending | pending | pending |
| Eventos privados           | pending | pending | pending | pending |
| Enrollment form            | pending | pending | pending | pending |
| Materials selector         | pending | pending | pending | pending |
| Order summary and WhatsApp | pending | pending | pending | pending |
| 404 and server error       | pending | pending | pending | pending |

## Audit findings

Each row states what is wrong, the applicable skill guidance, and the concrete repair. Priorities use **critical**, **high**, and **medium** only.

### Global system, navigation, and shared components

| ID  | Priority | What is wrong                                                                                                                                                        | Skill guidance                                                                                               | Repair                                                                                                                                                                                       |
| --- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G01 | critical | Global controls have a 24 px minimum, and native public form controls receive no 44 px component baseline (`styles/app.css`).                                        | Touch targets must be at least 44×44 px and spaced by at least 8 px.                                         | Introduce a shared field/control treatment with `min-h-11`, comfortable padding, and measured target tests.                                                                                  |
| G02 | high     | `Button` has hover/focus polish but no explicit disabled, loading, or busy treatment; active mostly removes the hover lift (`atoms/button.tsx`).                     | Every control needs distinct hover, focus, active, disabled, and async feedback.                             | Add semantic disabled/loading APIs, `aria-busy`, non-layout-shifting progress, disabled cursor/contrast, and stronger pressed feedback.                                                      |
| G03 | high     | Primary, outline, and `text-arrow` are the only variants; CTA copies and ad-hoc button classes are duplicated across header, footer, and bands, so hierarchy drifts. | One primary action per surface; secondary and tertiary actions must be visibly subordinate and consistent.   | Define primary, secondary, and tertiary variants and route every public CTA through them.                                                                                                    |
| G04 | high     | `atoms/icon.tsx` contains hand-authored approximations, while play/pause SVGs are duplicated inline in three organisms. Provenance is not registered.                | Use one vector family, one stroke system, semantic context, and accessible names for icon controls.          | Replace with dedicated Lucide-derived components under `atoms/icons/`, add contextual accessibility props, and register ISC provenance in `docs/design/icon-licenses.md`.                    |
| G05 | high     | `html { overflow-x: clip }` can hide off-canvas defects instead of proving that 360 px layouts fit.                                                                  | Mobile layouts must not horizontally overflow; clipping is not a substitute for fitting.                     | Keep intentional local clipping only, remove the global mask after fixing offenders, and add a 360 px `scrollWidth === clientWidth` browser check.                                           |
| G06 | high     | Desktop header `NavLink`s have no 44 px target; only mobile typography and the separate CTA create large hit areas (`molecules/nav-link.tsx`).                       | Navigation targets need 44 px hit areas and visible current state.                                           | Add a nav target variant with `min-h-11`, vertical alignment, and a persistent active indicator.                                                                                             |
| G07 | medium   | Focus rings exist, but sticky header and sticky materials UI have no shared focus-offset/scroll-margin strategy.                                                     | Sticky UI must not obscure keyboard-focused controls.                                                        | Add global `scroll-margin`/`scroll-padding` tokens and browser tests that tabbed focus stays fully visible.                                                                                  |
| G08 | high     | The six-link desktop navigation begins exactly at 1024 px, while the deviation register explicitly says fit was never verified.                                      | Breakpoints follow content, not device labels; navigation must not wrap or collide.                          | Measure at 1024 with real fonts and move desktop nav to `xl` if any collision occurs; record the result in the deviation register.                                                           |
| G09 | medium   | Scroll reveals last 650 ms and mobile menu items stagger across the full six-link set, making routine navigation feel choreographed rather than immediate.           | Motion must communicate cause/effect, remain interruptible, and animate only 1–2 key elements per view.      | Shorten reveal duration/stagger, limit reveals to major landmarks, and preserve the correct final state under rapid interaction.                                                             |
| G10 | medium   | The testimonial quotation glyph is corrupted (`content: "C"`) in `styles/motifs.css`.                                                                                | Decorative symbols must render predictably and never substitute malformed glyphs for icons.                  | Use an escaped Unicode quote or a licensed decorative SVG with `aria-hidden`.                                                                                                                |
| G11 | medium   | Cards, bands, and CTAs repeatedly use the same rounded surface, clay border, and shadow, producing the flat, undifferentiated feel reported by the owner.            | Establish hierarchy through contrast, spacing, typography, and a consistent elevation scale—not color alone. | Assign explicit surface/elevation roles for editorial bands, catalog cards, summaries, and conversion panels.                                                                                |
| G12 | medium   | Current UI/axe tests assert classes and static accessibility, but not computed contrast, 44 px geometry, interaction states, or 360 px overflow.                     | Validate observable accessibility outcomes at target viewports.                                              | Add browser-level checks for geometry, contrast pairs, focus visibility, reduced motion, and overflow without weakening existing axe tests.                                                  |
| G13 | high     | Abstract SVG stand-ins and soft social assets remain the dominant visual material; they read as placeholders and cannot communicate real workshop craft.             | Prefer optimized, meaningful imagery with stable dimensions and consistent art direction.                    | Keep the documented stand-ins only until the owner supplies rights-cleared photos; then use responsive WebP/AVIF crops and a deliberate mobile/desktop composition. Owner decision required. |
| G14 | medium   | The type scale is coherent, but short headings do not consistently bound their measure or request balanced wrapping, so display lines can orphan unpredictably.      | Use bounded heading measure and progressive `text-wrap: balance`; never hard-code line breaks.               | Add heading measure/balance roles and verify Spanish copy at all four widths and enlarged text.                                                                                              |

### Home

| ID  | Priority | What is wrong                                                                                                                                                          | Skill guidance                                                                                                 | Repair                                                                                                                     |
| --- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| H01 | high     | The brand descriptor/bajada is visually hidden below 1024 px (`hero-section.tsx`), removing important context for the mobile-first audience.                           | Mobile content priority must expose the core value proposition first.                                          | Keep a concise visible descriptor on mobile and move secondary copy below the CTAs if space is tight.                      |
| H02 | high     | The phone hero combines large display copy with a collage that has a hard 22 rem minimum and an intentional right bleed; global clipping currently hides any overflow. | Design mobile-first, avoid horizontal scroll, and reserve media space without pushing the primary action away. | Recompose the mobile collage into fewer intentional layers, cap its height, and verify top-to-CTA scanning at 360 px.      |
| H03 | medium   | The hero and later bands layer butterflies, sprigs, frames, torn masks, shadows, and reveals at once; the motifs compete with content.                                 | Limit animation and decoration to a few meaningful focal elements.                                             | Keep one signature motif per section and remove or quiet secondary ornament at phone widths.                               |
| H04 | high     | “Ver talleres” and “Ver intensivos” are category links, but neither names the user outcome or current availability, weakening conversion.                              | CTA copy should state the next step; only one action should dominate.                                          | Make the current best conversion path primary and use outcome-led secondary copy, informed by actual catalog availability. |
| H05 | medium   | Nested `py-section` blocks inside a section create long vertical gaps and make catalog modules feel disconnected.                                                      | Use a 4/8 px rhythm with distinct section spacing tiers.                                                       | Define local module spacing separately from page-section spacing and tighten related catalog content.                      |

### Talleres listing

| ID  | Priority | What is wrong                                                                                                                             | Skill guidance                                                                         | Repair                                                                                                 |
| --- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| T01 | high     | Taller cards stack image, heading, teacher, summary, shifts, price, notices, seats, and link with nearly equal visual weight.             | Visual hierarchy must support rapid comparison and one clear next action.              | Group metadata, elevate price/availability, shorten summary measure, and create a clear card footer.   |
| T02 | medium   | The `text-arrow` CTA has no arrow icon and the rest of the card is not clickable, so affordance is weaker than its variant name implies.  | Interactive affordance cannot rely on hover; labels and icons should reinforce intent. | Add the licensed arrow icon and an accessible stretched-link pattern without nesting controls.         |
| T03 | medium   | Card images use intrinsic proportions without a shared catalog aspect ratio, so mixed uploads can create uneven card starts and scanning. | Reserve stable media space and keep comparison grids aligned.                          | Adopt an art-directed catalog ratio with `object-fit`, focal-position support, and responsive `sizes`. |

### Taller detail

| ID   | Priority | What is wrong                                                                                                                                      | Skill guidance                                                     | Repair                                                                                              |
| ---- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| TD01 | high     | The enrollment/inquiry CTA appears after image, description, teacher, shifts, price, and notice, requiring a long mobile scan before action.       | Primary action should stay discoverable without obscuring content. | Add an above-the-fold action summary and a non-obscuring mobile sticky CTA when enrollment is open. |
| TD02 | high     | A full-width image and then a flat vertical metadata stack underuse tablet/desktop space and hide relationships between schedule, fee, and action. | Adapt layout by content priority and maintain readable measures.   | Use a two-column editorial hero at larger widths with a structured booking summary card.            |
| TD03 | medium   | Gallery follows the conversion block without an orienting title or explanation when images exist.                                                  | Group related content with headings and whitespace.                | Add a descriptive gallery heading and keep it secondary to booking.                                 |

### Intensivos listing and detail

| ID  | Priority | What is wrong                                                                                                                                                                     | Skill guidance                                                                              | Repair                                                                                                       |
| --- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| I01 | high     | Intensivo cards give date, title, teacher, duration, full price, deposit, seats, materials, policy, pause state, and CTA similar weight—the exact flatness reported by the owner. | Comparison cards need a dominant title/date, grouped metadata, and one unmistakable action. | Create date-led hierarchy, a compact facts row, a separated price block, and a distinct footer CTA.          |
| I02 | high     | Date badge and title share a non-wrapping flex row without a shrinkable title child, risking squeezed headings at 360 px.                                                         | Flex/grid text children must shrink and wrap naturally; do not truncate essential labels.   | Add `min-w-0`, bounded title measure, and a stacked narrow-phone fallback.                                   |
| I03 | high     | Detail price and deposit both use the same `PriceTag`, obscuring which amount is total and which reserves the seat.                                                               | Monetary hierarchy must explain the decision and use more than color.                       | Build a pricing summary that labels total, reservation amount, remaining balance, and conditions explicitly. |
| I04 | high     | The inquiry CTA comes after long conditions and gallery-preceding content, with no persistent conversion summary.                                                                 | One primary CTA should be visible near the decision facts.                                  | Place it beside date/price on desktop and use a tested sticky action on mobile.                              |

### Quiénes somos

| ID  | Priority | What is wrong                                                                                                                     | Skill guidance                                                                       | Repair                                                                                         |
| --- | -------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| A01 | medium   | Long copy is split across many sequential reveals, delaying reading and making the page feel effects-led.                         | Motion should reinforce hierarchy, not gate routine reading.                         | Reveal only the section landmark/media and keep body paragraphs immediately readable.          |
| A02 | high     | Overlapping frames use negative margins and multiple fixed percentage widths, a fragile composition for 360 px and enlarged text. | Mobile media structure must reflow without precision positioning or hidden overflow. | Switch the narrow layout to a simple editorial stack; reserve overlaps for larger breakpoints. |
| A03 | medium   | FAQ’s plus/minus visual is 36 px even though the summary row is larger, making the control look smaller than its real target.     | Visual affordance should match the 44 px interaction area.                           | Increase the indicator to 44 px and preserve the native summary semantics.                     |

### Contacto

| ID  | Priority | What is wrong                                                                                                                           | Skill guidance                                                                                | Repair                                                                                                         |
| --- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| C01 | medium   | Contact methods are presented as equal text items without prioritizing the preferred conversion channel or likely response expectation. | Make help mechanisms consistent and the primary contact route explicit.                       | Elevate WhatsApp, group address/directions, and add truthful response-time copy only if the owner confirms it. |
| C02 | medium   | “Ver talleres” and “Cómo llegar” lack contextual icons and the external-navigation consequence is only screen-reader text.              | Icons can improve scanning when paired with labels; external actions need clear expectations. | Add licensed calendar/map/arrow icons and concise visible context without relying on icon-only controls.       |

### Eventos privados

| ID  | Priority | What is wrong                                                                                                            | Skill guidance                                                               | Repair                                                                                                                 |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| E01 | high     | The page is still a generic coming-soon block, with no event formats, audience, process, proof, or inquiry expectations. | Landing pages need value proposition, key benefits, process, and a deep CTA. | Replace it with a focused private-events landing structure once the owner confirms offer/copy; do not invent policies. |
| E02 | medium   | Buttons say only “WhatsApp” and “Instagram,” naming channels instead of the user’s next step.                            | CTA copy should describe intent and outcome.                                 | Use “Consultar un evento” as primary and a subordinate proof/discovery link with truthful copy.                        |

### Enrollment form

| ID   | Priority | What is wrong                                                                                                           | Skill guidance                                                                      | Repair                                                                                                     |
| ---- | -------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| EN01 | critical | Failed multi-field submission has no focusable error summary and no focus management (`templates/enrollment-page.tsx`). | Focus a linked error summary after submit while retaining inline errors.            | Add a summary with links to fields, `tabIndex=-1`, focus-on-failure, and an announcement.                  |
| EN02 | critical | Text fields, select, and checkbox rely on native styling plus the 24 px global minimum.                                 | Form controls on mobile need at least 44 px height and readable 16 px text.         | Introduce shared public field primitives with `min-h-11`, visible focus/error states, and generous labels. |
| EN03 | high     | Inline errors use separate `role=alert` spans but inputs do not expose `aria-invalid` or `aria-describedby`.            | Connect each specific error to its field and announce it without duplicate noise.   | Generate stable IDs, wire descriptions, and use one deliberate live region.                                |
| EN04 | high     | Name/email/phone fields omit useful autocomplete tokens and phone helper text.                                          | Use semantic input types, autofill, and persistent helper text for complex formats. | Add `autocomplete="name email tel"`, `inputMode`, and concise Argentine phone guidance.                    |
| EN05 | high     | The form gives no “step 1 of …” orientation or visible back/cancel path before materials and order.                     | Multi-step flows need progress and predictable back navigation.                     | Add a reusable step indicator and explicit back link that preserves draft state.                           |
| EN06 | high     | “Acepto la política de privacidad” is plain text; the policy cannot be opened or reviewed.                              | Consent must be informed and the referenced policy reachable.                       | Link to the real policy in a new or same predictable context; owner/legal content is required.             |

### Materials selector

| ID  | Priority | What is wrong                                                                                                        | Skill guidance                                                                                          | Repair                                                                                                             |
| --- | -------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| M01 | critical | The mobile `aside` sticks to the viewport bottom without reserving space or proving focused controls remain visible. | Sticky UI must not hide content or keyboard focus.                                                      | Use a compact sticky summary with safe padding, measured offsets, and a non-sticky fallback under zoom/large text. |
| M02 | high     | The page lacks step progress and a clear path back to student details.                                               | Multi-step flows need orientation and reversible navigation.                                            | Reuse the enrollment stepper and preserve the draft on back navigation.                                            |
| M03 | high     | Users can add lines but have no visible remove/decrement/edit controls in the order summary.                         | Every state change needs clear recovery and undo.                                                       | Add 44 px quantity controls, remove action, totals that update immediately, and accessible announcements.          |
| M04 | high     | Material variants are text-only rows; similar names and prices are hard to distinguish.                              | Do not rely on subtle text differences; use structured grouping and meaningful imagery where available. | Add variant cards/swatches or photos from registered media, with clear selected state and labels.                  |
| M05 | medium   | Quantity input is only `w-20` and inherits the 24 px minimum; number spinners are precision targets.                 | Avoid precision taps and ensure 44 px controls.                                                         | Increase height/width, add explicit decrement/increment buttons, and retain direct numeric entry.                  |

### Order summary and WhatsApp handoff

| ID  | Priority | What is wrong                                                                                                  | Skill guidance                                                                        | Repair                                                                                                   |
| --- | -------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| O01 | high     | The order `dl`, materials, and total are flat text stacks; the payable total and order number do not dominate. | Transaction summaries need grouped facts, tabular figures, and a clear primary total. | Use a receipt card, aligned definition grid, tabular prices, and a strongly separated total/action area. |
| O02 | medium   | Status is plain accent text; it lacks a consistent status component and next-action explanation.               | Status should use text plus icon/shape and explain recovery.                          | Add a semantic status badge and state-specific next-step copy without color-only meaning.                |
| O03 | high     | When WhatsApp URL generation fails, the primary handoff simply disappears with no alternate recovery.          | Error states need a clear recovery path.                                              | Show a contact fallback and explain how to retain/use the order number.                                  |
| O04 | medium   | Four payment steps render as a dense default ordered list with no visual progression or spacing.               | Multi-step instructions should be scannable and preserve sequence.                    | Use a numbered step component with spacing, concise verbs, and current-state context.                    |

### 404 and server errors

| ID   | Priority | What is wrong                                                                                                                     | Skill guidance                                                               | Repair                                                                                                    |
| ---- | -------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| ER01 | high     | “Inicio” and “Contacto” are small raw links with no 44 px target or primary/secondary hierarchy (`templates/error-page.tsx`).     | Recovery screens need one obvious primary route and touch-safe alternatives. | Use shared primary and tertiary CTAs with icons and full focus/active states.                             |
| ER02 | medium   | 404 and 500 share an almost empty text layout and raw `<a>` reloads, with no contextual illustration, retry, or page suggestions. | Empty/error states should explain what happened and offer relevant recovery. | Add brand-consistent lightweight art, internal router links, retry only for 500, and useful destinations. |

## Decisions that require the owner

1. Use only media already registered in the repository media registry and site-content rights ledger. Where no suitable image exists, keep the layout slot with the closest registered image and record a content gap; do not add stock photography.
2. Do not build the private-events page in this branch. Apply this visual system after `feat/private-events` merges.
3. Keep the privacy-policy destination and consent copy outside this scope and record them as pending owner content.
4. Confirm whether the 1024 px header should remain desktop navigation after the measured fit check.

## Tasks

- [ ] Audit the global visual system and every public screen at all required viewport widths.
- [x] Record prioritized source findings by section, including skill guidance and a concrete remedy.
- [ ] Commit and publish the source audit, then notify Terminal B.
- [ ] Implement tokens, typography, and spacing.
- [ ] Implement differentiated primary, secondary, and tertiary CTAs with complete states.
- [ ] Implement and publish the licensed SVG icon component slice, then notify Terminal B.
- [ ] Improve each public page and the enrollment/order flow in bounded slices.
- [ ] Run the required checks before every PR and record final evidence.

## Work-unit evidence

- Source audit: this first work-unit commit; exact hash will be recorded in the next feature-document update.
- No UI source changes were made in the audit work unit.
- Viewport matrix: pending against the rebuilt local database.
