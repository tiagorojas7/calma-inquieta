/** Copy of the attendance rules: pending-fee marking, make-up targets and outcomes. */
export const attendanceRulesCopy = {
  pendingNote: "Debe la cuota del mes. Podés marcarla igual.",
  makeUpFullWarning: "Quedó agendada, pero ese turno ya está completo ese día.",
  /** A make-up that the student did not attend; it grants no replacement. */
  makeUpMissed: {
    label: "Recuperación: no vino",
    title: "No vinieron",
    action: "No vino",
    actionPrefix: "Marcar que no vino a la recuperación",
    note: (by: string, at: string) => `No vino. Lo marcó ${by} el ${at}`,
    marked: "Marcada como no vino.",
    closed: "Esa recuperación ya estaba cerrada.",
  },
  errors: {
    makeUpUsed: "Esta ausencia ya usó su recuperación.",
    makeUpTurnoOther: "Elegí otro turno del mismo taller.",
    makeUpDate: "Elegí una fecha del mes, en el día del turno.",
    makeUpBooked: "Tiene una recuperación agendada. Resolvela primero.",
  },
} as const;
