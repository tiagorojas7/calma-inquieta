import { useRef, useState, type ReactNode } from "react";
import { Button } from "../atoms/button";
import { Heading } from "../atoms/heading";
import { AdminButtonLink } from "./admin-button-link";
import { ConfirmDialog } from "./confirm-dialog";
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
  readonly policyVersion: string;
  readonly fee: string;
  readonly materialsTotal: string;
  readonly total: string;
  readonly lines: readonly {
    label: string;
    supplier: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
  }[];
  readonly payment: {
    paidOn: string;
    amount: string;
    confirmedBy: string;
    note: string | null;
  } | null;
  readonly seat: { confirmed: number; capacity: number };
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

export interface EnrollmentDetailProps {
  readonly order: EnrollmentDetailOrder;
  readonly form?: {
    readonly formError?: string | undefined;
    readonly errors?: Partial<Record<"amount" | "paidOn" | "reason", string>>;
    readonly values?: Partial<
      Record<"amount" | "paidOn" | "note" | "reason", string>
    >;
  };
}

const copy = adminMicrocopy.enrollments.detail;

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
  today,
  form,
}: {
  total: string;
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
        defaultValue={form?.values?.amount ?? ""}
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
        <Button type="submit" disabled={pending}>
          {copy.confirm.submit}
        </Button>
      </div>
    </form>
  );
}

function CancelOrderForm({ form }: { form: EnrollmentDetailProps["form"] }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={formRef}
      method="post"
      aria-label={copy.cancel.title}
      className="flex flex-col gap-3 rounded-md bg-surface p-4 shadow-card"
    >
      <Heading level={2} size="h3">
        {copy.cancel.title}
      </Heading>
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
      <div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setOpen(true);
          }}
        >
          {copy.cancel.submit}
        </Button>
      </div>
      <ConfirmDialog
        open={open}
        title={copy.cancel.dialogTitle}
        message={copy.cancel.dialogMessage}
        confirmLabel={copy.cancel.submit}
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

const cell = "px-4 py-3";
const head = "px-4 py-3 font-semibold";

/** One order for the admin: every stored field, the seat state and the actions its status allows. */
export function EnrollmentDetail({ order, form }: EnrollmentDetailProps) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading level={1}>{copy.title(order.number)}</Heading>
        <OrderStatusBadge status={order.status} label={order.statusLabel} />
      </div>
      <AdminButtonLink variant="outline" href="/admin/inscripciones">
        {copy.back}
      </AdminButtonLink>
      <FormError message={form?.formError} />

      <dl className="grid gap-4 md:grid-cols-2">
        <Fact label={copy.name}>{order.studentName}</Fact>
        <Fact label={copy.email}>{order.email}</Fact>
        <Fact label={copy.phone}>{order.phone}</Fact>
        <Fact label={copy.workshop}>{order.workshopName}</Fact>
        <Fact label={copy.month}>{order.month}</Fact>
        <Fact label={copy.turno}>{order.turno}</Fact>
        <Fact label={copy.requestedAt}>{order.requestedAt}</Fact>
        <Fact label={copy.policyVersion}>{order.policyVersion}</Fact>
        <Fact label={copy.order}>
          {copy.seat(order.seat.confirmed, order.seat.capacity)}
        </Fact>
      </dl>

      <section className="flex flex-col gap-3">
        <Heading level={2}>{copy.lines}</Heading>
        {order.lines.length === 0 ? (
          <p>{copy.noLines}</p>
        ) : (
          <div
            role="region"
            aria-label={copy.lines}
            tabIndex={0}
            className="overflow-x-auto rounded-md bg-surface shadow-card"
          >
            <table className="w-full text-left text-base text-ink-700">
              <caption className="sr-only">{copy.lines}</caption>
              <thead className="bg-sand-100 text-ink-900">
                <tr>
                  <th scope="col" className={head}>
                    {copy.lineColumns.material}
                  </th>
                  <th scope="col" className={head}>
                    {copy.lineColumns.supplier}
                  </th>
                  <th scope="col" className={head}>
                    {copy.lineColumns.quantity}
                  </th>
                  <th scope="col" className={head}>
                    {copy.lineColumns.unitPrice}
                  </th>
                  <th scope="col" className={head}>
                    {copy.lineColumns.total}
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((line) => (
                  <tr key={line.label} className="border-t border-sand-200">
                    <td className={cell}>{line.label}</td>
                    <td className={cell}>{line.supplier}</td>
                    <td className={cell}>{String(line.quantity)}</td>
                    <td className={cell}>{line.unitPrice}</td>
                    <td className={cell}>{line.lineTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <dl className="grid gap-2 md:grid-cols-3">
          <Fact label={copy.totals.fee}>{order.fee}</Fact>
          <Fact label={copy.totals.materials}>{order.materialsTotal}</Fact>
          <Fact label={copy.totals.total}>{order.total}</Fact>
        </dl>
      </section>

      {order.payment ? (
        <section className="flex flex-col gap-3">
          <Heading level={2}>{copy.payment.title}</Heading>
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
        </section>
      ) : null}

      {order.actions.confirm ? (
        <ConfirmPaymentForm
          total={order.total}
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
      {order.actions.cancel ? <CancelOrderForm form={form} /> : null}

      <section className="flex flex-col gap-3">
        <Heading level={2}>{copy.audit.title}</Heading>
        <div
          role="region"
          aria-label={copy.audit.title}
          tabIndex={0}
          className="overflow-x-auto rounded-md bg-surface shadow-card"
        >
          <table className="w-full text-left text-base text-ink-700">
            <caption className="sr-only">{copy.audit.title}</caption>
            <thead className="bg-sand-100 text-ink-900">
              <tr>
                <th scope="col" className={head}>
                  {copy.audit.at}
                </th>
                <th scope="col" className={head}>
                  {copy.audit.actor}
                </th>
                <th scope="col" className={head}>
                  {copy.audit.from}
                </th>
                <th scope="col" className={head}>
                  {copy.audit.to}
                </th>
                <th scope="col" className={head}>
                  {copy.audit.note}
                </th>
              </tr>
            </thead>
            <tbody>
              {order.audit.map((entry, index) => (
                <tr
                  key={`${entry.at}-${String(index)}`}
                  className="border-t border-sand-200"
                >
                  <td className={cell}>{entry.at}</td>
                  <td className={cell}>{entry.actor}</td>
                  <td className={cell}>{entry.from ?? copy.audit.creation}</td>
                  <td className={cell}>{entry.to}</td>
                  <td className={cell}>{entry.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
