export const imageFixture = {
  src: "/media/stand-ins/hero-1.jpg",
  alt: "Composición abstracta en tonos cálidos",
  width: 800,
  height: 600,
} as const;

export const decorativeImageFixture = {
  src: "/media/stand-ins/hero-2.jpg",
  alt: "",
  width: 400,
  height: 300,
} as const;

export const activityFixture = {
  id: "actividad-1",
  title: "Cerámica para encontrarnos",
  description: "Una propuesta para crear con calma.",
  image: imageFixture,
  href: "/talleres/ceramica",
  ctaLabel: "Ver actividad",
} as const;

export const upcomingItemFixture = {
  id: "intensivo-1",
  date: {
    dateTime: "2026-11-14",
    weekday: "sáb",
    day: "14",
    month: "nov",
    label: "sábado 14 de noviembre de 2026",
  },
  title: "Intensivo de otoño",
  href: "/intensivos/otono",
  ctaLabel: "Ver intensivo",
} as const;

export const testimonialFixture = {
  id: "testimonio-1",
  quote: "Un espacio hermoso para bajar un cambio.",
  author: "María",
} as const;

export const heroImageFixtures = [
  imageFixture,
  {
    ...imageFixture,
    src: "/media/stand-ins/hero-2.jpg",
    alt: "Textura abstracta",
  },
  {
    ...imageFixture,
    src: "/media/stand-ins/hero-3.jpg",
    alt: "Formas abstractas",
  },
] as const;

export const trustClaimFixtures = [
  { id: "claim-1", label: "Experiencias cuidadas", icon: "heart" as const },
  { id: "claim-2", label: "Para crear en comunidad", icon: "group" as const },
] as const;

export const valueItemFixtures = [
  {
    id: "value-1",
    title: "Hacer con calma",
    text: "Cada taller tiene su ritmo.",
  },
  {
    id: "value-2",
    title: "Compartir entre todas",
    text: "La comunidad es parte.",
  },
] as const;

export const faqEntryFixtures = [
  {
    id: "faq-1",
    question: "¿Necesito experiencia previa?",
    answer: "No, te acompañamos paso a paso.",
  },
  {
    id: "faq-2",
    question: "¿Dónde queda el espacio?",
    answer: "En Argüello, Córdoba.",
  },
] as const;

export const galleryImageFixtures = [
  {
    id: "gallery-1",
    src: "/media/stand-ins/gallery-01.jpg",
    alt: "Círculos superpuestos en tonos arcilla",
    width: 600,
    height: 600,
  },
  {
    id: "gallery-2",
    src: "/media/stand-ins/gallery-02.jpg",
    alt: "Columnas redondeadas en tonos salvia",
    width: 600,
    height: 600,
  },
  {
    id: "gallery-3",
    src: "/media/stand-ins/hero-1.jpg",
    alt: "Colinas suaves con un sol terracota",
    width: 600,
    height: 600,
  },
] as const;

export const videoFixtures = [
  {
    id: "video-1",
    youtubeId: "dQw4w9WgXcQ",
    title: "Un día en el taller",
    poster: {
      src: "/media/stand-ins/gallery-01.jpg",
      alt: "Portada del video",
      width: 800,
      height: 450,
    },
  },
] as const;
