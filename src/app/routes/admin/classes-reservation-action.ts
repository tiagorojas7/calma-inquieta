import { data, redirect } from "react-router";
import type { AdminActor } from "~/modules/admin-access";
import type { IntensiveRequestUseCases } from "~/modules/intensive-requests";
import type { IntensiveRequestFeedback } from "~/app/ui/admin/intensive-requests";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import {
  cancelRefundValues,
  parseCancelRefund,
  refundFieldError,
} from "~/app/admin/enrollment-cancel-form-data";
import { failureResponse } from "~/app/admin/failure-response";
import { isUuid } from "~/app/admin/enrollment-ids";
import { stayOnPage } from "~/app/admin/return-to";

const copy = adminMicrocopy.intensiveRequests;

export type ReservationIntent = "confirm" | "balance" | "cancel";

/** The saved-message code each action leaves in the address. */
export const RESERVATION_CODES = {
  confirm: "confirmed",
  balance: "balance",
  cancel: "cancelled",
} as const;

export function isReservationIntent(value: string): value is ReservationIntent {
  return value === "confirm" || value === "balance" || value === "cancel";
}

function text(form: FormData, name: string): string {
  const entry = form.get(name);
  return typeof entry === "string" ? entry : "";
}

type Failure =
  | { kind: "invalid"; issues: readonly { field: string }[] }
  | { kind: "intensive-full" }
  | { kind: "balance-already-paid" }
  | { kind: "no-balance-due" }
  | { kind: "illegal-transition"; from: string };

/** The message and field errors a rejected form shows next to its request. */
function feedbackFor(
  failure: Failure,
  base: Pick<IntensiveRequestFeedback, "requestId" | "intent" | "values">,
): IntensiveRequestFeedback {
  const errors: Record<string, string> = {};
  let formError: string | undefined;
  if (failure.kind === "invalid") {
    const balance = base.intent === "balance";
    for (const issue of failure.issues) {
      const message = balance
        ? issue.field === "amount"
          ? copy.errors.balanceAmount
          : issue.field === "paidOn"
            ? copy.errors.balancePaidOn
            : copy.errors[issue.field as keyof typeof copy.errors]
        : copy.errors[issue.field as keyof typeof copy.errors];
      errors[issue.field] ??= message;
    }
  } else if (failure.kind === "intensive-full") formError = copy.errors.full;
  else if (failure.kind === "balance-already-paid")
    formError = copy.errors.balanceAlreadyPaid;
  else if (failure.kind === "no-balance-due") formError = copy.errors.noBalance;
  else if (failure.from === "cancelled")
    formError = copy.errors.alreadyCancelled;
  else
    formError =
      base.intent === "balance"
        ? copy.errors.notConfirmed
        : copy.errors.notPending;
  return { ...base, formError, errors };
}

/**
 * Confirm the deposit, record the balance or cancel one request of one
 * workshop, through the existing use cases and with their rules. A success
 * goes back to the page the form was on, at that person's card (`stayOnPage`);
 * a refusal answers 422 with the message to show next to that person.
 */
export async function runReservationAction(input: {
  actor: AdminActor;
  requests: IntensiveRequestUseCases;
  form: FormData;
  intensiveId: string;
  /** Where to go when the form carries no `returnTo`. */
  fallback: string;
}) {
  const { actor, requests, form, intensiveId } = input;
  const intent = text(form, "intent");
  if (!isReservationIntent(intent)) throw data(null, { status: 400 });
  const requestId = text(form, "requestId");
  if (!isUuid(requestId)) throw data(null, { status: 404 });

  const amount = text(form, "amount");
  const paidOn = text(form, "paidOn");
  const note = text(form, "note");
  const reason = text(form, "reason");
  const refund = intent === "cancel" ? parseCancelRefund(form) : undefined;
  const values =
    intent === "cancel"
      ? { reason, ...cancelRefundValues(form) }
      : { amount, paidOn, note };
  const payment = { intensiveId, requestId, amount, paidOn, note };
  const result =
    intent === "confirm"
      ? await requests.confirm(actor, payment)
      : intent === "balance"
        ? await requests.recordBalance(actor, payment)
        : await requests.cancel(actor, {
            intensiveId,
            requestId,
            reason,
            ...(refund === undefined ? {} : { refund }),
          });
  if (result.ok)
    return redirect(
      stayOnPage(form, {
        fallback: input.fallback,
        code: RESERVATION_CODES[intent],
      }),
    );

  const error = result.error;
  if (error.kind === "invalid-refund") {
    const feedback: IntensiveRequestFeedback = {
      requestId,
      intent,
      values,
      formError: undefined,
      errors: refundFieldError(error),
    };
    return data({ feedback }, { status: 422 });
  }
  if (
    error.kind === "invalid" ||
    error.kind === "intensive-full" ||
    error.kind === "balance-already-paid" ||
    error.kind === "no-balance-due" ||
    error.kind === "illegal-transition"
  )
    return data(
      { feedback: feedbackFor(error, { requestId, intent, values }) },
      { status: 422 },
    );
  throw failureResponse(error);
}
