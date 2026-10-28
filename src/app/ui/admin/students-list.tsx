import { Heading } from "../atoms/heading";
import { AdminButtonLink } from "./admin-button-link";
import { DataTable, type DataTableColumn } from "./data-table";
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

const columns: readonly DataTableColumn<StudentRow>[] = [
  {
    key: "name",
    header: copy.columns.name,
    cell: (row) => (
      <a
        href={`/admin/alumnas/${encodeURIComponent(row.email)}`}
        className={linkClasses}
      >
        {row.name}
      </a>
    ),
  },
  { key: "email", header: copy.columns.email, cell: (r) => r.email },
  { key: "phone", header: copy.columns.phone, cell: (r) => r.phone },
  {
    key: "workshops",
    header: copy.columns.workshops,
    cell: (r) => r.workshops,
  },
  {
    key: "orders",
    header: copy.columns.orders,
    cell: (r) => String(r.orders),
  },
  {
    key: "lastRequest",
    header: copy.columns.lastRequest,
    cell: (r) => r.lastRequest,
  },
];

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
  return (
    <section className="flex flex-col gap-4">
      <Heading level={1}>{copy.title}</Heading>
      <form
        role="search"
        method="get"
        action="/admin/alumnas"
        aria-label={copy.filterLabel}
        className="grid gap-3 md:grid-cols-2"
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
          options={[{ value: "", label: copy.filters.anyStatus }, ...statuses]}
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
      <DataTable
        caption={copy.title}
        columns={columns}
        rows={rows}
        rowKey={(row) => row.email}
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
