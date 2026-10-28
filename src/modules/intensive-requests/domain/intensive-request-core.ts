import {
  err,
  ok,
  parseWholePesos,
  type FieldIssue,
  type Invalid,
  type Money,
  type Result,
} from "~/modules/_shared";

export const INTENSIVE_REQUEST_STATUSES = [
  "pending_confirmation",
  "confirmed",
  "cancelled",
] as const;
export type IntensiveRequestStatus =
  (typeof INTENSIVE_REQUEST_STATUSES)[number];

export function isIntensiveRequestStatus(
  value: string,
): value is IntensiveRequestStatus {
  return (INTENSIVE_REQUEST_STATUSES as readonly string[]).includes(value);
}

/** What the request flow needs to know about the intensivo's lifecycle. */
export interface IntensiveRequestGate {
  readonly status: string;
  /** True while the start of the intensivo is still in the future. */
  readonly upcoming: boolean;
}

/** A visitor can ask for a seat only on a published intensivo that has not started. */
export function acceptsRequests(gate: IntensiveRequestGate): boolean {
  return gate.status === "published" && gate.upcoming;
}

const CORDOBA_OFFSET_MS = 3 * 60 * 60 * 1000;

/** `YYYY-MM-DD` of the Córdoba calendar day at `instant` (fixed UTC-03:00). */
export function cordobaDateOf(instant: Date): string {
  return new Date(instant.getTime() - CORDOBA_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}

export type DepositField = "amount" | "paidOn" | "note";

export interface DepositDraft {
  readonly amount: string;
  /** `YYYY-MM-DD`, as a native date input submits it. */
  readonly paidOn: string;
  readonly note: string;
}

export interface DepositPayment {
  readonly paidOn: string;
  readonly note: string | null;
}

const NOTE_MAX = 500;
const REASON_MIN = 3;
const REASON_MAX = 300;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isRealDate(text: string): boolean {
  const match = ISO_DATE.exec(text);
  if (!match) return false;
  const [year, month, day] = [match[1], match[2], match[3]].map(Number) as [
    number,
    number,
    number,
  ];
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

/**
 * The owner registers exactly the deposit the intensivo asks for; any other
 * amount is refused. `today` is the Córdoba calendar day.
 */
export function validateDeposit(
  draft: DepositDraft,
  due: Money,
  today: string,
): Result<DepositPayment, Invalid<DepositField>> {
  const issues: FieldIssue<DepositField>[] = [];
  const amount = parseWholePesos(draft.amount);
  if (!amount.ok) issues.push({ field: "amount", code: amount.error });
  else if (amount.value.compare(due) !== 0)
    issues.push({ field: "amount", code: "out-of-range" });

  const paidOn = draft.paidOn.trim();
  if (paidOn === "") issues.push({ field: "paidOn", code: "required" });
  else if (!isRealDate(paidOn))
    issues.push({ field: "paidOn", code: "invalid-format" });
  else if (paidOn > today)
    issues.push({ field: "paidOn", code: "out-of-range" });

  const note = draft.note.trim();
  if (note.length > NOTE_MAX) issues.push({ field: "note", code: "too-long" });

  if (issues.length > 0) return err({ kind: "invalid", issues });
  return ok({ paidOn, note: note === "" ? null : note });
}

export function validateCancelReason(
  reason: string,
): Result<string, Invalid<"reason">> {
  const trimmed = reason.trim();
  const code =
    trimmed === ""
      ? "required"
      : trimmed.length < REASON_MIN
        ? "invalid-format"
        : trimmed.length > REASON_MAX
          ? "too-long"
          : null;
  return code === null
    ? ok(trimmed)
    : err({ kind: "invalid", issues: [{ field: "reason", code }] });
}
