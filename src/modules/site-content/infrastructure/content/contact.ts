import type { ContactPageContent } from "../../domain/page-content";

/** Copy for Contacto. The contact items themselves come from the business profile. */
export const contactContent = {
  seo: {
    title: "Contacto",
    description:
      "Escribinos por WhatsApp, seguinos en Instagram o visitanos en Albert Sabin 6079, Argüello, Córdoba. Te contamos qué talleres hay y cómo sumarte.",
  },
  heading: "Contacto",
  intro:
    "Escribinos por WhatsApp o seguinos en Instagram. Si preferís venir, estamos en Argüello: te contamos qué talleres hay y cómo sumarte.",
} as const satisfies ContactPageContent;
