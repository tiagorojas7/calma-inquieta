import { Heading } from "../atoms/heading";
import { AdminButtonLink } from "./admin-button-link";
import { DataTable, type DataTableColumn } from "./data-table";
import { SelectField, TextField } from "./form-fields";
import { adminMicrocopy } from "./microcopy";
import { OrderStatusBadge } from "./order-status-badge";

export interface EnrollmentRow {
  readonly id: string;
  readonly number: string;
  readonly studentName: string;
  readonly workshopName: string;
  readonly month: string;
  readonly turno: string;
  readonly status: string;
  readonly statusLabel: string;
  readonly total: string;
  readonly requestedOn: string;
}

export interface EnrollmentsFilter {
  readonly estado: string;
  readonly mes: string;
  readonly taller: string;
  readonly q: string;
  readonly page: number;
}

export interface EnrollmentsListProps {
  readonly rows: readonly EnrollmentRow[];
  readonly filter: EnrollmentsFilter;
  readonly workshops: readonly { id: string; name: string }[];
  readonly hasNext: boolean;
}

const copy = adminMicrocopy.enrollments;

const STATUS_OPTIONS = [
  { value: "pending_confirmation", label: "Pendiente de confirmación" },
  { value: "paid", label: "Cobrado" },
  { value: "materials_requested", label: "Solicitado al proveedor" },
  { value: "materials_received", label: "Recibido" },
  { value: "cancelled", label: "Cancelado" },
] as const;

const linkClasses =
  "inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

const columns: readonly DataTableColumn<EnrollmentRow>[] = [
  {
    key: "number",
    header: copy.columns.number,
    cell: (row) => (
      <a href={`/admin/inscripciones/${row.id}`} className={linkClasses}>
        {row.number}
      </a>
    ),
  },
  { key: "student", header: copy.columns.student, cell: (r) => r.studentName },
  {
    key: "workshop",
    header: copy.columns.workshop,
    cell: (r) => r.workshopName,
  },
  { key: "month", header: copy.columns.month, cell: (r) => r.month },
  { key: "turno", header: copy.columns.turno, cell: (r) => r.turno },
  {
    key: "status",
    header: copy.columns.status,
    cell: (row) => (
      <OrderStatusBadge status={row.status} label={row.statusLabel} />
    ),
  },
  { key: "total", header: copy.columns.total, cell: (r) => r.total },
  {
    key: "requestedOn",
    header: copy.columns.requestedOn,
    cell: (r) => r.requestedOn,
  },
];

function pageHref(filter: EnrollmentsFilter, page: number): string {
  const params = new URLSearchParams({ estado: filter.estado });
  if (filter.mes) params.set("mes", filter.mes);
  if (filter.taller) params.set("taller", filter.taller);
  if (filter.q) params.set("q", filter.q);
  params.set("page", String(page));
  return `/admin/inscripciones?${params.toString()}`;
}

/**
 * Orders list. The filter is a plain GET form and every link a plain anchor:
 * the Worker gate refuses the `.data` requests a client navigation would make.
 */
export function EnrollmentsList({
  rows,
  filter,
  workshops,
  hasNext,
}: EnrollmentsListProps) {
  return (
    <section className="flex flex-col gap-4">
      <Heading level={1}>{copy.title}</Heading>
      <form
        role="search"
        method="get"
        action="/admin/inscripciones"
        aria-label={copy.filterLabel}
        className="grid gap-3 md:grid-cols-2"
      >
        <SelectField
          label={copy.filters.status}
          name="estado"
          defaultValue={filter.estado}
          options={STATUS_OPTIONS}
        />
        <TextField
          label={copy.filters.month}
          name="mes"
          type="month"
          defaultValue={filter.mes}
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
        <TextField
          label={copy.filters.search}
          hint={copy.filters.searchHint}
          name="q"
          defaultValue={filter.q}
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
        rowKey={(row) => row.id}
        empty={{
          title: copy.empty.title,
          message: copy.empty.message,
          action: { href: "/admin/inscripciones", label: copy.empty.action },
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
