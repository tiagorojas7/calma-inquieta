import { Heading } from "../atoms/heading";
import { AdminButtonLink } from "./admin-button-link";
import { DataTable, type DataTableColumn } from "./data-table";
import { adminMicrocopy } from "./microcopy";
import { StatusBadge, type AdminStatus } from "./status-badge";

export interface WorkshopRow {
  readonly id: string;
  readonly name: string;
  readonly teacherName: string | null;
  readonly status: AdminStatus;
  readonly activeTurnos: number;
}

export type WorkshopFilterKey = keyof typeof adminMicrocopy.workshops.filters;

const copy = adminMicrocopy.workshops;

const FILTER_KEYS = Object.keys(copy.filters) as WorkshopFilterKey[];

const linkClasses =
  "inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

const columns: readonly DataTableColumn<WorkshopRow>[] = [
  {
    key: "name",
    header: copy.columns.name,
    cell: (row) => (
      <a href={`/admin/talleres/${row.id}`} className={linkClasses}>
        {row.name}
      </a>
    ),
  },
  {
    key: "teacher",
    header: copy.columns.teacher,
    cell: (row) => row.teacherName ?? copy.noTeacher,
  },
  {
    key: "state",
    header: copy.columns.state,
    cell: (row) => <StatusBadge status={row.status} />,
  },
  {
    key: "turnos",
    header: copy.columns.turnos,
    cell: (row) => String(row.activeTurnos),
  },
];

/**
 * Talleres list. Every link is a plain anchor: the Worker gate refuses the
 * `.data` requests a client navigation would make.
 */
export function WorkshopsList({
  rows,
  filter,
}: {
  rows: readonly WorkshopRow[];
  filter: WorkshopFilterKey;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading level={1}>{copy.title}</Heading>
        <AdminButtonLink href="/admin/talleres/nuevo">
          {copy.newAction}
        </AdminButtonLink>
      </div>
      <nav aria-label={copy.filterLabel}>
        <ul className="flex flex-wrap gap-4">
          {FILTER_KEYS.map((key) => (
            <li key={key}>
              <a
                href={`/admin/talleres?estado=${key}`}
                aria-current={key === filter ? "page" : undefined}
                className={`${linkClasses} ${key === filter ? "font-semibold" : ""}`}
              >
                {copy.filters[key]}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <DataTable
        caption={copy.title}
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        empty={{
          title: copy.empty.title,
          message: copy.empty.message,
          action: { href: "/admin/talleres/nuevo", label: copy.newAction },
        }}
      />
    </section>
  );
}
