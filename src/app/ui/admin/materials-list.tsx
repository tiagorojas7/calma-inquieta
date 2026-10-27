import { Button } from "../atoms/button";
import { Heading } from "../atoms/heading";
import { AdminButtonLink } from "./admin-button-link";
import { DataTable, type DataTableColumn } from "./data-table";
import { SelectField } from "./form-fields";
import { adminMicrocopy } from "./microcopy";
import { StatusBadge } from "./status-badge";

export interface MaterialRow {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly supplierName: string;
  readonly variantCount: number;
  readonly active: boolean;
  readonly available: boolean;
}

export type MaterialFilterKey = "activos" | "inactivos" | "todos";

const FILTER_KEYS: readonly MaterialFilterKey[] = [
  "activos",
  "inactivos",
  "todos",
];

const BASE = "/admin/materiales";

const linkClasses =
  "inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

const copy = adminMicrocopy.materials;

const columns: readonly DataTableColumn<MaterialRow>[] = [
  {
    key: "name",
    header: copy.columns.name,
    cell: (row) => (
      <a href={`${BASE}/${row.id}`} className={linkClasses}>
        {row.name}
      </a>
    ),
  },
  { key: "category", header: copy.columns.category, cell: (r) => r.category },
  {
    key: "supplier",
    header: copy.columns.supplier,
    cell: (row) => row.supplierName,
  },
  {
    key: "variants",
    header: copy.columns.variants,
    cell: (row) => String(row.variantCount),
  },
  {
    key: "state",
    header: copy.columns.state,
    cell: (row) => (
      <span className="flex flex-wrap items-center gap-2">
        <StatusBadge status={row.active ? "active" : "archived"} />
        {row.available ? null : <span>{copy.unavailable}</span>}
      </span>
    ),
  },
];

/**
 * Materiales list. Every link and the filter form are document navigation:
 * the Worker gate refuses the `.data` requests a client navigation would make.
 */
export function MaterialsList({
  rows,
  filter,
  category,
  supplierId,
  categories,
  suppliers,
}: {
  rows: readonly MaterialRow[];
  filter: MaterialFilterKey;
  category: string;
  supplierId: string;
  categories: readonly string[];
  suppliers: readonly { value: string; label: string }[];
}) {
  const carried = new URLSearchParams();
  if (category) carried.set("categoria", category);
  if (supplierId) carried.set("proveedor", supplierId);
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading level={1}>{copy.title}</Heading>
        <div className="flex flex-wrap items-center gap-3">
          <a href={`${BASE}/proveedores`} className={linkClasses}>
            {copy.suppliersLink}
          </a>
          <AdminButtonLink href={`${BASE}/nuevo`}>
            {copy.newAction}
          </AdminButtonLink>
        </div>
      </div>
      <nav aria-label={copy.filterLabel}>
        <ul className="flex flex-wrap gap-4">
          {FILTER_KEYS.map((key) => {
            const params = new URLSearchParams(carried);
            params.set("estado", key);
            return (
              <li key={key}>
                <a
                  href={`${BASE}?${params.toString()}`}
                  aria-current={key === filter ? "page" : undefined}
                  className={`${linkClasses} ${key === filter ? "font-semibold" : ""}`}
                >
                  {copy.filters[key]}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      <form
        method="get"
        action={BASE}
        aria-label={copy.refine.label}
        className="flex flex-wrap items-end gap-3"
      >
        <input type="hidden" name="estado" value={filter} />
        <SelectField
          label={copy.refine.category}
          name="categoria"
          defaultValue={category}
          options={[
            { value: "", label: copy.refine.allCategories },
            ...categories.map((name) => ({ value: name, label: name })),
          ]}
        />
        <SelectField
          label={copy.refine.supplier}
          name="proveedor"
          defaultValue={supplierId}
          options={[
            { value: "", label: copy.refine.allSuppliers },
            ...suppliers,
          ]}
        />
        <Button type="submit" variant="outline">
          {copy.refine.apply}
        </Button>
      </form>
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
