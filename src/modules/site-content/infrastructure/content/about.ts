import type { AboutPageContent } from "../../domain/page-content";
import { imageRef } from "./media-refs";

/**
 * Quiénes somos. Drafted from docs/brand/dmr-calma-inquieta.md (sections 2 and
 * 5): voseo, "nosotras", and nothing the evidence does not back (no founders,
 * years, prices, schedules or policies). All prose carries `approved: false`.
 */

export const aboutContent = {
  seo: {
    title: "Quiénes somos",
    description:
      "Conocé Calma Inquieta, un multiespacio de arte en Argüello, Córdoba, donde se aprende y se comparte creando con las manos.",
  },
  heading: "Quiénes somos",
  history: [
    {
      id: "about-history-1",
      approved: false,
      text: "Somos Calma Inquieta, un multiespacio de arte en Argüello, Córdoba. Nuestro nombre y nuestra bajada, «Equilibrio entre serenidad y movimiento», cuentan lo que queremos que pase acá: crear con calma y con ganas de movernos.",
    },
    {
      id: "about-history-2",
      approved: false,
      text: "En el espacio damos talleres mensuales de encordado y cestería, talleres intensivos con instructoras invitadas y eventos privados para grupos. También hacemos pedidos a medida.",
    },
    {
      id: "about-history-3",
      approved: false,
      text: "Lo que más cuidamos es la comunidad: se aprende, se charla y se comparte, y cada una se lleva una pieza hecha por ella.",
    },
  ],
  valueProposition: {
    id: "about-value-proposition",
    approved: false,
    text: "Te ofrecemos un lugar para aprender una técnica manual sin apuro, acompañada por instructoras, y llevarte una pieza hecha por vos.",
  },
  /** The brand caption already in circulation (DMR rule R14: no invented tagline). */
  pullQuote: {
    id: "about-pull-quote",
    approved: false,
    text: "Calma, creatividad y un poquito de inquietud.",
  },
  /** The intro collage: a portrait, a wide group shot and a near-square detail. */
  introImages: [
    imageRef("about-espacio"),
    imageRef("about-comunidad"),
    imageRef("about-jarrones"),
  ],
  values: [
    {
      id: "about-value-calm",
      approved: false,
      title: "Hacer con calma",
      text: "Cada taller tiene su ritmo. Nadie corre: se aprende de a poco y se disfruta el proceso.",
    },
    {
      id: "about-value-community",
      approved: false,
      title: "Compartir entre todas",
      text: "Se charla, se ríe y se arma red. La comunidad es parte de lo que hacemos.",
    },
    {
      id: "about-value-beginners",
      approved: false,
      title: "Sin experiencia previa",
      text: "Podés venir sin haber probado nunca la técnica. Te acompañamos paso a paso.",
    },
    {
      id: "about-value-credit",
      approved: false,
      title: "Reconocer a cada una",
      text: "Valoramos a quienes enseñan y a quienes crean, y lo decimos con nombre propio.",
    },
  ],
  /** The ten curated photos, in the curation order; the reserves are not registered. */
  gallery: [
    { id: "about-gallery-01", ...imageRef("about-espacio") },
    { id: "about-gallery-02", ...imageRef("about-manos-aro") },
    { id: "about-gallery-03", ...imageRef("about-espejo-flecos") },
    { id: "about-gallery-04", ...imageRef("about-mesa-taller") },
    { id: "about-gallery-05", ...imageRef("about-macrame") },
    { id: "about-gallery-06", ...imageRef("about-ceramica-manos") },
    { id: "about-gallery-07", ...imageRef("about-cuenco-tejido") },
    { id: "about-gallery-08", ...imageRef("about-acuarela") },
    { id: "about-gallery-09", ...imageRef("about-comunidad") },
    { id: "about-gallery-10", ...imageRef("about-jarrones") },
  ],
  videos: [],
  faq: [
    {
      id: "about-faq-experience",
      approved: false,
      question: "¿Necesito experiencia previa?",
      answer:
        "No. Podés venir sin haber probado nunca la técnica: las instructoras te acompañan.",
    },
    {
      id: "about-faq-who",
      approved: false,
      question: "¿Quiénes dan los talleres?",
      answer:
        "Algunos los damos nosotras y otros los conducen instructoras invitadas.",
    },
    {
      id: "about-faq-where",
      approved: false,
      question: "¿Dónde queda Calma Inquieta?",
      answer: "En Albert Sabin 6079, Argüello, Córdoba.",
    },
    {
      id: "about-faq-dates",
      approved: false,
      question: "¿Cómo me entero de las próximas fechas?",
      answer:
        "Escribinos por WhatsApp o seguinos en Instagram, donde publicamos cada taller.",
    },
  ],
  sectionHeadings: {
    values: "Lo que nos mueve",
    gallery: "Un vistazo",
    faq: "Preguntas frecuentes",
  },
} as const satisfies AboutPageContent;
