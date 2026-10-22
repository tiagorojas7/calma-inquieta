import { Heading } from "../atoms/heading";
import { AdminButtonLink } from "./admin-button-link";
import { DataTable, type DataTableColumn } from "./data-table";
import { adminMicrocopy } from "./microcopy";
import { StatusBadge, type AdminStatus } from "./status-badge";

export interface IntensiveRow {
  readonly id: string;
  readonly name: string;
  readonly teacherName: string | null;
  readonly status: AdminStatus;
  readonly dateTime: string;
  readonly capacity: number;
}
type FilterKey = keyof typeof adminMicrocopy.intensives.filters;
const copy = adminMicrocopy.intensives;
const linkClasses =
  "inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";
const columns: readonly DataTableColumn<IntensiveRow>[] = [
  {
    key: "name",
    header: copy.columns.name,
    cell: (row) => (
      <a href={`/admin/intensivos/${row.id}`} className={linkClasses}>
        {row.name}
      </a>
    ),
  },
  {
    key: "teacher",
    header: copy.columns.teacher,
    cell: (row) => row.teacherName ?? copy.noTeacher,
  },
  { key: "date", header: copy.columns.date, cell: (row) => row.dateTime },
  {
    key: "state",
    header: copy.columns.state,
    cell: (row) => <StatusBadge status={row.status} />,
  },
  {
    key: "capacity",
    header: copy.columns.capacity,
    cell: (row) => String(row.capacity),
  },
];

/** Native anchors avoid the Worker gate's refusal of client `.data` requests. */
export function IntensivesList({
  rows,
  filter,
}: {
  rows: readonly IntensiveRow[];
  filter: FilterKey;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading level={1}>{copy.title}</Heading>
        <AdminButtonLink href="/admin/intensivos/nuevo">
          {copy.newAction}
        </AdminButtonLink>
      </div>
      <nav aria-label={copy.filterLabel}>
        <ul className="flex flex-wrap gap-4">
          {(Object.keys(copy.filters) as FilterKey[]).map((key) => (
            <li key={key}>
              <a
                href={`/admin/intensivos?estado=${key}`}
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
          action: { href: "/admin/intensivos/nuevo", label: copy.newAction },
        }}
      />
    </section>
  );
}
