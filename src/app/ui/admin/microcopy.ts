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
  enrollments: {
    title: "Inscripciones",
    filterLabel: "Filtrar inscripciones",
    filters: {
      status: "Estado",
      month: "Mes",
      workshop: "Taller",
      anyWorkshop: "Todos los talleres",
      search: "Buscar",
      searchHint: "Número de pedido, nombre o email.",
      apply: "Filtrar",
    },
    columns: {
      number: "Pedido",
      student: "Alumno",
      workshop: "Taller",
      month: "Mes",
      turno: "Turno",
      status: "Estado",
      total: "Total",
      requestedOn: "Solicitado",
    },
    pagination: {
      label: "Paginación",
      previous: "Anterior",
      next: "Siguiente",
    },
    empty: {
      title: "No hay inscripciones para este filtro",
      message: "Probá con otro estado, mes o búsqueda.",
      action: "Ver pendientes",
    },
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
  imageField: {
    altLabel: "Texto alternativo",
    altHint: "Describí la imagen para quien no puede verla.",
    uploading: "Subiendo imagen…",
    previewAlt: "Vista previa de la imagen",
    errors: {
      "too-large": "La imagen es demasiado grande.",
      "unsupported-format": "Formato no admitido.",
      unavailable: "La subida de imágenes no está disponible por ahora.",
      failed: "No se pudo subir la imagen. Probá de nuevo.",
    },
  },
  teachers: {
    title: "Profesores",
    newTitle: "Nuevo profesor",
    editTitle: "Editar profesor",
    newAction: "Nuevo profesor",
    back: "Volver a profesores",
    filterLabel: "Mostrar profesores",
    filters: {
      activos: "Activos",
      archivados: "Archivados",
      todos: "Todos",
    },
    columns: { name: "Nombre", modality: "Modalidad", state: "Estado" },
    modality: { own: "Propia", third_party: "De terceros" },
    empty: {
      title: "Todavía no hay profesores",
      message: "Cargá el primero para poder asignarlo a una actividad.",
    },
    form: {
      name: "Nombre",
      bioLine: "Presentación breve",
      bioLineHint: "Se muestra en el sitio público.",
      phone: "Teléfono",
      email: "Correo electrónico",
      modality: "Modalidad",
      modalityPlaceholder: "Elegí una modalidad",
      save: "Guardar",
      cancel: "Cancelar",
      saveFailed: "Revisá los campos marcados e intentá de nuevo.",
    },
    state: {
      archive: "Archivar",
      reactivate: "Reactivar",
      archivedNotice: "Este profesor está archivado.",
      archivedHint:
        "No se puede elegir para actividades nuevas. Podés reactivarlo cuando quieras.",
      assignedWarning: (names: string) =>
        `Sigue asignado a: ${names}. Las asignaciones y los períodos existentes lo conservan.`,
    },
  },
  workshops: {
    title: "Talleres",
    newTitle: "Nuevo taller",
    editTitle: "Editar taller",
    newAction: "Nuevo taller",
    filterLabel: "Mostrar talleres",
    filters: {
      vigentes: "Vigentes",
      borradores: "Borradores",
      publicados: "Publicados",
      pausados: "Pausados",
      archivados: "Archivados",
    },
    columns: {
      name: "Nombre",
      teacher: "Profesor",
      state: "Estado",
      turnos: "Turnos activos",
    },
    noTeacher: "Sin profesor",
    turnos: {
      manage: "Administrar turnos",
      title: (workshop: string) => `Turnos de ${workshop}`,
      back: "Volver al taller",
      listLabel: "Turnos del taller",
      columns: {
        label: "Turno",
        day: "Día",
        range: "Horario",
        capacity: "Capacidad",
        state: "Estado",
        actions: "Acciones",
      },
      empty: {
        title: "Todavía no hay turnos",
        message:
          "Cargá el primero. Un taller necesita al menos un turno activo para publicarse.",
      },
      retired: "Retirado",
      edit: "Editar",
      retire: "Retirar",
      reactivate: "Reactivar",
      delete: "Eliminar",
      rowName: (action: string, label: string) => `${action} ${label}`,
      confirmDelete: {
        title: "¿Eliminar el turno?",
        message:
          "Se elimina para siempre. Ningún mes lo usó todavía, por eso se puede borrar.",
      },
      form: {
        addTitle: "Agregar turno",
        editTitle: "Editar turno",
        label: "Nombre del turno",
        labelHint: "Por ejemplo: Mañana, Tarde o Noche.",
        weekday: "Día de la semana",
        startsAt: "Desde",
        endsAt: "Hasta",
        defaultCapacity: "Capacidad por defecto",
        defaultCapacityHint:
          "Cupos para los meses nuevos. Cambiarla no modifica los meses que ya abriste.",
        save: "Guardar turno",
        cancelEdit: "Cancelar edición",
        saveFailed: "Revisá los campos marcados e intentá de nuevo.",
      },
    },
    empty: {
      title: "Todavía no hay talleres",
      message: "Creá el primero para empezar a armar el calendario.",
    },
    form: {
      name: "Nombre",
      slug: "Enlace",
      slugHint:
        "Letras minúsculas, números y guiones. Si lo dejás vacío se arma con el nombre.",
      confirmSlugChange:
        "Entiendo que cambiar el enlace de un taller publicado rompe su dirección actual",
      summary: "Resumen",
      summaryHint: "Una frase para las tarjetas del sitio.",
      description: "Descripción",
      technique: "Técnica",
      defaultFee: "Arancel mensual (en pesos)",
      defaultFeeHint:
        "Solo pesos enteros, sin puntos ni centavos. Ejemplo: 12000.",
      teacher: "Profesor",
      teacherPlaceholder: "Sin profesor",
      percentage: "Porcentaje acordado",
      percentageHint:
        "Solo para profesores de terceros, de 0 a 100 con hasta dos decimales. Ejemplo: 35,5.",
      save: "Guardar",
      cancel: "Cancelar",
      saveFailed: "Revisá los campos marcados e intentá de nuevo.",
    },
    state: {
      status: "Estado",
      turnos: (count: number) =>
        count === 1 ? "1 turno activo" : `${String(count)} turnos activos`,
      publish: "Publicar",
      resume: "Volver a publicar",
      pause: "Pausar",
      archive: "Archivar",
      restore: "Restaurar como borrador",
      delete: "Eliminar borrador",
      confirm: {
        pause: {
          title: "¿Pausar el taller?",
          message:
            "Sigue visible, pero deja de aceptar nuevas solicitudes hasta que lo vuelvas a publicar.",
        },
        archive: {
          title: "¿Archivar el taller?",
          message:
            "Deja de verse en el sitio. Sus turnos, períodos e historial se conservan y podés restaurarlo.",
        },
        delete: {
          title: "¿Eliminar el borrador?",
          message:
            "Se elimina para siempre junto con sus turnos. No se puede deshacer.",
        },
      },
    },
  },
  intensives: {
    title: "Intensivos",
    newTitle: "Nuevo intensivo",
    editTitle: "Editar intensivo",
    newAction: "Nuevo intensivo",
    audit: {
      title: "Última actualización",
      by: "Actualizado por",
      at: "Fecha y hora",
    },
    filterLabel: "Mostrar intensivos",
    filters: {
      vigentes: "Vigentes",
      borradores: "Borradores",
      publicados: "Publicados",
      pausados: "Pausados",
      cancelados: "Cancelados",
      archivados: "Archivados",
    },
    columns: {
      name: "Nombre",
      teacher: "Profesor",
      date: "Fecha y horario",
      state: "Estado",
      capacity: "Capacidad",
    },
    noTeacher: "Sin profesor",
    empty: {
      title: "Todavía no hay intensivos",
      message: "Creá el primero para empezar a organizar actividades.",
    },
    state: {
      status: "Estado",
      publish: "Publicar",
      resume: "Volver a publicar",
      pause: "Pausar",
      cancel: "Cancelar intensivo",
      archive: "Archivar",
      restore: "Restaurar como borrador",
      delete: "Eliminar borrador",
      reschedule: "Reprogramar",
      confirm: {
        pause: {
          title: "¿Pausar el intensivo?",
          message:
            "Sigue visible, pero deja de aceptar nuevas solicitudes hasta que lo vuelvas a publicar.",
        },
        cancel: {
          title: "¿Cancelar el intensivo?",
          message:
            "Se cancela y no acepta nuevas solicitudes. El historial se conserva y no se puede deshacer.",
        },
        archive: {
          title: "¿Archivar el intensivo?",
          message:
            "Deja de verse en el sitio. Sus datos se conservan y podés restaurarlo.",
        },
        delete: {
          title: "¿Eliminar el borrador?",
          message: "Se elimina para siempre. No se puede deshacer.",
        },
      },
    },
    form: {
      name: "Nombre",
      slug: "Enlace",
      summary: "Resumen",
      description: "Descripción",
      teacher: "Profesor",
      teacherPlaceholder: "Sin profesor",
      percentage: "Porcentaje acordado",
      eventDate: "Fecha",
      startsAt: "Desde",
      endsAt: "Hasta",
      price: "Precio (en pesos)",
      deposit: "Seña fija (en pesos)",
      capacity: "Capacidad",
      minSeats: "Cupos mínimos",
      policyText: "Política de cancelación y ausencias",
      materialsIncluded: "Incluye materiales",
      images: "Imagen",
      save: "Guardar",
      cancel: "Cancelar",
      saveFailed: "Revisá los campos marcados e intentá de nuevo.",
    },
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
