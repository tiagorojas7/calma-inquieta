# Materials catalog: easy loading for the owners, easy choosing for students

Objective: load and maintain the supplier catalog (the monthly "CATÁLOGO CI" PDF) in a few steps, and let students choose materials comfortably with large photos.
Branches: `feat/materials-catalog` (M1, admin and backend), then `feat/materials-selector` (M2, public selector, after the public identity pass merges). Owner merges.
Test runner: `pnpm vitest run --project unit --project ui <paths>`; db tests `pnpm test:db <dir>` with `TEST_DATABASE_URL`, one directory per command.

## Specs

S1. Import the catalog from a spreadsheet. A CSV with the columns `Categoría;Producto;Medida;Precio` (`;` separator, UTF-8, optional BOM, prices in whole pesos without thousands separators, empty price = "consultar precio") creates or updates materials (product = material, category = category, medida = variant) for one supplier the owner picks on the import screen. Re-importing updates prices and adds new rows without duplicating; rows not in the file are left as they are. Show a preview before applying (counts of new materials, new variants, price changes, errors with line numbers), then one "Importar" button. Description defaults to "<Producto> (<Categoría>)" when a new material is created. The October file from the owner's PDF is `docs/materials/catalogo-octubre-2026.csv` (as found in the file: 189 measures, 95 products, 20 categories, 4 without price; the earlier 187/101/21 counts did not match the file).

S2. "Consultar precio" variants. A variant may have no price; students see it with a "Consultar precio" WhatsApp link and cannot add it to an enrollment. Today the domain requires a price > 0 (`material-core.ts`), so the price becomes optional.

S3. Raise all prices by a percentage. One admin action "Subir precios X %" over all materials of a supplier (or of a category), rounding to whole pesos, with a preview of before/after totals.

S4. Quick photo from the list. Each material in the admin materials list has "Subir foto" (the existing `ImageField` + `POST /admin/imagenes` flow) without opening the edit form; the list shows which materials still have no photo, with a "Sin foto" filter.

S5. Choose the month's materials by category. In the taller month (period) materials step, materials are grouped by category with "Elegir todos" per category and a search box.

S6. Student selector (M2). Students see only the materials chosen for their taller month, grouped by category with a category filter when there are several; product cards lead with a large photo that opens full screen when tapped (accessible dialog, closable, keyboard and back-button friendly); measures are option buttons showing measure and price in plain language; the total updates live; "consultar precio" measures show a WhatsApp link instead of being selectable.

## Tasks

- [x] M1 — S1-S5: admin import, consultar precio, percentage raise, quick photo, period selection by category. Route: delegated (parallel with P1/A1, disjoint surfaces). Risk: item 1 (migration 0017 drops NOT NULL on material_variant.price_centavos). Commits: migration and S2 in PR 1 (branch feat/materials-catalog); S1, S3, S4, S5 in PR 2 (branch feat/materials-catalog-tools, chained on PR 1). Gaps: S4 is a one-click "Subir foto" screen per row rather than an inline upload; the public offer leaves no-price variants out until M2 shows them with a WhatsApp link.
- [x] M2 — S6: public materials selector. Route: delegated. Risk: item 3 (the public offer variant gains `onRequest` and a nullable `unitPrice`, and the action accepts native `variant-<id>`/`quantity-<id>` fields; no-price measures stay refused by `resolveLines`). Commits: PR on branch feat/materials-selector (base feat/materials-catalog-tools). Gaps: no-JS cannot complete end to end because the student draft lives in sessionStorage (the radios and quantity are real fields and the action reads them); material photos have no responsive srcSet in the data, so the full-screen photo reuses the single src; category filter needs script; a required step does not block when nothing in the offer is orderable.

## Log

L1 (2026-11-02, owner, verbatim): "Ademas mira, te muestro un ejemplo de lpdf que se envia a las alumnas antes de empezar un nuevo taller mensual, es sobre los materiales a pedir, parea que lo tengas en cuenta y en base LO QUE YA TENENMOS EN EL PANEL, SE AGREGUEN FUNCIONES PARA facilitar la agregacion de estos materiales tanrto para el dueño en su panel como a los clientes a la hora de elegir, las imagenes a la hora de elegir se deben pdoer abrir y visualziar en formato mas grande, ya que actualmente se ven chiquitas."

L2 (owner): "no tiene que ser extactamente igual, pero te muestro el pdf de com ose manejan a la hora de elgir materiales, que me sujieres?" Then approved the suggestion "Sí, sin el catálogo público (Recommended)": students see only the products chosen for their taller grouped by category, large photo full screen, measures as buttons in plain language, live total, consultar precio via WhatsApp; owners import from a spreadsheet, raise prices by % or re-import, photo straight from the list, choose month products by category.

L3 (owner): the PDF "1,90 D X 795ALTO" is a typo: "si, es 95". The CSV already says 95. "Respaldo rectangular 1,90 × 70 alto" appears twice in the PDF; the CSV keeps one row until the owner says whether they are two models.

L4 (owner): "puedes ir desplegando subagentes que lo vayan haciendo en paralelo".

L5 (owner, verbatim): "es un mismo modelo" (about "Respaldo rectangular 1,90 × 70 alto", listed twice in the PDF). The CSV keeps its single row; no change needed.
