import {
  err,
  ok,
  parseWholePesos,
  type FieldIssue,
  type Invalid,
  Money,
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

// Balance -------------------------------------------------------------------

/**
 * What the deposit left unpaid: the request's snapshot price minus its snapshot
 * deposit. Zero when the deposit already covered the whole price.
 */
export function balanceDue(price: Money, deposit: Money): Money {
  return price.subtract(deposit);
}

/**
 * The owner registers exactly the balance still due, on a real date that is
 * neither in the future nor before the deposit was paid. The amount, date and
 * note follow the same rules as the deposit.
 */
export function validateBalance(
  draft: DepositDraft,
  due: Money,
  today: string,
  depositPaidOn: string | null,
): Result<DepositPayment, Invalid<DepositField>> {
  const checked = validateDeposit(draft, due, today);
  const paidOn = draft.paidOn.trim();
  const tooEarly =
    depositPaidOn !== null && isRealDate(paidOn) && paidOn < depositPaidOn;
  if (!tooEarly) return checked;
  const issues = checked.ok ? [] : checked.error.issues;
  return err({
    kind: "invalid",
    issues: [...issues, { field: "paidOn", code: "out-of-range" }],
  });
}

// Refunds -------------------------------------------------------------------

export type RefundField = "amount" | "refundedOn" | "note";
export type RefundIssueCode =
  | "required"
  | "invalid-format"
  | "out-of-range"
  | "invalid-calendar-date"
  | "too-long"
  | "negative"
  | "not-whole-pesos"
  | "above-paid"
  | "not-refundable"
  | "future-date"
  | "before-payment";
export type InvalidRequestRefund = {
  readonly kind: "invalid-refund";
  readonly field: RefundField;
  readonly code: RefundIssueCode;
};

const invalidRefund = (
  field: RefundField,
  code: RefundIssueCode,
): Result<never, InvalidRequestRefund> =>
  err({ kind: "invalid-refund", field, code });

/** A cancellation's refund as the form typed it. */
export interface RefundDraft {
  /** Whole pesos returned, from 0 up to what was paid. */
  readonly amount: string;
  /** Córdoba `YYYY-MM-DD`. */
  readonly refundedOn: string;
  readonly note?: string;
}

export interface Refund {
  readonly amount: Money;
  readonly refundedOn: string;
  readonly note: string | null;
}

const REFUND_NOTE_MAX = 300;

/** The syntax of a typed refund; the bounds against the payments are `checkRefund`. */
export function parseRefund(
  draft: RefundDraft,
): Result<Refund, InvalidRequestRefund> {
  const amount = parseWholePesos(draft.amount);
  if (!amount.ok)
    return invalidRefund(
      "amount",
      draft.amount.includes(",") || draft.amount.includes(".")
        ? "not-whole-pesos"
        : amount.error,
    );
  if (!isRealDate(draft.refundedOn))
    return invalidRefund("refundedOn", "invalid-calendar-date");
  const note = draft.note?.trim() ?? "";
  if (note.length > REFUND_NOTE_MAX) return invalidRefund("note", "too-long");
  return ok({
    amount: amount.value,
    refundedOn: draft.refundedOn,
    note: note === "" ? null : note,
  });
}

/** The payments a request holds when it is cancelled. */
export interface RequestPayments {
  readonly status: IntensiveRequestStatus;
  readonly deposit: Money | null;
  readonly depositPaidOn: string | null;
  readonly balance: Money | null;
  readonly balancePaidOn: string | null;
}

/** Everything the request took in: the deposit plus the balance. */
export function totalPaid(payments: RequestPayments): Money {
  return (payments.deposit ?? Money.zero()).add(
    payments.balance ?? Money.zero(),
  );
}

/**
 * What cancelling must record. A confirmed request (its balance paid or not)
 * records the amount returned, from $0 up to what it paid, dated from its last
 * payment to today (Córdoba `YYYY-MM-DD`). A pending request paid nothing and
 * records none.
 */
export function checkRefund(
  payments: RequestPayments,
  refund: Refund | undefined,
  today: string,
): Result<undefined, InvalidRequestRefund> {
  if (payments.status !== "confirmed")
    return refund === undefined
      ? ok(undefined)
      : invalidRefund("amount", "not-refundable");
  if (refund === undefined) return invalidRefund("amount", "required");
  if (refund.amount.isNegative()) return invalidRefund("amount", "negative");
  if (refund.amount.toCentavos() % 100 !== 0)
    return invalidRefund("amount", "not-whole-pesos");
  if (refund.amount.compare(totalPaid(payments)) > 0)
    return invalidRefund("amount", "above-paid");
  if (refund.refundedOn > today)
    return invalidRefund("refundedOn", "future-date");
  const lastPayment = [payments.depositPaidOn, payments.balancePaidOn]
    .filter((date): date is string => date !== null)
    .sort()
    .at(-1);
  if (lastPayment !== undefined && refund.refundedOn < lastPayment)
    return invalidRefund("refundedOn", "before-payment");
  return ok(undefined);
}
