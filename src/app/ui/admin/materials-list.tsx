import { AdminButton as Button } from "./admin-button";
import { Text } from "../atoms/heading";
import { AdminButtonLink } from "./admin-button-link";
import { AdminFeedback, AdminPageHeader } from "./admin-page";
import { AdminCardList } from "./admin-sections";
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
  feedback = null,
}: {
  rows: readonly MaterialRow[];
  filter: MaterialFilterKey;
  category: string;
  supplierId: string;
  categories: readonly string[];
  suppliers: readonly { value: string; label: string }[];
  feedback?: keyof typeof copy.feedback | null | undefined;
}) {
  const carried = new URLSearchParams();
  if (category) carried.set("categoria", category);
  if (supplierId) carried.set("proveedor", supplierId);
  return (
    <section className="flex flex-col gap-4">
      <AdminPageHeader
        title={copy.title}
        breadcrumbs={[
          { label: "Panel", href: "/admin" },
          { label: copy.title },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <AdminButtonLink href={`${BASE}/nuevo`}>
              {copy.newAction}
            </AdminButtonLink>
            <AdminButtonLink href={`${BASE}/proveedores`} variant="outline">
              {copy.suppliersLink}
            </AdminButtonLink>
          </div>
        }
      />
      {feedback ? (
        <AdminFeedback tone="success" title={copy.feedback[feedback].title} />
      ) : null}
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
      <AdminCardList
        label={copy.title}
        rows={rows}
        rowKey={(row) => row.id}
        card={(row) => (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <a href={`${BASE}/${row.id}`} className={linkClasses}>
                {row.name}
              </a>
              <span className="flex flex-wrap items-center gap-2">
                <StatusBadge status={row.active ? "active" : "archived"} />
                {row.available ? null : <span>{copy.unavailable}</span>}
              </span>
            </div>
            <Text tone="muted">{row.category}</Text>
            <Text tone="muted">{row.supplierName}</Text>
            <Text tone="muted">{copy.variantCount(row.variantCount)}</Text>
          </>
        )}
        empty={{
          title: copy.empty.title,
          message: copy.empty.message,
          action: { href: `${BASE}/nuevo`, label: copy.newAction },
        }}
      />
    </section>
  );
}
