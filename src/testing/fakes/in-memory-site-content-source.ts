import type { SiteContentSource } from "~/modules/site-content/application/ports";
import {
  DEFAULT_SHARE_IMAGE,
  type MediaRegistry,
} from "~/modules/site-content/domain/media";
import type {
  AmbientLoop,
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

/** A registered stand-in with a one-candidate srcSet, so the hero exercises the responsive path. */
const heroImage: ImageRef = {
  ...image("/media/stand-ins/hero-1.jpg", "Composición abstracta"),
  srcSet: "/media/stand-ins/hero-1.jpg 100w",
};

const loopPoster = "/media/video/home-loop-poster-720.00000000.webp";
const loopWebm = "/media/video/home-loop-720.00000000.webm";
const loopMp4 = "/media/video/home-loop-720.00000000.mp4";

/** A decorative loop whose poster and two sources are registered and publishable below. */
const heroLoop: AmbientLoop = {
  poster: { src: loopPoster, alt: "", width: 720, height: 900 },
  sources: [
    { src: loopWebm, type: "video/webm" },
    { src: loopMp4, type: "video/mp4" },
  ],
  width: 720,
  height: 900,
};

/** One publishable share image built from the module default, so minimal content never reports share-image-missing, plus the publishable loop. */
const shareRegistry: MediaRegistry = {
  assets: [
    {
      kind: "image",
      id: "share-default",
      sourceId: "test-share-source",
      area: "share",
      alt: DEFAULT_SHARE_IMAGE.alt,
      format: "jpeg",
      variants: [
        {
          width: DEFAULT_SHARE_IMAGE.width,
          height: DEFAULT_SHARE_IMAGE.height,
          path: DEFAULT_SHARE_IMAGE.path,
        },
      ],
    },
    {
      kind: "image",
      id: "home-loop-poster",
      sourceId: "test-loop-source",
      area: "video",
      alt: "",
      decorative: true,
      format: "webp",
      variants: [{ width: 720, height: 900, path: loopPoster }],
    },
    {
      kind: "video",
      id: "home-loop",
      sourceId: "test-loop-source",
      area: "video",
      width: 720,
      height: 900,
      durationSeconds: 6,
      audio: false,
      sources: [
        { path: loopWebm, type: "video/webm" },
        { path: loopMp4, type: "video/mp4" },
      ],
      posterId: "home-loop-poster",
    },
  ],
  rights: [
    { sourceId: "test-share-source", people: "none", consent: "not-required" },
    { sourceId: "test-loop-source", people: "hands", consent: "not-required" },
  ],
  excluded: [],
};

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
        backdrop: heroImage,
        collage: [heroImage, heroImage, heroImage],
        note: "Crear también es una forma de volver a vos.",
        keywords: ["Arte", "Manos", "Encuentro", "Bienestar"],
        loop: heroLoop,
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
        accentImage: image("/media/stand-ins/hero-1.jpg", "Detalle"),
        pull: "Hecho con las manos, compartido entre todas.",
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
      photo: image("/media/stand-ins/gallery-01.jpg", "Frente del local"),
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
    catalog: {
      fallbackImage: image("/media/stand-ins/gallery-01.jpg", ""),
      talleres: {
        seo: seo("Catálogo de talleres"),
        heading: "Talleres",
        intro: { id: "catalog-talleres-intro", approved: true, text: "Intro." },
        emptyMessage: "Pronto.",
        cardCtaLabel: "Ver taller",
        feeSuffix: "/ mes",
        feeLabel: "Cuota mensual",
        noOffering: "Próximamente abrimos inscripciones",
        turnosHeading: "Turnos",
        teacherHeading: "Quién lo guía",
        projectHeading: "Proyectos que vamos a realizar",
      },
      intensivos: {
        seo: seo("Catálogo de intensivos"),
        heading: "Talleres intensivos",
        intro: {
          id: "catalog-intensivos-intro",
          approved: true,
          text: "Intro.",
        },
        emptyMessage: "Pronto.",
        cardCtaLabel: "Ver intensivo",
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
          "Hola, quiero consultar por el taller {nombre}, turno {dia} {horario}.",
        intensivo:
          "Hola, quiero consultar por el intensivo {nombre} del {fecha}.",
        paused: "Hola, quiero que me avisen cuando reabra {nombre}.",
      },
    },
    standIns: [
      standIn("hero-1", "/media/stand-ins/hero-1.jpg"),
      standIn("about-teaser", "/media/stand-ins/about-teaser.svg"),
      standIn("gallery-01", "/media/stand-ins/gallery-01.jpg"),
    ],
    media: shareRegistry,
    ...overrides,
  };
}

export function createInMemorySiteContentSource(
  raw: RawSiteContent,
): SiteContentSource {
  return { load: () => Promise.resolve(raw) };
}
