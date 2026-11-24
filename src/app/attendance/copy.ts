/** Copy of the attendance rules: pending-fee marking, make-up targets and outcomes. */
export const attendanceRulesCopy = {
  pendingNote:
    "Todavía debe la cuota del mes. Podés marcar su asistencia igual.",
  makeUpFullWarning:
    "La recuperación quedó programada, pero ese turno ya no tiene lugares libres ese día.",
  /** A make-up that the student did not attend; it grants no replacement. */
  makeUpMissed: {
    label: "Recuperación: no vino",
    title: "No vinieron",
    action: "No vino",
    actionPrefix: "Marcar que no vino a la recuperación",
    note: (by: string, at: string) => `No vino. Lo marcó ${by} el ${at}`,
    marked: "Recuperación marcada como no asistida.",
    closed: "Esa recuperación ya estaba cerrada y no se puede cambiar.",
  },
  errors: {
    makeUpUsed:
      "La recuperación de esta ausencia ya se usó. Una ausencia tiene una sola recuperación.",
    makeUpTurnoOther: "Elegí otro turno del mismo taller.",
    makeUpDate:
      "Elegí una fecha dentro del mes del turno, en su día de la semana.",
    makeUpBooked:
      "Una alumna con una recuperación programada no puede pasar a presente. Resolvé primero la recuperación.",
  },
} as const;
