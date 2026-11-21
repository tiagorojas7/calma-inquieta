import { useRef, useState, type ReactNode } from "react";
import { AdminButton as Button } from "./admin-button";
import { Heading } from "../atoms/heading";
import { AdminFeedback, AdminPageHeader } from "./admin-page";
import { AdminButtonLink } from "./admin-button-link";
import { AdminDangerZone, AdminSection } from "./admin-sections";
import { ConfirmDialog } from "./confirm-dialog";
import { adminCopy } from "./copy";
import {
  EnrollmentCorrectionForm,
  EnrollmentCorrectionHistory,
  type CorrectionFormField,
  type CorrectionFormModel,
  type CorrectionHistoryEntry,
} from "./enrollment-correction";
import { FormError, TextAreaField, TextField } from "./form-fields";
import { adminMicrocopy } from "./microcopy";
import { MoreOptions } from "./more-options";
import { OrderStatusBadge } from "./order-status-badge";
import { StatusChip } from "./status-chip";

export interface EnrollmentDetailOrder {
  readonly id: string;
  readonly number: string;
  readonly status: string;
  readonly statusLabel: string;
  readonly studentName: string;
  readonly email: string;
  readonly phone: string;
  readonly workshopName: string;
  readonly month: string;
  readonly turno: string;
  readonly requestedAt: string;
  /** The legacy month-based policy version; null when it says nothing true. */
  readonly policyVersion: string | null;
  /** "Condiciones v2 · Privacidad v3", or that there is no record. */
  readonly acceptance: string;
  readonly fee: string;
  readonly materialsTotal: string;
  readonly total: string;
  readonly totalPesos: string;
  readonly lines: readonly {
    label: string;
    supplier: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
    /** Where the units come from: the studio's stock or an order to the supplier. */
    source?: "stock" | "supplier";
  }[];
  readonly payment: {
    paidOn: string;
    amount: string;
    confirmedBy: string;
    note: string | null;
  } | null;
  /** Set when cancelling must record a refund: what was paid, as text and as whole pesos. */
  readonly cancelRefund: { paid: string; paidPesos: string } | null;
  /** What was returned when the paid order was cancelled. */
  readonly refund: {
    amount: string;
    refundedOn: string;
    note: string | null;
    refundedBy: string;
  } | null;
  readonly seat: { confirmed: number; capacity: number };
  /** `material_sale` for a later material purchase; absent means the monthly record. */
  readonly kind?: "enrollment" | "material_sale";
  /** The monthly record a sale belongs to. */
  readonly parent?: { readonly number: string; readonly href: string } | null;
  /** The sales under a monthly record, oldest first. */
  readonly sales?: readonly {
    readonly id: string;
    readonly number: string;
    readonly href: string;
    readonly status: string;
    readonly statusLabel: string;
    readonly total: string;
    readonly requestedOn: string;
    /** What the sale holds, so the record shows it in place. */
    readonly lines?: readonly { label: string; quantity: number }[];
  }[];
  /** Where a new sale of this record starts; null when it cannot take one. */
  readonly newSaleHref?: string | null;
  /** What the correction form offers; null once the order is cancelled or for a sale. */
  readonly correction: CorrectionFormModel | null;
  readonly corrections: readonly CorrectionHistoryEntry[];
  readonly audit: readonly {
    at: string;
    actor: string;
    from: string | null;
    to: string;
    note: string | null;
  }[];
  readonly actions: {
    confirm: boolean;
    cancel: boolean;
    materialsRequested: boolean;
    materialsReceived: boolean;
  };
  readonly today: string;
}

const copy = adminMicrocopy.enrollments.detail;

export type EnrollmentDetailFeedback = keyof typeof copy.feedback;

export interface EnrollmentDetailProps {
  readonly order: EnrollmentDetailOrder;
  readonly feedback?: EnrollmentDetailFeedback | null | undefined;
  readonly form?: {
    readonly formError?: string | undefined;
    readonly errors?: Partial<
      Record<
        | "amount"
        | "paidOn"
        | "reason"
        | "refundAmount"
        | "refundedOn"
        | "refundNote"
        | CorrectionFormField,
        string
      >
    >;
    readonly values?: Partial<
      Record<
        | "amount"
        | "paidOn"
        | "note"
        | "reason"
        | "refundAmount"
        | "refundedOn"
        | "refundNote"
        | CorrectionFormField,
        string
      >
    >;
  };
}

/** A refused correction reopens its form with what was typed. */
function hasCorrectionFeedback(form: EnrollmentDetailProps["form"]): boolean {
  const fields = [
    ...Object.keys(form?.errors ?? {}),
    ...Object.keys(form?.values ?? {}),
  ];
  return fields.some((field) => field.startsWith("correct"));
}

const summaryClasses =
  "inline-flex min-h-11 cursor-pointer items-center font-semibold text-ink-900";

const linkClasses =
  "inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-sm text-ink-600">{label}</dt>
      <dd className="text-ink-900">{children}</dd>
    </div>
  );
}

function ConfirmPaymentForm({
  total,
  totalPesos,
  today,
  form,
}: {
  total: string;
  totalPesos: string;
  today: string;
  form: EnrollmentDetailProps["form"];
}) {
  const [pending, setPending] = useState(false);
  // A refused amount or day opens the options again, with what was typed.
  const typed =
    form?.errors?.amount !== undefined ||
    form?.errors?.paidOn !== undefined ||
    form?.values?.note !== undefined;
  return (
    <form
      method="post"
      aria-label={adminCopy.alumnas.file.pay}
      className="flex flex-col gap-3"
      onSubmit={() => {
        setPending(true);
      }}
    >
      <input type="hidden" name="intent" value="confirm" />
      <div>
        <Button type="submit" variant="success" disabled={pending}>
          {adminCopy.alumnas.file.pay}
        </Button>
      </div>
      <MoreOptions
        label={adminCopy.alumnas.file.otherAmount}
        defaultOpen={typed}
      >
        <TextField
          label={copy.confirm.amount}
          hint={copy.confirm.amountHint(total)}
          name="amount"
          inputMode="numeric"
          required
          defaultValue={form?.values?.amount ?? totalPesos}
          error={form?.errors?.amount}
        />
        <TextField
          label={copy.confirm.paidOn}
          name="paidOn"
          type="date"
          max={today}
          required
          defaultValue={form?.values?.paidOn ?? today}
          error={form?.errors?.paidOn}
        />
        <TextField
          label={copy.confirm.note}
          name="note"
          defaultValue={form?.values?.note ?? ""}
        />
      </MoreOptions>
    </form>
  );
}

function CancelOrderForm({
  form,
  refund,
  today,
  isSale,
}: {
  form: EnrollmentDetailProps["form"];
  refund: EnrollmentDetailOrder["cancelRefund"];
  today: string;
  isSale: boolean;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const wording = isSale ? copy.sale.cancel : copy.cancel;
  return (
    <form
      ref={formRef}
      method="post"
      aria-label={wording.title}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="intent" value="cancel" />
      <TextAreaField
        label={copy.cancel.reason}
        hint={copy.cancel.reasonHint}
        name="reason"
        required
        maxLength={300}
        defaultValue={form?.values?.reason ?? ""}
        error={form?.errors?.reason}
      />
      {refund ? (
        <fieldset className="flex flex-col gap-3 rounded-md bg-sand-100 p-4">
          <legend className="px-1 font-semibold text-ink-900">
            {copy.cancel.refundTitle}
          </legend>
          <TextField
            label={copy.cancel.refundAmount}
            hint={copy.cancel.refundAmountHint(refund.paid)}
            name="refundAmount"
            inputMode="numeric"
            required
            defaultValue={form?.values?.refundAmount ?? refund.paidPesos}
            error={form?.errors?.refundAmount}
          />
          <TextField
            label={copy.cancel.refundedOn}
            name="refundedOn"
            type="date"
            max={today}
            required
            defaultValue={form?.values?.refundedOn ?? today}
            error={form?.errors?.refundedOn}
          />
          <TextField
            label={copy.cancel.refundNote}
            name="refundNote"
            defaultValue={form?.values?.refundNote ?? ""}
            error={form?.errors?.refundNote}
          />
        </fieldset>
      ) : null}
      <div>
        <Button
          type="button"
          variant="danger"
          onClick={() => {
            setOpen(true);
          }}
        >
          {wording.title}
        </Button>
      </div>
      <ConfirmDialog
        open={open}
        title={wording.dialogTitle}
        message={refund ? wording.dialogMessageRefund : wording.dialogMessage}
        confirmLabel={wording.title}
        tone="destructive"
        onCancel={() => {
          setOpen(false);
        }}
        onConfirm={() => {
          setOpen(false);
          formRef.current?.requestSubmit();
        }}
      />
    </form>
  );
}

function MaterialsStep({ intent, label }: { intent: string; label: string }) {
  return (
    <form method="post">
      <input type="hidden" name="intent" value={intent} />
      <Button type="submit">{label}</Button>
    </form>
  );
}

/** The state of an order in plain words: paid, how much is owed, or cancelled. */
function stateOf(order: EnrollmentDetailOrder): {
  status: string;
  label: string;
} {
  if (order.status === "cancelled")
    return { status: "cancelled", label: adminCopy.alumnas.file.cancelled };
  if (order.status === "pending_confirmation")
    return {
      status: "pending_confirmation",
      label: adminCopy.alumnas.file.owes(order.total),
    };
  return { status: "paid", label: adminCopy.alumnas.file.paid };
}

/**
 * One order for the admin: a card with its state in words, the amount and the
 * action it needs right there, its sales nested under it, and everything else
 * (contact, totals, payment, history) behind "Ver más".
 */
export function EnrollmentDetail({
  order,
  form,
  feedback = null,
}: EnrollmentDetailProps) {
  const isSale = order.kind === "material_sale";
  const state = stateOf(order);
  const hasAction =
    order.actions.confirm ||
    order.actions.materialsRequested ||
    order.actions.materialsReceived;
  return (
    <section className="flex max-w-3xl flex-col gap-6">
      <AdminPageHeader
        title={
          isSale ? copy.sale.title(order.number) : copy.title(order.number)
        }
        breadcrumbs={[
          { label: "Panel", href: "/admin" },
          {
            label: adminMicrocopy.enrollments.title,
            href: "/admin/inscripciones",
          },
          { label: order.number },
        ]}
        back={{ href: "/admin/inscripciones", label: copy.back }}
      />
      {feedback ? (
        <AdminFeedback tone="success" title={copy.feedback[feedback]} />
      ) : null}
      <FormError message={form?.formError} />

      <section
        aria-label={copy.summary}
        className="flex flex-col gap-4 rounded-md bg-surface p-5 shadow-card"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <Heading level={2} size="h3">
              {order.studentName}
            </Heading>
            {order.parent ? (
              <a href={order.parent.href} className={linkClasses}>
                {copy.sale.parent(order.parent.number)}
              </a>
            ) : null}
          </div>
          <StatusChip status={state.status} label={state.label} />
        </div>
        <div
          data-order-total
          className={`flex items-baseline justify-between gap-4 border-t-2 border-clay-800 pt-3 text-2xl font-bold tabular-nums ${order.status === "pending_confirmation" ? "text-admin-warning-fg" : order.status === "cancelled" ? "text-admin-neutral-fg" : "text-admin-positive-fg"}`}
        >
          <span>{copy.totals.total}</span>
          <span className="font-display text-3xl font-semibold tabular-nums">
            {order.total}
          </span>
        </div>
        <p className="text-lg text-ink-700">
          {isSale
            ? `${order.workshopName} · ${order.month}`
            : `${order.workshopName} · ${order.month} · ${order.turno}`}
        </p>
        {order.lines.length > 0 ? (
          <ul
            aria-label={copy.lines}
            className="flex flex-col gap-1 text-lg text-ink-700"
          >
            {order.lines.map((line) => (
              <li key={line.label} className="flex flex-col">
                <span>{`${line.label} × ${String(line.quantity)}`}</span>
                {line.source === undefined ? null : (
                  <span className="text-sm text-ink-600">
                    {copy.lineSource[line.source]}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : null}
        {hasAction ? (
          <div className="flex flex-col gap-3">
            {order.actions.confirm ? (
              <ConfirmPaymentForm
                total={order.total}
                totalPesos={order.totalPesos}
                today={order.today}
                form={form}
              />
            ) : null}
            {order.actions.materialsRequested ? (
              <MaterialsStep
                intent="materials-requested"
                label={copy.materials.requested}
              />
            ) : null}
            {order.actions.materialsReceived ? (
              <MaterialsStep
                intent="materials-received"
                label={copy.materials.received}
              />
            ) : null}
          </div>
        ) : null}
      </section>

      {isSale ? null : (
        <AdminSection
          title={copy.sale.sectionTitle}
          actions={
            order.newSaleHref ? (
              <AdminButtonLink href={order.newSaleHref} variant="outline">
                {copy.sale.newSale}
              </AdminButtonLink>
            ) : undefined
          }
        >
          {(order.sales ?? []).length === 0 ? (
            <p>{adminCopy.alumnas.file.noSales}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {(order.sales ?? []).map((sale) => (
                <li
                  key={sale.id}
                  className="flex flex-col gap-2 rounded-md bg-sand-100 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <a href={sale.href} className={linkClasses}>
                      {sale.number}
                    </a>
                    <OrderStatusBadge
                      status={sale.status}
                      label={sale.statusLabel}
                    />
                  </div>
                  <span className="text-lg text-ink-900">{sale.total}</span>
                  {(sale.lines ?? []).length > 0 ? (
                    <ul className="text-lg text-ink-700">
                      {(sale.lines ?? []).map((line) => (
                        <li key={line.label}>
                          {`${line.label} × ${String(line.quantity)}`}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </AdminSection>
      )}

      {order.correction ? (
        <details
          open={hasCorrectionFeedback(form)}
          className="rounded-md bg-surface p-4 shadow-card"
        >
          <summary className={summaryClasses}>{copy.correction.title}</summary>
          <div className="mt-3">
            <EnrollmentCorrectionForm
              correction={order.correction}
              today={order.today}
              form={form}
            />
          </div>
        </details>
      ) : null}

      <MoreOptions label={adminCopy.alumnas.file.more}>
        <dl className="grid gap-3 md:grid-cols-2">
          <Fact label={copy.name}>{order.studentName}</Fact>
          <Fact label={copy.email}>{order.email}</Fact>
          <Fact label={copy.phone}>{order.phone}</Fact>
          <Fact label={copy.workshop}>{order.workshopName}</Fact>
          <Fact label={copy.month}>{order.month}</Fact>
          {isSale ? null : <Fact label={copy.turno}>{order.turno}</Fact>}
          {isSale ? null : <Fact label={copy.totals.fee}>{order.fee}</Fact>}
          <Fact label={copy.totals.materials}>{order.materialsTotal}</Fact>
        </dl>

        <AdminSection title={copy.lines}>
          {order.lines.length === 0 ? (
            <p>{copy.noLines}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-admin-line">
              {order.lines.map((line) => (
                <li
                  key={line.label}
                  className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0"
                >
                  <span className="font-semibold text-ink-900">
                    {line.label}
                  </span>
                  <span className="text-ink-700">{line.supplier}</span>
                  <span className="text-ink-700">
                    {`${String(line.quantity)} × ${line.unitPrice}`}
                  </span>
                  <span className="text-ink-900">{line.lineTotal}</span>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>

        {order.payment ? (
          <AdminSection title={copy.payment.title}>
            <dl className="grid gap-4 md:grid-cols-2">
              <Fact label={copy.payment.paidOn}>{order.payment.paidOn}</Fact>
              <Fact label={copy.payment.amount}>{order.payment.amount}</Fact>
              <Fact label={copy.payment.confirmedBy}>
                {order.payment.confirmedBy}
              </Fact>
              {order.payment.note ? (
                <Fact label={copy.payment.note}>{order.payment.note}</Fact>
              ) : null}
            </dl>
          </AdminSection>
        ) : null}

        {order.refund ? (
          <AdminSection title={copy.refund.title}>
            <dl className="grid gap-4 md:grid-cols-2">
              <Fact label={copy.refund.amount}>{order.refund.amount}</Fact>
              <Fact label={copy.refund.refundedOn}>
                {order.refund.refundedOn}
              </Fact>
              <Fact label={copy.refund.refundedBy}>
                {order.refund.refundedBy}
              </Fact>
              {order.refund.note ? (
                <Fact label={copy.refund.note}>{order.refund.note}</Fact>
              ) : null}
            </dl>
          </AdminSection>
        ) : null}

        <EnrollmentCorrectionHistory entries={order.corrections} />

        <details className="rounded-md bg-surface p-4 shadow-card">
          <summary className={summaryClasses}>{copy.moreData}</summary>
          <dl className="mt-3 grid gap-4 md:grid-cols-2">
            <Fact label={copy.requestedAt}>{order.requestedAt}</Fact>
            {order.policyVersion === null ? null : (
              <Fact label={copy.policyVersion}>{order.policyVersion}</Fact>
            )}
            <Fact label={copy.acceptance}>{order.acceptance}</Fact>
            {isSale ? null : (
              <Fact label={copy.order}>
                {copy.seat(order.seat.confirmed, order.seat.capacity)}
              </Fact>
            )}
          </dl>
        </details>

        <details className="rounded-md bg-surface p-4 shadow-card">
          <summary className={summaryClasses}>{copy.audit.title}</summary>
          <ol className="mt-3 flex flex-col gap-3">
            {order.audit.map((entry, index) => (
              <li
                key={`${entry.at}-${String(index)}`}
                className="flex flex-col gap-1 border-l-2 border-sand-200 pl-3"
              >
                <span className="text-sm text-ink-600">{entry.at}</span>
                <span className="text-ink-900">
                  {`${entry.from ?? copy.audit.creation} → ${entry.to}`}
                </span>
                <span className="text-ink-700">{entry.actor}</span>
                {entry.note ? (
                  <span className="text-ink-700">{entry.note}</span>
                ) : null}
              </li>
            ))}
          </ol>
        </details>
      </MoreOptions>

      {order.actions.cancel ? (
        <AdminDangerZone title={copy.dangerTitle}>
          <CancelOrderForm
            form={form}
            refund={order.cancelRefund}
            today={order.today}
            isSale={isSale}
          />
        </AdminDangerZone>
      ) : null}
    </section>
  );
}
