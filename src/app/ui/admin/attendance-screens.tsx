import { AdminButton as Button } from "./admin-button";
import { AdminButtonLink } from "./admin-button-link";
import { AdminPageHeader } from "./admin-page";
import { AdminCardList } from "./admin-sections";
import { SelectField } from "./form-fields";
import { adminMicrocopy } from "./microcopy";

const copy = adminMicrocopy.attendance;

export interface AttendanceTurnoRow {
  readonly key: string;
  readonly href: string;
  readonly workshop: string;
  readonly turno: string;
  readonly schedule: string;
  readonly sessions: number;
}

export interface AttendanceIndexProps {
  readonly filter: { readonly mes: string; readonly taller: string };
  readonly months: readonly { value: string; label: string }[];
  readonly workshops: readonly { value: string; label: string }[];
  readonly rows: readonly AttendanceTurnoRow[];
}

/**
 * Month, workshop and turno chooser. The filter is a plain GET form and every
 * link a plain anchor: the Worker gate refuses the `.data` requests a client
 * navigation would make.
 */
export function AttendanceIndex({
  filter,
  months,
  workshops,
  rows,
}: AttendanceIndexProps) {
  return (
    <section className="flex flex-col gap-4">
      <AdminPageHeader
        title={copy.title}
        breadcrumbs={[
          { label: "Panel", href: "/admin" },
          { label: copy.title },
        ]}
        actions={
          <AdminButtonLink
            variant="outline"
            href="/admin/asistencia/recuperaciones"
          >
            {copy.makeUpsLink}
          </AdminButtonLink>
        }
      />
      <form
        role="search"
        method="get"
        action="/admin/asistencia"
        aria-label={copy.filterLabel}
        className="grid gap-3 md:grid-cols-2"
      >
        <SelectField
          label={copy.filters.month}
          name="mes"
          defaultValue={filter.mes}
          options={months}
        />
        <SelectField
          label={copy.filters.workshop}
          name="taller"
          defaultValue={filter.taller}
          options={[
            { value: "", label: copy.filters.anyWorkshop },
            ...workshops,
          ]}
        />
        <div>
          <Button type="submit">{copy.filters.apply}</Button>
        </div>
      </form>
      <AdminCardList
        label={copy.title}
        rows={rows}
        rowKey={(row) => row.key}
        card={(row) => (
          <>
            <p className="font-semibold text-ink-900">{row.workshop}</p>
            <dl className="grid gap-1 text-sm text-ink-700">
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-semibold">{copy.cardLabels.turno}</dt>
                <dd>{row.turno}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-semibold">{copy.cardLabels.schedule}</dt>
                <dd>{row.schedule}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-semibold">{copy.cardLabels.sessions}</dt>
                <dd>{String(row.sessions)}</dd>
              </div>
            </dl>
            <div>
              <AdminButtonLink
                href={row.href}
                ariaLabel={copy.openSessionsFor(
                  `${row.workshop}, ${row.turno}`,
                )}
              >
                {copy.openSessions}
              </AdminButtonLink>
            </div>
          </>
        )}
        empty={{
          title: copy.empty.title,
          message: copy.empty.message,
          action: { href: "/admin/asistencia", label: copy.empty.action },
        }}
      />
    </section>
  );
}

export interface AttendanceSessionRow {
  readonly key: string;
  readonly href: string;
  readonly date: string;
  readonly marked: string;
  readonly present: string;
  readonly absent: string;
}

export interface AttendanceSessionsProps {
  readonly heading: string;
  readonly subtitle: string;
  readonly rows: readonly AttendanceSessionRow[];
}

/** The generated class dates of one turno and month. */
export function AttendanceSessions({
  heading,
  subtitle,
  rows,
}: AttendanceSessionsProps) {
  return (
    <section className="flex flex-col gap-4">
      <AdminPageHeader
        title={heading}
        description={subtitle}
        breadcrumbs={[
          { label: "Panel", href: "/admin" },
          { label: copy.title, href: "/admin/asistencia" },
          { label: heading },
        ]}
        back={{ href: "/admin/asistencia", label: copy.sessions.back }}
      />
      <AdminCardList
        label={copy.sessions.caption}
        rows={rows}
        rowKey={(row) => row.key}
        card={(row) => (
          <>
            <p className="font-semibold text-ink-900">{row.date}</p>
            <dl className="grid grid-cols-3 gap-2 text-sm text-ink-700">
              <div>
                <dt className="font-semibold">
                  {copy.sessions.columns.marked}
                </dt>
                <dd>{row.marked}</dd>
              </div>
              <div>
                <dt className="font-semibold">
                  {copy.sessions.columns.present}
                </dt>
                <dd>{row.present}</dd>
              </div>
              <div>
                <dt className="font-semibold">
                  {copy.sessions.columns.absent}
                </dt>
                <dd>{row.absent}</dd>
              </div>
            </dl>
            <div>
              <AdminButtonLink
                href={row.href}
                ariaLabel={copy.sessions.openFor(row.date)}
              >
                {copy.sessions.open}
              </AdminButtonLink>
            </div>
          </>
        )}
        empty={{
          title: copy.sessions.empty.title,
          message: copy.sessions.empty.message,
          action: {
            href: "/admin/asistencia",
            label: copy.sessions.empty.action,
          },
        }}
      />
    </section>
  );
}
