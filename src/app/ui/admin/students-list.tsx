import { Heading } from "../atoms/heading";
import { AdminButton } from "./admin-button";
import { AdminButtonLink } from "./admin-button-link";
import { AdminPageHeader } from "./admin-page";
import { ADMIN_CARD_GRID, AdminColumns } from "./admin-sections";
import { adminCopy } from "./copy";
import { SelectField, TextField } from "./form-fields";
import { MoreOptions } from "./more-options";
import { StatusChip } from "./status-chip";

export interface StudentRow {
  readonly email: string;
  readonly name: string;
  readonly active: boolean;
  /** "Cerámica · noviembre 2026": her newest record that was not cancelled. */
  readonly current: string | null;
  /** What she owes, as text; null when she owes nothing. */
  readonly owes: string | null;
}

export interface StudentsFilter {
  readonly q: string;
  readonly taller: string;
  readonly estado: string;
  readonly mostrar: "activas" | "inactivas" | "todas";
  readonly page: number;
}

export interface StudentsListProps {
  readonly rows: readonly StudentRow[];
  readonly filter: StudentsFilter;
  readonly workshops: readonly { id: string; name: string }[];
  readonly statuses: readonly { value: string; label: string }[];
  readonly hasNext: boolean;
}

const copy = adminCopy.alumnas.list;

function pageHref(filter: StudentsFilter, page: number): string {
  const params = new URLSearchParams();
  if (filter.q) params.set("q", filter.q);
  if (filter.taller) params.set("taller", filter.taller);
  if (filter.estado) params.set("estado", filter.estado);
  if (filter.mostrar !== "activas") params.set("mostrar", filter.mostrar);
  params.set("page", String(page));
  return `/admin/alumnas?${params.toString()}`;
}

/**
 * The students, found by a big search and shown as plain cards: her name, where
 * she is this month and whether she owes. The search is a plain GET form and
 * every link a plain anchor: the Worker gate refuses the `.data` requests a
 * client navigation would make. The filters stay behind "Filtrar".
 */
export function StudentsList({
  rows,
  filter,
  workshops,
  statuses,
  hasNext,
}: StudentsListProps) {
  const filtered = Boolean(
    filter.taller || filter.estado || filter.mostrar !== "activas",
  );
  return (
    <section className="flex flex-col gap-5">
      <AdminPageHeader title={copy.title} />
      <div>
        <AdminButtonLink href="/admin/inscripciones/nueva">
          {copy.enroll}
        </AdminButtonLink>
      </div>
      <form
        role="search"
        method="get"
        action="/admin/alumnas"
        aria-label={copy.searchLabel}
        className="flex flex-col gap-3 rounded-md bg-surface p-5 shadow-card lg:p-6"
      >
        <AdminColumns
          start={
            <>
              <TextField
                label={copy.searchLabel}
                hint={copy.searchHint}
                name="q"
                type="search"
                autoComplete="off"
                defaultValue={filter.q}
              />
              <div>
                <AdminButton type="submit">{copy.search}</AdminButton>
              </div>
            </>
          }
          end={
            <MoreOptions label={copy.filter} defaultOpen={filtered}>
              <SelectField
                label={copy.workshop}
                name="taller"
                defaultValue={filter.taller}
                options={[
                  { value: "", label: copy.allWorkshops },
                  ...workshops.map((w) => ({ value: w.id, label: w.name })),
                ]}
              />
              <SelectField
                label={copy.orderState}
                name="estado"
                defaultValue={filter.estado}
                options={[
                  { value: "", label: copy.allOrderStates },
                  ...statuses,
                ]}
              />
              <SelectField
                label={copy.show}
                name="mostrar"
                defaultValue={filter.mostrar}
                options={[
                  { value: "activas", label: copy.shows.activas },
                  { value: "inactivas", label: copy.shows.inactivas },
                  { value: "todas", label: copy.shows.todas },
                ]}
              />
              <div>
                <AdminButton type="submit" variant="outline">
                  {copy.apply}
                </AdminButton>
              </div>
            </MoreOptions>
          }
        />
      </form>
      {rows.length === 0 ? (
        <p role="status" className="text-lg text-ink-700">
          {copy.empty}
        </p>
      ) : (
        <ul aria-label={copy.title} className={ADMIN_CARD_GRID}>
          {rows.map((row) => (
            <li
              key={row.email}
              className="flex flex-col gap-3 rounded-md bg-surface p-5 shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <Heading level={2} size="h4">
                    {row.name}
                  </Heading>
                  <p
                    className={`text-2xl font-bold tabular-nums ${row.owes === null ? "text-admin-positive-fg" : "text-admin-warning-fg"}`}
                  >
                    {row.owes === null ? copy.upToDate : copy.owes(row.owes)}
                  </p>
                  <p className="text-lg text-ink-700">
                    {row.current ?? copy.noCurrent}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {row.active ? null : (
                    <StatusChip status="cancelled" label={copy.inactive} />
                  )}
                </div>
              </div>
              <div>
                <AdminButtonLink
                  variant="secondary"
                  href={`/admin/alumnas/${encodeURIComponent(row.email)}`}
                  ariaLabel={`${copy.open} de ${row.name}`}
                >
                  {copy.open}
                </AdminButtonLink>
              </div>
            </li>
          ))}
        </ul>
      )}
      {filter.page > 1 || hasNext ? (
        <nav aria-label={copy.title} className="flex flex-wrap gap-3">
          {filter.page > 1 ? (
            <AdminButtonLink
              variant="outline"
              href={pageHref(filter, filter.page - 1)}
            >
              {copy.previous}
            </AdminButtonLink>
          ) : null}
          {hasNext ? (
            <AdminButtonLink
              variant="outline"
              href={pageHref(filter, filter.page + 1)}
            >
              {copy.next}
            </AdminButtonLink>
          ) : null}
        </nav>
      ) : null}
    </section>
  );
}
