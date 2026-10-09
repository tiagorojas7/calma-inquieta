export const microcopy = {
  openMenu: "Abrir menú",
  closeMenu: "Cerrar menú",
  close: "Cerrar",
  previous: "Anterior",
  next: "Siguiente",
  skipToContent: "Saltar al contenido",
  opensInNewTab: "(se abre en una pestaña nueva)",
  playVideo: (title: string) => `Reproducir video: ${title}`,
  directions: "Cómo llegar",
  writeUs: "Escribinos",
  whatsappSuffix: " por WhatsApp",
  followInstagram: "Seguinos en Instagram",
  notFound: {
    title: "Página no encontrada",
    message: "La página que buscás no existe.",
  },
  serverError: {
    title: "Algo salió mal",
    message: "Probá de nuevo más tarde.",
  },
} as const;
