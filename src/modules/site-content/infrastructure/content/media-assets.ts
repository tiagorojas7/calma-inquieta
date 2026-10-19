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
        path: "/media/home/home-hero-mobile-480.672703ad.webp",
      },
      {
        width: 720,
        height: 900,
        path: "/media/home/home-hero-mobile-720.7ae91450.webp",
      },
      {
        width: 1080,
        height: 1350,
        path: "/media/home/home-hero-mobile-1080.72f4fab7.webp",
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
        path: "/media/home/home-hero-desktop-480.614d48fa.webp",
      },
      {
        width: 960,
        height: 1280,
        path: "/media/home/home-hero-desktop-960.67e37134.webp",
      },
      {
        width: 1600,
        height: 2133,
        path: "/media/home/home-hero-desktop-1600.c887fe23.webp",
      },
    ],
  },
  {
    kind: "image",
    id: "home-hero-backdrop",
    sourceId: "img-20260530-wa0030",
    area: "home",
    alt: "Un banco de madera con asiento tejido en cuerda y borlas blancas, frente a cortinas de lino color crema",
    format: "webp",
    variants: [
      {
        width: 480,
        height: 853,
        path: "/media/home/home-hero-backdrop-480.25657208.webp",
      },
      {
        width: 720,
        height: 1280,
        path: "/media/home/home-hero-backdrop-720.c11bc471.webp",
      },
      {
        width: 900,
        height: 1600,
        path: "/media/home/home-hero-backdrop-900.71f667db.webp",
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
        path: "/media/about/about-espacio-480.dc7a11e1.webp",
      },
      {
        width: 960,
        height: 1280,
        path: "/media/about/about-espacio-960.767da8bc.webp",
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
        path: "/media/about/about-manos-aro-480.1f164765.webp",
      },
      {
        width: 900,
        height: 1600,
        path: "/media/about/about-manos-aro-900.b5b155b6.webp",
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
        path: "/media/about/about-espejo-flecos-480.964c03af.webp",
      },
      {
        width: 960,
        height: 1280,
        path: "/media/about/about-espejo-flecos-960.3b6f0749.webp",
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
        path: "/media/about/about-mesa-taller-480.e732a77f.webp",
      },
      {
        width: 960,
        height: 1280,
        path: "/media/about/about-mesa-taller-960.ba13f64e.webp",
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
        path: "/media/about/about-macrame-480.1ab16dbd.webp",
      },
      {
        width: 960,
        height: 1280,
        path: "/media/about/about-macrame-960.c94c34e5.webp",
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
        path: "/media/about/about-ceramica-manos-480.3a2e5ab7.webp",
      },
      {
        width: 960,
        height: 1280,
        path: "/media/about/about-ceramica-manos-960.2256390e.webp",
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
        path: "/media/about/about-cuenco-tejido-480.26249dcc.webp",
      },
      {
        width: 960,
        height: 1280,
        path: "/media/about/about-cuenco-tejido-960.2a7da1c5.webp",
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
        path: "/media/about/about-acuarela-480.ec5a8715.webp",
      },
      {
        width: 960,
        height: 1280,
        path: "/media/about/about-acuarela-960.0717c74f.webp",
      },
      {
        width: 1600,
        height: 2133,
        path: "/media/about/about-acuarela-1600.786a4613.webp",
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
        path: "/media/about/about-comunidad-480.ab10d2d2.webp",
      },
      {
        width: 960,
        height: 720,
        path: "/media/about/about-comunidad-960.faab714e.webp",
      },
      {
        width: 1600,
        height: 1200,
        path: "/media/about/about-comunidad-1600.e2fa024b.webp",
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
        path: "/media/about/about-jarrones-480.5e0b2ff9.webp",
      },
      {
        width: 960,
        height: 779,
        path: "/media/about/about-jarrones-960.497314d4.webp",
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
        path: "/media/home/home-teaser-480.d7edc2a9.webp",
      },
      {
        width: 800,
        height: 1000,
        path: "/media/home/home-teaser-800.e4abc393.webp",
      },
    ],
  },
  {
    kind: "image",
    id: "home-collage-square",
    sourceId: "img-20260709-wa0009",
    area: "home",
    alt: "Un cuenco de cerámica con el borde tejido en cestería, visto desde arriba sobre un mantel de rayas",
    format: "webp",
    variants: [
      {
        width: 480,
        height: 480,
        path: "/media/home/home-collage-square-480.596cdd96.webp",
      },
      {
        width: 960,
        height: 960,
        path: "/media/home/home-collage-square-960.d4fb4142.webp",
      },
    ],
  },
  {
    kind: "image",
    id: "home-collage-wide",
    sourceId: "img-20260530-wa0021",
    area: "home",
    alt: "Una lámpara de cuerda encendida sobre el rincón del estudio, con espejos tejidos en la pared",
    format: "webp",
    variants: [
      {
        width: 480,
        height: 360,
        path: "/media/home/home-collage-wide-480.86e790d7.webp",
      },
      {
        width: 960,
        height: 720,
        path: "/media/home/home-collage-wide-960.19691d4a.webp",
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
        path: "/media/contact/contact-fachada-480.3b789a04.webp",
      },
      {
        width: 960,
        height: 1280,
        path: "/media/contact/contact-fachada-960.d51a3b71.webp",
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
