import type { IssueCode } from "~/modules/_shared";

type StudentFieldName = "fullName" | "email" | "phone" | "policy";

/** Public es-AR (voseo) copy of the workshop seat request pages. */
export const intensiveRequestCopy = {
  reserveCta: "Reservar mi lugar",
  seo: { title: "Reservar mi lugar" },
  form: {
    label: "Reservar mi lugar",
    intro:
      "Completá tus datos y dejamos tu solicitud registrada. Después coordinamos la seña por WhatsApp y tu lugar queda confirmado cuando la registramos.",
    deposit: "Seña para confirmar tu lugar",
    fullName: "Nombre y apellido",
    email: "Correo electrónico",
    phone: "WhatsApp o teléfono",
    phoneHint: "Con característica, por ejemplo 351 555 0101.",
    policy: "Leí las condiciones y acepto la política de privacidad.",
    submit: "Enviar solicitud",
    back: "Volver al workshop",
  },
  conditions: {
    label: "Condiciones",
    cancellation:
      "Si no se alcanza el mínimo de {cantidad} personas, el workshop se cancela y se devuelve lo que corresponde.",
    noShow:
      "Ante una inasistencia rige la política indicada en estas condiciones.",
    noPolicy:
      "El detalle de la seña, la devolución y la inasistencia te lo confirmamos por WhatsApp.",
  },
  summary: {
    title: "Tu solicitud",
    reference: "Solicitud",
    status: {
      pending_confirmation: "Pendiente de seña",
      confirmed: "Lugar confirmado",
      cancelled: "Solicitud cancelada",
    },
    fields: {
      intensivo: "Workshop",
      date: "Fecha",
      time: "Horario",
      deposit: "Seña",
    },
    stepsTitle: "Cómo seguir",
    steps: [
      "Tu solicitud quedó registrada.",
      "Escribinos por WhatsApp con tu número de solicitud.",
      "Te pasamos los datos para abonar la seña.",
      "Cuando registramos el pago, tu lugar queda confirmado.",
    ],
    currentStep: "Ahora",
    whatsapp: "Enviar resumen por WhatsApp",
    confirmed:
      "¡Gracias! Registramos tu seña y tu lugar está confirmado. Te esperamos.",
    cancelled:
      "Esta solicitud fue cancelada. Si querés reservar de nuevo, podés hacerlo desde la web.",
    cancelledCta: "Ver workshops",
  },
} as const;

const MESSAGES: Record<StudentFieldName, string> = {
  fullName: "Ingresá tu nombre completo.",
  email: "Ingresá un correo electrónico válido.",
  phone: "Ingresá un teléfono argentino válido.",
  policy: "Tenés que aceptar las condiciones y la política de privacidad.",
};

const TOO_LONG: Partial<Record<StudentFieldName, string>> = {
  fullName: "El nombre es demasiado largo.",
  email: "El correo es demasiado largo.",
};

/** The message shown next to a field; the code only refines "too-long". */
export function studentIssueMessage(
  field: StudentFieldName,
  code: IssueCode,
): string {
  if (code === "too-long") return TOO_LONG[field] ?? MESSAGES[field];
  return MESSAGES[field];
}

/** Message above the form for a refusal that has no field. */
export const requestFailureMessages = {
  "duplicate-request":
    "Ya tenés una solicitud activa para este workshop. Escribinos por WhatsApp si necesitás cambiarla.",
  unavailable: "No pudimos registrar tu solicitud. Probá de nuevo en un rato.",
} as const;
