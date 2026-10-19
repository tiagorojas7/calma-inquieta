import { DEFAULT_SHARE_IMAGE, type MediaAsset } from "../../domain/media";

/**
 * The curated client media. Files live under `public/media/<area>/` and come
 * from `pnpm media:derive` (recipe: tooling/media/recipes/design-adjustments.json);
 * paths, widths and heights are copied from the fragment it prints. Rights live
 * in the ledger (`media-rights.ts`), keyed by `sourceId`.
 */
export const MEDIA_ASSETS = [
  {
    kind: "image",
    id: "home-hero-mobile",
    sourceId: "img-20260819-174607732-hdr",
    area: "home",
    alt: "Pieza circular de papel kraft con flecos y un aro tejido oscuro, sobre un soporte frente a una reja",
    format: "webp",
    variants: [
      {
        width: 480,
        height: 600,
        path: "/media/home/home-hero-mobile-480.13e77fb5.webp",
      },
      {
        width: 720,
        height: 900,
        path: "/media/home/home-hero-mobile-720.58b52aa5.webp",
      },
      {
        width: 1080,
        height: 1350,
        path: "/media/home/home-hero-mobile-1080.a90a6d0e.webp",
      },
    ],
  },
  {
    kind: "image",
    id: "home-hero-desktop",
    sourceId: "img-20260819-174607732-hdr",
    area: "home",
    alt: "Pieza circular de papel kraft con flecos y un aro tejido oscuro, sobre un soporte frente a una reja",
    format: "webp",
    variants: [
      {
        width: 480,
        height: 640,
        path: "/media/home/home-hero-desktop-480.522bdb58.webp",
      },
      {
        width: 960,
        height: 1280,
        path: "/media/home/home-hero-desktop-960.4c6a3278.webp",
      },
      {
        width: 1600,
        height: 2133,
        path: "/media/home/home-hero-desktop-1600.2b820d5f.webp",
      },
    ],
  },
  {
    kind: "image",
    id: "share-default",
    sourceId: "img-20260819-174607732-hdr",
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
    id: "about-espacio",
    sourceId: "img-20260530-wa0021",
    area: "about",
    alt: "El espacio de Calma Inquieta, con una lámpara de cuerda, espejos y un estante",
    format: "webp",
    variants: [
      {
        width: 480,
        height: 640,
        path: "/media/about/about-espacio-480.985cb07e.webp",
      },
      {
        width: 960,
        height: 1280,
        path: "/media/about/about-espacio-960.3ff2bdc2.webp",
      },
    ],
  },
  {
    kind: "image",
    id: "about-manos-aro",
    sourceId: "img-20260411-wa0106",
    area: "about",
    alt: "Manos tejiendo un aro con cuerda",
    format: "webp",
    variants: [
      {
        width: 480,
        height: 853,
        path: "/media/about/about-manos-aro-480.bd0049bc.webp",
      },
      {
        width: 900,
        height: 1600,
        path: "/media/about/about-manos-aro-900.b0f24b88.webp",
      },
    ],
  },
  {
    kind: "image",
    id: "about-espejo-flecos",
    sourceId: "img-20260530-wa0026",
    area: "about",
    alt: "Espejo con flecos de cuerda sobre un pie, frente a un fondo blanco",
    format: "webp",
    variants: [
      {
        width: 480,
        height: 640,
        path: "/media/about/about-espejo-flecos-480.7fec60f0.webp",
      },
      {
        width: 960,
        height: 1280,
        path: "/media/about/about-espejo-flecos-960.5e2a6c47.webp",
      },
    ],
  },
  {
    kind: "image",
    id: "about-mesa-taller",
    sourceId: "img-20260419-wa0044",
    area: "about",
    alt: "Mesa de taller con los kits de materiales listos para cada persona",
    format: "webp",
    variants: [
      {
        width: 480,
        height: 640,
        path: "/media/about/about-mesa-taller-480.b5a94a23.webp",
      },
      {
        width: 960,
        height: 1280,
        path: "/media/about/about-mesa-taller-960.9a1180e2.webp",
      },
    ],
  },
  {
    kind: "image",
    id: "about-macrame",
    sourceId: "img-20260530-wa0032",
    area: "about",
    alt: "Colgante de macramé hecho con cuerda",
    format: "webp",
    variants: [
      {
        width: 480,
        height: 640,
        path: "/media/about/about-macrame-480.f48f6bc2.webp",
      },
      {
        width: 960,
        height: 1280,
        path: "/media/about/about-macrame-960.5fa0aeba.webp",
      },
    ],
  },
  {
    kind: "image",
    id: "about-ceramica-manos",
    sourceId: "img-20261015-wa0029",
    area: "about",
    alt: "Manos modelando una bandeja de arcilla, con un delantal de rayas",
    format: "webp",
    variants: [
      {
        width: 480,
        height: 640,
        path: "/media/about/about-ceramica-manos-480.beadafdb.webp",
      },
      {
        width: 960,
        height: 1280,
        path: "/media/about/about-ceramica-manos-960.137fba96.webp",
      },
    ],
  },
  {
    kind: "image",
    id: "about-cuenco-tejido",
    sourceId: "img-20260709-wa0009",
    area: "about",
    alt: "Cuenco de cerámica con el borde tejido en cestería",
    format: "webp",
    variants: [
      {
        width: 480,
        height: 640,
        path: "/media/about/about-cuenco-tejido-480.570261f0.webp",
      },
      {
        width: 960,
        height: 1280,
        path: "/media/about/about-cuenco-tejido-960.98956937.webp",
      },
    ],
  },
  {
    kind: "image",
    id: "about-acuarela",
    sourceId: "img-20260912-131514909-hdr",
    area: "about",
    alt: "Mesa de acuarela con pinturas de colores intensos",
    format: "webp",
    variants: [
      {
        width: 480,
        height: 640,
        path: "/media/about/about-acuarela-480.c9eb252e.webp",
      },
      {
        width: 960,
        height: 1280,
        path: "/media/about/about-acuarela-960.f984cf6e.webp",
      },
      {
        width: 1600,
        height: 2133,
        path: "/media/about/about-acuarela-1600.ec6588db.webp",
      },
    ],
  },
  {
    kind: "image",
    id: "about-comunidad",
    sourceId: "img-20261015-wa0030",
    area: "about",
    alt: "Un grupo de personas comparte un taller de cerámica en el estudio",
    format: "webp",
    variants: [
      {
        width: 480,
        height: 360,
        path: "/media/about/about-comunidad-480.9d2efa54.webp",
      },
      {
        width: 960,
        height: 720,
        path: "/media/about/about-comunidad-960.f3ff5607.webp",
      },
      {
        width: 1600,
        height: 1200,
        path: "/media/about/about-comunidad-1600.fad08082.webp",
      },
    ],
  },
  {
    kind: "image",
    id: "about-jarrones",
    sourceId: "img-20260511-wa0019",
    area: "about",
    alt: "Dos jarrones de papel y cerámica",
    format: "webp",
    variants: [
      {
        width: 480,
        height: 389,
        path: "/media/about/about-jarrones-480.9cbdb163.webp",
      },
      {
        width: 960,
        height: 779,
        path: "/media/about/about-jarrones-960.50ab47f7.webp",
      },
    ],
  },
  {
    kind: "image",
    id: "home-teaser",
    sourceId: "img-20260411-wa0013",
    area: "home",
    alt: "Una cesta con flores silvestres junto al cartel de Calma Inquieta, con la luz del ventanal",
    format: "webp",
    variants: [
      {
        width: 480,
        height: 600,
        path: "/media/home/home-teaser-480.502a7908.webp",
      },
      {
        width: 800,
        height: 1000,
        path: "/media/home/home-teaser-800.cf772cf0.webp",
      },
    ],
  },
  {
    kind: "image",
    id: "contact-fachada",
    sourceId: "img-20260530-wa0019",
    area: "contact",
    alt: "El local de Calma Inquieta visto desde afuera al anochecer, con el ventanal iluminado",
    format: "webp",
    variants: [
      {
        width: 480,
        height: 640,
        path: "/media/contact/contact-fachada-480.87a69003.webp",
      },
      {
        width: 960,
        height: 1280,
        path: "/media/contact/contact-fachada-960.4aab4923.webp",
      },
    ],
  },
  {
    kind: "image",
    id: "home-loop-poster",
    sourceId: "vid-20261014-185300580",
    area: "video",
    alt: "",
    decorative: true,
    format: "webp",
    variants: [
      {
        width: 480,
        height: 600,
        path: "/media/video/home-loop-poster-480.c9da0871.webp",
      },
      {
        width: 720,
        height: 900,
        path: "/media/video/home-loop-poster-720.39ea6615.webp",
      },
    ],
  },
  {
    kind: "video",
    id: "home-loop",
    sourceId: "vid-20261014-185300580",
    area: "video",
    width: 720,
    height: 900,
    durationSeconds: 6,
    audio: false,
    sources: [
      { path: "/media/video/home-loop-720.307f7e0a.webm", type: "video/webm" },
      { path: "/media/video/home-loop-720.451c3923.mp4", type: "video/mp4" },
    ],
    posterId: "home-loop-poster",
  },
] as const satisfies readonly MediaAsset[];

export type MediaAssetId = (typeof MEDIA_ASSETS)[number]["id"];
