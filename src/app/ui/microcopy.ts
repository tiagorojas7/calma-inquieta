export const microcopy = {
  openMenu: "Abrir menú",
  closeMenu: "Cerrar menú",
  close: "Cerrar",
  previous: "Anterior",
  next: "Siguiente",
  skipToContent: "Saltar al contenido",
  opensInNewTab: "(se abre en una pestaña nueva)",
  playVideo: (title: string) => `Reproducir video: ${title}`,
  pauseAnimation: "Pausar animación",
  playAnimation: "Reproducir animación",
  directions: "Cómo llegar",
  gallery: "Galería",
  bookingSummary: "Resumen",
  balanceLabel: "Saldo restante",
  writeUs: "Escribinos",
  whatsappSuffix: " por WhatsApp",
  followInstagram: "Seguinos en Instagram",
  /** Decorative signpost above the closing band heading. */
  closingBandEyebrow: "Hay un lugar para vos",
  /** Decorative signpost above the Quiénes somos heading. */
  aboutEyebrow: "Nuestra historia",
  notFound: {
    title: "Página no encontrada",
    message: "La página que buscás no existe.",
  },
  serverError: {
    title: "Algo salió mal",
    message: "Probá de nuevo más tarde.",
  },
} as const;
