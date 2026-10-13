# Client inputs needed

What the studio still has to send before launch. None of these blocks the current build; all of them block launch. Source: the "Client inputs needed" table in `openspec/changes/design-system-and-public-site/proposal.md`.

## Inputs

| Input                                                                            | What it unblocks                                                        | Stand-in used until it arrives                                                                                                                                                                                |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vector logo and lockup, brand fonts, official palette                            | Design tokens, header, footer, favicon and share image                  | Text wordmark, stand-in fonts (Cormorant Garamond and Montserrat), a palette reconciled from the mockups and the DMR brand document, and a favicon and share image derived from the Instagram profile picture |
| Photos and videos with image rights (workshops, the space, finished pieces)      | Inicio hero, the Quiénes somos gallery and videos, the Open Graph image | Abstract SVG compositions in the brand palette, registered as stand-ins; the gallery video block stays hidden until video URLs exist                                                                          |
| Official WhatsApp number, email, opening hours                                   | Contacto, footer, structured data (JSON-LD)                             | WhatsApp: the number `351 739 5239`, marked provisional, used only inside `wa.me` links and never printed or put in JSON-LD. Email and hours: not shown anywhere                                              |
| History text (founding, founders' names), value proposition, official descriptor | Quiénes somos, meta descriptions                                        | Copy drafted only from verified DMR evidence, marked as unapproved                                                                                                                                            |
| FAQ questions and answers (policies: seña, cancellations, make-ups)              | The Quiénes somos FAQ                                                   | Only answers backed by evidence; no invented policy, each marked as unapproved                                                                                                                                |
| Trust claims for the Inicio hero row (for example "Grupos reducidos")            | The Inicio trust row                                                    | Only claims the client confirms; the row stays hidden until then. "Materiales incluidos" applies to intensivos only (the mockups conflict with the monthly flow)                                              |
| Testimonials, each with written consent                                          | The Inicio testimonials section                                         | Section hidden                                                                                                                                                                                                |

## Launch checklist source

Two lists in the `site-content` module tell us what is still open. Both are read through the `SiteContent` port (`src/modules/site-content/application/site-content.ts`):

| List                      | What it returns                                                                                                                                                                                                                                                                                | Launch condition                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `listUnapprovedContent()` | Every content item still marked `approved: false`, as `{ id, area }`. The areas are `home:trust-claims`, `home:teaser`, `about:history`, `about:value-proposition`, `about:values` and `about:faq`. The domain rule is `listUnapproved` in `src/modules/site-content/domain/content-rules.ts`. | The list is empty: the client has approved every drafted text. This is the launch checklist source for copy. |
| `listStandInAssets()`     | Every stand-in file still shipped (images, favicon, share image, font rows), from the manifest `src/modules/site-content/infrastructure/content/stand-in-assets.ts`.                                                                                                                           | The list is empty. See `docs/design/brand-swap-guide.md`, section "Launch gate".                             |

Testimonials are gated separately: an item is published only with recorded written consent, so `listUnapprovedContent()` does not cover them.

## Open questions for the owner

1. Is `351 739 5239` the number the studio wants for WhatsApp, or is there an official one?
2. What are the official opening hours? The mockups disagree with each other (Tuesday to Saturday 10:00 to 19:00 in one, Monday classes and evening classes until 21:00 in others).
3. Which email address should be public?
