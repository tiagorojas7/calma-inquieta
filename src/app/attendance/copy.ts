/** Copy of the attendance rules: pending-fee marking and make-up targets. */
export const attendanceRulesCopy = {
  pendingNote:
    "Todavía debe la cuota del mes. Podés marcar su asistencia igual.",
  makeUpFullWarning:
    "La recuperación quedó programada, pero ese turno ya no tiene lugares libres ese día.",
  errors: {
    makeUpTurnoOther: "Elegí otro turno del mismo taller.",
    makeUpDate:
      "Elegí una fecha dentro del mes del turno, en su día de la semana.",
    makeUpBooked:
      "Una alumna con una recuperación programada no puede pasar a presente. Resolvé primero la recuperación.",
  },
} as const;
