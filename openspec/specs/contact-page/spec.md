# Contact Page Specification

## Purpose

Defines Contacto (`/contacto`): address, directions link, WhatsApp click-to-chat, Instagram, and the rule that only confirmed facts are displayed.

Traceability: proposal scope item 8; decision D8; A6 (directions link, no embedded map, scope adjustment); exploration Q23 default (no form).

## Requirements

### Requirement: Page contents

Contacto MUST show the address "Albert Sabin 6079, Argüello, Córdoba", a "Cómo llegar" link, a WhatsApp click-to-chat link, and the Instagram link `@calma.inquieta`, all derived from the business profile. It MUST NOT contain a form, newsletter signup or embedded map.

#### Scenario: Required items present

- GIVEN Contacto renders
- WHEN its links are listed
- THEN address text, "Cómo llegar", WhatsApp and Instagram are present

#### Scenario: No form or embed

- GIVEN Contacto renders
- WHEN the DOM is queried for `form`, `iframe` and map embeds
- THEN none exist

### Requirement: Directions link

"Cómo llegar" MUST link to a maps directions URL built from the address, open in a new tab with `rel="noopener noreferrer"`, and indicate that to assistive technology.

#### Scenario: URL and attributes

- GIVEN the profile address
- WHEN the link renders
- THEN its href is an https maps directions URL whose destination encodes the address and its `rel` includes `noopener`

### Requirement: WhatsApp click-to-chat URL builder

A pure builder MUST produce `https://wa.me/<digits>?text=<encoded message>` where digits are the number in international format without `+`, spaces or punctuation, and the message is a prefilled Spanish text. The default number MUST be 351 739 5239 in Argentine mobile format (the builder normalizes it to the international digits form) and MUST be marked provisional in the profile (D8). The number MUST be defined in exactly one content location.

#### Scenario: Encoding

- GIVEN a message containing accents, spaces and "?"
- WHEN the URL is built
- THEN the text parameter is percent-encoded and decodes to the original message

#### Scenario: Digits normalization

- GIVEN the number written "351 739 5239" with spaces
- WHEN the URL is built
- THEN the path contains only digits, with the Argentina country code prefix per design

#### Scenario: Single source

- GIVEN the number changes in the profile
- WHEN header, footer, Inicio, Contacto and "Próximamente" pages render
- THEN all WhatsApp links reflect the new number

#### Scenario: Invalid number

- GIVEN a profile number with no digits
- WHEN the builder is called
- THEN it throws or returns an error result and no link is rendered

### Requirement: Provisional marking

The profile MUST carry a provisional flag for the WhatsApp number. The provisional status MUST be visible in the content module (for the launch gate and tests) and the site MUST NOT describe the number as official.

#### Scenario: Flag exposed

- GIVEN the default profile
- WHEN `getBusinessProfile()` is read
- THEN the WhatsApp entry has `provisional: true`

### Requirement: Show only confirmed facts

Opening hours, email and any phone number other than the WhatsApp line MUST render only when the profile marks them confirmed. When not confirmed, the corresponding rows MUST be absent (no placeholder, no "próximamente").

#### Scenario: Unconfirmed hours

- GIVEN a profile with no confirmed hours
- WHEN Contacto renders
- THEN no hours row exists

#### Scenario: Confirmed email

- GIVEN a profile with a confirmed email
- WHEN Contacto renders
- THEN an email row with a `mailto:` link appears

### Requirement: Accessibility and metadata

External links MUST have discernible names; each ContactItem MUST have an icon with `aria-hidden` and a text label. Contacto MUST have a unique title and description and expose LocalBusiness JSON-LD.

#### Scenario: axe

- GIVEN Contacto rendered
- WHEN axe-core runs
- THEN there are no violations
