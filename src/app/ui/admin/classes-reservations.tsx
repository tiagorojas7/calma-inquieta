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
import {
  baseFields,
  browseHref,
  browseReservations,
  DEFAULT_BROWSE,
  needsBrowsing,
  RESERVATION_FILTERS,
  RESERVATIONS_ANCHOR,
  type ReservationBrowse,
  type ReservationFilter,
} from "./reservation-browse";

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
    ? copy.confirmedDeposit
    : copy.paid;
}

/** The chosen project on its own line, in ink, then the state in words. */
function ProjectFacts({
  row,
  state,
}: {
  row: IntensiveRequestRow;
  state: string;
}) {
  return (
    <>
      {row.projectName === null ? null : (
        <span className="block font-semibold text-ink-900">
          {copy.project(row.projectName)}
        </span>
      )}
      <span className="block">{state}</span>
    </>
  );
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
  const facts = <ProjectFacts row={row} state={stateWords(status, row)} />;
  const owesBalance =
    status === "confirmed" && row.balance === null && row.balanceDue !== null;
  const summary =
    status === "pending_confirmation"
      ? copy.depositSummary(row.deposit)
      : owesBalance
        ? copy.balanceSummary(row.balanceDue)
        : copy.paidSummary(row.paidTotal ?? row.price);
  return (
    <AdminActionCard
      id={reservationAnchor(row.id)}
      title={row.name}
      summary={summary}
      summaryTone={
        status === "pending_confirmation" || owesBalance ? "owed" : "paid"
      }
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
      summary={copy.priceSummary(row.price)}
      facts={
        <ProjectFacts
          row={row}
          state={
            row.cancelReason
              ? `${copy.cancelled} · ${copy.cancelledReason(row.cancelReason)}`
              : copy.cancelled
          }
        />
      }
      headingLevel={headingLevel}
      primary={null}
    />
  );
}

const chip =
  "inline-flex min-h-12 items-center gap-2 rounded-md border-2 px-3 text-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";
const chipIdle = "border-sand-300 bg-surface text-ink-900 hover:bg-sand-100";
const chipActive = "border-clay-800 bg-clay-800 text-white";
const plainLink =
  "inline-flex min-h-12 items-center rounded-md px-2 text-lg font-semibold text-clay-800 underline underline-offset-4 hover:bg-sand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

/** State chips with their counts and a native name search, for a long list. */
function BrowseControls({
  basePath,
  browse,
  counts,
}: {
  basePath: string;
  browse: ReservationBrowse;
  counts: Readonly<Record<ReservationFilter, number>>;
}) {
  const b = copy.browse;
  const [action = ""] = basePath.split("?");
  return (
    <div className="flex flex-col gap-3">
      <nav aria-label={b.label}>
        <ul className="flex flex-wrap gap-2">
          {RESERVATION_FILTERS.map((filter) => {
            const active = browse.filter === filter;
            return (
              <li key={filter}>
                <a
                  href={browseHref(
                    basePath,
                    { filter, search: browse.search, focus: null },
                    RESERVATIONS_ANCHOR,
                  )}
                  aria-current={active ? "page" : undefined}
                  className={`${chip} ${active ? chipActive : chipIdle}`}
                >
                  {b.filters[filter]}{" "}
                  <span className="tabular-nums">{counts[filter]}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      <form
        method="get"
        role="search"
        aria-label={b.search}
        action={`${action}#${RESERVATIONS_ANCHOR}`}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="flex grow flex-wrap items-end gap-3">
          {baseFields(basePath).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          {browse.filter === "todas" ? null : (
            <input type="hidden" name="estado" value={browse.filter} />
          )}
          <div className="min-w-0 grow">
            <TextField
              label={b.search}
              name="buscar"
              type="search"
              autoComplete="off"
              defaultValue={browse.search}
            />
          </div>
          <Button type="submit" variant="secondary">
            {b.searchSubmit}
          </Button>
        </div>
        {browse.search === "" ? null : (
          <a
            href={browseHref(
              basePath,
              { filter: browse.filter, search: "", focus: null },
              RESERVATIONS_ANCHOR,
            )}
            className={plainLink}
          >
            {b.clear}
          </a>
        )}
      </form>
    </div>
  );
}

/**
 * Everyone who asked for a place in one workshop, as cards: the pending ones
 * first, then the confirmed ones, with the cancelled ones behind a link. A long
 * list shows one page at a time, with state chips and a name search, and the
 * person just acted on always stays in view. Every action is a native post that
 * comes back to the same card, filter and search.
 */
export function ReservationList({
  intensivoId,
  today,
  groups,
  returnTo,
  feedback,
  browse = DEFAULT_BROWSE,
  justCancelled = false,
  headingLevel = 4,
}: {
  intensivoId: string;
  today: string;
  groups: readonly IntensiveRequestGroup[];
  /** The page the list is on, with its own query. */
  returnTo: string;
  feedback: IntensiveRequestFeedback | undefined;
  /** Filter, search and the request just acted on, from the address. */
  browse?: ReservationBrowse | undefined;
  /** Opens the cancelled list right after a cancel, so the card is in view. */
  justCancelled?: boolean;
  /** The level of each name: one below the heading above the list. */
  headingLevel?: 2 | 3 | 4;
}) {
  const cancelled = groups.find((group) => group.status === "cancelled");
  const total = groups.reduce((sum, group) => sum + group.rows.length, 0);
  if (total === 0)
    return (
      <p className="text-lg text-ink-700">
        {adminCopy.clases.dated.noReservations}
      </p>
    );
  const { cards, counts, matching } = browseReservations(groups, browse);
  const browsing = needsBrowsing(counts, browse);
  const contextFor = (rowId: string): CardContext => ({
    intensivoId,
    today,
    returnTo: browseHref(returnTo, { ...browse, focus: rowId }),
    feedback,
    headingLevel,
  });
  const shown = cards.length;
  return (
    <div id={RESERVATIONS_ANCHOR} className="flex scroll-mt-20 flex-col gap-3">
      {browsing ? (
        <BrowseControls basePath={returnTo} browse={browse} counts={counts} />
      ) : null}
      {browsing && matching > shown ? (
        <p className="text-lg font-semibold text-ink-900">
          {copy.browse.showing(shown, matching)}
        </p>
      ) : null}
      {browsing && shown === 0 ? (
        <p className="text-lg text-ink-700">
          {browse.search === "" ? copy.browse.noneInState : copy.browse.noMatch}
        </p>
      ) : null}
      {cards.map(({ status, row }) => (
        <PersonCard
          key={row.id}
          status={status}
          row={row}
          context={contextFor(row.id)}
        />
      ))}
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
