# Delta for SEO Foundation

Unchanged: Document language, Per-route title and description, Canonical URL, Indexing gate, Sitemap, LocalBusiness JSON-LD, Semantic structure and alt text.

> **Archive-order dependency.** Change 4 (`public-catalog`, not yet archived) also modifies "Open Graph and Twitter cards", adding the activity cover rule. This delta is written against the CURRENT main-spec text. Recommended order: archive change 4 first, then rebase this block onto its text, keeping its activity-cover sentence and its three scenarios (OG set, Activity cover, Activity without cover) and only changing what the registered share image is. If this change archives first, change 4's block must be rebased the same way. In code, this change touches only the value of `SHARE_IMAGE_PATH` in `src/app/seo/meta.ts`; it does not touch `sitemap.ts` or `json-ld.ts`.

## MODIFIED Requirements

### Requirement: Open Graph and Twitter cards

Each public page MUST emit `og:title`, `og:description`, `og:url`, `og:type`, `og:locale` ("es_AR"), `og:image` (absolute URL of the registered share image from the media registry) and Twitter card tags. The share image MUST be a JPEG of 1200 by 630 pixels cropped from `img-20260819-174607732-hdr`; `og:image:width` and `og:image:height` SHOULD be emitted with those values. The share image MUST NOT be a stand-in and its registry entry MUST be publishable.
(Previously: `og:image` was the absolute URL of the registered stand-in share image.)

#### Scenario: OG set

- GIVEN meta for Inicio
- WHEN evaluated
- THEN all listed tags are present and `og:image` is an absolute https URL

#### Scenario: Share image is the registered JPEG

- GIVEN the meta for any public page
- WHEN `og:image` is read
- THEN it is the absolute URL of the share image registry entry, ends in `.jpg`, and the file is 1200 by 630

#### Scenario: Share image is not a stand-in

- GIVEN the `og:image` path
- WHEN compared with the stand-in manifest
- THEN it is not listed there and `share-default` no longer exists

#### Scenario: Share image missing from the registry

- GIVEN the registry has no publishable share image
- WHEN the meta builder runs
- THEN it throws or reports an error and no page emits an empty `og:image`

#### Scenario: Only the path value changes

- GIVEN the diff of the slice that swaps the share image
- WHEN `src/app/seo/meta.ts` is compared with `main`
- THEN the only change is the `SHARE_IMAGE_PATH` value (or its registry-derived equivalent) and `sitemap.ts` and `json-ld.ts` are unchanged
