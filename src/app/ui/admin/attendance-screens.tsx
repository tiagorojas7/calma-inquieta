import { AdminButton as Button } from "./admin-button";
import { AdminButtonLink } from "./admin-button-link";
import { AdminPageHeader } from "./admin-page";
import { AdminCardList } from "./admin-sections";
import { adminCopy } from "./copy";
import { SelectField } from "./form-fields";

const copy = adminCopy.clases.attendance;

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
 * Month and workshop chooser, then one card per turno. The filter is a plain
 * GET form and every link a plain anchor: the Worker gate refuses the `.data`
 * requests a client navigation would make.
 */
export function AttendanceIndex({
  filter,
  months,
  workshops,
  rows,
}: AttendanceIndexProps) {
  const t = copy.index;
  return (
    <section className="flex flex-col gap-4">
      <AdminPageHeader
        title={t.title}
        back={{ href: "/admin/clases", label: t.back }}
        actions={
          <AdminButtonLink
            variant="secondary"
            href="/admin/asistencia/recuperaciones"
          >
            {t.makeUps}
          </AdminButtonLink>
        }
      />
      <form
        role="search"
        method="get"
        action="/admin/asistencia"
        aria-label={t.title}
        className="grid gap-3 md:grid-cols-2"
      >
        <SelectField
          label={t.month}
          name="mes"
          defaultValue={filter.mes}
          options={months}
        />
        <SelectField
          label={t.workshop}
          name="taller"
          defaultValue={filter.taller}
          options={[{ value: "", label: t.anyWorkshop }, ...workshops]}
        />
        <div>
          <Button type="submit" variant="secondary">
            {t.apply}
          </Button>
        </div>
      </form>
      <AdminCardList
        label={t.title}
        rows={rows}
        rowKey={(row) => row.key}
        card={(row) => (
          <>
            <p className="text-xl font-semibold text-ink-900">{row.workshop}</p>
            <p className="text-lg text-ink-700">
              {row.turno} · {row.schedule}
            </p>
            <p className="text-lg text-ink-700">{t.sessions(row.sessions)}</p>
            <div>
              <AdminButtonLink
                href={row.href}
                ariaLabel={`${t.open}: ${row.workshop}, ${row.turno}`}
              >
                {t.open}
              </AdminButtonLink>
            </div>
          </>
        )}
        empty={{
          title: t.emptyTitle,
          message: t.emptyMessage,
          action: { href: "/admin/asistencia", label: t.emptyAction },
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

/** The class dates of one turno and month, each with who came and who did not. */
export function AttendanceSessions({
  heading,
  subtitle,
  rows,
}: AttendanceSessionsProps) {
  const t = copy.sessions;
  return (
    <section className="flex flex-col gap-4">
      <AdminPageHeader
        title={heading}
        description={subtitle}
        back={{ href: "/admin/asistencia", label: t.back }}
      />
      <AdminCardList
        label={heading}
        rows={rows}
        rowKey={(row) => row.key}
        card={(row) => (
          <>
            <p className="text-xl font-semibold text-ink-900">{row.date}</p>
            {row.marked === "0" ? null : (
              <p className="text-lg text-ink-700">
                {t.present}: {row.present} · {t.absent}: {row.absent}
              </p>
            )}
            <div>
              <AdminButtonLink
                href={row.href}
                ariaLabel={`${t.open}: ${row.date}`}
              >
                {t.open}
              </AdminButtonLink>
            </div>
          </>
        )}
        empty={{
          title: copy.index.emptyTitle,
          message: copy.index.emptyMessage,
          action: { href: "/admin/asistencia", label: t.back },
        }}
      />
    </section>
  );
}
