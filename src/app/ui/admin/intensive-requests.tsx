import type { ReactNode } from "react";
import { AdminButton as Button } from "./admin-button";
import { Heading } from "../atoms/heading";
import { AdminFeedback, AdminPageHeader } from "./admin-page";
import { FormError, TextField } from "./form-fields";
import { adminMicrocopy } from "./microcopy";

const copy = adminMicrocopy.intensiveRequests;

/** Label of the project fact; the shared admin microcopy file is not edited here. */
const PROJECT_LABEL = "Proyecto";

/** Plain display strings of one request; the delivery layer builds them. */
export interface IntensiveRequestRow {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly whatsappHref: string | undefined;
  /** The project the person chose; null for a request made before projects. */
  readonly projectName: string | null;
  readonly reference: string;
  readonly receivedAt: string;
  /** "Condiciones v2 · Privacidad v3", or that there is no record. */
  readonly acceptance: string;
  /** The terms the person was quoted: price, deposit and what the deposit left. */
  readonly price: string;
  readonly deposit: string;
  /** Whole pesos, as the confirm form prefills them. */
  readonly depositInput: string;
  /** The balance still owed after the deposit; null when the deposit covered it all. */
  readonly balanceDue: string | null;
  readonly balanceInput: string;
  /** The one full balance payment, once recorded. */
  readonly balance: {
    readonly amount: string;
    readonly paidOn: string;
    readonly note: string | null;
    readonly by: string | null;
  } | null;
  /** Deposit plus balance, as text and as whole pesos for the refund form. */
  readonly paidTotal: string | null;
  readonly paidTotalInput: string;
  readonly refund: {
    readonly amount: string;
    readonly refundedOn: string;
    readonly note: string | null;
  } | null;
  readonly paidAmount: string | null;
  readonly paidOn: string | null;
  readonly paymentNote: string | null;
  readonly confirmedBy: string | null;
  readonly cancelReason: string | null;
  readonly cancelledBy: string | null;
}

export interface IntensiveRequestGroup {
  readonly status: "pending_confirmation" | "confirmed" | "cancelled";
  readonly title: string;
  readonly rows: readonly IntensiveRequestRow[];
}

export interface IntensiveRequestsViewData {
  readonly intensivo: {
    readonly id: string;
    readonly name: string;
    readonly dateLine: string;
    readonly deposit: string;
    readonly today: string;
    readonly seats: string;
    readonly minSeats: string;
  };
  readonly groups: readonly IntensiveRequestGroup[];
}

/** What a rejected form sends back: only that request's forms show it. */
export interface IntensiveRequestFeedback {
  readonly requestId: string;
  readonly intent: "confirm" | "balance" | "cancel";
  readonly formError: string | undefined;
  readonly errors: Readonly<
    Partial<
      Record<
        | "amount"
        | "paidOn"
        | "note"
        | "reason"
        | "refundAmount"
        | "refundedOn"
        | "refundNote",
        string
      >
    >
  >;
  readonly values: Readonly<Record<string, string>>;
}

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

function ConfirmForm({
  row,
  intensivo,
  feedback,
}: {
  row: IntensiveRequestRow;
  intensivo: IntensiveRequestsViewData["intensivo"];
  feedback: IntensiveRequestFeedback | undefined;
}) {
  const f = copy.confirmForm;
  const shown = feedback?.intent === "confirm" ? feedback : undefined;
  return (
    <form
      method="post"
      aria-label={`${f.label}: ${row.name}`}
      className="flex max-w-prose flex-col gap-3"
    >
      <input type="hidden" name="intent" value="confirm" />
      <input type="hidden" name="requestId" value={row.id} />
      <FormError message={shown?.formError} />
      <TextField
        label={f.amount}
        hint={f.amountHint(row.deposit)}
        name="amount"
        inputMode="numeric"
        required
        defaultValue={shown?.values["amount"] ?? row.depositInput}
        error={shown?.errors.amount}
      />
      <TextField
        label={f.paidOn}
        name="paidOn"
        type="date"
        max={intensivo.today}
        required
        defaultValue={shown?.values["paidOn"] ?? intensivo.today}
        error={shown?.errors.paidOn}
      />
      <TextField
        label={f.note}
        name="note"
        maxLength={500}
        defaultValue={shown?.values["note"] ?? ""}
        error={shown?.errors.note}
      />
      <div>
        <Button type="submit" variant="success">
          {f.submit}
        </Button>
      </div>
    </form>
  );
}

function BalanceForm({
  row,
  intensivo,
  feedback,
}: {
  row: IntensiveRequestRow;
  intensivo: IntensiveRequestsViewData["intensivo"];
  feedback: IntensiveRequestFeedback | undefined;
}) {
  const f = copy.balanceForm;
  const shown = feedback?.intent === "balance" ? feedback : undefined;
  return (
    <form
      method="post"
      aria-label={`${f.label}: ${row.name}`}
      className="flex max-w-prose flex-col gap-3"
    >
      <input type="hidden" name="intent" value="balance" />
      <input type="hidden" name="requestId" value={row.id} />
      <FormError message={shown?.formError} />
      <TextField
        label={f.amount}
        hint={f.amountHint(row.balanceDue ?? "")}
        name="amount"
        inputMode="numeric"
        required
        defaultValue={shown?.values["amount"] ?? row.balanceInput}
        error={shown?.errors.amount}
      />
      <TextField
        label={f.paidOn}
        name="paidOn"
        type="date"
        max={intensivo.today}
        required
        defaultValue={shown?.values["paidOn"] ?? intensivo.today}
        error={shown?.errors.paidOn}
      />
      <TextField
        label={f.note}
        name="note"
        maxLength={500}
        defaultValue={shown?.values["note"] ?? ""}
        error={shown?.errors.note}
      />
      <div>
        <Button type="submit" variant="success">
          {f.submit}
        </Button>
      </div>
    </form>
  );
}

function CancelForm({
  row,
  status,
  intensivo,
  feedback,
}: {
  row: IntensiveRequestRow;
  status: IntensiveRequestGroup["status"];
  intensivo: IntensiveRequestsViewData["intensivo"];
  feedback: IntensiveRequestFeedback | undefined;
}) {
  const f = copy.cancelForm;
  const shown = feedback?.intent === "cancel" ? feedback : undefined;
  return (
    <form
      method="post"
      aria-label={`${f.label}: ${row.name}`}
      className="flex max-w-prose flex-col gap-3"
    >
      <input type="hidden" name="intent" value="cancel" />
      <input type="hidden" name="requestId" value={row.id} />
      <p className="text-ink-700">{copy.cancelConsequence}</p>
      <FormError message={shown?.formError} />
      <TextField
        label={f.reason}
        hint={f.reasonHint}
        name="reason"
        required
        maxLength={300}
        defaultValue={shown?.values["reason"] ?? ""}
        error={shown?.errors.reason}
      />
      {status === "confirmed" ? (
        <fieldset className="flex flex-col gap-3 rounded-md bg-sand-100 p-4">
          <legend className="px-1 font-semibold text-ink-900">
            {f.refundTitle}
          </legend>
          <TextField
            label={f.refundAmount}
            hint={f.refundAmountHint(row.paidTotal ?? "")}
            name="refundAmount"
            inputMode="numeric"
            required
            defaultValue={shown?.values["refundAmount"] ?? row.paidTotalInput}
            error={shown?.errors.refundAmount}
          />
          <TextField
            label={f.refundedOn}
            name="refundedOn"
            type="date"
            max={intensivo.today}
            required
            defaultValue={shown?.values["refundedOn"] ?? intensivo.today}
            error={shown?.errors.refundedOn}
          />
          <TextField
            label={f.refundNote}
            name="refundNote"
            maxLength={300}
            defaultValue={shown?.values["refundNote"] ?? ""}
            error={shown?.errors.refundNote}
          />
        </fieldset>
      ) : null}
      <div>
        <Button type="submit" variant="danger">
          {f.submit}
        </Button>
      </div>
    </form>
  );
}

function RequestCard({
  status,
  row,
  intensivo,
  feedback,
}: {
  status: IntensiveRequestGroup["status"];
  row: IntensiveRequestRow;
  intensivo: IntensiveRequestsViewData["intensivo"];
  feedback: IntensiveRequestFeedback | undefined;
}) {
  const own = feedback?.requestId === row.id ? feedback : undefined;
  return (
    <article
      aria-label={row.name}
      className="flex flex-col gap-4 rounded-md bg-surface p-4 shadow-card"
    >
      <Heading level={3}>{row.name}</Heading>
      <dl className="grid gap-3 md:grid-cols-2">
        <Fact label={copy.fields.email}>{row.email}</Fact>
        <Fact label={copy.fields.phone}>
          {row.phone}
          {row.whatsappHref ? (
            <>
              {" "}
              <a
                href={row.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClasses}
              >
                {copy.whatsapp}
              </a>
            </>
          ) : null}
        </Fact>
        {row.projectName === null ? null : (
          <Fact label={PROJECT_LABEL}>{row.projectName}</Fact>
        )}
        <Fact label={copy.fields.received}>{row.receivedAt}</Fact>
        <Fact label={copy.fields.reference}>{row.reference}</Fact>
        <Fact label={copy.fields.acceptance}>{row.acceptance}</Fact>
        <Fact label={copy.fields.price}>{row.price}</Fact>
        {status === "pending_confirmation" ? (
          <Fact label={copy.summary.deposit}>{row.deposit}</Fact>
        ) : null}
        {status !== "pending_confirmation" && row.paidAmount !== null ? (
          <>
            <Fact label={copy.fields.paidAmount}>{row.paidAmount}</Fact>
            <Fact label={copy.fields.paidOn}>{row.paidOn}</Fact>
            {row.paymentNote ? (
              <Fact label={copy.fields.note}>{row.paymentNote}</Fact>
            ) : null}
            {row.confirmedBy ? (
              <Fact label={copy.fields.confirmed}>{row.confirmedBy}</Fact>
            ) : null}
          </>
        ) : null}
        {status === "confirmed" || row.balance !== null ? (
          <Fact label={copy.fields.balance}>
            {row.balance !== null
              ? copy.balanceState.paid(row.balance.amount, row.balance.paidOn)
              : row.balanceDue !== null
                ? copy.balanceState.due(row.balanceDue)
                : copy.balanceState.none}
          </Fact>
        ) : null}
        {row.balance?.note ? (
          <Fact label={copy.fields.balanceNote}>{row.balance.note}</Fact>
        ) : null}
        {row.balance?.by ? (
          <Fact label={copy.fields.balanceBy}>{row.balance.by}</Fact>
        ) : null}
        {status === "cancelled" ? (
          <>
            <Fact label={copy.fields.cancelReason}>{row.cancelReason}</Fact>
            {row.cancelledBy ? (
              <Fact label={copy.fields.cancelled}>{row.cancelledBy}</Fact>
            ) : null}
            {row.refund !== null ? (
              <>
                <Fact label={copy.fields.refund}>{row.refund.amount}</Fact>
                <Fact label={copy.fields.refundedOn}>
                  {row.refund.refundedOn}
                </Fact>
                {row.refund.note ? (
                  <Fact label={copy.fields.refundNote}>{row.refund.note}</Fact>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}
      </dl>
      {status === "pending_confirmation" ? (
        <ConfirmForm row={row} intensivo={intensivo} feedback={own} />
      ) : null}
      {status === "confirmed" &&
      row.balance === null &&
      row.balanceDue !== null ? (
        <BalanceForm row={row} intensivo={intensivo} feedback={own} />
      ) : null}
      {status !== "cancelled" ? (
        <details open={own?.intent === "cancel"} className="max-w-prose">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-clay-800 underline underline-offset-4">
            {copy.cancelStep}
          </summary>
          <div className="pt-3">
            <CancelForm
              row={row}
              status={status}
              intensivo={intensivo}
              feedback={own}
            />
          </div>
        </details>
      ) : null}
    </article>
  );
}

/**
 * Reservations of one intensivo, grouped by status. Every action is a native
 * form post and every link a plain anchor: the Worker gate refuses the `.data`
 * requests a client navigation makes.
 */
export function IntensiveRequestsScreen({
  view,
  feedback,
  done = null,
}: {
  view: IntensiveRequestsViewData;
  feedback: IntensiveRequestFeedback | undefined;
  done?: keyof typeof copy.feedback | null | undefined;
}) {
  const { intensivo, groups } = view;
  return (
    <section className="flex flex-col gap-6">
      <AdminPageHeader
        title={`${copy.title}: ${intensivo.name}`}
        breadcrumbs={[
          { label: "Panel", href: "/admin" },
          { label: adminMicrocopy.intensives.title, href: "/admin/intensivos" },
          { label: intensivo.name, href: `/admin/intensivos/${intensivo.id}` },
          { label: copy.title },
        ]}
        back={{ href: `/admin/intensivos/${intensivo.id}`, label: copy.back }}
      />
      {done ? (
        <AdminFeedback tone="success" title={copy.feedback[done]} />
      ) : null}
      <dl className="grid gap-4 md:grid-cols-4">
        <Fact label={copy.summary.date}>{intensivo.dateLine}</Fact>
        <Fact label={copy.summary.deposit}>{intensivo.deposit}</Fact>
        <Fact label={copy.summary.seats}>{intensivo.seats}</Fact>
        <Fact label={copy.summary.minSeats}>{intensivo.minSeats}</Fact>
      </dl>
      {groups.map((group) => {
        const heading = (
          <Heading level={2} id={`group-${group.status}`}>
            {`${group.title} (${String(group.rows.length)})`}
          </Heading>
        );
        const body =
          group.rows.length === 0 ? (
            <p className="text-ink-700">{copy.empty}</p>
          ) : (
            group.rows.map((row) => (
              <RequestCard
                key={row.id}
                status={group.status}
                row={row}
                intensivo={intensivo}
                feedback={feedback}
              />
            ))
          );
        // Finished groups start collapsed so the pending work comes first.
        return group.status === "pending_confirmation" ? (
          <section
            key={group.status}
            aria-labelledby={`group-${group.status}`}
            className="flex flex-col gap-4"
          >
            {heading}
            {body}
          </section>
        ) : (
          <details
            key={group.status}
            open={feedback !== undefined && feedback.intent !== "confirm"}
            className="flex flex-col gap-4"
          >
            <summary className="min-h-11 cursor-pointer">{heading}</summary>
            <div className="flex flex-col gap-4 pt-4">{body}</div>
          </details>
        );
      })}
    </section>
  );
}
