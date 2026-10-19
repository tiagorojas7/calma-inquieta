import type { HomePageContent } from "../../domain/page-content";
import { artDirected, imageRef, loopRef } from "./media-refs";

/**
 * Inicio. Drafted from docs/brand/dmr-calma-inquieta.md and the client
 * proposal: voseo, "nosotras", no founders, years, prices or policies. Every
 * drafted claim carries `approved: false` until the client signs it off.
 */
export const homeContent = {
  seo: {
    title: "Calma Inquieta | Multiespacio de arte en Argüello, Córdoba",
    description:
      "Talleres de encordado y cestería, talleres intensivos y eventos privados en Argüello, Córdoba. Equilibrio entre serenidad y movimiento.",
  },
  hero: {
    eyebrow: "Multiespacio de arte en Argüello",
    title: {
      lead: "Un espacio para crear con",
      accent: "calma",
      trail: "y un poquito de inquietud",
    },
    subtitle:
      "Talleres de encordado y cestería, talleres intensivos y eventos privados. Un lugar para hacer con las manos y compartir.",
    primaryCtaLabel: "Ver talleres",
    secondaryCtaLabel: "Ver intensivos",
    image: artDirected("home-hero-mobile", "home-hero-desktop"),
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
      label: "Talleres intensivos con materiales incluidos",
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
      "Estamos preparando la información de los talleres mensuales. Escribinos y te contamos cómo sumarte.",
  },
  intensivos: {
    heading: "Próximos intensivos",
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
    linkLabel: "Conocenos",
  },
  testimonials: {
    heading: "Lo que cuentan nuestras alumnas",
    items: [],
  },
  contactBand: {
    heading: "¿Querés sumarte?",
    body: "Escribinos por WhatsApp o seguinos en Instagram y te contamos qué hay para vos.",
  },
} as const satisfies HomePageContent;
