import type { AboutPageContent } from "../../domain/page-content";

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
      src: "/media/stand-ins/gallery-01.jpg",
      alt: "Mueble de madera con dos canastos de fibra tejida en el estante inferior",
      width: 640,
      height: 640,
    },
    {
      id: "gallery-02",
      src: "/media/stand-ins/gallery-02.jpg",
      alt: "Una mujer sostiene un limón junto a un limonero cargado de frutos",
      width: 360,
      height: 640,
    },
    {
      id: "gallery-03",
      src: "/media/stand-ins/hero-1.jpg",
      alt: "Estantería de cestería con cuerda de papel negra tejida sobre una estructura de hierro",
      width: 480,
      height: 640,
    },
    {
      id: "gallery-04",
      src: "/media/stand-ins/hero-2.jpg",
      alt: "Grupo de mujeres sonrientes posando juntas en el patio del espacio durante un encuentro",
      width: 640,
      height: 480,
    },
    {
      id: "gallery-05",
      src: "/media/stand-ins/hero-3.jpg",
      alt: "Tres mujeres con sombreros posan abrazadas frente a un ventanal, con árboles al fondo",
      width: 640,
      height: 640,
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
