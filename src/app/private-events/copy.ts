import type { PrivateEventField } from "~/modules/private-events";
import type { IssueCode } from "~/modules/_shared";

/** Public es-AR (voseo) copy of the private-events request page. */
export const privateEventsCopy = {
  seo: {
    title: "Eventos privados",
    description:
      "Consultá por un evento privado en Calma Inquieta: contanos la fecha, el lugar y cuántas personas serían, y te respondemos con una propuesta para tu grupo.",
  },
  title: "Eventos privados",
  intro:
    "Armamos talleres para tu grupo: cumpleaños, despedidas, encuentros de equipo. Contanos qué tenés en mente y te escribimos con una propuesta.",
  form: {
    label: "Consulta por un evento privado",
    submit: "Enviar consulta",
    fullName: "Nombre y apellido",
    phone: "WhatsApp o teléfono",
    phoneHint: "Con característica, por ejemplo 351 555 0101.",
    email: "Email (opcional)",
    desiredDate: "Fecha deseada",
    place: "Lugar o tipo de evento",
    placeHint: "Por ejemplo: en el taller, en mi casa, cumpleaños.",
    participants: "Cantidad de personas",
    participantsHint: "Entre 1 y 200.",
    notes: "Observaciones (opcional)",
    notesHint: "Cualquier detalle que nos ayude a preparar la propuesta.",
  },
  thanks: {
    title: "¡Gracias por escribirnos!",
    message:
      "Recibimos tu consulta y te vamos a responder a la brevedad. Si querés, adelantanos más detalles por WhatsApp.",
    whatsapp: "Escribinos por WhatsApp",
    instagram: "Seguinos en Instagram",
  },
} as const;

const MESSAGES: Record<PrivateEventField, string> = {
  fullName: "Ingresá tu nombre y apellido.",
  phone: "Ingresá un teléfono argentino válido.",
  email: "Ingresá un email válido.",
  desiredDate: "Elegí una fecha de hoy en adelante.",
  place: "Contanos dónde o qué tipo de evento sería.",
  participants: "Ingresá una cantidad de personas entre 1 y 200.",
  notes: "Las observaciones pueden tener hasta 1000 caracteres.",
};

const TOO_LONG: Partial<Record<PrivateEventField, string>> = {
  fullName: "El nombre es demasiado largo.",
  email: "El email es demasiado largo.",
  place: "Resumilo en hasta 200 caracteres.",
};

/** The message shown next to a field; the code only refines "too-long". */
export function privateEventIssueMessage(
  field: PrivateEventField,
  code: IssueCode,
): string {
  if (code === "too-long") return TOO_LONG[field] ?? MESSAGES[field];
  return MESSAGES[field];
}
