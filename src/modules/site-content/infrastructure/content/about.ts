import type { AboutPageContent } from "../../domain/page-content";

/**
 * Quiénes somos. Drafted from docs/brand/dmr-calma-inquieta.md (sections 2 and
 * 5): voseo, "nosotras", and nothing the evidence does not back (no founders,
 * years, prices, schedules or policies). All prose carries `approved: false`.
 */

const GALLERY_SIZE = 800;

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
  gallery: [
    {
      id: "gallery-01",
      src: "/media/stand-ins/gallery-01.svg",
      alt: "Composición abstracta de círculos superpuestos en tonos arcilla, arena y terracota",
      width: GALLERY_SIZE,
      height: GALLERY_SIZE,
    },
    {
      id: "gallery-02",
      src: "/media/stand-ins/gallery-02.svg",
      alt: "Composición abstracta de columnas redondeadas en tonos salvia, arena y arcilla",
      width: GALLERY_SIZE,
      height: GALLERY_SIZE,
    },
    {
      id: "gallery-03",
      src: "/media/stand-ins/gallery-03.svg",
      alt: "Composición abstracta de colinas suaves con un sol terracota",
      width: GALLERY_SIZE,
      height: GALLERY_SIZE,
    },
    {
      id: "gallery-04",
      src: "/media/stand-ins/gallery-04.svg",
      alt: "Composición abstracta de líneas onduladas sobre un fondo salvia",
      width: GALLERY_SIZE,
      height: GALLERY_SIZE,
    },
    {
      id: "gallery-05",
      src: "/media/stand-ins/gallery-05.svg",
      alt: "Composición abstracta de círculos concéntricos en tonos arena y arcilla",
      width: GALLERY_SIZE,
      height: GALLERY_SIZE,
    },
    {
      id: "gallery-06",
      src: "/media/stand-ins/gallery-06.svg",
      alt: "Composición abstracta de formas ovaladas anidadas en tonos arena y salvia",
      width: GALLERY_SIZE,
      height: GALLERY_SIZE,
    },
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
