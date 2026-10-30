import { Text } from "../atoms/heading";
import { AdminButtonLink } from "./admin-button-link";
import { AdminPageHeader } from "./admin-page";
import { AdminCardList } from "./admin-sections";
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

const chipClasses =
  "inline-block rounded-pill bg-sand-200 px-3 py-1 text-sm text-ink-900";

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
  const chips = [
    copy.chips.status(
      STATUS_OPTIONS.find((option) => option.value === filter.estado)?.label ??
        filter.estado,
    ),
    ...(filter.mes ? [copy.chips.month(filter.mes)] : []),
    ...(filter.taller
      ? [
          copy.chips.workshop(
            workshops.find((w) => w.id === filter.taller)?.name ??
              filter.taller,
          ),
        ]
      : []),
    ...(filter.q ? [copy.chips.search(filter.q)] : []),
  ];
  return (
    <section className="flex flex-col gap-4">
      <AdminPageHeader
        title={copy.title}
        breadcrumbs={[
          { label: copy.panel, href: "/admin" },
          { label: copy.title },
        ]}
        actions={
          <AdminButtonLink
            variant="outline"
            href="/admin/inscripciones/materiales"
          >
            {copy.consolidationLink}
          </AdminButtonLink>
        }
      />
      <details className="rounded-md bg-surface p-4 shadow-card">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-ink-900">
          {copy.filterToggle}
        </summary>
        <form
          role="search"
          method="get"
          action="/admin/inscripciones"
          aria-label={copy.filterLabel}
          className="mt-3 grid gap-3 md:grid-cols-2"
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
      </details>
      <div className="flex flex-wrap items-center gap-2">
        <ul
          aria-label={copy.activeFiltersLabel}
          className="flex flex-wrap gap-2"
        >
          {chips.map((chip) => (
            <li key={chip} className={chipClasses}>
              {chip}
            </li>
          ))}
        </ul>
        <a href="/admin/inscripciones" className={linkClasses}>
          {copy.clearFilters}
        </a>
      </div>
      <Text tone="muted">{copy.resultCount(rows.length)}</Text>
      <AdminCardList
        label={copy.title}
        rows={rows}
        rowKey={(row) => row.id}
        card={(row) => (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-ink-900">{row.number}</span>
              <OrderStatusBadge status={row.status} label={row.statusLabel} />
            </div>
            <p className="text-ink-900">{row.studentName}</p>
            <Text tone="muted">
              {`${row.workshopName} · ${row.month} · ${row.turno}`}
            </Text>
            <p className="font-semibold text-ink-900">{row.total}</p>
            <Text tone="muted">{copy.requestedOn(row.requestedOn)}</Text>
            <div>
              <a
                href={`/admin/inscripciones/${row.id}`}
                aria-label={copy.viewDetailOf(row.number)}
                className={linkClasses}
              >
                {copy.viewDetail}
              </a>
            </div>
          </>
        )}
        empty={{
          title: copy.empty.title,
          message: copy.empty.message,
          action: { href: "/admin/inscripciones", label: copy.empty.action },
        }}
      />
      <details className="rounded-md bg-surface p-4 shadow-card">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-ink-900">
          {copy.statusGuide.title}
        </summary>
        <ul className="mt-2 flex flex-col gap-1 text-ink-700">
          {copy.statusGuide.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>
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
