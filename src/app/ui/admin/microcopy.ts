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
} as const;
