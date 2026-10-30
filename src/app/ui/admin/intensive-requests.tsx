import type { ReactNode } from "react";
import { AdminButton as Button } from "./admin-button";
import { Heading } from "../atoms/heading";
import { AdminFeedback, AdminPageHeader } from "./admin-page";
import { FormError, TextField } from "./form-fields";
import { adminMicrocopy } from "./microcopy";

const copy = adminMicrocopy.intensiveRequests;

/** Plain display strings of one request; the delivery layer builds them. */
export interface IntensiveRequestRow {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly whatsappHref: string | undefined;
  readonly reference: string;
  readonly receivedAt: string;
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
    readonly depositInput: string;
    readonly today: string;
    readonly seats: string;
    readonly minSeats: string;
  };
  readonly groups: readonly IntensiveRequestGroup[];
}

/** What a rejected form sends back: only that request's forms show it. */
export interface IntensiveRequestFeedback {
  readonly requestId: string;
  readonly intent: "confirm" | "cancel";
  readonly formError: string | undefined;
  readonly errors: Readonly<
    Partial<Record<"amount" | "paidOn" | "note" | "reason", string>>
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
        hint={f.amountHint}
        name="amount"
        inputMode="numeric"
        required
        defaultValue={shown?.values["amount"] ?? intensivo.depositInput}
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
        <Button type="submit">{f.submit}</Button>
      </div>
    </form>
  );
}

function CancelForm({
  row,
  feedback,
}: {
  row: IntensiveRequestRow;
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
      <div>
        <Button type="submit" variant="outline">
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
        <Fact label={copy.fields.received}>{row.receivedAt}</Fact>
        <Fact label={copy.fields.reference}>{row.reference}</Fact>
        {status === "confirmed" ? (
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
        {status === "cancelled" ? (
          <>
            <Fact label={copy.fields.cancelReason}>{row.cancelReason}</Fact>
            {row.cancelledBy ? (
              <Fact label={copy.fields.cancelled}>{row.cancelledBy}</Fact>
            ) : null}
          </>
        ) : null}
      </dl>
      {status === "pending_confirmation" ? (
        <ConfirmForm row={row} intensivo={intensivo} feedback={own} />
      ) : null}
      {status !== "cancelled" ? (
        <details open={own?.intent === "cancel"} className="max-w-prose">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-clay-800 underline underline-offset-4">
            {copy.cancelStep}
          </summary>
          <div className="pt-3">
            <CancelForm row={row} feedback={own} />
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
            open={feedback !== undefined && feedback.intent === "cancel"}
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
