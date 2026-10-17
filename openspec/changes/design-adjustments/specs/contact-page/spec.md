# Delta for Contact Page

Unchanged: Directions link, WhatsApp click-to-chat URL builder, Provisional marking, Show only confirmed facts, Accessibility and metadata.

## MODIFIED Requirements

### Requirement: Page contents

Contacto MUST show the address "Albert Sabin 6079, Argüello, Córdoba", a "Cómo llegar" link, a WhatsApp click-to-chat link, and the Instagram link `@calma.inquieta`, all derived from the business profile. It MUST also show one photo of the space, `img-20260530-wa0019`, taken from the media registry (publishable assets only) with non-empty alt, `loading="lazy"`, and `width` and `height`. It MUST NOT contain a form, newsletter signup or embedded map. The photo MUST NOT be a video and MUST NOT be an embed.
(Previously: no photo; the no-form, no-embed rule is unchanged.)

#### Scenario: Required items present

- GIVEN Contacto renders
- WHEN its links are listed
- THEN address text, "Cómo llegar", WhatsApp and Instagram are present

#### Scenario: No form or embed

- GIVEN Contacto renders
- WHEN the DOM is queried for `form`, `iframe` and map embeds
- THEN none exist

#### Scenario: Photo of the space

- GIVEN Contacto renders
- WHEN images are listed
- THEN the image of `img-20260530-wa0019` is present with non-empty alt, `loading="lazy"`, `width` and `height`

#### Scenario: Photo is not a stand-in

- GIVEN the Contacto photo source
- WHEN compared with the stand-in manifest
- THEN it is not listed there

#### Scenario: Photo withheld when not publishable

- GIVEN the Contacto photo entry is made `pending` with `people: faces`
- WHEN Contacto renders
- THEN no image is rendered, the contact details are still present and nothing errors

#### Scenario: No layout shift

- GIVEN a 360 px and a 1280 px viewport
- WHEN Contacto loads
- THEN the photo box is reserved from its declared dimensions before the file loads
