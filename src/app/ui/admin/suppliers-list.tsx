import { Text } from "../atoms/heading";
import { AdminButtonLink } from "./admin-button-link";
import { AdminFeedback, AdminPageHeader } from "./admin-page";
import { AdminCardList } from "./admin-sections";
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

/**
 * Proveedores list. Every link is a plain anchor: the Worker gate refuses the
 * `.data` requests a client navigation would make.
 */
export function SuppliersList({
  rows,
  filter,
  feedback = null,
}: {
  rows: readonly SupplierRow[];
  filter: SupplierFilterKey;
  feedback?: keyof typeof copy.feedback | null | undefined;
}) {
  return (
    <section className="flex flex-col gap-4">
      <AdminPageHeader
        title={copy.title}
        breadcrumbs={[
          { label: "Panel", href: "/admin" },
          { label: "Materiales", href: "/admin/materiales" },
          { label: copy.title },
        ]}
        back={{ href: "/admin/materiales", label: copy.back }}
        actions={
          <AdminButtonLink href={`${BASE}/nuevo`}>
            {copy.newAction}
          </AdminButtonLink>
        }
      />
      {feedback ? (
        <AdminFeedback tone="success" title={copy.feedback[feedback].title} />
      ) : null}
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
              <StatusBadge status={row.active ? "active" : "archived"} />
            </div>
            <Text tone="muted">{row.phone ?? copy.noPhone}</Text>
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
