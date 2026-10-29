/** Subject, plain text and simple html of one email; the recipient is added by the sender. */
export interface EmailContent {
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}

export interface OrderEmailInput {
  readonly studentName: string;
  readonly number: string;
  readonly workshopName: string;
  /** Already formatted, e.g. "noviembre 2026". */
  readonly periodLabel: string;
  readonly turnoLabel: string;
  /** Already formatted, e.g. "$ 58.000". */
  readonly total: string;
  readonly orderUrl: string;
}

export interface ReservationEmailInput {
  readonly studentName: string;
  readonly intensivoName: string;
  /** Already formatted, e.g. "sábado 5 de diciembre". */
  readonly dateLabel: string;
  /** Already formatted, e.g. "$ 20.000". */
  readonly deposit: string;
  readonly reservationUrl: string;
}

export interface ClassEmailInput {
  readonly studentName: string;
  readonly workshopName: string;
  readonly turnoLabel: string;
  /** `HH:MM`. */
  readonly startsAt: string;
}

export interface EventInquiryInput {
  readonly fullName: string;
  readonly phone: string;
  readonly email: string | null;
  readonly desiredDate: string;
  readonly place: string;
  readonly participants: number;
  readonly notes: string | null;
}

const ESCAPES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);

const firstName = (fullName: string): string =>
  fullName.trim().split(/\s+/)[0] ?? "";

/** A paragraph is plain text, or text plus one link rendered in the html body. */
interface Paragraph {
  readonly text: string;
  readonly link?: string;
}

function compose(subject: string, paragraphs: readonly Paragraph[]) {
  const text = paragraphs
    .map((p) => (p.link === undefined ? p.text : `${p.text} ${p.link}`))
    .join("\n\n");
  const html = paragraphs
    .map((p) =>
      p.link === undefined
        ? `<p>${escapeHtml(p.text)}</p>`
        : `<p>${escapeHtml(p.text)} <a href="${escapeHtml(p.link)}">${escapeHtml(p.link)}</a></p>`,
    )
    .join("");
  return { subject, text, html } satisfies EmailContent;
}

const greeting = (studentName: string): Paragraph => ({
  text: `Hola, ${firstName(studentName)}.`,
});

const SIGNATURE: Paragraph = { text: "Un abrazo, Calma Inquieta" };

export function enrollmentReceivedEmail(input: OrderEmailInput): EmailContent {
  return compose(`Recibimos tu inscripción ${input.number}`, [
    greeting(input.studentName),
    {
      text: `Recibimos tu inscripción a ${input.workshopName} (${input.periodLabel}, ${input.turnoLabel}). Tu número es ${input.number} y el total es ${input.total}.`,
    },
    {
      text: "Cuando registremos tu pago, te avisamos. Podés ver el detalle de tu inscripción acá:",
      link: input.orderUrl,
    },
    SIGNATURE,
  ]);
}

export function paymentConfirmedEmail(input: OrderEmailInput): EmailContent {
  return compose("Confirmamos tu pago", [
    greeting(input.studentName),
    {
      text: `Confirmamos el pago de tu inscripción ${input.number}: ${input.workshopName} (${input.periodLabel}, ${input.turnoLabel}). Tu lugar está reservado.`,
    },
    { text: "Podés ver el detalle acá:", link: input.orderUrl },
    SIGNATURE,
  ]);
}

export function intensiveReservationReceivedEmail(
  input: ReservationEmailInput,
): EmailContent {
  return compose("Recibimos tu reserva", [
    greeting(input.studentName),
    {
      text: `Recibimos tu pedido de lugar para el intensivo ${input.intensivoName} (${input.dateLabel}). Para reservarlo, la seña es de ${input.deposit}.`,
    },
    {
      text: "Cuando registremos tu seña, te avisamos. Podés ver el resumen de tu reserva acá:",
      link: input.reservationUrl,
    },
    SIGNATURE,
  ]);
}

export function intensiveReservationConfirmedEmail(
  input: ReservationEmailInput,
): EmailContent {
  return compose("Confirmamos tu reserva", [
    greeting(input.studentName),
    {
      text: `Confirmamos tu seña de ${input.deposit}: tu lugar en el intensivo ${input.intensivoName} (${input.dateLabel}) está reservado.`,
    },
    { text: "Podés ver el resumen acá:", link: input.reservationUrl },
    SIGNATURE,
  ]);
}

export function classTomorrowEmail(input: ClassEmailInput): EmailContent {
  return compose("Mañana tenés clase", [
    greeting(input.studentName),
    {
      text: `Te recordamos que mañana tenés clase de ${input.workshopName} (${input.turnoLabel}), a las ${input.startsAt}.`,
    },
    { text: "Te esperamos." },
    SIGNATURE,
  ]);
}

export function feePendingEmail(input: OrderEmailInput): EmailContent {
  return compose("Tu cuota está pendiente", [
    greeting(input.studentName),
    {
      text: `Tu cuota correspondiente a ${input.periodLabel} (${input.workshopName}, inscripción ${input.number}) figura pendiente. Si ya realizaste el pago, podés enviarnos el comprobante.`,
    },
    { text: "Podés ver el detalle acá:", link: input.orderUrl },
    SIGNATURE,
  ]);
}

/** Internal email to the studio: not addressed to a student, so no voseo greeting. */
export function eventInquiryEmail(input: EventInquiryInput): EmailContent {
  return compose(`Nueva consulta de evento: ${input.fullName}`, [
    { text: "Llegó una consulta para un evento privado." },
    { text: `Nombre: ${input.fullName}` },
    { text: `Teléfono: ${input.phone}` },
    { text: `Email: ${input.email ?? "no indicó"}` },
    { text: `Fecha deseada: ${input.desiredDate}` },
    { text: `Lugar o tipo de evento: ${input.place}` },
    { text: `Participantes: ${String(input.participants)}` },
    { text: `Notas: ${input.notes ?? "sin notas"}` },
  ]);
}
