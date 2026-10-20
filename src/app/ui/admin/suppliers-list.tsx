import { Heading } from "../atoms/heading";
import { AdminButtonLink } from "./admin-button-link";
import { DataTable, type DataTableColumn } from "./data-table";
import { adminMicrocopy } from "./microcopy";
import { StatusBadge } from "./status-badge";

export interface SupplierRow {
  readonly id: string;
  readonly name: string;
  readonly phone: string | null;
  readonly active: boolean;
}

export type SupplierFilterKey = "activos" | "archivados" | "todos";

const FILTER_KEYS: readonly SupplierFilterKey[] = [
  "activos",
  "archivados",
  "todos",
];

const BASE = "/admin/materiales/proveedores";

const linkClasses =
  "inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

const copy = adminMicrocopy.suppliers;

const columns: readonly DataTableColumn<SupplierRow>[] = [
  {
    key: "name",
    header: copy.columns.name,
    cell: (row) => (
      <a href={`${BASE}/${row.id}`} className={linkClasses}>
        {row.name}
      </a>
    ),
  },
  {
    key: "phone",
    header: copy.columns.phone,
    cell: (row) => row.phone ?? copy.noPhone,
  },
  {
    key: "state",
    header: copy.columns.state,
    cell: (row) => <StatusBadge status={row.active ? "active" : "archived"} />,
  },
];

/**
 * Proveedores list. Every link is a plain anchor: the Worker gate refuses the
 * `.data` requests a client navigation would make.
 */
export function SuppliersList({
  rows,
  filter,
}: {
  rows: readonly SupplierRow[];
  filter: SupplierFilterKey;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading level={1}>{copy.title}</Heading>
        <AdminButtonLink href={`${BASE}/nuevo`}>
          {copy.newAction}
        </AdminButtonLink>
      </div>
      <nav aria-label={copy.filterLabel}>
        <ul className="flex flex-wrap gap-4">
          {FILTER_KEYS.map((key) => (
            <li key={key}>
              <a
                href={`${BASE}?estado=${key}`}
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
          action: { href: `${BASE}/nuevo`, label: copy.newAction },
        }}
      />
    </section>
  );
}
