import { Heading } from "../atoms/heading";
import { DataTable, type DataTableColumn } from "./data-table";
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

const columns: readonly DataTableColumn<PrivateEventRow>[] = [
  {
    key: "name",
    header: copy.columns.name,
    cell: (row) => (
      <a href={`/admin/eventos/${row.id}`} className={linkClasses}>
        {row.name}
      </a>
    ),
  },
  { key: "date", header: copy.columns.date, cell: (row) => row.desiredDate },
  { key: "place", header: copy.columns.place, cell: (row) => row.place },
  {
    key: "participants",
    header: copy.columns.participants,
    cell: (row) => String(row.participants),
  },
  {
    key: "status",
    header: copy.columns.status,
    cell: (row) => (
      <PrivateEventStatusBadge status={row.status} label={row.statusLabel} />
    ),
  },
  {
    key: "received",
    header: copy.columns.received,
    cell: (row) => row.receivedOn,
  },
];

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
      <Heading level={1}>{copy.title}</Heading>
      <form
        role="search"
        method="get"
        action="/admin/eventos"
        aria-label={copy.filterLabel}
        className="grid gap-3 md:grid-cols-2"
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
      <DataTable
        caption={copy.title}
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        empty={{
          title: copy.empty.title,
          message: copy.empty.message,
          action: { href: "/admin/eventos", label: copy.empty.action },
        }}
      />
    </section>
  );
}
