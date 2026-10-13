export const imageFixture = {
  src: "/media/stand-ins/hero-1.svg",
  alt: "Composición abstracta en tonos cálidos",
  width: 800,
  height: 600,
} as const;

export const decorativeImageFixture = {
  src: "/media/stand-ins/hero-2.svg",
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
  date: "2026-11-14",
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
    src: "/media/stand-ins/hero-2.svg",
    alt: "Textura abstracta",
  },
  {
    ...imageFixture,
    src: "/media/stand-ins/hero-3.svg",
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
