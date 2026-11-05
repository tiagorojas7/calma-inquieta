import {
  err,
  ok,
  type FieldIssue,
  type Invalid,
  type Result,
} from "~/modules/_shared";

export const REMINDER_KINDS = [
  "class",
  "fee",
  "materials",
  "intensive",
  "notice",
] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

/** The order statuses an audience can be narrowed to (mirrors the order table). */
export const REMINDER_STATUSES = [
  "pending_confirmation",
  "paid",
  "materials_requested",
  "materials_received",
  "cancelled",
] as const;
export type ReminderStatus = (typeof REMINDER_STATUSES)[number];

/** What the audience is derived from: one enrollment order of one student. */
export interface ReminderOrder {
  readonly status: ReminderStatus;
  readonly workshopId: string;
  readonly workshopName: string;
  /** `YYYY-MM`. */
  readonly period: string;
  readonly turnoLabel: string;
  readonly studentName: string;
  readonly studentEmail: string;
  readonly studentPhoneDigits: string;
}

export const NOTICE_MAX = 800;
export const DEFAULT_CLASS_WHEN = "mañana";
const WHEN_MAX = 60;
const ACTIVITY_MAX = 80;

export type ReminderField = "when" | "activity" | "text";

/** A template with its free inputs resolved. */
export type ReminderTemplate =
  | { readonly kind: "class"; readonly when: string }
  | { readonly kind: "fee" }
  | { readonly kind: "materials" }
  | {
      readonly kind: "intensive";
      readonly activity: string;
      readonly when: string;
    }
  | { readonly kind: "notice"; readonly text: string };

export interface ReminderInputs {
  readonly when?: string;
  readonly activity?: string;
  readonly text?: string;
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

/** The month name of a `YYYY-MM` key; any other key stays as it is. */
export function monthNameOf(periodKey: string): string {
  const match = /^\d{4}-(\d{2})$/.exec(periodKey);
  return MONTHS[Number(match?.[1]) - 1] ?? periodKey;
}

/** The first word of a full name; empty when the name is blank. */
export function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

function required(
  value: string | undefined,
  field: ReminderField,
  max: number,
  issues: FieldIssue<ReminderField>[],
): string {
  const text = (value ?? "").trim();
  if (text === "") issues.push({ field, code: "required" });
  else if (text.length > max) issues.push({ field, code: "too-long" });
  return text;
}

/** Resolves the free inputs of a template, aggregating every field issue. */
export function validateReminderTemplate(
  kind: ReminderKind,
  inputs: ReminderInputs,
): Result<ReminderTemplate, Invalid<ReminderField>> {
  const issues: FieldIssue<ReminderField>[] = [];
  let template: ReminderTemplate;
  switch (kind) {
    case "class": {
      const when = (inputs.when ?? "").trim() || DEFAULT_CLASS_WHEN;
      if (when.length > WHEN_MAX)
        issues.push({ field: "when", code: "too-long" });
      template = { kind, when };
      break;
    }
    case "fee":
    case "materials":
      template = { kind };
      break;
    case "intensive": {
      const activity = required(
        inputs.activity,
        "activity",
        ACTIVITY_MAX,
        issues,
      );
      const when = required(inputs.when, "when", WHEN_MAX, issues);
      template = { kind, activity, when };
      break;
    }
    case "notice":
      template = {
        kind,
        text: required(inputs.text, "text", NOTICE_MAX, issues),
      };
      break;
  }
  return issues.length > 0 ? err({ kind: "invalid", issues }) : ok(template);
}

/** The message text for one order of one student, greeting her by first name. */
export function buildReminderMessage(
  template: ReminderTemplate,
  order: ReminderOrder,
): string {
  const name = firstNameOf(order.studentName);
  const greeting = name === "" ? "Hola." : `Hola, ${name}.`;
  switch (template.kind) {
    case "class":
      return `${greeting} Te recordamos que ${template.when} tenés tu clase de ${order.workshopName} (turno ${order.turnoLabel}) en Calma Inquieta.`;
    case "fee":
      return `${greeting} Tu cuota correspondiente a ${monthNameOf(order.period)} figura pendiente. Si ya realizaste el pago, podés enviarnos el comprobante.`;
    case "materials":
      return `${greeting} Tus materiales de ${order.workshopName} ya están listos para retirar en Calma Inquieta.`;
    case "intensive":
      return `${greeting} Te recordamos que ${template.when} tenés reservado tu lugar en el workshop de ${template.activity}.`;
    case "notice":
      return `${greeting} ${template.text}`;
  }
}

export interface AudienceFilter {
  readonly workshopId?: string;
  /** `YYYY-MM`. */
  readonly period?: string;
  readonly turnoLabel?: string;
  readonly status?: ReminderStatus;
}

/**
 * The orders a reminder is about. Cancelled orders are left out unless the
 * status filter asks for them; the pending fee reminder defaults to pending
 * orders when no status is chosen.
 */
export function selectAudienceOrders(
  orders: readonly ReminderOrder[],
  filter: AudienceFilter,
  kind: ReminderKind,
): readonly ReminderOrder[] {
  const status =
    filter.status ?? (kind === "fee" ? "pending_confirmation" : undefined);
  return orders.filter(
    (order) =>
      (filter.workshopId === undefined ||
        order.workshopId === filter.workshopId) &&
      (filter.period === undefined || order.period === filter.period) &&
      (filter.turnoLabel === undefined ||
        order.turnoLabel === filter.turnoLabel) &&
      (status === undefined
        ? order.status !== "cancelled"
        : order.status === status),
  );
}
