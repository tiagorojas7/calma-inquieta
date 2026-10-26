import type { Money } from "~/modules/_shared";

export const WHATSAPP_MESSAGE_CAP = 1200;

export interface OrderMessageLine {
  readonly materialName: string;
  readonly variantLabel: string;
  readonly quantity: number;
}

export interface OrderMessageInput {
  readonly orderNumber: string;
  readonly studentName: string;
  readonly workshopName: string;
  /** `YYYY-MM`. */
  readonly periodKey: string;
  readonly turnoLabel: string;
  readonly lines: readonly OrderMessageLine[];
  readonly total: Money;
}

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

const PERIOD_KEY = /^(\d{4})-(\d{2})$/;

export function monthLabel(periodKey: string): string {
  const match = PERIOD_KEY.exec(periodKey);
  const month = MONTHS[Number(match?.[2]) - 1];
  return match === null || month === undefined
    ? periodKey
    : `${month} ${match[1] ?? ""}`;
}

/** "$ 58.000": whole pesos with es-AR thousands separators. */
export function formatPesos(amount: Money): string {
  const pesos = Math.trunc(amount.toCentavos() / 100);
  const digits = String(Math.abs(pesos)).replace(/\B(?=(\d{3})+$)/g, ".");
  return `$ ${pesos < 0 ? "-" : ""}${digits}`;
}

/**
 * Pure text for the `wa.me` hand-off. Above the cap, item lines are dropped
 * from the end and replaced by "y N más (ver pedido)"; the order number and
 * the total are always kept.
 */
export function buildOrderWhatsAppText(order: OrderMessageInput): string {
  const head = [
    "Hola! Quiero confirmar mi inscripción",
    `Pedido: ${order.orderNumber}`,
    `Nombre: ${order.studentName}`,
    `Taller: ${order.workshopName}`,
    `Mes: ${monthLabel(order.periodKey)}`,
    `Turno: ${order.turnoLabel}`,
  ];
  const tail = `Total: ${formatPesos(order.total)}`;
  const items = order.lines.map(
    (l) => `- ${l.materialName} ${l.variantLabel} x${String(l.quantity)}`,
  );

  const compose = (kept: number): string => {
    if (items.length === 0) return [...head, tail].join("\n");
    const rest = items.length - kept;
    const more = rest > 0 ? [`y ${String(rest)} más (ver pedido)`] : [];
    return [
      ...head,
      "Materiales:",
      ...items.slice(0, kept),
      ...more,
      tail,
    ].join("\n");
  };

  for (let kept = items.length; kept >= 0; kept -= 1) {
    const text = compose(kept);
    if (text.length <= WHATSAPP_MESSAGE_CAP) return text;
  }
  return [head[0], head[1], tail].join("\n");
}
