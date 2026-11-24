import { AdminButton as Button } from "./admin-button";
import { SelectField, TextField } from "./form-fields";
import { adminMicrocopy } from "./microcopy";

const copy = adminMicrocopy.enrollments.detail.correction;
const historyCopy = adminMicrocopy.enrollments.detail.corrections;

export type CorrectionFormField =
  | "correctOffer"
  | "correctFee"
  | "correctNote"
  | "correctRefundAmount"
  | "correctRefundedOn"
  | "correctRefundNote";

/** What the form offers for one active order. */
export interface CorrectionFormModel {
  /** Every workshop, month and turno that still takes enrollments. */
  readonly options: readonly { value: string; label: string }[];
  /** The order's current fee in whole pesos, e.g. `58000`. */
  readonly feePesos: string;
  /** What was paid, as text; null while the order is still pending. */
  readonly paid: string | null;
}

export interface CorrectionFormState {
  readonly errors?: Partial<Record<CorrectionFormField, string>>;
  readonly values?: Partial<Record<CorrectionFormField, string>>;
}

/**
 * Corrects an active order. A native `<form method="post">`, like the rest of
 * the detail screen: the Worker gate denies `/admin/**.data`, so the submit
 * must be a document request.
 */
export function EnrollmentCorrectionForm({
  correction,
  today,
  form,
}: {
  correction: CorrectionFormModel;
  today: string;
  form?: CorrectionFormState | undefined;
}) {
  const values = form?.values;
  const errors = form?.errors;
  return (
    <form
      method="post"
      noValidate
      aria-label={copy.title}
      className="flex flex-col gap-3 rounded-md bg-surface p-4 shadow-card"
    >
      <p className="text-ink-700">{copy.intro}</p>
      <input type="hidden" name="intent" value="correct" />
      <SelectField
        label={copy.offer}
        name="correctOffer"
        options={[{ value: "", label: copy.keepOffer }, ...correction.options]}
        defaultValue={values?.correctOffer ?? ""}
        error={errors?.correctOffer}
      />
      <TextField
        label={copy.fee}
        hint={copy.feeHint}
        name="correctFee"
        inputMode="numeric"
        autoComplete="off"
        required
        defaultValue={values?.correctFee ?? correction.feePesos}
        error={errors?.correctFee}
      />
      <TextField
        label={copy.note}
        name="correctNote"
        maxLength={300}
        autoComplete="off"
        defaultValue={values?.correctNote ?? ""}
        error={errors?.correctNote}
      />
      {correction.paid === null ? null : (
        <fieldset className="flex flex-col gap-3 rounded-md bg-sand-100 p-4">
          <legend className="px-1 font-semibold text-ink-900">
            {copy.refundTitle}
          </legend>
          <p className="text-ink-700">{copy.refundHint(correction.paid)}</p>
          <TextField
            label={copy.refundAmount}
            name="correctRefundAmount"
            inputMode="numeric"
            autoComplete="off"
            defaultValue={values?.correctRefundAmount ?? ""}
            error={errors?.correctRefundAmount}
          />
          <TextField
            label={copy.refundedOn}
            name="correctRefundedOn"
            type="date"
            max={today}
            defaultValue={values?.correctRefundedOn ?? today}
            error={errors?.correctRefundedOn}
          />
          <TextField
            label={copy.refundNote}
            name="correctRefundNote"
            maxLength={300}
            autoComplete="off"
            defaultValue={values?.correctRefundNote ?? ""}
            error={errors?.correctRefundNote}
          />
        </fieldset>
      )}
      <div>
        <Button type="submit">{copy.submit}</Button>
      </div>
    </form>
  );
}

/** An order as one line of text parts, before or after a correction. */
export interface CorrectionSummary {
  readonly workshop: string;
  readonly month: string;
  readonly turno: string;
  readonly fee: string;
  readonly total: string;
}

export interface CorrectionHistoryEntry {
  readonly at: string;
  readonly actor: string;
  readonly note: string | null;
  readonly outcome: keyof typeof historyCopy.outcome;
  readonly before: CorrectionSummary;
  readonly after: CorrectionSummary;
  /** The payment a raised total sent back to pending. */
  readonly previousPayment: {
    amount: string;
    paidOn: string;
    confirmedBy: string | null;
  } | null;
  /** What the owner gave back when the total dropped. */
  readonly refund: {
    amount: string;
    refundedOn: string;
    note: string | null;
  } | null;
}

const summaryText = (summary: CorrectionSummary) =>
  historyCopy.summary(
    summary.workshop,
    summary.month,
    summary.turno,
    summary.fee,
    summary.total,
  );

/** Every correction of the order, oldest first; nothing for an order never corrected. */
export function EnrollmentCorrectionHistory({
  entries,
}: {
  entries: readonly CorrectionHistoryEntry[];
}) {
  if (entries.length === 0) return null;
  return (
    <details className="rounded-md bg-surface p-4 shadow-card">
      <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-ink-900">
        {`${historyCopy.title} (${String(entries.length)})`}
      </summary>
      <ol className="mt-3 flex flex-col gap-4">
        {entries.map((entry, index) => (
          <li
            key={`${entry.at}-${String(index)}`}
            className="flex flex-col gap-1 border-l-2 border-sand-200 pl-3"
          >
            <span className="text-sm text-ink-600">{entry.at}</span>
            <span className="text-ink-700">{entry.actor}</span>
            <span className="font-semibold text-ink-900">
              {historyCopy.outcome[entry.outcome]}
            </span>
            <span className="text-sm text-ink-600">{historyCopy.before}</span>
            <span className="text-ink-900">{summaryText(entry.before)}</span>
            <span className="text-sm text-ink-600">{historyCopy.after}</span>
            <span className="text-ink-900">{summaryText(entry.after)}</span>
            {entry.note ? (
              <span className="text-ink-700">{entry.note}</span>
            ) : null}
            {entry.previousPayment ? (
              <span className="text-ink-700">
                {entry.previousPayment.confirmedBy === null
                  ? historyCopy.previousPaymentNoAuthor(
                      entry.previousPayment.amount,
                      entry.previousPayment.paidOn,
                    )
                  : historyCopy.previousPayment(
                      entry.previousPayment.amount,
                      entry.previousPayment.paidOn,
                      entry.previousPayment.confirmedBy,
                    )}
              </span>
            ) : null}
            {entry.refund ? (
              <span className="text-ink-700">
                {historyCopy.refund(
                  entry.refund.amount,
                  entry.refund.refundedOn,
                )}
              </span>
            ) : null}
            {entry.refund?.note ? (
              <span className="text-ink-700">
                {historyCopy.refundNote(entry.refund.note)}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </details>
  );
}
