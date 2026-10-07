import type { RawBusinessProfile } from "../../domain/business-profile";

/**
 * The business facts, and the only file that holds the WhatsApp number.
 *
 * Source: docs/brand/dmr-calma-inquieta.md (section 2 and rule R10). The number
 * is provisional (DMR D8): the studio publishes more than one line, so the
 * client still has to confirm which one the site should use. Email, phone,
 * hours and coordinates stay absent until the client confirms them.
 */
export const businessProfile = {
  name: "Calma Inquieta",
  bajada: "Equilibrio entre serenidad y movimiento",
  address: {
    street: "Albert Sabin 6079",
    locality: "Argüello",
    city: "Córdoba",
    region: "Córdoba",
    countryCode: "AR",
  },
  instagramHandle: "calma.inquieta",
  whatsapp: { display: "351 739 5239", provisional: true },
  whatsappMessages: {
    general: "Hola, quiero hacerles una consulta.",
    talleres: "Hola, quiero información sobre los talleres mensuales.",
    intensivos: "Hola, quiero información sobre los talleres intensivos.",
    "eventos-privados": "Hola, quiero consultar por un evento privado.",
  },
} as const satisfies RawBusinessProfile;
