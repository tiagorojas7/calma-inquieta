import type { ReactNode } from "react";
import type {
  IntensiveRequestGroup,
  IntensiveRequestRow,
} from "~/app/intensive-requests/admin-view";
import { Button } from "../atoms/button";
import { Heading } from "../atoms/heading";
import { AdminButtonLink } from "./admin-button-link";
import { FormError, TextField } from "./form-fields";
import { adminMicrocopy } from "./microcopy";

const copy = adminMicrocopy.intensiveRequests;

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
      {status !== "cancelled" ? <CancelForm row={row} feedback={own} /> : null}
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
}: {
  view: IntensiveRequestsViewData;
  feedback: IntensiveRequestFeedback | undefined;
}) {
  const { intensivo, groups } = view;
  return (
    <section className="flex flex-col gap-6">
      <Heading level={1}>{`${copy.title}: ${intensivo.name}`}</Heading>
      <div>
        <AdminButtonLink
          variant="outline"
          href={`/admin/intensivos/${intensivo.id}`}
        >
          {copy.back}
        </AdminButtonLink>
      </div>
      <dl className="grid gap-4 md:grid-cols-4">
        <Fact label={copy.summary.date}>{intensivo.dateLine}</Fact>
        <Fact label={copy.summary.deposit}>{intensivo.deposit}</Fact>
        <Fact label={copy.summary.seats}>{intensivo.seats}</Fact>
        <Fact label={copy.summary.minSeats}>{intensivo.minSeats}</Fact>
      </dl>
      {groups.map((group) => (
        <section
          key={group.status}
          aria-labelledby={`group-${group.status}`}
          className="flex flex-col gap-4"
        >
          <Heading level={2} id={`group-${group.status}`}>
            {`${group.title} (${String(group.rows.length)})`}
          </Heading>
          {group.rows.length === 0 ? (
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
          )}
        </section>
      ))}
    </section>
  );
}
