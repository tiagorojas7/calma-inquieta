import type { OrderStatus } from "~/modules/enrollments";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_confirmation: "Pendiente de confirmación",
  paid: "Cobrado",
  materials_requested: "Solicitado al proveedor",
  materials_received: "Recibido",
  cancelled: "Cancelado",
};

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

/** "2026-11" as "noviembre 2026"; anything else is returned unchanged. */
export function monthLabel(period: string): string {
  const match = PERIOD_KEY.exec(period);
  const month = MONTHS[Number(match?.[2]) - 1];
  return match === null || month === undefined
    ? period
    : `${month} ${match[1] ?? ""}`;
}

const CORDOBA_OFFSET_MS = 10_800_000;

/** An instant as "31/10/2026 12:30", on the Córdoba wall clock. */
export function dateTimeLabel(instant: Date): string {
  const local = new Date(instant.getTime() - CORDOBA_OFFSET_MS)
    .toISOString()
    .slice(0, 16);
  return `${dateLabel(local.slice(0, 10))} ${local.slice(11)}`;
}

/** "2026-10-31" as "31/10/2026". */
export function dateLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return year && month && day ? `${day}/${month}/${year}` : isoDate;
}
