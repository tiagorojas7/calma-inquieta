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
    panel: "Panel",
    filterLabel: "Filtrar inscripciones",
    filterToggle: "Filtros",
    clearFilters: "Quitar filtros",
    activeFiltersLabel: "Filtros activos",
    chips: {
      month: (value: string) => `Mes: ${value}`,
      workshop: (name: string) => `Taller: ${name}`,
      search: (value: string) => `Búsqueda: ${value}`,
    },
    resultCount: (count: number) =>
      count === 1
        ? "1 inscripción en esta página"
        : `${String(count)} inscripciones en esta página`,
    requestedOn: (date: string) => `Solicitado el ${date}`,
    viewDetail: "Ver detalle",
    viewDetailOf: (number: string) => `Ver detalle del pedido ${number}`,
    tabs: {
      label: "Estados de inscripciones",
      "por-cobrar": "Por cobrar",
      pagadas: "Pagadas",
      canceladas: "Canceladas",
    },
    card: {
      markPaid: "Marcar pagado",
      otherAmount: "Otro monto",
      amount: "Monto cobrado",
      paidOn: "Fecha de pago",
      note: "Nota (opcional)",
      saveOther: "Registrar este pago",
      cancel: "Cancelar",
      reason: "Motivo",
      reasonHint: "Entre 3 y 300 caracteres.",
      cancelSubmit: "Cancelar inscripción",
      detailAndContact: "Ver detalle y contacto",
      detailAndContactOf: (number: string) =>
        `Ver detalle y contacto del pedido ${number}`,
    },
    feedback: {
      paid: (name: string | null) =>
        name === null ? "Pago registrado" : `Pago de ${name} registrado`,
      cancelled: (name: string | null) =>
        name === null
          ? "Inscripción cancelada"
          : `Inscripción de ${name} cancelada`,
    },
    filters: {
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
      "por-cobrar": {
        title: "No hay inscripciones por cobrar",
        message: "Cuando alguien se inscriba, aparece acá para cobrarla.",
      },
      pagadas: {
        title: "No hay inscripciones pagadas",
        message: "Probá con otro mes, taller o búsqueda.",
      },
      canceladas: {
        title: "No hay inscripciones canceladas",
        message: "Probá con otro mes, taller o búsqueda.",
      },
      action: "Ver por cobrar",
    },
    consolidationLink: "Materiales a pedir",
    consolidation: {
      title: (month: string) => `Materiales a pedir: ${month}`,
      workflowLabel: "Pasos del pedido",
      quantity: (count: number) => `Cantidad: ${String(count)}`,
      consequence: (count: number) =>
        count === 1
          ? "Marca 1 pedido cobrado como solicitado al proveedor. Después lo marcás como recibido cuando llegue."
          : `Marca ${String(count)} pedidos cobrados como solicitados al proveedor. Después los marcás como recibidos cuando lleguen.`,
      afterRequested:
        "Siguiente: cuando lleguen los materiales, marcá cada pedido como recibido.",
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
      summary: "Resumen",
      moreData: "Más datos del pedido",
      dangerTitle: "Zona de riesgo",
      nextStepTitle: "Próximo paso",
      progressLabel: "Avance del pedido",
      steps: {
        confirm: "Confirmar cobro",
        request: "Solicitar materiales",
        receive: "Recibir materiales",
      },
      stepState: { done: "hecho", current: "ahora", todo: "después" },
      next: {
        pending_confirmation:
          "Siguiente paso: confirmar el cobro cuando recibas el pago.",
        paid: "Siguiente paso: pedir los materiales al proveedor.",
        paidNoMaterials: "No hay materiales para pedir. El pedido está al día.",
        materials_requested:
          "Siguiente paso: marcar como recibido cuando lleguen los materiales.",
        materials_received: "Pedido completo. No queda nada por hacer.",
        cancelled: "Este pedido está cancelado y ya no admite cambios.",
      },
      feedback: {
        confirmed: "Cobro confirmado",
        cancelled: "Pedido cancelado",
        "materials-requested": "Materiales marcados como solicitados",
        "materials-received": "Materiales marcados como recibidos",
      },
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
  reminders: {
    title: "Recordatorios",
    intro:
      "Elegí el mensaje y a quiénes va. Cada alumna tiene su enlace de WhatsApp con el texto ya escrito: lo abrís y lo enviás vos. Los emails automáticos (inscripción, pago, clase y cuota) salen solos cuando están activados.",
    emailStatus: {
      on: "Emails automáticos: activados",
      off: "Emails automáticos: desactivados (falta configurar el dominio)",
    },
    formLabel: "Preparar mensajes",
    fields: {
      message: "Mensaje",
      when: "Cuándo",
      whenHint:
        "Para clase e intensivo. Por ejemplo: mañana, el martes 4 o este sábado.",
      activity: "Nombre del intensivo",
      activityHint: "Solo para el recordatorio de intensivo.",
      text: "Texto del aviso",
      textHint:
        "Solo para el aviso libre. Se agrega después del saludo con el nombre.",
    },
    audience: {
      workshop: "Taller",
      anyWorkshop: "Todos los talleres",
      period: "Mes",
      anyPeriod: "Todos los meses",
      turno: "Turno",
      anyTurno: "Todos los turnos",
      status: "Estado de la inscripción",
      anyStatus: "Según el mensaje",
      statusHint:
        "Sin elegir, la cuota pendiente va a quienes tienen la inscripción por confirmar y el resto a quienes no cancelaron.",
    },
    steps: {
      message: "1. Qué querés avisar",
      audience: "2. A quiénes (opcional)",
    },
    submit: "Preparar mensajes",
    preview: "Vista previa",
    count: (students: number, withoutPhone: number) =>
      `${String(students)} ${students === 1 ? "alumna" : "alumnas"}${
        withoutPhone > 0 ? `, ${String(withoutPhone)} sin teléfono válido` : ""
      }.`,
    columns: { student: "Alumna", message: "Mensaje", actions: "Acciones" },
    send: (name: string) => `Enviar por WhatsApp a ${name}`,
    sendLabel: "Enviar por WhatsApp",
    noPhone: "Sin teléfono válido",
    copy: "Copiar mensaje",
    copyFor: (name: string) => `Copiar mensaje de ${name}`,
    copied: "Mensaje copiado.",
    empty: {
      title: "No hay alumnas para este filtro",
      message: "Probá con otro taller, mes, turno o estado.",
      action: "Volver a empezar",
    },
    errors: {
      when: {
        required: "Escribí cuándo es.",
        "too-long": "Cuándo puede tener hasta 60 caracteres.",
      },
      activity: {
        required: "Escribí el nombre del intensivo.",
        "too-long": "El nombre puede tener hasta 80 caracteres.",
      },
      text: {
        required: "Escribí el texto del aviso.",
        "too-long": "El aviso puede tener hasta 800 caracteres.",
      },
    },
    kinds: {
      class: "Recordatorio de clase",
      fee: "Cuota pendiente",
      materials: "Materiales listos",
      intensive: "Reserva de intensivo",
      notice: "Aviso libre",
    },
  },
  students: {
    title: "Alumnas",
    filterLabel: "Filtrar alumnas",
    count: (n: number) => (n === 1 ? "1 alumna" : `${String(n)} alumnas`),
    cardLabels: { email: "Email", phone: "Teléfono", orders: "Pedidos" },
    filters: {
      summary: "Buscar y filtrar",
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
      feedback: { "note-saved": "Observaciones guardadas" },
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
    more: "Más",
  },
  landing: {
    title: "Panel de administración",
    greeting: (email: string) => `Hola, ${email}`,
    intro: "Mirá cómo viene el mes y elegí qué querés administrar.",
    summaryTitle: (month: string) => `Resumen de ${month}`,
    areasTitle: "Secciones",
    areaHints: {
      "/admin/talleres": "Publicá talleres, turnos y abrí las inscripciones.",
      "/admin/intensivos": "Encuentros únicos con fecha y reservas.",
      "/admin/profesores": "Quiénes dan las clases y sus liquidaciones.",
      "/admin/materiales/proveedores": "A quién le pedís cada material.",
      "/admin/inscripciones": "Solicitudes, cobros y materiales a pedir.",
      "/admin/alumnas": "Datos, pedidos y observaciones de cada alumna.",
      "/admin/asistencia": "Planilla de cada clase y recuperaciones.",
      "/admin/inscripciones/materiales": "Qué pedir y qué entregar.",
      "/admin/materiales": "Lista de materiales que ofrecés.",
      "/admin/eventos": "Consultas para eventos privados.",
      "/admin/estadisticas": "Ocupación e ingresos mes a mes.",
      "/admin/recordatorios": "Mensajes de WhatsApp listos para enviar.",
    } as Record<string, string>,
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
    teachers: {
      title: "Profesores",
      intro:
        "Alumnas vinculadas, ingresos asociados y liquidación estimada según porcentaje.",
      columns: {
        teacher: "Profesor",
        modality: "Modalidad",
        percentage: "Porcentaje",
        students: "Alumnas vinculadas",
        income: "Ingresos asociados",
        estimate: "Importe estimado a liquidar",
      },
      noPercentage: "Sin porcentaje",
      note: "El importe es el porcentaje acordado de cada período sobre las cuotas cobradas en el mes, sin materiales. Los profesores de modalidad propia no tienen porcentaje acordado, por eso no suman importe. Las señas de los intensivos se suman cuando se registren.",
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
    signOut: "Cerrar sesión y usar otra cuenta",
    requestAccess: "Pedir acceso por WhatsApp",
    whatsappMessage: (email: string | null) =>
      email === null
        ? "Hola, necesito acceso al panel de Calma Inquieta."
        : `Hola, necesito acceso al panel de Calma Inquieta con la cuenta ${email}.`,
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
    settlement: {
      title: "Importe estimado a liquidar",
      intro: (month: string) =>
        `Cuotas cobradas en ${month} de las actividades a cargo de este profesor, sin materiales.`,
      month: "Mes",
      apply: "Ver mes",
      none: "Este mes no tiene actividades a cargo de este profesor.",
      modality: "Modalidad",
      percentage: "Porcentaje acordado",
      activities: "Actividades",
      students: "Alumnas vinculadas",
      income: "Ingresos asociados",
      estimate: "Importe estimado a liquidar",
      noPercentage: "Sin porcentaje",
      ownNote:
        "La modalidad propia no tiene porcentaje acordado, así que no se calcula un importe.",
    },
    state: {
      archive: "Archivar",
      reactivate: "Reactivar",
      archivedNotice: "Este profesor está archivado.",
      archivedHint:
        "No se puede elegir para actividades nuevas. Podés reactivarlo cuando quieras.",
      assignedWarning: (names: string) =>
        `Sigue asignado a: ${names}. Las asignaciones y los períodos existentes lo conservan.`,
      dangerTitle: "Zona de riesgo",
      archiveTitle: "¿Archivar este profesor?",
      archiveMessage:
        "No se va a poder elegir para actividades nuevas. Las asignaciones y los períodos existentes lo conservan, y podés reactivarlo cuando quieras.",
    },
    feedback: {
      created: { title: "Profesor creado" },
      saved: { title: "Cambios guardados" },
      archived: { title: "Profesor archivado" },
      restored: { title: "Profesor reactivado" },
    },
    modalityHint:
      "Propia: no hay porcentaje acordado y no se calcula un importe. De terceros: la liquidación usa el porcentaje acordado de cada período.",
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
    backToList: "Volver a talleres",
    enrollment: "Inscripciones",
    feedback: {
      created: {
        title: "Taller guardado como borrador",
        message: "Todavía no se ve en el sitio. Publicalo cuando esté listo.",
      },
      saved: { title: "Cambios guardados" },
      deleted: { title: "Borrador eliminado" },
      published: { title: "Taller publicado" },
      paused: { title: "Taller pausado" },
      archived: { title: "Taller archivado" },
      restored: { title: "Taller restaurado como borrador" },
      opened: {
        title: "Mes abierto",
        message: "Ya acepta inscripciones, con lo mismo del mes anterior.",
      },
      "published-open": {
        title: "Listo: taller publicado",
        message: "Las inscripciones del mes ya están abiertas.",
      },
    },
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
        title: "Abrir inscripciones",
        intro:
          "Al abrir un mes se crea con los cupos de tus turnos activos. Después elegís los materiales y lo publicás: recién ahí el sitio acepta inscripciones.",
        period: "Mes",
        hint: (months: string) =>
          months
            ? `Escribilo como AAAA-MM. Podés abrir: ${months}.`
            : "Escribilo como AAAA-MM, por ejemplo 2026-11.",
        submit: (month: string) =>
          month ? `Abrir inscripciones de ${month}` : "Abrir inscripciones",
        saveFailed: "Revisá el mes para abrir el período.",
        conflict: "Ya existe un período para ese mes.",
      },
      detail: {
        title: (period: string) => `Período ${period}`,
        backToMonths: "Volver a inscripciones del taller",
        feedback: {
          opened: "Mes abierto. Ahora definí cupos y materiales.",
          saved: "Cambios guardados",
          published: "Mes publicado: ya acepta inscripciones",
          closed: "Mes cerrado",
        },
        enrollment: {
          draft: {
            title: "Todavía no acepta inscripciones",
            message: (month: string, seats: number) =>
              `${month} está en borrador con ${String(seats)} cupos. Publicalo cuando los cupos y los materiales estén listos.`,
          },
          open: {
            title: "Acepta inscripciones",
            message: (month: string, seats: number) =>
              `${month} está publicado en el sitio con ${String(seats)} cupos.`,
          },
          closed: {
            title: "No acepta inscripciones",
            message: (month: string) => `${month} está cerrado.`,
          },
        },
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
      feedback: {
        added: "Turno agregado",
        updated: "Turno actualizado",
        retired: "Turno retirado",
        reactivated: "Turno reactivado",
        deleted: "Turno eliminado",
      },
      nextStep: (month: string) => `Siguiente: abrir inscripciones de ${month}`,
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
      photosTitle: "Fotos",
      photosHint:
        "Hasta 4 fotos. La primera es la que se ve en la tarjeta del taller.",
      photo: "Foto",
      morePhotos: "Agregar más fotos",
      save: "Guardar",
      cancel: "Cancelar",
      saveFailed: "Revisá los campos marcados e intentá de nuevo.",
    },
    quick: {
      sectionTurnos: "Turnos",
      turnosHint: "Completá los que ofrezcas. Las filas vacías se ignoran.",
      weekday: "Día",
      weekdayPlaceholder: "Elegí el día",
      startsAt: "Desde",
      endsAt: "Hasta",
      capacity: "Cupos",
      timeHint: "Formato 24 h, por ejemplo 10:00.",
      row: (index: number) => `Turno ${String(index)}`,
      moreTurnos: "+ otro turno",
      rowInvalid:
        "Revisá este turno: elegí el día, un horario válido (desde antes que hasta) y cupos de 1 a 500.",
      rowDuplicate: "Ya cargaste un turno con el mismo día y horario.",
      turnosRequired: "Agregá al menos un turno para poder publicar.",
      sectionMaterials: "Materiales (opcional)",
      materialsHint: "Marcá los materiales que las alumnas pueden sumar.",
      noMaterials: "Todavía no hay materiales en el catálogo.",
      percentageDetails: "Profesor de terceros: porcentaje acordado",
      percentageSummary: "Porcentaje (solo profesores de terceros)",
      publish: "Publicar y abrir inscripciones",
      saveDraft: "Guardar borrador",
      derivedNote:
        "El enlace se arma solo con el nombre. El resumen sale de la descripción.",
      techniqueDetails: "Más opciones",
    },
    failures: {
      turnos:
        "El taller quedó como borrador, pero no se pudieron guardar los turnos. Revisalos y volvé a intentar.",
      publish:
        "El taller quedó como borrador porque no se pudo publicar. Revisá los datos del taller.",
      month:
        "El taller está publicado, pero no se pudo abrir el mes. Abrilo desde la lista de meses.",
      materials:
        "El taller está publicado y el mes abierto, pero no se pudieron guardar los materiales. Elegilos en el mes.",
      enroll:
        "El mes quedó abierto en borrador y todavía no acepta inscripciones. Publicalo desde el mes.",
    },
    summaryLine: {
      draft: "Borrador. Todavía no se ve en el sitio.",
      noMonth: (month: string) =>
        `Publicado. Falta abrir las inscripciones de ${month}.`,
      open: (month: string) => `Publicado. Inscripciones abiertas en ${month}.`,
      monthDraft: (month: string) =>
        `Publicado. ${month} está en borrador y todavía no acepta inscripciones.`,
      paused: "Pausado. No acepta inscripciones nuevas.",
      archived: "Archivado.",
      noTurnos: "Falta agregar un turno.",
    },
    openMonth: (month: string) => `Abrir ${month}`,
    openedMonth: (month: string) => `Inscripciones abiertas en ${month}`,
    openFailed: "No se pudo abrir el mes. Entrá al taller para ver qué falta.",
    detailSections: {
      turnos: "Turnos",
      months: "Meses",
      edit: "Editar datos",
      manageTurnos: "Editar turnos",
      manageMonths: "Editar meses",
      noMonths: "Todavía no abriste ningún mes.",
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
    back: "Volver a intensivos",
    seats: (count: number) => `Lugares: ${String(count)}`,
    feedback: {
      created: { title: "Intensivo creado" },
      saved: { title: "Cambios guardados" },
      deleted: { title: "Borrador eliminado" },
      published: { title: "Intensivo publicado" },
      paused: { title: "Intensivo pausado" },
      cancelled: { title: "Intensivo cancelado" },
      archived: { title: "Intensivo archivado" },
      restored: { title: "Intensivo restaurado" },
      rescheduled: { title: "Fecha y horario actualizados" },
    },
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
    quick: {
      publish: "Publicar",
      saveDraft: "Guardar borrador",
      advanced: "Opciones avanzadas",
      advancedHint:
        "No hace falta tocar nada acá: ya vienen con valores de uso común.",
      defaultPolicy: "La seña asegura el lugar en el intensivo.",
      derivedNote:
        "El enlace se arma solo con el nombre. El resumen sale de la descripción.",
      percentageHint: "Solo si el profesor es de terceros.",
      minSeatsHint: "Por defecto 1.",
      policyHint: "Si lo dejás vacío se usa el texto estándar de la seña.",
      missingTitle: (missing: string) =>
        `El intensivo quedó como borrador porque falta: ${missing}.`,
      notPublished:
        "El intensivo quedó como borrador porque no se pudo publicar. Revisá los datos y probá de nuevo.",
    },
    statusLine: {
      draft: "Borrador. Todavía no se ve en el sitio.",
      published: "Publicado. Recibe solicitudes.",
      paused: "Pausado. No recibe solicitudes nuevas.",
      cancelled: "Cancelado. No recibe solicitudes.",
      archived: "Archivado. No se ve en el sitio.",
    },
    otherActions: {
      title: "Otras acciones",
      dangerTitle: "Cancelar, archivar o eliminar",
      rescheduleTitle: "Cambiar fecha y horario",
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
      sections: {
        basics: "Datos principales",
        schedule: "Fecha y horario",
        money: "Profesor y precio",
        conditions: "Cupos y condiciones",
        images: "Imágenes",
      },
      moreImages: "Agregar más imágenes",
      save: "Guardar",
      cancel: "Cancelar",
      saveFailed: "Revisá los campos marcados e intentá de nuevo.",
    },
  },
  materials: {
    title: "Materiales",
    newTitle: "Nuevo material",
    newAction: "Nuevo material",
    back: "Volver a materiales",
    variantCount: (count: number) =>
      `${String(count)} ${count === 1 ? "variante" : "variantes"}`,
    feedback: {
      created: { title: "Material creado" },
      saved: { title: "Cambios guardados" },
    },
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
    feedback: {
      saved: "Cambios guardados",
      deactivated: "Material desactivado",
      reactivated: "Material reactivado",
    },
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
      title: "Zona de riesgo",
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
    sectionBasics: "Datos del material",
    sectionImage: "Foto del material",
    variants: "Variantes",
    variantsHint:
      "Empezás con una variante. Agregá más solo si el material viene en distintas opciones.",
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
      dangerTitle: "Zona de riesgo",
      archiveTitle: "¿Archivar este proveedor?",
      archiveMessage:
        "No se va a poder elegir para materiales nuevos. Los materiales que ya lo tienen lo siguen mostrando y podés reactivarlo cuando quieras.",
    },
    feedback: {
      created: { title: "Proveedor creado" },
      saved: { title: "Cambios guardados" },
      archived: { title: "Proveedor archivado" },
      restored: { title: "Proveedor reactivado" },
    },
    backToList: "Volver a proveedores",
  },
  intensiveRequests: {
    title: "Reservas",
    feedback: {
      confirmed: "Seña registrada: el lugar quedó confirmado",
      cancelled: "Solicitud cancelada",
    },
    cancelStep: "Cancelar esta solicitud",
    cancelConsequence:
      "No se puede deshacer. Si estaba confirmada, libera el lugar.",
    link: "Ver reservas",
    back: "Volver al intensivo",
    summary: {
      date: "Fecha",
      deposit: "Seña",
      seats: "Lugares confirmados",
      minSeats: "Mínimo para realizarse",
    },
    seatsValue: "{confirmed} de {capacity}",
    groups: {
      pending_confirmation: "Pendientes de seña",
      confirmed: "Confirmadas",
      cancelled: "Canceladas",
    },
    empty: "No hay solicitudes en esta lista.",
    fields: {
      email: "Correo electrónico",
      phone: "Teléfono",
      received: "Recibida",
      reference: "Número de solicitud",
      paidAmount: "Seña registrada",
      paidOn: "Fecha de pago",
      note: "Nota del pago",
      confirmed: "Confirmada por",
      cancelReason: "Motivo de la cancelación",
      cancelled: "Cancelada por",
    },
    whatsapp: "Escribirle por WhatsApp",
    confirmForm: {
      label: "Registrar la seña",
      amount: "Seña cobrada",
      amountHint: "Tiene que ser la seña completa del intensivo.",
      paidOn: "Fecha del pago",
      note: "Nota (opcional)",
      submit: "Registrar seña y confirmar lugar",
    },
    cancelForm: {
      label: "Cancelar la solicitud",
      reason: "Motivo",
      reasonHint:
        "Entre 3 y 300 caracteres. Si estaba confirmada, libera el lugar.",
      submit: "Cancelar solicitud",
    },
    errors: {
      amount: "Ingresá la seña completa del intensivo, tal como figura arriba.",
      paidOn: "Elegí una fecha válida, de hoy hacia atrás.",
      note: "La nota puede tener hasta 500 caracteres.",
      reason: "Escribí un motivo de entre 3 y 300 caracteres.",
      full: "El intensivo ya tiene todos sus lugares confirmados.",
      notPending: "Esta solicitud ya no está pendiente.",
      alreadyCancelled: "Esta solicitud ya estaba cancelada.",
      failed: "No pudimos guardar el cambio. Probá de nuevo.",
    },
  },
  privateEvents: {
    title: "Eventos privados",
    filterLabel: "Filtrar consultas",
    count: (n: number) => (n === 1 ? "1 consulta" : `${String(n)} consultas`),
    cardLabels: {
      date: "Fecha deseada",
      people: "Personas",
      received: "Recibida",
    },
    feedback: { "status-saved": "Estado actualizado" },
    filters: {
      summary: "Filtrar por estado",
      status: "Estado",
      all: "Todas",
      apply: "Filtrar",
    },
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
  attendance: {
    title: "Asistencia",
    filterLabel: "Elegir clases",
    filters: {
      month: "Mes",
      workshop: "Taller",
      anyWorkshop: "Todos los talleres",
      apply: "Ver turnos",
    },
    columns: {
      workshop: "Taller",
      turno: "Turno",
      schedule: "Día y horario",
      sessions: "Clases",
    },
    openSessions: "Ver clases",
    openSessionsFor: (turno: string) => `Ver clases de ${turno}`,
    classesCrumb: "Clases",
    cardLabels: {
      turno: "Turno",
      schedule: "Día y horario",
      sessions: "Clases",
    },
    makeUpsLink: "Ver recuperaciones",
    empty: {
      title: "No hay turnos para este filtro",
      message: "Probá con otro mes o taller.",
      action: "Ver todos",
    },
    sessions: {
      back: "Volver a asistencia",
      caption: "Clases del turno",
      columns: {
        date: "Fecha",
        marked: "Registradas",
        present: "Presentes",
        absent: "Ausentes",
      },
      open: "Registrar asistencia",
      openFor: (date: string) => `Registrar asistencia: ${date}`,
      empty: {
        title: "Este mes no tiene clases",
        message: "El turno no tiene fechas dentro del mes.",
        action: "Volver a asistencia",
      },
    },
    sheet: {
      back: "Volver a las clases",
      formLabel: "Asistencia de la clase",
      caption: "Alumnas de la clase",
      columns: {
        student: "Alumna",
        fee: "Cuota",
        attendance: "Asistencia",
      },
      feePaid: "Cuota pagada",
      feePending: "Cuota pendiente",
      present: "Presente",
      absent: "Ausente",
      pendingNote:
        "Las alumnas con la cuota pendiente se pueden marcar cuando confirmes el pago.",
      save: "Guardar asistencia",
      saved: "Asistencia guardada.",
      makeUpScheduled: "Recuperación programada.",
      invalid:
        "No pudimos guardar la asistencia. Revisá los datos e intentá de nuevo.",
      empty: {
        title: "Todavía no hay alumnas en este turno",
        message: "Cuando haya inscripciones pagas, las vas a ver acá.",
        action: "Volver a las clases",
      },
    },
    makeUp: {
      title: "Recuperaciones de esta clase",
      none: "No hay alumnas ausentes en esta clase.",
      schedule: "Programar recuperación",
      turno: "Turno de la recuperación",
      date: "Fecha de la recuperación",
      dateHint: "Tiene que ser el día de la semana del turno elegido.",
      submit: "Programar recuperación",
      pending: "Recuperación pendiente",
      done: "Recuperación realizada",
      errors: {
        makeUpDate: "Elegí una fecha que sea el día de la semana del turno.",
        makeUpTurno: "Elegí un turno de la lista.",
        student:
          "Solo se puede programar la recuperación de una alumna marcada como ausente.",
        exists: "Esta ausencia ya tiene una recuperación programada.",
      },
    },
    makeUps: {
      title: "Recuperaciones",
      back: "Volver a asistencia",
      pendingTitle: "Pendientes",
      doneTitle: "Realizadas",
      emptyPending: "No hay recuperaciones pendientes.",
      emptyDone: "Todavía no hay recuperaciones realizadas.",
      columns: {
        student: "Alumna",
        absence: "Clase que faltó",
        makeUp: "Recuperación",
        status: "Estado",
        action: "Acción",
      },
      markDone: "Marcar como realizada",
      completed: "Recuperación marcada como realizada.",
      markDoneFor: (name: string) => `Marcar como realizada la de ${name}`,
      doneBy: (by: string, at: string) => `Realizada el ${at} (${by})`,
      empty: {
        title: "No hay recuperaciones",
        message: "Cuando programes una recuperación, la vas a ver acá.",
        action: "Ver asistencia",
      },
    },
    summary: {
      title: "Asistencia",
      present: "Clases a las que vino",
      absent: "Clases que faltó",
      makeUpsPending: "Recuperaciones pendientes",
      makeUpsDone: "Recuperaciones realizadas",
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
    retry: "Reintentar",
    support:
      "Si sigue pasando, avisale a quien administra el panel y contale qué estabas haciendo.",
  },
} as const;
