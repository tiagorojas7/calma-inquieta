/**
 * Admin copy for the materials catalog tools (import, price raise, quick
 * photo, period selection). es-AR with voseo. Kept apart from the shared
 * microcopy so parallel work does not collide; scanned by its own test.
 */
export const materialCatalogCopy = {
  priceOnRequest: "Consultar precio",
  priceOnRequestHint:
    "Marcalo si el precio se consulta con el proveedor. Las alumnas no pueden pedir esta variante.",
  toolsLabel: "Herramientas del catálogo",
  importLink: "Importar catálogo",
  pricesLink: "Subir precios",
  feedback: {
    photo: "Listo, la foto quedó guardada.",
    imported: "Listo, el catálogo quedó importado.",
    raised: "Listo, los precios quedaron actualizados.",
  },
  list: {
    withoutPhoto: "Sin foto",
    withoutPhotoFilter: "Mostrar solo materiales sin foto",
    allMaterials: "Mostrar todos",
    uploadPhoto: "Subir foto",
    changePhoto: "Cambiar foto",
    photoOf: (name: string) => `de ${name}`,
    noPhotoBadge: "Sin foto",
  },
  photo: {
    title: "Foto del material",
    intro: "Elegí una imagen y escribí qué muestra. Después guardá.",
    image: "Foto",
    save: "Guardar foto",
    cancel: "Volver a materiales",
    saveFailed:
      "No pudimos guardar la foto. Revisá la imagen y su descripción.",
  },
  import: {
    title: "Importar catálogo",
    intro:
      "Cargá el archivo CSV del proveedor (Categoría; Producto; Medida; Precio, separado por punto y coma). Primero ves un resumen y después confirmás con Importar. Si volvés a importar, se actualizan los precios y se agregan las filas nuevas sin duplicar nada. Lo que no esté en el archivo queda como está.",
    back: "Volver a materiales",
    supplier: "Proveedor",
    supplierPlaceholder: "Elegí un proveedor",
    file: "Archivo CSV",
    fileHint: "Hasta 1 MB y 2000 filas.",
    text: "O pegá el contenido",
    textHint: "Si elegís un archivo, se usa el archivo.",
    preview: "Ver resumen",
    previewTitle: "Resumen de la importación",
    previewFor: (supplier: string) => `Proveedor: ${supplier}`,
    rows: (count: number) => `${String(count)} filas leídas`,
    newMaterials: (count: number) => `${String(count)} materiales nuevos`,
    newVariants: (count: number) => `${String(count)} medidas nuevas`,
    priceChanges: (count: number) => `${String(count)} precios que cambian`,
    unchanged: (count: number) => `${String(count)} sin cambios`,
    errorsTitle: "Hay filas para corregir",
    errorsIntro:
      "Corregí el archivo y volvé a cargarlo. Mientras haya errores no se puede importar.",
    errorLine: (line: number, message: string) =>
      `Línea ${String(line)}: ${message}`,
    itemsTitle: "Qué va a cambiar",
    columns: {
      line: "Línea",
      product: "Producto",
      measure: "Medida",
      change: "Cambio",
    },
    kinds: {
      "new-material": "Material nuevo",
      "new-variant": "Medida nueva",
      "price-change": "Cambia el precio",
      unchanged: "Sin cambios",
    },
    consult: "Consultar precio",
    nothingToDo: "No hay nada para importar: todo ya está cargado.",
    apply: "Importar",
    codes: {
      "wrong-columns":
        "tiene que tener cuatro columnas separadas por punto y coma.",
      "missing-category": "falta la categoría.",
      "missing-product": "falta el producto.",
      "missing-measure": "falta la medida.",
      "invalid-price":
        "el precio tiene que ser un número entero mayor a cero, o quedar vacío para consultar precio.",
      "duplicate-row": "repite un producto con la misma medida de otra línea.",
      "other-supplier": "ese producto ya está cargado con otro proveedor.",
    },
    fileErrors: {
      empty: "El archivo está vacío.",
      "bad-header":
        "La primera línea tiene que ser: Categoría;Producto;Medida;Precio.",
      "too-large": "El archivo es demasiado grande. El máximo es 1 MB.",
      "too-many-rows": "El archivo tiene demasiadas filas. El máximo es 2000.",
    },
    noFile: "Elegí un archivo o pegá el contenido.",
    noSupplier: "Elegí un proveedor.",
    archivedSupplier: "Ese proveedor está archivado.",
    hasErrors: "Todavía hay filas con errores. Corregilas e intentá de nuevo.",
  },
  prices: {
    title: "Subir precios",
    intro:
      "Subí los precios de un proveedor o de una categoría en un porcentaje. Los precios se redondean a pesos enteros y las medidas sin precio no se tocan. Primero ves cómo quedaría y después confirmás.",
    back: "Volver a materiales",
    supplier: "Proveedor",
    category: "Categoría",
    anySupplier: "Todos los proveedores",
    anyCategory: "Todas las categorías",
    percent: "Porcentaje de aumento",
    percentHint: "Por ejemplo 10 o 7,5. Hasta 200.",
    preview: "Ver cómo quedaría",
    previewTitle: "Así quedarían los precios",
    summary: (materials: number, variants: number) =>
      `${String(variants)} precios en ${String(materials)} materiales`,
    skipped: (count: number) =>
      `${String(count)} medidas sin precio no cambian`,
    before: (amount: string) => `Suma antes: ${amount}`,
    after: (amount: string) => `Suma después: ${amount}`,
    change: (from: string, to: string) => `${from} → ${to}`,
    nothing: "Con ese porcentaje no cambia ningún precio.",
    apply: "Subir precios",
    errors: {
      "invalid-percent": "Ingresá un porcentaje mayor a cero y hasta 200.",
      "no-scope": "Elegí un proveedor o una categoría.",
    },
  },
  period: {
    search: "Buscar material",
    searchApply: "Buscar",
    searchClear: "Ver todos",
    selectEverything: "Elegir todos",
    selectNothing: "Quitar todos",
    selectAll: (category: string) => `Elegir todos: ${category}`,
    selectNone: (category: string) => `Quitar todos: ${category}`,
    categoryGroup: (category: string) => `Categoría ${category}`,
    noMatches: "Ningún material coincide con la búsqueda.",
  },
} as const;
