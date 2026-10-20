import { Heading } from "../atoms/heading";
import { AdminButtonLink } from "./admin-button-link";
import { DataTable, type DataTableColumn } from "./data-table";
import { adminMicrocopy } from "./microcopy";
import { StatusBadge } from "./status-badge";

export interface TeacherRow {
  readonly id: string;
  readonly name: string;
  readonly modality: "own" | "third_party";
  readonly active: boolean;
}

export type TeacherFilterKey = "activos" | "archivados" | "todos";

const FILTER_KEYS: readonly TeacherFilterKey[] = [
  "activos",
  "archivados",
  "todos",
];

const linkClasses =
  "inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

const copy = adminMicrocopy.teachers;

const columns: readonly DataTableColumn<TeacherRow>[] = [
  {
    key: "name",
    header: copy.columns.name,
    cell: (row) => (
      <a href={`/admin/profesores/${row.id}`} className={linkClasses}>
        {row.name}
      </a>
    ),
  },
  {
    key: "modality",
    header: copy.columns.modality,
    cell: (row) => copy.modality[row.modality],
  },
  {
    key: "state",
    header: copy.columns.state,
    cell: (row) => <StatusBadge status={row.active ? "active" : "archived"} />,
  },
];

/**
 * Profesores list. Every link is a plain anchor: the Worker gate refuses the
 * `.data` requests a client navigation would make.
 */
export function TeachersList({
  rows,
  filter,
}: {
  rows: readonly TeacherRow[];
  filter: TeacherFilterKey;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading level={1}>{copy.title}</Heading>
        <AdminButtonLink href="/admin/profesores/nuevo">
          {copy.newAction}
        </AdminButtonLink>
      </div>
      <nav aria-label={copy.filterLabel}>
        <ul className="flex flex-wrap gap-4">
          {FILTER_KEYS.map((key) => (
            <li key={key}>
              <a
                href={`/admin/profesores?estado=${key}`}
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
          action: { href: "/admin/profesores/nuevo", label: copy.newAction },
        }}
      />
    </section>
  );
}
