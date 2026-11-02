# Materials catalog: loading and maintaining it

Admin screens (all under `/admin/materiales`):

- **Importar catálogo** (`/importar`): choose a supplier, upload a CSV (or paste its text), review the summary, then press "Importar".
- **Subir precios** (`/precios`): raise the prices of one supplier or one category by a percentage, with a before/after preview.
- **Subir foto** (`/:id/foto`, linked from every row of the list): set a material's photo without opening the full form. The list has a "Sin foto" filter (`?sinfoto=1`).
- **Consultar precio**: a checkbox on each variant in the material form. A variant without price is shown to the owners as "Consultar precio" and cannot be ordered.
- **Month materials** (taller month page): materials are grouped by category with "Elegir todos" per category and a search box (these two need JavaScript; without it the plain checkbox list still works).

## CSV format

```
Categoría;Producto;Medida;Precio
Canastos;Canasto rectangular;40 × 20 × 10 alto;34600
Pinturas;Acrílico;250 cc;
```

- `;` separator, UTF-8, optional BOM, Windows or Unix line endings, quoted fields allowed (`"a;b"`, `""` for a quote).
- Price in whole pesos (`34600`, `$ 34.600`); empty means "Consultar precio"; `0` is an error.
- A product is a material, a measure is one of its variants. A product is matched by its name and a measure by its label, ignoring upper and lower case (accents are significant).
- Re-importing updates changed prices (an empty price turns a variant into "Consultar precio"), adds new measures and new products, and leaves everything not in the file untouched. Importing the same file twice changes nothing.
- A product that already exists under another supplier is reported as an error and blocks the import. Any row error blocks the import; the preview lists them with the line number.
- New materials get the description `<Producto> (<Categoría>)` and are available, active and without photo.
- Limits: 1 MB and 2000 rows.

`catalogo-octubre-2026.csv` is the October 2026 catalog transcribed from the owner's PDF: 189 measures of 95 products in 20 categories, 4 of them without price.
