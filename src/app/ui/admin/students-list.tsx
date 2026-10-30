import { Text } from "../atoms/heading";
import { AdminButtonLink } from "./admin-button-link";
import { AdminPageHeader } from "./admin-page";
import { AdminCardList } from "./admin-sections";
import { SelectField, TextField } from "./form-fields";
import { adminMicrocopy } from "./microcopy";

export interface StudentRow {
  readonly email: string;
  readonly name: string;
  readonly phone: string;
  readonly workshops: string;
  readonly orders: number;
  readonly lastRequest: string;
}

export interface StudentsFilter {
  readonly q: string;
  readonly taller: string;
  readonly estado: string;
  readonly page: number;
}

export interface StudentsListProps {
  readonly rows: readonly StudentRow[];
  readonly filter: StudentsFilter;
  readonly workshops: readonly { id: string; name: string }[];
  readonly statuses: readonly { value: string; label: string }[];
  readonly hasNext: boolean;
}

const copy = adminMicrocopy.students;

const linkClasses =
  "inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

function pageHref(filter: StudentsFilter, page: number): string {
  const params = new URLSearchParams();
  if (filter.q) params.set("q", filter.q);
  if (filter.taller) params.set("taller", filter.taller);
  if (filter.estado) params.set("estado", filter.estado);
  params.set("page", String(page));
  return `/admin/alumnas?${params.toString()}`;
}

/**
 * Students registry. The filter is a plain GET form and every link a plain
 * anchor: the Worker gate refuses the `.data` requests a client navigation
 * would make.
 */
export function StudentsList({
  rows,
  filter,
  workshops,
  statuses,
  hasNext,
}: StudentsListProps) {
  const filtered = Boolean(filter.q || filter.taller || filter.estado);
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
        open={filtered}
        className="rounded-md bg-surface p-4 shadow-card"
      >
        <summary className="min-h-11 cursor-pointer font-semibold text-ink-900">
          {copy.filters.summary}
        </summary>
        <form
          role="search"
          method="get"
          action="/admin/alumnas"
          aria-label={copy.filterLabel}
          className="mt-3 grid gap-3 md:grid-cols-2"
        >
          <TextField
            label={copy.filters.search}
            hint={copy.filters.searchHint}
            name="q"
            defaultValue={filter.q}
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
          <SelectField
            label={copy.filters.status}
            name="estado"
            defaultValue={filter.estado}
            options={[
              { value: "", label: copy.filters.anyStatus },
              ...statuses,
            ]}
          />
          <div>
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
        rowKey={(row) => row.email}
        card={(row) => (
          <>
            <a
              href={`/admin/alumnas/${encodeURIComponent(row.email)}`}
              className={linkClasses}
            >
              {row.name}
            </a>
            <dl className="grid gap-1 text-sm text-ink-700">
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-semibold">{copy.cardLabels.email}</dt>
                <dd className="break-all">{row.email}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-semibold">{copy.cardLabels.phone}</dt>
                <dd>{row.phone}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-semibold">{copy.cardLabels.orders}</dt>
                <dd>{String(row.orders)}</dd>
              </div>
            </dl>
            <Text tone="muted">{row.workshops}</Text>
            <Text tone="muted">{row.lastRequest}</Text>
          </>
        )}
        empty={{
          title: copy.empty.title,
          message: copy.empty.message,
          action: { href: "/admin/alumnas", label: copy.empty.action },
        }}
      />
      {filter.page > 1 || hasNext ? (
        <nav
          aria-label={copy.pagination.label}
          className="flex flex-wrap gap-3"
        >
          {filter.page > 1 ? (
            <AdminButtonLink
              variant="outline"
              href={pageHref(filter, filter.page - 1)}
            >
              {copy.pagination.previous}
            </AdminButtonLink>
          ) : null}
          {hasNext ? (
            <AdminButtonLink
              variant="outline"
              href={pageHref(filter, filter.page + 1)}
            >
              {copy.pagination.next}
            </AdminButtonLink>
          ) : null}
        </nav>
      ) : null}
    </section>
  );
}
