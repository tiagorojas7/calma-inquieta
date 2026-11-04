import type { ContactPageContent } from "../../domain/page-content";
import { imageRef } from "./media-refs";

/** Copy for Contacto. The contact items themselves come from the business profile. */
export const contactContent = {
  seo: {
    title: "Contacto",
    description:
      "Escribinos por WhatsApp, seguinos en Instagram o visitanos en Albert Sabin 6079, Argüello, Córdoba. Te contamos qué talleres y workshops hay.",
  },
  heading: "Contacto",
  intro:
    "Escribinos por WhatsApp o seguinos en Instagram. Si preferís venir, estamos en Argüello: te contamos qué talleres y workshops hay.",
  photo: imageRef("contact-fachada"),
} as const satisfies ContactPageContent;
