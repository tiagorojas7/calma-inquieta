/**
 * Admin primitive strings (es-AR, voseo). F0a extends this file with the
 * layout and navigation copy; the same copy rule scans both.
 */
export const adminMicrocopy = {
  status: {
    draft: "Borrador",
    published: "Publicado",
    paused: "Pausado",
    cancelled: "Cancelado",
    archived: "Archivado",
    active: "Activo",
  },
  confirm: {
    cancel: "Cancelar",
  },
  rowEditor: {
    moveUp: "Subir",
    moveDown: "Bajar",
    remove: "Quitar",
    rowName: (action: string, position: number) =>
      `${action} fila ${String(position)}`,
  },
  shell: {
    brand: "Calma Inquieta",
    panel: "Panel de administración",
    sections: "Secciones",
    mobileSections: "Menú de secciones",
    openMenu: "Abrir menú",
    closeMenu: "Cerrar menú",
    signedInAs: "Sesión iniciada como",
    signOut: "Salir",
  },
  landing: {
    title: "Panel de administración",
    greeting: (email: string) => `Hola, ${email}`,
    intro: "Elegí qué querés administrar.",
  },
  denied: {
    title: "No tenés acceso al panel",
    signedInAs: (email: string) => `Iniciaste sesión como ${email}.`,
    help: "Si creés que es un error, pedile acceso a quien administra el panel.",
    backToSite: "Ir al sitio",
  },
  errors: {
    generic: {
      title: "Algo salió mal",
      message: "Probá de nuevo en unos minutos.",
    },
    unavailable: {
      title: "Esta sección está en construcción",
      message: "Todavía no está disponible. Volvé más tarde.",
    },
    backToPanel: "Volver al panel",
  },
} as const;
