import type {
  ComingSoonContent,
  ComingSoonSlug,
} from "../../domain/page-content";

/** The private-events Próximamente page. Always `noindex`; it points to WhatsApp with its own topic. */
export const comingSoonContent = {
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
