import type { SiteContentSource } from "~/modules/site-content/application/ports";
import type {
  ImageRef,
  RawSiteContent,
} from "~/modules/site-content/domain/page-content";
import type { StandInAsset } from "~/modules/site-content/domain/stand-in";

const standIn = (id: string, path: string): StandInAsset => ({
  id,
  path,
  kind: "image",
  source: "test fake",
  licence: "test fake",
  replaceWith: "test fake",
});

const image = (src: string, alt: string): ImageRef => ({
  src,
  alt,
  width: 100,
  height: 100,
});

const seo = (title: string) => ({
  title,
  description: `Descripción de ${title}`,
});

/**
 * A minimal `RawSiteContent` that passes every validation rule. The WhatsApp
 * number is a fake (finding 9), never the client's. Overrides replace whole
 * top-level sections; tests that need one nested change spread the section.
 */
export function buildRawSiteContent(
  overrides: Partial<RawSiteContent> = {},
): RawSiteContent {
  return {
    profile: {
      name: "Calma Inquieta",
      bajada: "Equilibrio entre serenidad y movimiento",
      address: {
        street: "Calle Falsa 123",
        locality: "Argüello",
        city: "Córdoba",
        region: "Córdoba",
        countryCode: "AR",
      },
      instagramHandle: "calma.inquieta",
      whatsapp: { display: "351 000 0000", provisional: true },
      whatsappMessages: {
        general: "Hola, quiero hacer una consulta.",
        talleres: "Hola, quiero información sobre los talleres.",
        intensivos: "Hola, quiero información sobre los talleres intensivos.",
        "eventos-privados": "Hola, quiero consultar por un evento privado.",
      },
    },
    home: {
      seo: seo("Inicio"),
      hero: {
        eyebrow: "Multiespacio de arte",
        title: { lead: "Un lugar para", accent: "crear", trail: "con calma" },
        subtitle: "Talleres creativos en Argüello.",
        primaryCtaLabel: "Ver talleres",
        secondaryCtaLabel: "Ver intensivos",
        images: [image("/media/stand-ins/hero-1.jpg", "Composición abstracta")],
      },
      trustClaims: [
        {
          id: "claim-no-experience",
          approved: true,
          label: "No necesitás experiencia",
          icon: "hands",
          appliesTo: "all",
        },
      ],
      monthly: { heading: "Talleres mensuales", emptyMessage: "Pronto." },
      intensivos: { heading: "Próximos intensivos", emptyMessage: "Pronto." },
      teaser: {
        heading: "Quiénes somos",
        body: { id: "teaser-body", approved: true, text: "Somos un equipo." },
        image: image("/media/stand-ins/about-teaser.svg", "Composición"),
        linkLabel: "Conocenos",
      },
      testimonials: { heading: "Lo que cuentan", items: [] },
      contactBand: { heading: "Escribinos", body: "Contanos qué buscás." },
    },
    about: {
      seo: seo("Quiénes somos"),
      heading: "Quiénes somos",
      history: [{ id: "history-1", approved: true, text: "Nuestra historia." }],
      valueProposition: {
        id: "value-proposition",
        approved: true,
        text: "Lo que ofrecemos.",
      },
      values: [
        { id: "value-1", approved: true, title: "Calma", text: "Sin apuro." },
      ],
      gallery: [
        {
          id: "gallery-1",
          ...image("/media/stand-ins/gallery-01.jpg", "Composición abstracta"),
        },
      ],
      videos: [],
      faq: [
        {
          id: "faq-1",
          approved: true,
          question: "¿Necesito experiencia?",
          answer: "No.",
        },
      ],
      sectionHeadings: {
        values: "Lo que nos mueve",
        gallery: "Galería",
        faq: "Preguntas frecuentes",
      },
    },
    contact: {
      seo: seo("Contacto"),
      heading: "Contacto",
      intro: "Escribinos cuando quieras.",
    },
    comingSoon: {
      talleres: {
        seo: seo("Talleres"),
        title: "Talleres",
        message: "Muy pronto.",
        whatsappTopic: "talleres",
      },
      intensivos: {
        seo: seo("Intensivos"),
        title: "Intensivos",
        message: "Muy pronto.",
        whatsappTopic: "intensivos",
      },
      "eventos-privados": {
        seo: seo("Eventos privados"),
        title: "Eventos privados",
        message: "Muy pronto.",
        whatsappTopic: "eventos-privados",
      },
    },
    standIns: [
      standIn("hero-1", "/media/stand-ins/hero-1.jpg"),
      standIn("about-teaser", "/media/stand-ins/about-teaser.svg"),
      standIn("gallery-01", "/media/stand-ins/gallery-01.jpg"),
    ],
    ...overrides,
  };
}

export function createInMemorySiteContentSource(
  raw: RawSiteContent,
): SiteContentSource {
  return { load: () => Promise.resolve(raw) };
}
