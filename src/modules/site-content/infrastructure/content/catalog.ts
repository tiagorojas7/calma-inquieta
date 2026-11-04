import type { CatalogContent } from "../../domain/page-content";

/**
 * Copy for the public catalog pages. The literals the specs name are fixed;
 * the listing intros and the other labels are drafted prose awaiting the
 * owners' approval. No schedule, price, teacher or policy fact is written here.
 */
export const catalogContent = {
  // Reuses a registered stand-in; decorative, so the alt text is empty.
  fallbackImage: {
    src: "/media/stand-ins/gallery-01.jpg",
    alt: "",
    width: 640,
    height: 640,
  },
  talleres: {
    seo: {
      title: "Talleres para crear con calma",
      description:
        "Conocé los talleres mensuales de Calma Inquieta: quién los guía, en qué días y horarios se cursan y cómo inscribirte desde la web.",
    },
    heading: "Talleres mensuales",
    intro: {
      id: "catalog-talleres-intro",
      approved: false,
      text: "Elegí un taller, conocé a quien lo guía e inscribite desde acá.",
    },
    emptyMessage:
      "Estamos preparando los próximos talleres. Escribinos por WhatsApp y te contamos cuándo abren.",
    cardCtaLabel: "Ver taller",
    feeSuffix: "/ mes",
    feeLabel: "Cuota mensual",
    noOffering: "Próximamente abrimos inscripciones",
    turnosHeading: "Días y horarios",
    teacherHeading: "Quién lo guía",
    projectHeading: "Proyectos que vamos a realizar",
  },
  intensivos: {
    seo: {
      title: "Próximos workshops",
      description:
        "Mirá las próximas fechas de los workshops de Calma Inquieta: encuentros de un solo día en los que te llevás tu pieza ya terminada. Reservá tu lugar desde la web.",
    },
    heading: "Workshops",
    intro: {
      id: "catalog-intensivos-intro",
      approved: false,
      text: "Encuentros de un solo día para crear con calma: te llevás tu pieza ya terminada. Mirá las próximas fechas y reservá tu lugar desde acá.",
    },
    oneDay: "Encuentro de un solo día: te llevás tu pieza ya terminada.",
    emptyMessage:
      "Todavía no hay fechas confirmadas. Escribinos por WhatsApp y te avisamos de las próximas.",
    cardCtaLabel: "Ver workshop",
    priceLabel: "Precio",
    depositLabel: "Seña",
    materialsIncluded: "Materiales incluidos",
    minSeats: "Se realiza con un mínimo de {cantidad} personas",
    conditionsLabel: "Condiciones",
    teacherHeading: "Quién lo guía",
  },
  shared: {
    seatsLimited: "Cupo limitado",
    paused: "Inscripciones pausadas",
    inquiryCta: "Consultá por WhatsApp",
    pausedLinkLabel: "Escribinos por WhatsApp",
    moreTurnos: "y {cantidad} turnos más",
    moreTurnosOne: "y 1 turno más",
    breadcrumbLabel: "Ruta de navegación",
  },
  messages: {
    taller: "Hola, quiero consultar por el taller {nombre}.",
    turno:
      "Hola, quiero consultar por el taller {nombre}, el turno del {dia} de {horario}.",
    intensivo: "Hola, quiero consultar por el workshop {nombre} del {fecha}.",
    paused:
      "Hola, vi que las inscripciones de {nombre} están pausadas. ¿Me avisan cuando reabran?",
  },
} as const satisfies CatalogContent;
