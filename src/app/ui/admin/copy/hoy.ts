/** Hoy: the numbers, what to do, today's classes and what is new. */
export const hoyCopy = {
  nav: { label: "Hoy" },
  title: "Hoy",
  figures: {
    collected: "Cobrado",
    toCollect: "Por cobrar",
    studio: "Para el estudio",
  },
  more: {
    label: "Ver más",
    occupancy: "Ocupación",
    occupancyDetail: (enrolled: number, capacity: number) =>
      `${String(enrolled)} de ${String(capacity)} lugares`,
    teachers: "Para profesoras",
    statistics: "Ver estadísticas",
  },
  todo: {
    title: "Para hacer",
    empty: "Todo al día",
    seeAll: "Ver todo",
    charge: (amount: string) => `Cobrar ${amount}`,
    chargeMaterials: (amount: string) => `Cobrar materiales ${amount}`,
    confirmDeposit: (amount: string) => `Confirmar seña ${amount}`,
    chargeBalance: (amount: string) => `Cobrar saldo ${amount}`,
    chargeTo: (label: string, name: string) => `${label} a ${name}`,
    fee: "Cuota",
    materials: "Materiales",
    deposit: "Seña",
    balance: "Saldo",
    seeRequest: "Ver consulta",
    whatsapp: "WhatsApp",
    privateEvent: "Evento privado",
    forDate: (date: string) => `para el ${date}`,
    open: (month: string) => `Abrir ${month}`,
    openFacts: (month: string) => `Falta abrir ${month}`,
    addTurno: "Agregar turno",
    emptyMonth: (month: string) => `${month} sin turnos`,
    order: "Ver pedido",
    orderTitle: (suppliers: string) => `Pedir materiales a ${suppliers}`,
    deliver: "Ver entregas",
    deliverTitle: (count: number) =>
      count === 1 ? "1 pedido para entregar" : `${String(count)} para entregar`,
    seeWorkshop: "Ver taller",
  },
  classes: {
    title: "Clases de hoy",
    empty: "Hoy no hay clases",
    takeAttendance: "Tomar asistencia",
    students: (count: number) =>
      count === 0
        ? "Sin alumnas"
        : count === 1
          ? "1 alumna"
          : `${String(count)} alumnas`,
  },
  news: {
    title: "Lo nuevo",
    empty: "Nada nuevo",
    seeAll: "Ver todo",
  },
  saved: {
    charged: "cobro",
    deposit: "seña",
    balance: "saldo",
    opened: "mes abierto",
  },
  refused: {
    "turno-full": "El turno está completo.",
    "period-closed": "El mes ya está cerrado.",
    "amount-mismatch": "El monto no coincide con el pedido.",
    "illegal-transition": "Ya no se puede cobrar.",
    "already-confirmed": "Ya estaba cobrado.",
    "already-cancelled": "Ya estaba cancelado.",
    invalid: "El monto no es válido.",
    "intensive-full": "El workshop está completo.",
    "balance-already-paid": "El saldo ya estaba cobrado.",
    "no-balance-due": "No hay saldo para cobrar.",
    "not-confirmed": "Primero confirmá la seña.",
    "month-refused": "No se pudo abrir el mes.",
    "month-unpublished":
      "Se abrió, pero quedó sin publicar. Revisalo en el taller.",
    generic: "No se pudo guardar.",
  },
} as const;
