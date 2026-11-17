import { useRef, useState, type ReactNode } from "react";
import { AdminButton as Button } from "./admin-button";
import { Heading } from "../atoms/heading";
import { AdminFeedback, AdminPageHeader } from "./admin-page";
import { AdminButtonLink } from "./admin-button-link";
import { AdminDangerZone, AdminSection } from "./admin-sections";
import { ConfirmDialog } from "./confirm-dialog";
import {
  EnrollmentCorrectionForm,
  EnrollmentCorrectionHistory,
  type CorrectionFormField,
  type CorrectionFormModel,
  type CorrectionHistoryEntry,
} from "./enrollment-correction";
import { FormError, TextAreaField, TextField } from "./form-fields";
import { adminMicrocopy } from "./microcopy";
import { OrderStatusBadge } from "./order-status-badge";

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
  return (
    <form
      method="post"
      aria-label={copy.confirm.title}
      className="flex flex-col gap-3 rounded-md bg-surface p-4 shadow-card"
      onSubmit={() => {
        setPending(true);
      }}
    >
      <Heading level={2} size="h3">
        {copy.confirm.title}
      </Heading>
      <input type="hidden" name="intent" value="confirm" />
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
      <div>
        <Button type="submit" variant="success" disabled={pending}>
          {copy.confirm.submit}
        </Button>
      </div>
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

type StepState = keyof typeof copy.stepState;

/** The workflow steps and where the order is; a cancelled order has none. */
function progress(order: EnrollmentDetailOrder) {
  if (order.status === "cancelled") return null;
  const steps = [
    copy.steps.confirm,
    ...(order.lines.length > 0 ? [copy.steps.request, copy.steps.receive] : []),
  ];
  const current =
    order.status === "pending_confirmation"
      ? 0
      : order.status === "paid"
        ? 1
        : order.status === "materials_requested"
          ? 2
          : 3;
  return steps.map((label, index): { label: string; state: StepState } => ({
    label,
    state: index < current ? "done" : index === current ? "current" : "todo",
  }));
}

function nextStepText(order: EnrollmentDetailOrder): string {
  if (order.status === "paid" && order.lines.length === 0)
    return copy.next.paidNoMaterials;
  if (order.status === "paid" && order.actions.materialsReceived)
    return copy.next.paidFromStock;
  const known: Record<string, string> = copy.next;
  return known[order.status] ?? copy.next.cancelled;
}

/** One order for the admin: summary, progress, the one next step, and the rest behind disclosures. */
export function EnrollmentDetail({
  order,
  form,
  feedback = null,
}: EnrollmentDetailProps) {
  const steps = progress(order);
  const isSale = order.kind === "material_sale";
  return (
    <section className="flex flex-col gap-6">
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
        actions={
          <OrderStatusBadge status={order.status} label={order.statusLabel} />
        }
      />
      {feedback ? (
        <AdminFeedback tone="success" title={copy.feedback[feedback]} />
      ) : null}
      <FormError message={form?.formError} />

      <div
        data-detail-grid
        className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
      >
        <div data-detail-facts className="flex flex-col gap-6 lg:order-2">
          <AdminSection title={copy.summary}>
            <dl className="flex flex-col gap-3">
              {order.parent ? (
                <Fact label={copy.sale.parentLabel}>
                  <a href={order.parent.href} className={linkClasses}>
                    {copy.sale.parent(order.parent.number)}
                  </a>
                </Fact>
              ) : null}
              <Fact label={copy.name}>{order.studentName}</Fact>
              <Fact label={copy.email}>{order.email}</Fact>
              <Fact label={copy.phone}>{order.phone}</Fact>
              <Fact label={copy.workshop}>{order.workshopName}</Fact>
              <Fact label={copy.month}>{order.month}</Fact>
              {isSale ? null : <Fact label={copy.turno}>{order.turno}</Fact>}
            </dl>
          </AdminSection>
          <div className="flex flex-col gap-2 rounded-md bg-surface p-5 shadow-card lg:p-6">
            <dl className="flex flex-col gap-2">
              {isSale ? null : <Fact label={copy.totals.fee}>{order.fee}</Fact>}
              <Fact label={copy.totals.materials}>{order.materialsTotal}</Fact>
              <div
                data-order-total
                className="mt-1 flex items-baseline justify-between gap-4 border-t-2 border-clay-800 pt-3"
              >
                <dt>{copy.totals.total}</dt>
                <dd className="font-display text-3xl font-semibold tabular-nums">
                  {order.total}
                </dd>
              </div>
            </dl>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-6 lg:order-1">
          {steps ? (
            <ol
              aria-label={copy.progressLabel}
              className="grid gap-2 md:grid-cols-3"
            >
              {steps.map((step) => (
                <li
                  key={step.label}
                  aria-current={step.state === "current" ? "step" : undefined}
                  className={`rounded-md p-3 ${step.state === "current" ? "bg-sand-200 font-semibold text-ink-900" : "bg-surface text-ink-700 shadow-card"}`}
                >
                  {`${step.label} (${copy.stepState[step.state]})`}
                </li>
              ))}
            </ol>
          ) : null}

          <AdminSection
            title={copy.nextStepTitle}
            description={nextStepText(order)}
          >
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
          </AdminSection>

          {order.correction ? (
            <details
              open={hasCorrectionFeedback(form)}
              className="rounded-md bg-surface p-4 shadow-card"
            >
              <summary className={summaryClasses}>
                {copy.correction.title}
              </summary>
              <div className="mt-3">
                <EnrollmentCorrectionForm
                  correction={order.correction}
                  today={order.today}
                  form={form}
                />
              </div>
            </details>
          ) : null}

          {isSale ? null : (
            <AdminSection
              title={copy.sale.sectionTitle}
              description={copy.sale.sectionHint}
              actions={
                order.newSaleHref ? (
                  <AdminButtonLink href={order.newSaleHref} variant="outline">
                    {copy.sale.newSale}
                  </AdminButtonLink>
                ) : undefined
              }
            >
              {(order.sales ?? []).length === 0 ? (
                <p>{copy.sale.empty}</p>
              ) : (
                <ul className="flex flex-col divide-y divide-admin-line">
                  {(order.sales ?? []).map((sale) => (
                    <li
                      key={sale.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex min-w-0 flex-col">
                        <a href={sale.href} className={linkClasses}>
                          {sale.number}
                        </a>
                        <span className="text-sm text-ink-700">
                          {sale.requestedOn}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-ink-900">{sale.total}</span>
                        <OrderStatusBadge
                          status={sale.status}
                          label={sale.statusLabel}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </AdminSection>
          )}

          <AdminSection title={copy.lines}>
            {order.lines.length === 0 ? (
              <p>{copy.noLines}</p>
            ) : (
              <ul
                aria-label={copy.lines}
                className="flex flex-col divide-y divide-admin-line"
              >
                {order.lines.map((line) => (
                  <li
                    key={line.label}
                    className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="font-semibold text-ink-900">
                      {line.label}
                    </span>
                    <span className="text-ink-700">{line.supplier}</span>
                    {line.source === undefined ? null : (
                      <span className="text-ink-700">
                        {copy.lineSource[line.source]}
                      </span>
                    )}
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
        </div>
      </div>
    </section>
  );
}
