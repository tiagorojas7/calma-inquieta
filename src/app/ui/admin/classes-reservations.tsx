import { AdminActionCard } from "./action-card";
import { AdminButton as Button } from "./admin-button";
import { adminCopy } from "./copy";
import { FormError, ReturnToFields, TextField } from "./form-fields";
import type {
  IntensiveRequestFeedback,
  IntensiveRequestGroup,
  IntensiveRequestRow,
} from "./intensive-requests";
import { MoreOptions } from "./more-options";

const copy = adminCopy.clases.reservation;

/** The anchor of one person's card: the page comes back to it after a post. */
export function reservationAnchor(requestId: string): string {
  return `reserva-${requestId}`;
}

interface CardContext {
  readonly intensivoId: string;
  readonly today: string;
  /** The page the forms came from, with its query. */
  readonly returnTo: string;
  readonly feedback: IntensiveRequestFeedback | undefined;
  readonly headingLevel: 2 | 3 | 4;
}

function Hidden({
  row,
  intent,
  context,
}: {
  row: IntensiveRequestRow;
  intent: "confirm" | "balance" | "cancel";
  context: CardContext;
}) {
  return (
    <>
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="requestId" value={row.id} />
      <input type="hidden" name="intensiveId" value={context.intensivoId} />
      <ReturnToFields
        to={context.returnTo}
        anchor={reservationAnchor(row.id)}
      />
    </>
  );
}

/** One tap records the quoted amount today; the amount and date sit behind a link. */
function PaymentForm({
  row,
  intent,
  label,
  amountInput,
  context,
  own,
}: {
  row: IntensiveRequestRow;
  intent: "confirm" | "balance";
  label: string;
  amountInput: string;
  context: CardContext;
  own: IntensiveRequestFeedback | undefined;
}) {
  const shown = own?.intent === intent ? own : undefined;
  const failed =
    shown !== undefined &&
    (shown.formError !== undefined || Object.keys(shown.errors).length > 0);
  return (
    <form
      method="post"
      aria-label={`${label}: ${row.name}`}
      className="flex w-full flex-col gap-3"
    >
      <Hidden row={row} intent={intent} context={context} />
      <FormError message={shown?.formError} />
      <div>
        <Button type="submit" variant="success">
          {label}
        </Button>
      </div>
      <MoreOptions label={copy.otherAmount} defaultOpen={failed}>
        <TextField
          label={copy.amount}
          name="amount"
          inputMode="numeric"
          defaultValue={shown?.values["amount"] ?? amountInput}
          error={shown?.errors.amount}
        />
        <TextField
          label={copy.paidOn}
          name="paidOn"
          type="date"
          max={context.today}
          defaultValue={shown?.values["paidOn"] ?? context.today}
          error={shown?.errors.paidOn}
        />
        <TextField
          label={copy.note}
          name="note"
          maxLength={500}
          defaultValue={shown?.values["note"] ?? ""}
          error={shown?.errors.note}
        />
      </MoreOptions>
    </form>
  );
}

function CancelForm({
  row,
  confirmed,
  context,
  own,
}: {
  row: IntensiveRequestRow;
  confirmed: boolean;
  context: CardContext;
  own: IntensiveRequestFeedback | undefined;
}) {
  const shown = own?.intent === "cancel" ? own : undefined;
  return (
    <form
      method="post"
      aria-label={`${copy.cancel}: ${row.name}`}
      className="flex w-full flex-col gap-3"
    >
      <Hidden row={row} intent="cancel" context={context} />
      <MoreOptions label={copy.cancel} defaultOpen={shown !== undefined}>
        <p className="text-lg text-ink-700">{copy.cancelNote}</p>
        <FormError message={shown?.formError} />
        <TextField
          label={copy.reason}
          name="reason"
          required
          maxLength={300}
          defaultValue={shown?.values["reason"] ?? ""}
          error={shown?.errors.reason}
        />
        {confirmed ? (
          <>
            <TextField
              label={copy.refundAmount}
              name="refundAmount"
              inputMode="numeric"
              required
              defaultValue={shown?.values["refundAmount"] ?? row.paidTotalInput}
              error={shown?.errors.refundAmount}
            />
            <TextField
              label={copy.refundedOn}
              name="refundedOn"
              type="date"
              max={context.today}
              required
              defaultValue={shown?.values["refundedOn"] ?? context.today}
              error={shown?.errors.refundedOn}
            />
            <TextField
              label={copy.refundNote}
              name="refundNote"
              maxLength={300}
              defaultValue={shown?.values["refundNote"] ?? ""}
              error={shown?.errors.refundNote}
            />
          </>
        ) : null}
        <div>
          <Button type="submit" variant="danger">
            {copy.cancelSubmit}
          </Button>
        </div>
      </MoreOptions>
    </form>
  );
}

function MoreAboutPerson({ row }: { row: IntensiveRequestRow }) {
  return (
    <MoreOptions label={copy.more}>
      <dl className="flex flex-col gap-2 text-lg">
        <div>
          <dt className="text-base text-ink-700">{copy.email}</dt>
          <dd>{row.email}</dd>
        </div>
        <div>
          <dt className="text-base text-ink-700">{copy.phone}</dt>
          <dd>
            {row.phone}
            {row.whatsappHref ? (
              <>
                {" "}
                <a
                  href={row.whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4"
                >
                  {copy.whatsapp}
                </a>
              </>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-base text-ink-700">{copy.received}</dt>
          <dd>{row.receivedAt}</dd>
        </div>
        <div>
          <dt className="text-base text-ink-700">{copy.acceptance}</dt>
          <dd>{row.acceptance}</dd>
        </div>
      </dl>
    </MoreOptions>
  );
}

/** The state of one request, in words. */
function stateWords(
  status: IntensiveRequestGroup["status"],
  row: IntensiveRequestRow,
): string {
  if (status === "pending_confirmation") return copy.pending;
  if (status === "cancelled") return copy.cancelled;
  return row.balance === null && row.balanceDue !== null
    ? copy.confirmedDue(row.balanceDue)
    : copy.paid;
}

function PersonCard({
  status,
  row,
  context,
}: {
  status: IntensiveRequestGroup["status"];
  row: IntensiveRequestRow;
  context: CardContext;
}) {
  const own =
    context.feedback?.requestId === row.id ? context.feedback : undefined;
  const facts = [row.projectName ?? null, stateWords(status, row)]
    .filter((part): part is string => part !== null)
    .join(" · ");
  const owesBalance =
    status === "confirmed" && row.balance === null && row.balanceDue !== null;
  return (
    <AdminActionCard
      id={reservationAnchor(row.id)}
      title={row.name}
      facts={facts}
      headingLevel={context.headingLevel}
      primary={
        <div className="flex w-full flex-col gap-3">
          {status === "pending_confirmation" ? (
            <PaymentForm
              row={row}
              intent="confirm"
              label={copy.confirm(row.deposit)}
              amountInput={row.depositInput}
              context={context}
              own={own}
            />
          ) : null}
          {owesBalance ? (
            <PaymentForm
              row={row}
              intent="balance"
              label={copy.balance(row.balanceDue)}
              amountInput={row.balanceInput}
              context={context}
              own={own}
            />
          ) : null}
          {status !== "cancelled" ? (
            <CancelForm
              row={row}
              confirmed={status === "confirmed"}
              context={context}
              own={own}
            />
          ) : null}
          <MoreAboutPerson row={row} />
        </div>
      }
    />
  );
}

function CancelledCard({
  row,
  headingLevel,
}: {
  row: IntensiveRequestRow;
  headingLevel: 2 | 3 | 4;
}) {
  return (
    <AdminActionCard
      id={reservationAnchor(row.id)}
      title={row.name}
      facts={
        row.cancelReason
          ? `${copy.cancelled} · ${copy.cancelledReason(row.cancelReason)}`
          : copy.cancelled
      }
      headingLevel={headingLevel}
      primary={null}
    />
  );
}

/**
 * Everyone who asked for a place in one workshop, as cards: the pending ones
 * first, then the confirmed ones, with the cancelled ones behind a link. Every
 * action is a native post that comes back to the same card.
 */
export function ReservationList({
  intensivoId,
  today,
  groups,
  returnTo,
  feedback,
  justCancelled = false,
  headingLevel = 4,
}: {
  intensivoId: string;
  today: string;
  groups: readonly IntensiveRequestGroup[];
  returnTo: string;
  feedback: IntensiveRequestFeedback | undefined;
  /** Opens the cancelled list right after a cancel, so the card is in view. */
  justCancelled?: boolean;
  /** The level of each name: one below the heading above the list. */
  headingLevel?: 2 | 3 | 4;
}) {
  const context: CardContext = {
    intensivoId,
    today,
    returnTo,
    feedback,
    headingLevel,
  };
  const active = groups.filter((group) => group.status !== "cancelled");
  const cancelled = groups.find((group) => group.status === "cancelled");
  const total = groups.reduce((sum, group) => sum + group.rows.length, 0);
  if (total === 0)
    return (
      <p className="text-lg text-ink-700">
        {adminCopy.clases.dated.noReservations}
      </p>
    );
  return (
    <div className="flex flex-col gap-3">
      {active.flatMap((group) =>
        group.rows.map((row) => (
          <PersonCard
            key={row.id}
            status={group.status}
            row={row}
            context={context}
          />
        )),
      )}
      {cancelled && cancelled.rows.length > 0 ? (
        <MoreOptions
          label={copy.seeCancelled(cancelled.rows.length)}
          defaultOpen={justCancelled}
        >
          {cancelled.rows.map((row) => (
            <CancelledCard key={row.id} row={row} headingLevel={headingLevel} />
          ))}
        </MoreOptions>
      ) : null}
    </div>
  );
}
