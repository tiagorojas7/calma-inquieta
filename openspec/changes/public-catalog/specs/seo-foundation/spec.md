# Delta for SEO Foundation

Unchanged: Document language, Canonical URL, LocalBusiness JSON-LD, Semantic structure and alt text. `Event` structured data lives in the new `event-structured-data` capability. The indexing gate stays OFF in this change.

## MODIFIED Requirements

### Requirement: Per-route title and description

A pure meta builder MUST produce a title using a template (page title plus brand name) and a description for every public route, including `/talleres`, `/intensivos` and every activity detail page. Detail pages MUST build the page title from the activity name and the description from the activity summary. Titles and descriptions MUST be unique across routes and non-empty. Descriptions SHOULD be at most 160 characters; detail descriptions derived from a longer summary MUST be truncated to at most 160 characters.
(Previously: the requirement covered static routes; uniqueness was checked against Inicio, Quiénes somos, Contacto and three Próximamente pages.)

#### Scenario: Template

- GIVEN page title "Contacto"
- WHEN the builder runs
- THEN the title contains "Contacto" and the brand name per the template

#### Scenario: Uniqueness

- GIVEN meta for Inicio, Quiénes somos, Contacto, Talleres, Intensivos, Eventos privados, and two taller and two intensivo detail pages
- WHEN titles and descriptions are compared
- THEN no two are equal

#### Scenario: Missing description

- GIVEN a route meta input with an empty description
- WHEN the builder runs
- THEN it throws or reports an error

#### Scenario: Detail built from the activity

- GIVEN an activity named "Taller Demo" with a 300-character summary
- WHEN its detail meta is built
- THEN the title contains "Taller Demo" and the description has at most 160 characters

### Requirement: Open Graph and Twitter cards

Each public page MUST emit `og:title`, `og:description`, `og:url`, `og:type`, `og:locale` ("es_AR"), `og:image` and Twitter card tags. `og:image` MUST be an absolute URL: for an activity detail page it MUST be the activity's cover image when present, otherwise the registered stand-in share image; for every other page it is the registered stand-in share image.
(Previously: `og:image` was always the stand-in share image.)

#### Scenario: OG set

- GIVEN meta for Inicio
- WHEN evaluated
- THEN all listed tags are present and `og:image` is an absolute https URL

#### Scenario: Activity cover

- GIVEN an activity detail with a cover image
- WHEN its meta is evaluated
- THEN `og:image` is the absolute URL of that cover

#### Scenario: Activity without cover

- GIVEN an activity detail without images
- WHEN its meta is evaluated
- THEN `og:image` is the absolute URL of the stand-in share image

### Requirement: Indexing gate

Indexing MUST be controlled by one validated boolean configuration value that defaults to OFF. While OFF: `robots.txt` MUST contain `Disallow: /` for all agents, every page MUST send a robots `noindex` meta, and `sitemap.xml` SHOULD still be served but MUST NOT be referenced by robots.txt. While ON: robots.txt MUST allow crawling and reference the sitemap, and pages MUST NOT send `noindex` except the Próximamente page `/eventos-privados`. Catalog pages (`/talleres`, `/intensivos` and their detail pages) follow the gate like any other page. The gate MUST stay OFF in this change.
(Previously: the Próximamente exception covered the three Próximamente pages, and `/talleres` was the example.)

#### Scenario: Gate off

- GIVEN indexing is off
- WHEN `/robots.txt` and the Inicio meta are produced
- THEN robots.txt has `User-agent: *` and `Disallow: /`, and Inicio has `noindex`

#### Scenario: Gate on

- GIVEN indexing is on
- WHEN robots.txt is produced
- THEN it does not disallow `/` and contains the absolute sitemap URL

#### Scenario: Próximamente always noindex

- GIVEN indexing is on
- WHEN the meta for `/eventos-privados` is produced
- THEN it contains `noindex`

#### Scenario: Catalog pages follow the gate

- GIVEN indexing is on
- WHEN the meta for `/talleres`, `/intensivos` and a detail page is produced
- THEN none contains `noindex`

#### Scenario: Catalog pages while the gate is off

- GIVEN indexing is off
- WHEN the meta for `/talleres` and `/intensivos/:slug` is produced
- THEN both contain `noindex`

#### Scenario: Default is off

- GIVEN no indexing variable set
- WHEN configuration loads
- THEN indexing is off

### Requirement: Sitemap

`/sitemap.xml` MUST be a valid XML sitemap listing as absolute URLs from the site base URL: `/`, `/quienes-somos`, `/contacto`, `/talleres`, `/intensivos`, one entry per visible taller detail (`/talleres/:slug`) and one entry per visible, non-expired intensivo detail (`/intensivos/:slug`). It MUST NOT list `/eventos-privados`, `/admin`, `/status`, error pages, or any invisible, expired, draft, archived or cancelled activity. The static entries MUST be listed even when the catalog is empty or the fail-soft placeholder is wired, and the sitemap MUST NOT return a 5xx in those cases.
(Previously: only `/`, `/quienes-somos` and `/contacto`; Próximamente pages were excluded.)

#### Scenario: Static entries with an empty catalog

- GIVEN base "https://example.test" and an empty or placeholder catalog
- WHEN the sitemap is produced
- THEN it contains exactly five `<loc>` entries: `/`, `/quienes-somos`, `/contacto`, `/talleres`, `/intensivos`

#### Scenario: Detail entries

- GIVEN one visible taller "ceramica-inicial" and one visible intensivo "intensivo-demo"
- WHEN the sitemap is produced
- THEN it also lists `https://example.test/talleres/ceramica-inicial` and `https://example.test/intensivos/intensivo-demo`

#### Scenario: Paused activities are listed

- GIVEN a paused taller
- WHEN the sitemap is produced
- THEN its detail URL is listed

#### Scenario: Invisible activities excluded

- GIVEN draft, archived and cancelled activities and an intensivo dated yesterday
- WHEN the sitemap is produced
- THEN none of their URLs appear

#### Scenario: Excluded routes

- GIVEN the full sitemap
- WHEN its entries are listed
- THEN `/eventos-privados`, `/admin` and `/status` are absent

#### Scenario: Content type

- GIVEN a request to `/sitemap.xml`
- WHEN handled
- THEN status is 200 and content type is an XML type
