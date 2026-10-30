import { Text } from "../atoms/heading";
import { AdminPageHeader } from "./admin-page";
import { AdminCardList } from "./admin-sections";
import { SelectField } from "./form-fields";
import { adminMicrocopy } from "./microcopy";
import { PrivateEventStatusBadge } from "./private-event-status-badge";

export interface PrivateEventRow {
  readonly id: string;
  readonly receivedOn: string;
  readonly name: string;
  readonly desiredDate: string;
  readonly place: string;
  readonly participants: number;
  readonly status: string;
  readonly statusLabel: string;
}

export interface PrivateEventsListProps {
  readonly rows: readonly PrivateEventRow[];
  /** `""` shows every status. */
  readonly filter: string;
  readonly statusOptions: readonly { value: string; label: string }[];
}

const copy = adminMicrocopy.privateEvents;

const linkClasses =
  "inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

/**
 * Private-event inbox. The filter is a plain GET form and every link a plain
 * anchor: the Worker gate refuses the `.data` requests a client navigation makes.
 */
export function PrivateEventsList({
  rows,
  filter,
  statusOptions,
}: PrivateEventsListProps) {
  return (
    <section className="flex flex-col gap-4">
      <AdminPageHeader
        title={copy.title}
        breadcrumbs={[
          { label: "Panel", href: "/admin" },
          { label: copy.title },
        ]}
      />
      <details
        open={filter !== ""}
        className="rounded-md bg-surface p-4 shadow-card"
      >
        <summary className="min-h-11 cursor-pointer font-semibold text-ink-900">
          {copy.filters.summary}
        </summary>
        <form
          role="search"
          method="get"
          action="/admin/eventos"
          aria-label={copy.filterLabel}
          className="mt-3 grid gap-3 md:grid-cols-2"
        >
          <SelectField
            label={copy.filters.status}
            name="estado"
            defaultValue={filter}
            options={[{ value: "", label: copy.filters.all }, ...statusOptions]}
          />
          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-md bg-clay-600 px-6 py-3 font-sans text-white hover:bg-clay-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800"
            >
              {copy.filters.apply}
            </button>
          </div>
        </form>
      </details>
      <Text tone="muted">{copy.count(rows.length)}</Text>
      <AdminCardList
        label={copy.title}
        rows={rows}
        rowKey={(row) => row.id}
        card={(row) => (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <a href={`/admin/eventos/${row.id}`} className={linkClasses}>
                {row.name}
              </a>
              <PrivateEventStatusBadge
                status={row.status}
                label={row.statusLabel}
              />
            </div>
            <Text tone="muted">{row.place}</Text>
            <dl className="grid gap-1 text-sm text-ink-700">
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-semibold">{copy.cardLabels.date}</dt>
                <dd>{row.desiredDate}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-semibold">{copy.cardLabels.people}</dt>
                <dd>{String(row.participants)}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-semibold">{copy.cardLabels.received}</dt>
                <dd>{row.receivedOn}</dd>
              </div>
            </dl>
          </>
        )}
        empty={{
          title: copy.empty.title,
          message: copy.empty.message,
          action: { href: "/admin/eventos", label: copy.empty.action },
        }}
      />
    </section>
  );
}
