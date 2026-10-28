/**
 * Admin primitive strings (es-AR, voseo). F0a extends this file with the
 * layout and navigation copy; the same copy rule scans both.
 */
function materialAvailability(active: boolean, available: boolean): string {
  const state = active ? "activo" : "inactivo";
  const availability = available ? "disponible" : "no disponible";
  return `${state}, ${availability}`;
}

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
    consolidationLink: "Materiales a pedir",
    consolidation: {
      title: (month: string) => `Materiales a pedir: ${month}`,
      month: "Mes",
      apply: "Ver mes",
      pending: (count: number) =>
        count === 1
          ? "1 pedido a confirmar (no entra en los totales)."
          : `${String(count)} pedidos a confirmar (no entran en los totales).`,
      requested: (count: number) =>
        count === 1
          ? "Se marcó 1 pedido como solicitado."
          : `Se marcaron ${String(count)} pedidos como solicitados.`,
      columns: { material: "Material", quantity: "Cantidad", total: "Total" },
      supplierTotal: "Total del proveedor",
      grandTotal: "Total general",
      summaryLabel: (supplier: string) => `Resumen para ${supplier}`,
      copy: "Copiar resumen",
      copied: "Resumen copiado.",
      markRequested: "Marcar como solicitado",
      empty: "No hay materiales para pedir este mes",
    },
    detail: {
      title: (number: string) => `Pedido ${number}`,
      back: "Volver a inscripciones",
      student: "Alumno",
      name: "Nombre",
      email: "Email",
      phone: "Teléfono",
      order: "Pedido",
      workshop: "Taller",
      month: "Mes",
      turno: "Turno",
      requestedAt: "Solicitado",
      policyVersion: "Política aceptada",
      seat: (confirmed: number, capacity: number) =>
        `${String(confirmed)} de ${String(capacity)} lugares confirmados`,
      lines: "Materiales",
      noLines: "Sin materiales",
      lineColumns: {
        material: "Material",
        supplier: "Proveedor",
        quantity: "Cantidad",
        unitPrice: "Precio unitario",
        total: "Total",
      },
      totals: {
        fee: "Cuota",
        materials: "Materiales",
        total: "Total",
      },
      payment: {
        title: "Cobro",
        paidOn: "Fecha de pago",
        amount: "Monto",
        confirmedBy: "Confirmado por",
        note: "Nota",
      },
      audit: {
        title: "Historial",
        at: "Fecha",
        actor: "Quién",
        from: "De",
        to: "A",
        note: "Nota",
        creation: "Alta",
      },
      confirm: {
        title: "Confirmar cobro",
        amount: "Monto cobrado",
        amountHint: (total: string) =>
          `Tiene que ser igual al total del pedido (${total}), en pesos enteros.`,
        paidOn: "Fecha de pago",
        note: "Nota (opcional)",
        submit: "Confirmar cobro",
      },
      cancel: {
        title: "Cancelar pedido",
        reason: "Motivo",
        reasonHint: "Entre 3 y 300 caracteres.",
        submit: "Cancelar pedido",
        dialogTitle: "¿Cancelar este pedido?",
        dialogMessage:
          "Si el pedido ya estaba cobrado, se libera el lugar del turno. Esto no se puede deshacer.",
      },
      materials: {
        requested: "Marcar como solicitado",
        received: "Marcar como recibido",
      },
    },
  },
  students: {
    title: "Alumnas",
    filterLabel: "Filtrar alumnas",
    filters: {
      search: "Buscar",
      searchHint: "Nombre, email o teléfono.",
      workshop: "Taller",
      anyWorkshop: "Todos los talleres",
      status: "Estado de la inscripción",
      anyStatus: "Cualquier estado",
      apply: "Filtrar",
    },
    columns: {
      name: "Alumna",
      email: "Email",
      phone: "Teléfono",
      workshops: "Talleres",
      orders: "Pedidos",
      lastRequest: "Última solicitud",
    },
    pagination: {
      label: "Paginación",
      previous: "Anterior",
      next: "Siguiente",
    },
    empty: {
      title: "No hay alumnas para este filtro",
      message: "Probá con otra búsqueda, taller o estado.",
      action: "Ver todas",
    },
    detail: {
      back: "Volver a alumnas",
      personal: "Datos",
      name: "Nombre",
      email: "Email",
      phone: "Teléfono",
      activities: {
        title: "Talleres e intensivos",
        empty: "Todavía no tiene inscripciones vigentes.",
        columns: {
          workshop: "Taller",
          month: "Mes",
          turno: "Turno",
          status: "Estado",
        },
      },
      orders: {
        title: "Historial de pedidos y pagos",
        columns: {
          number: "Pedido",
          workshop: "Taller",
          month: "Mes",
          status: "Estado",
          total: "Total",
          paidOn: "Cobrado el",
        },
        unpaid: "Sin cobrar",
        emptyAction: "Ver inscripciones",
      },
      notes: {
        title: "Observaciones",
        label: "Observaciones sobre la alumna",
        hint: "Las ves solo vos. Hasta 2000 caracteres.",
        save: "Guardar observaciones",
        tooLong: "Las observaciones no pueden pasar los 2000 caracteres.",
        updated: (by: string, at: string) => `Actualizadas por ${by} el ${at}.`,
      },
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
    intro: "Mirá cómo viene el mes y elegí qué querés administrar.",
    summaryTitle: (month: string) => `Resumen de ${month}`,
    areasTitle: "Secciones",
    cards: {
      occupancy: {
        label: "Ocupación",
        value: (percent: number) => `${String(percent)} %`,
        detail: (confirmed: number, capacity: number, free: number) =>
          `${String(confirmed)} inscriptas de ${String(capacity)} cupos, ${String(free)} libres.`,
        action: "Ver ocupación",
      },
      pending: {
        label: "Solicitudes pendientes",
        detail: (older: number) =>
          older === 0
            ? "Ninguna espera hace más de 48 horas."
            : `${String(older)} esperan hace más de 48 horas.`,
        action: "Revisar solicitudes",
      },
      confirmed: {
        label: "Confirmadas este mes",
        detail: "Pagos registrados durante el mes.",
        action: "Ver confirmadas",
      },
      income: {
        label: "Ingresos registrados",
        detail: (fee: string, materials: string) =>
          `Cuotas y señas ${fee}, materiales ${materials}.`,
        action: "Ver ingresos",
      },
      materials: {
        label: "Materiales a pedir",
        detail: (orders: number, units: number) =>
          `${String(units)} unidades en ${String(orders)} pedidos.`,
        action: "Armar el pedido a proveedores",
      },
    },
    alerts: {
      title: "Alertas pendientes",
      empty: "No hay alertas pendientes. Está todo al día.",
      overdue: (count: number) =>
        count === 1
          ? "Una solicitud espera confirmación hace más de 48 horas."
          : `${String(count)} solicitudes esperan confirmación hace más de 48 horas.`,
      overdueAction: "Revisar solicitudes",
      withoutPeriod: (name: string, month: string) =>
        `${name} no tiene inscripción abierta para ${month}.`,
      withoutPeriodAction: (name: string) => `Abrir inscripción de ${name}`,
      materials: (orders: number) =>
        orders === 1
          ? "Un pedido con materiales todavía sin pedir al proveedor."
          : `${String(orders)} pedidos con materiales todavía sin pedir al proveedor.`,
      materialsAction: "Ver materiales a pedir",
    },
  },
  statistics: {
    title: "Estadísticas",
    subtitle: (month: string) => `Datos de ${month}.`,
    month: "Mes",
    apply: "Ver mes",
    backToPanel: "Volver al panel",
    total: "Total",
    empty: {
      title: "Todavía no hay datos para este mes",
      message: "Probá con otro mes o revisá las inscripciones.",
      action: "Ver inscripciones",
    },
    occupancy: {
      title: "Ocupación",
      intro:
        "Inscriptas, cupos libres y porcentaje de ocupación por taller y turno.",
      columns: {
        workshop: "Taller",
        turno: "Turno",
        capacity: "Cupos",
        confirmed: "Inscriptas",
        free: "Libres",
        percent: "Ocupación",
      },
    },
    conversion: {
      title: "Conversión",
      intro:
        "Solicitudes recibidas, pendientes y confirmadas para detectar consultas sin concretar.",
      columns: {
        workshop: "Taller",
        received: "Recibidas",
        pending: "Pendientes",
        confirmed: "Confirmadas",
        cancelled: "Canceladas",
        percent: "Concretadas",
      },
    },
    income: {
      title: "Ingresos registrados",
      intro: "Cuotas, señas y materiales cobrados en el mes, por taller.",
      columns: {
        workshop: "Taller",
        orders: "Cobros",
        fee: "Cuotas y señas",
        materials: "Materiales",
        total: "Total",
      },
    },
    students: {
      title: "Alumnas",
      intro:
        "Participación y recurrencia de las alumnas con inscripción confirmada.",
      columns: {
        students: "Participantes",
        recurring: "También en otro mes",
        percent: "Recurrencia",
      },
      note: "Las asistencias, faltas y recuperaciones se suman cuando esté el control de asistencia.",
    },
    materials: {
      title: "Materiales",
      intro: "Pedidos por estado, taller, proyecto y proveedor.",
      columns: {
        status: "Estado",
        workshop: "Taller",
        project: "Proyecto",
        supplier: "Proveedor",
        orders: "Pedidos",
        units: "Unidades",
        amount: "Importe",
      },
    },
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
    periods: {
      manage: "Administrar períodos",
      title: (workshop: string) => `Períodos de ${workshop}`,
      back: "Volver al taller",
      listLabel: "Períodos del taller",
      statuses: {
        draft: "Borrador",
        open: "Abierto",
        closed: "Cerrado",
      },
      columns: {
        month: "Mes",
        status: "Estado",
        fee: "Arancel",
        capacity: "Cupos totales",
      },
      empty: {
        title: "Todavía no hay períodos",
        message: "Los períodos que abras se organizan acá.",
      },
      form: {
        title: "Abrir mes",
        period: "Mes",
        submit: "Abrir mes",
        saveFailed: "Revisá el mes para abrir el período.",
        conflict: "Ya existe un período para ese mes.",
      },
      detail: {
        title: (period: string) => `Período ${period}`,
        status: "Estado",
        fee: "Arancel mensual",
        materialsRequired: "Requiere materiales",
        yes: "Sí",
        no: "No",
        project: "Proyecto",
        projectTitle: "Título",
        projectDescription: "Descripción",
        capacities: "Cupos por turno",
        capacity: (label: string, amount: string) => `${label}: ${amount}`,
        history: "Historial del período",
        teacher: "Docente al abrir",
        modality: "Modalidad al abrir",
        modalities: { own: "Propia", third_party: "De terceros" },
        percentage: "Porcentaje al abrir",
        snapshotPercentage: "Porcentaje acordado",
        save: "Guardar cambios",
        publish: "Publicar período",
        close: "Cerrar período",
        delete: "Eliminar borrador",
        actions: "Acciones del período",
        confirm: {
          close: {
            title: "¿Cerrar el período?",
            message: "No vas a poder volver a editarlo.",
          },
          delete: {
            title: "¿Eliminar el borrador?",
            message: "Se elimina para siempre. No se puede deshacer.",
          },
        },
        periodClosed: "Este período está cerrado y no se puede editar.",
        capacityFloor: "No bajes el cupo debajo de los lugares confirmados.",
        updatedBy: "Actualizado por",
        updatedAt: "Última actualización",
        materials: "Materiales",
        historicalMaterials: "Materiales históricos",
        duplicateMaterial: "No repitas materiales en el período.",
        materialOption: (item: {
          name: string;
          active: boolean;
          available: boolean;
          historical: boolean;
        }) =>
          item.historical
            ? `${item.name} (histórico: ${materialAvailability(item.active, item.available)})`
            : item.name,
        images: "Imágenes históricas",
        notApplicable: "No corresponde",
        material: (item: {
          name: string;
          active: boolean;
          available: boolean;
        }) =>
          `${item.name} (${materialAvailability(item.active, item.available)})`,
      },
    },

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
  materials: {
    title: "Materiales",
    newAction: "Nuevo material",
    suppliersLink: "Proveedores",
    filterLabel: "Mostrar materiales",
    filters: {
      activos: "Activos",
      inactivos: "Inactivos",
      todos: "Todos",
    },
    refine: {
      label: "Filtrar materiales",
      category: "Categoría",
      allCategories: "Todas las categorías",
      supplier: "Proveedor",
      allSuppliers: "Todos los proveedores",
      apply: "Filtrar",
    },
    columns: {
      name: "Nombre",
      category: "Categoría",
      supplier: "Proveedor",
      variants: "Variantes",
      state: "Estado",
    },
    unavailable: "No disponible",
    empty: {
      title: "No hay materiales con estos filtros",
      message: "Probá con otros filtros o cargá un material nuevo.",
    },
  },
  materialDetail: {
    back: "Volver a materiales",
    edit: {
      title: "Editar material",
      save: "Guardar cambios",
      saveFailed: "Revisá los campos marcados e intentá de nuevo.",
      variantRequired: "Agregá al menos una variante para guardar el material.",
      variantInUse:
        "No se pudo guardar porque una variante usada no puede eliminarse. Conservá las variantes existentes e intentá de nuevo.",
    },
    category: "Categoría",
    state: "Estado",
    availability: "Disponibilidad",
    available: "Disponible",
    unavailable: "No disponible",
    supplier: "Proveedor",
    noSupplier: "Sin proveedor",
    image: "Imagen",
    imageUnavailable: "La imagen ya no está disponible.",
    variants: "Variantes",
    price: (value: string) => `$${value}`,
    used: "Usada",
    swatch: "Muestra de color",
    audit: {
      title: "Última actualización",
      by: "Actualizado por",
      at: "Fecha y hora",
    },
    lifecycle: {
      title: "Acciones",
      deactivate: "Desactivar",
      reactivate: "Reactivar",
      failed: "No se pudo actualizar el estado del material. Probá de nuevo.",
      confirmDeactivate: {
        title: "¿Desactivar este material?",
        message:
          "Deja de estar disponible para materiales nuevos. Podés reactivarlo cuando quieras.",
      },
      confirmReactivate: {
        title: "¿Reactivar este material?",
        message: "Vuelve a estar disponible según sus variantes activas.",
      },
    },
  },
  materialForm: {
    name: "Nombre",
    description: "Descripción",
    category: "Categoría",
    supplier: "Proveedor",
    supplierPlaceholder: "Elegí un proveedor",
    available: "Disponible",
    image: "Imagen",
    variant: "Variante",
    price: "Precio (en pesos)",
    priceHint: "Solo números, por ejemplo 12500 o 12.500.",
    useSwatch: "Usar color de muestra",
    color: "Color",
    variantAvailable: "Disponible para pedir",
    addVariant: "Agregar variante",
    moveVariantUp: "Subir variante",
    moveVariantDown: "Bajar variante",
    removeVariant: "Quitar variante",
    cancel: "Cancelar",
    saveFailed: "Revisá los campos marcados e intentá de nuevo.",
  },
  suppliers: {
    title: "Proveedores",
    newTitle: "Nuevo proveedor",
    editTitle: "Editar proveedor",
    newAction: "Nuevo proveedor",
    back: "Volver a materiales",
    filterLabel: "Mostrar proveedores",
    filters: {
      activos: "Activos",
      archivados: "Archivados",
      todos: "Todos",
    },
    columns: { name: "Nombre", phone: "Teléfono", state: "Estado" },
    noPhone: "Sin teléfono",
    empty: {
      title: "Todavía no hay proveedores",
      message: "Cargá el primero para poder asignarlo a un material.",
    },
    form: {
      name: "Nombre",
      phone: "Teléfono",
      email: "Correo electrónico",
      notes: "Notas",
      notesHint: "Solo las ve el equipo.",
      save: "Guardar",
      cancel: "Cancelar",
      saveFailed: "Revisá los campos marcados e intentá de nuevo.",
    },
    state: {
      archive: "Archivar",
      reactivate: "Reactivar",
      archivedNotice: "Este proveedor está archivado.",
      archivedHint:
        "No se puede elegir para materiales nuevos. Los materiales que ya lo tienen lo siguen mostrando. Podés reactivarlo cuando quieras.",
    },
  },
  privateEvents: {
    title: "Eventos privados",
    filterLabel: "Filtrar consultas",
    filters: { status: "Estado", all: "Todas", apply: "Filtrar" },
    status: {
      nueva: "Nueva",
      contactada: "Contactada",
      cerrada: "Cerrada",
    },
    columns: {
      received: "Recibida",
      name: "Nombre",
      date: "Fecha deseada",
      place: "Lugar o tipo de evento",
      participants: "Personas",
      status: "Estado",
    },
    empty: {
      title: "Todavía no hay consultas",
      message:
        "Cuando alguien consulte por un evento privado, la vas a ver acá.",
      action: "Ver todas las consultas",
    },
    detailTitle: "Consulta de evento privado",
    back: "Volver a las consultas",
    fields: {
      received: "Recibida",
      name: "Nombre",
      phone: "Teléfono",
      email: "Correo electrónico",
      date: "Fecha deseada",
      place: "Lugar o tipo de evento",
      participants: "Cantidad de personas",
      notes: "Observaciones",
      statusChanged: "Último cambio de estado",
    },
    noEmail: "No dejó correo",
    noNotes: "Sin observaciones",
    whatsapp: "Escribirle por WhatsApp",
    statusForm: {
      label: "Estado de la consulta",
      field: "Estado",
      save: "Guardar estado",
      failed: "Elegí un estado de la lista e intentá de nuevo.",
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
