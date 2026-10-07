import type {
  ComingSoonContent,
  ComingSoonSlug,
} from "../../domain/page-content";

/** The three Próximamente pages. Always `noindex`; each points to WhatsApp with its own topic. */
export const comingSoonContent = {
  talleres: {
    seo: {
      title: "Talleres mensuales",
      description:
        "Estamos preparando la página de talleres mensuales de Calma Inquieta. Mientras tanto, escribinos y te contamos cómo sumarte.",
    },
    title: "Talleres mensuales",
    message:
      "Estamos preparando esta página. Mientras tanto, escribinos por WhatsApp y te contamos qué talleres hay y cómo sumarte.",
    whatsappTopic: "talleres",
  },
  intensivos: {
    seo: {
      title: "Talleres intensivos",
      description:
        "Estamos preparando la página de talleres intensivos de Calma Inquieta. Mientras tanto, escribinos y te avisamos de las próximas fechas.",
    },
    title: "Talleres intensivos",
    message:
      "Estamos preparando esta página. Mientras tanto, escribinos por WhatsApp y te avisamos de las próximas fechas.",
    whatsappTopic: "intensivos",
  },
  "eventos-privados": {
    seo: {
      title: "Eventos privados",
      description:
        "Estamos preparando la página de eventos privados de Calma Inquieta. Mientras tanto, escribinos y armamos una propuesta para tu grupo.",
    },
    title: "Eventos privados",
    message:
      "Estamos preparando esta página. Mientras tanto, escribinos por WhatsApp y armamos una propuesta para tu grupo.",
    whatsappTopic: "eventos-privados",
  },
} as const satisfies Record<ComingSoonSlug, ComingSoonContent>;
