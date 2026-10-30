import { Text } from "../atoms/heading";
import { AdminButton } from "./admin-button";
import { AdminButtonLink } from "./admin-button-link";
import { AdminFeedback, AdminPageHeader } from "./admin-page";
import { AdminCardList } from "./admin-sections";
import { SelectField, TextAreaField, TextField } from "./form-fields";
import { adminMicrocopy } from "./microcopy";
import { OrderStatusBadge } from "./order-status-badge";
import { ResponsiveList } from "./responsive-list";

export interface EnrollmentRow {
  readonly id: string;
  readonly number: string;
  readonly studentName: string;
  /** wa.me link to the student, when her phone can be dialed. */
  readonly whatsappHref?: string | undefined;
  readonly workshopName: string;
  readonly month: string;
  readonly turno: string;
  readonly status: string;
  readonly statusLabel: string;
  readonly total: string;
  /** The order total in whole pesos, as the payment form posts it. */
  readonly totalPesos: string;
  readonly requestedOn: string;
}

export interface EnrollmentsFilter {
  readonly estado: string;
  readonly mes: string;
  readonly taller: string;
  readonly q: string;
  readonly page: number;
}

export type EnrollmentTabKey = "por-cobrar" | "pagadas" | "canceladas";

export interface EnrollmentsListProps {
  readonly rows: readonly EnrollmentRow[];
  readonly filter: EnrollmentsFilter;
  readonly tab: EnrollmentTabKey;
  readonly counts: Readonly<Record<EnrollmentTabKey, string>>;
  /** Today in Córdoba (yyyy-mm-dd): the payment date the one-click form posts. */
  readonly today: string;
  readonly workshops: readonly { id: string; name: string }[];
  readonly hasNext: boolean;
  readonly feedback: {
    readonly kind: "paid" | "cancelled";
    readonly name: string | null;
  } | null;
  readonly actionError?: { readonly error: string; readonly orderId: string };
}

const copy = adminMicrocopy.enrollments;

const TABS = [
  { key: "por-cobrar", estado: "pending_confirmation" },
  { key: "pagadas", estado: "paid" },
  { key: "canceladas", estado: "cancelled" },
] as const;

const linkClasses =
  "inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

const cols = copy.columns;

const columns = [
  {
    key: "number",
    header: cols.number,
    cell: (row: EnrollmentRow) => (
      <a href={`/admin/inscripciones/${row.id}`} className={linkClasses}>
        {row.number}
      </a>
    ),
  },
  {
    key: "student",
    header: cols.student,
    cell: (row: EnrollmentRow) => row.studentName,
  },
  {
    key: "workshop",
    header: cols.workshop,
    cell: (row: EnrollmentRow) => row.workshopName,
  },
  { key: "month", header: cols.month, cell: (row: EnrollmentRow) => row.month },
  { key: "turno", header: cols.turno, cell: (row: EnrollmentRow) => row.turno },
  {
    key: "status",
    header: cols.status,
    cell: (row: EnrollmentRow) => (
      <OrderStatusBadge status={row.status} label={row.statusLabel} />
    ),
  },
  { key: "total", header: cols.total, cell: (row: EnrollmentRow) => row.total },
  {
    key: "requestedOn",
    header: cols.requestedOn,
    cell: (row: EnrollmentRow) => row.requestedOn,
  },
] as const;

const chipClasses =
  "inline-block rounded-pill bg-sand-200 px-3 py-1 text-sm text-ink-900";

function listHref(
  filter: EnrollmentsFilter,
  estado: string,
  page?: number,
): string {
  const params = new URLSearchParams({ estado });
  if (filter.mes) params.set("mes", filter.mes);
  if (filter.taller) params.set("taller", filter.taller);
  if (filter.q) params.set("q", filter.q);
  if (page !== undefined) params.set("page", String(page));
  return `/admin/inscripciones?${params.toString()}`;
}

const summaryClasses =
  "inline-flex min-h-11 cursor-pointer items-center font-semibold text-ink-900";

const tabClasses = (active: boolean) =>
  `inline-flex min-h-11 items-center gap-2 rounded-md px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800 ${
    active
      ? "bg-clay-800 text-white shadow-card"
      : "border-2 border-clay-800 bg-surface text-clay-800 hover:bg-sand-100"
  }`;

function Tabs({
  filter,
  tab,
  counts,
}: Pick<EnrollmentsListProps, "filter" | "tab" | "counts">) {
  return (
    <nav aria-label={copy.tabs.label}>
      <ul className="flex flex-wrap gap-2">
        {TABS.map(({ key, estado }) => (
          <li key={key}>
            <a
              href={listHref(filter, estado)}
              aria-current={key === tab ? "page" : undefined}
              className={tabClasses(key === tab)}
            >
              {copy.tabs[key]} <span>{counts[key]}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Hidden fields every inline action posts: which order, and where to come back to. */
function OrderFields({
  intent,
  orderId,
  returnTo,
}: {
  intent: "confirm" | "cancel";
  orderId: string;
  returnTo: string;
}) {
  return (
    <>
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="returnTo" value={returnTo} />
    </>
  );
}

function PayableCard({
  row,
  today,
  returnTo,
  error,
}: {
  row: EnrollmentRow;
  today: string;
  returnTo: string;
  error: string | undefined;
}) {
  const card = copy.card;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-ink-900">{row.number}</span>
        <OrderStatusBadge status={row.status} label={row.statusLabel} />
      </div>
      <p className="text-lg font-semibold text-ink-900">{row.studentName}</p>
      <Text tone="muted">
        {`${row.workshopName} · ${row.month} · ${row.turno}`}
      </Text>
      <p className="text-xl font-semibold text-ink-900">{row.total}</p>
      <div className="flex flex-wrap items-center gap-x-4">
        <a
          href={`/admin/inscripciones/${row.id}`}
          aria-label={card.detailAndContactOf(row.number)}
          className={linkClasses}
        >
          {card.detailAndContact}
        </a>
        {row.whatsappHref ? (
          <a
            href={row.whatsappHref}
            aria-label={card.whatsappWith(row.studentName)}
            className={linkClasses}
          >
            {card.whatsapp}
          </a>
        ) : null}
      </div>
      {error ? <AdminFeedback tone="error" title={error} /> : null}
      <form method="post" action="/admin/inscripciones">
        <OrderFields intent="confirm" orderId={row.id} returnTo={returnTo} />
        <input type="hidden" name="amount" value={row.totalPesos} />
        <input type="hidden" name="paidOn" value={today} />
        <AdminButton type="submit" className="w-full sm:w-auto">
          {card.markPaid}
        </AdminButton>
      </form>
      <details>
        <summary className={summaryClasses}>{card.otherAmount}</summary>
        <form
          method="post"
          action="/admin/inscripciones"
          className="mt-2 flex flex-col gap-3"
        >
          <OrderFields intent="confirm" orderId={row.id} returnTo={returnTo} />
          <TextField
            label={card.amount}
            name="amount"
            inputMode="numeric"
            required
            defaultValue={row.totalPesos}
          />
          <TextField
            label={card.paidOn}
            name="paidOn"
            type="date"
            max={today}
            required
            defaultValue={today}
          />
          <TextField label={card.note} name="note" />
          <div>
            <AdminButton type="submit">{card.saveOther}</AdminButton>
          </div>
        </form>
      </details>
      <details>
        <summary className={summaryClasses}>{card.cancel}</summary>
        <form
          method="post"
          action="/admin/inscripciones"
          className="mt-2 flex flex-col gap-3"
        >
          <OrderFields intent="cancel" orderId={row.id} returnTo={returnTo} />
          <TextAreaField
            label={card.reason}
            hint={card.reasonHint}
            name="reason"
            required
            minLength={3}
            maxLength={300}
          />
          <div>
            <AdminButton type="submit" variant="danger">
              {card.cancelSubmit}
            </AdminButton>
          </div>
        </form>
      </details>
    </>
  );
}

/**
 * Orders list in three tabs. Por cobrar carries the actions (mark paid, cancel)
 * so the owners never leave the list. The filter is a plain GET form and every
 * link a plain anchor: the Worker gate refuses the `.data` requests a client
 * navigation would make.
 */
export function EnrollmentsList({
  rows,
  filter,
  tab,
  counts,
  today,
  workshops,
  hasNext,
  feedback,
  actionError,
}: EnrollmentsListProps) {
  const chips = [
    ...(filter.mes ? [copy.chips.month(filter.mes)] : []),
    ...(filter.taller
      ? [
          copy.chips.workshop(
            workshops.find((w) => w.id === filter.taller)?.name ??
              filter.taller,
          ),
        ]
      : []),
    ...(filter.q ? [copy.chips.search(filter.q)] : []),
  ];
  const returnTo = listHref(
    filter,
    filter.estado,
    filter.page > 1 ? filter.page : undefined,
  );
  const empty = {
    title: copy.empty[tab].title,
    message: copy.empty[tab].message,
    action: {
      href: "/admin/inscripciones?estado=pending_confirmation",
      label: copy.empty.action,
    },
  };
  return (
    <section className="flex flex-col gap-4">
      <AdminPageHeader
        title={copy.title}
        breadcrumbs={[
          { label: copy.panel, href: "/admin" },
          { label: copy.title },
        ]}
        actions={
          <AdminButtonLink
            variant="outline"
            href="/admin/inscripciones/materiales"
          >
            {copy.consolidationLink}
          </AdminButtonLink>
        }
      />
      {feedback ? (
        <AdminFeedback
          tone="success"
          title={copy.feedback[feedback.kind](feedback.name)}
        />
      ) : null}
      {actionError && !rows.some((row) => row.id === actionError.orderId) ? (
        <AdminFeedback tone="error" title={actionError.error} />
      ) : null}
      <Tabs filter={filter} tab={tab} counts={counts} />
      <details className="rounded-md bg-surface p-4 shadow-card">
        <summary className={summaryClasses}>{copy.filterToggle}</summary>
        <form
          role="search"
          method="get"
          action="/admin/inscripciones"
          aria-label={copy.filterLabel}
          className="mt-3 grid gap-3 md:grid-cols-2"
        >
          <input type="hidden" name="estado" value={filter.estado} />
          <TextField
            label={copy.filters.month}
            name="mes"
            type="month"
            defaultValue={filter.mes}
          />
          <SelectField
            label={copy.filters.workshop}
            name="taller"
            defaultValue={filter.taller}
            options={[
              { value: "", label: copy.filters.anyWorkshop },
              ...workshops.map((w) => ({ value: w.id, label: w.name })),
            ]}
          />
          <TextField
            label={copy.filters.search}
            hint={copy.filters.searchHint}
            name="q"
            defaultValue={filter.q}
          />
          <div>
            <AdminButton type="submit" variant="secondary">
              {copy.filters.apply}
            </AdminButton>
          </div>
        </form>
      </details>
      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <ul
            aria-label={copy.activeFiltersLabel}
            className="flex flex-wrap gap-2"
          >
            {chips.map((chip) => (
              <li key={chip} className={chipClasses}>
                {chip}
              </li>
            ))}
          </ul>
          <a
            href={listHref(
              { ...filter, mes: "", taller: "", q: "" },
              filter.estado,
            )}
            className={linkClasses}
          >
            {copy.clearFilters}
          </a>
        </div>
      ) : null}
      {tab === "por-cobrar" ? (
        <AdminCardList
          label={copy.title}
          rows={rows}
          rowKey={(row) => row.id}
          empty={empty}
          card={(row) => (
            <PayableCard
              row={row}
              today={today}
              returnTo={returnTo}
              error={
                actionError?.orderId === row.id ? actionError.error : undefined
              }
            />
          )}
        />
      ) : (
        <ResponsiveList
          label={copy.title}
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          card={(row) => (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-ink-900">{row.number}</span>
                <OrderStatusBadge status={row.status} label={row.statusLabel} />
              </div>
              <p className="text-ink-900">{row.studentName}</p>
              <Text tone="muted">
                {`${row.workshopName} · ${row.month} · ${row.turno}`}
              </Text>
              <p className="font-semibold text-ink-900">{row.total}</p>
              <Text tone="muted">{copy.requestedOn(row.requestedOn)}</Text>
              <div>
                <a
                  href={`/admin/inscripciones/${row.id}`}
                  aria-label={copy.viewDetailOf(row.number)}
                  className={linkClasses}
                >
                  {copy.viewDetail}
                </a>
              </div>
            </>
          )}
          empty={empty}
        />
      )}
      {filter.page > 1 || hasNext ? (
        <nav
          aria-label={copy.pagination.label}
          className="flex flex-wrap gap-3"
        >
          {filter.page > 1 ? (
            <AdminButtonLink
              variant="outline"
              href={listHref(filter, filter.estado, filter.page - 1)}
            >
              {copy.pagination.previous}
            </AdminButtonLink>
          ) : null}
          {hasNext ? (
            <AdminButtonLink
              variant="outline"
              href={listHref(filter, filter.estado, filter.page + 1)}
            >
              {copy.pagination.next}
            </AdminButtonLink>
          ) : null}
        </nav>
      ) : null}
    </section>
  );
}
