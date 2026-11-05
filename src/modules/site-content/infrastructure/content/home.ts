import type { HomePageContent } from "../../domain/page-content";
import { imageRef, loopRef } from "./media-refs";

/**
 * Inicio. Drafted from docs/brand/dmr-calma-inquieta.md and the client
 * proposal: voseo, "nosotras", no founders, years, prices or policies. Every
 * drafted claim carries `approved: false` until the client signs it off.
 */
export const homeContent = {
  seo: {
    title: "Calma Inquieta | Multiespacio de arte en Argüello, Córdoba",
    description:
      "Talleres de encordado y cestería, workshops y eventos privados en Argüello, Córdoba. Equilibrio entre serenidad y movimiento.",
  },
  hero: {
    eyebrow: "Multiespacio de arte en Argüello",
    title: {
      lead: "Un espacio para crear con",
      accent: "calma",
      trail: "y un poquito de inquietud",
    },
    subtitle:
      "Talleres de encordado y cestería, workshops y eventos privados. Un lugar para hacer con las manos y compartir.",
    primaryCtaLabel: "Ver talleres",
    secondaryCtaLabel: "Ver workshops",
    backdrop: imageRef("home-hero-backdrop"),
    collage: [
      imageRef("home-hero-desktop"),
      imageRef("home-collage-wide"),
      imageRef("home-collage-square"),
    ],
    note: "Crear también es una forma de volver a vos",
    keywords: ["Arte", "Manos", "Encuentro", "Bienestar"],
    loop: loopRef("home-loop"),
  },
  trustClaims: [
    {
      id: "home-claim-no-experience",
      approved: false,
      label: "No necesitás experiencia",
      icon: "hands",
      appliesTo: "all",
    },
    {
      id: "home-claim-materials",
      approved: false,
      label: "Workshops con materiales incluidos",
      icon: "leaf",
      appliesTo: "intensivos",
    },
    {
      id: "home-claim-community",
      approved: false,
      label: "Una comunidad que se arma entre todas",
      icon: "group",
      appliesTo: "all",
    },
  ],
  monthly: {
    heading: "Talleres mensuales",
    emptyMessage:
      "Estamos preparando la información de los talleres mensuales. Pronto vas a poder inscribirte desde acá.",
  },
  intensivos: {
    heading: "Próximos workshops",
    emptyMessage:
      "Todavía no hay fechas publicadas. Escribinos o seguinos en Instagram para enterarte primero.",
  },
  teaser: {
    heading: "Quiénes somos",
    body: {
      id: "home-teaser-body",
      approved: false,
      text: "Somos un multiespacio de arte en Argüello. Nos gusta crear con las manos, aprender juntas y que cada persona se lleve algo hecho por ella.",
    },
    image: imageRef("home-teaser"),
    accentImage: imageRef("about-jarrones"),
    pull: "Hecho a mano, compartido entre todas",
    linkLabel: "Conocenos",
  },
  testimonials: {
    heading: "Lo que cuentan nuestras alumnas",
    items: [],
  },
  catalogBand: {
    heading: "Tu lugar para crear con las manos",
    body: "Sumate a un taller mensual o a un workshop y llevate algo hecho por vos. Elegí el tuyo y reservá tu lugar desde la web.",
    primary: imageRef("home-catalog-weaving"),
    secondary: imageRef("home-catalog-looms"),
  },
  contactBand: {
    heading: "¿Querés sumarte?",
    body: "Elegí tu taller o tu workshop y reservá tu lugar desde la web.",
    image: imageRef("home-band-hands"),
  },
} as const satisfies HomePageContent;
