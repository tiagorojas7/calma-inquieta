/**
 * Materiales: one screen with three plain sections (what there is, what to
 * order, what to hand over) and a short new-material form. Short words.
 */
export const materialesCopy = {
  nav: { label: "Materiales" },
  title: "Materiales",
  crumb: "Materiales",
  /** The stock reason the system writes when units arrive. */
  arrivedReason: "Llegaron",
  /** The words of a saved banner, after "Guardado:". */
  saved: {
    created: (name: string) => name,
    arrived: (count: number) =>
      count === 1 ? "llegó 1 unidad" : `llegaron ${String(count)} unidades`,
    requested: (count: number) =>
      count === 1 ? "1 pedido hecho" : `${String(count)} pedidos hechos`,
    received: (count: number) =>
      count === 1 ? "1 entrega" : `${String(count)} entregas`,
    "workshop-requested": (count: number) =>
      count === 1
        ? "1 material de workshop pedido"
        : `${String(count)} materiales de workshop pedidos`,
  },
  stock: {
    title: "Qué hay",
    newAction: "Nuevo material",
    search: "Buscar material",
    searchAction: "Buscar",
    filtersLabel: "Mostrar",
    filters: { todos: "Todos", hay: "Hay", sin: "Sin stock" },
    state: {
      hay: (count: number) => `Hay ${String(count)}`,
      sin: "Sin stock",
    },
    listLabel: "Materiales",
    variantsLabel: (name: string) => `Variantes de ${name}`,
    arrived: "Llegaron",
    arrivedField: (name: string) => `Cuántas llegaron de ${name}`,
    arrivedPlaceholder: "Cantidad",
    edit: "Editar",
    editOf: (name: string) => `Editar ${name}`,
    empty: "Todavía no hay materiales.",
    emptyFound: "No encontramos nada.",
    noUnits: "Poné una cantidad mayor a cero.",
    unitsTooMany: "Esa cantidad es demasiado grande.",
  },
  order: {
    title: "Para pedir",
    empty: "No hay nada para pedir.",
    total: (amount: string) => `Total ${amount}`,
    quantity: (count: number) => `Cantidad: ${String(count)}`,
    workshop: (name: string) => `Workshop: ${name}`,
    unconfirmed: (count: number) =>
      count === 1 ? "1 sin confirmar" : `${String(count)} sin confirmar`,
    copy: "Copiar pedido",
    copied: "Pedido copiado.",
    done: "Ya lo pedí",
    doneOf: (supplier: string) => `Ya lo pedí a ${supplier}`,
    seeText: "Ver el texto",
    textLabel: (supplier: string) => `Pedido para ${supplier}`,
  },
  deliver: {
    title: "Para entregar",
    empty: "No hay nada para entregar.",
    done: "Entregado",
    doneOf: (name: string) => `Entregado a ${name}`,
    all: "Entregar todo",
    fromStock: "Del stock",
    asked: "Pedido",
    whatsapp: "WhatsApp",
    whatsappWith: (name: string) => `WhatsApp con ${name}`,
    delivered: (count: number) => `Ya entregados: ${String(count)}`,
    deliveredLabel: "Ya entregados",
  },
  month: {
    more: "Otro mes",
    label: "Mes",
    apply: "Ver mes",
    showing: (month: string) => `Mostrando ${month}`,
  },
  tools: {
    title: "Herramientas",
    import: "Importar lista de precios",
    prices: "Subir precios",
    suppliers: "Proveedores",
    archived: "Materiales archivados",
    active: "Materiales activos",
    record: "Registro del mes",
  },
  form: {
    title: "Nuevo material",
    back: "Volver a materiales",
    name: "Nombre",
    price: "Precio",
    stock: "¿Cuántos hay?",
    save: "Guardar",
    cancel: "Cancelar",
    saveFailed: "No pudimos guardar. Revisá los campos.",
    supplier: "Proveedor",
    supplierPlaceholder: "Elegí un proveedor",
    category: "Categoría",
    description: "Descripción",
    cost: "Costo",
    priceOnRequest: "Precio a consultar",
    available: "Disponible",
    photo: "Foto",
    variantsTitle: "Otras variantes",
    variantName: "Nombre de la variante",
    variantPrice: "Precio de la variante",
    variantCost: "Costo de la variante",
    addVariant: "Agregar variante",
    removeVariant: "Quitar variante",
    stockInvalid: "Escribí un número entero, por ejemplo 5.",
    stockTooMany: "Esa cantidad es demasiado grande.",
  },
  redirect: {
    back: "Volver a Materiales",
    failed: "No se pudo marcar.",
  },
} as const;
