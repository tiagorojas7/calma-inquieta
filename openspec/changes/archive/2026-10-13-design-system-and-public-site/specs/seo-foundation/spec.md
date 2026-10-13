# SEO Foundation Specification

## Purpose

Defines document language, per-route metadata, canonical URLs, Open Graph, sitemap, robots, LocalBusiness JSON-LD and the indexing gate that keeps the preview out of search engines until launch.

Traceability: proposal scope item 11; D2; A7; risk "Preview indexed". Two new validated config values (site base URL, indexing flag) are scope additions detailed in design.

## Requirements

### Requirement: Document language

The root document MUST declare `lang="es-AR"`, including on error and 404 pages.

#### Scenario: Language

- GIVEN any public route or the error boundary
- WHEN the document renders
- THEN `<html lang="es-AR">`

### Requirement: Per-route title and description

A pure meta builder MUST produce a title using a template (page title plus brand name) and a description for every public route. Titles and descriptions MUST be unique across routes and non-empty. Descriptions SHOULD be at most 160 characters.

#### Scenario: Template

- GIVEN page title "Contacto"
- WHEN the builder runs
- THEN the title contains "Contacto" and the brand name per the template

#### Scenario: Uniqueness

- GIVEN meta for Inicio, Quiénes somos, Contacto and the three Próximamente pages
- WHEN titles and descriptions are compared
- THEN no two are equal

#### Scenario: Missing description

- GIVEN a route meta input with an empty description
- WHEN the builder runs
- THEN it throws or reports an error

### Requirement: Canonical URL

The canonical URL MUST be built from the configured site base URL plus the route path, with no query string and no trailing slash except the root. A missing or invalid site base URL MUST fail configuration validation at startup.

#### Scenario: Canonical

- GIVEN base URL "https://example.test" and path "/contacto"
- WHEN the builder runs
- THEN canonical is "https://example.test/contacto"

#### Scenario: Trailing slash and query

- GIVEN base "https://example.test/" and path "/contacto?utm=x"
- WHEN the builder runs
- THEN canonical is "https://example.test/contacto"

#### Scenario: Invalid base

- GIVEN a base URL value "not a url"
- WHEN env validation runs
- THEN it fails with a clear error and no secret values

### Requirement: Open Graph and Twitter cards

Each public page MUST emit `og:title`, `og:description`, `og:url`, `og:type`, `og:locale` ("es_AR"), `og:image` (absolute URL of the registered stand-in share image) and Twitter card tags.

#### Scenario: OG set

- GIVEN meta for Inicio
- WHEN evaluated
- THEN all listed tags are present and `og:image` is an absolute https URL

### Requirement: Indexing gate

Indexing MUST be controlled by one validated boolean configuration value that defaults to OFF. While OFF: `robots.txt` MUST contain `Disallow: /` for all agents, every page MUST send a robots `noindex` meta, and `sitemap.xml` SHOULD still be served but MUST NOT be referenced by robots.txt. While ON: robots.txt MUST allow crawling and reference the sitemap, and pages MUST NOT send `noindex` except Próximamente pages. The gate MUST stay OFF in this change.

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
- WHEN the meta for `/talleres` is produced
- THEN it contains `noindex`

#### Scenario: Default is off

- GIVEN no indexing variable set
- WHEN configuration loads
- THEN indexing is off

### Requirement: Sitemap

`/sitemap.xml` MUST be a valid XML sitemap listing only `/`, `/quienes-somos` and `/contacto` as absolute URLs from the site base URL. It MUST NOT list Próximamente pages, `/status` or error pages.

#### Scenario: Entries

- GIVEN base "https://example.test"
- WHEN the sitemap is produced
- THEN it contains exactly three `<loc>` entries for those paths

#### Scenario: Content type

- GIVEN a request to `/sitemap.xml`
- WHEN handled
- THEN status is 200 and content type is an XML type

### Requirement: LocalBusiness JSON-LD

Inicio and Contacto MUST include one valid `application/ld+json` LocalBusiness object built from the business profile: name, address (PostalAddress), URL, `sameAs` with the Instagram URL. Telephone, email, openingHours and geo MUST be included only when confirmed in the profile. The WhatsApp number marked provisional MUST NOT be emitted as `telephone`. JSON-LD text MUST be safely serialized so values cannot break out of the script element.

#### Scenario: Minimal profile

- GIVEN a profile with no confirmed optional facts
- WHEN JSON-LD is built
- THEN keys telephone, email, openingHours and geo are absent

#### Scenario: Confirmed hours

- GIVEN confirmed hours
- WHEN JSON-LD is built
- THEN `openingHours` is present

#### Scenario: Provisional number

- GIVEN a provisional WhatsApp number
- WHEN JSON-LD is built
- THEN it is not present anywhere in the object

#### Scenario: Script-breaking value

- GIVEN a profile name containing `</script>`
- WHEN the JSON-LD is serialized for embedding
- THEN the output contains no literal `</script>` sequence

### Requirement: Semantic structure and alt text

Each public page MUST have landmarks, one `h1`, ordered heading levels without skips, and `alt` on every non-decorative image.

#### Scenario: Heading order

- GIVEN any public page rendered
- WHEN headings are listed
- THEN no level is skipped downward and exactly one `h1` exists
