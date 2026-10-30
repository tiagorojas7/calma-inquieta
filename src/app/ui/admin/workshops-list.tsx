import { Text } from "../atoms/heading";
import { AdminButton } from "./admin-button";
import { AdminButtonLink } from "./admin-button-link";
import { AdminFeedback, AdminPageHeader } from "./admin-page";
import { AdminEmptyState } from "./empty-state";
import { adminMicrocopy } from "./microcopy";
import { StatusBadge, type AdminStatus } from "./status-badge";

export interface WorkshopRow {
  readonly id: string;
  readonly name: string;
  readonly teacherName: string | null;
  readonly status: AdminStatus;
  readonly activeTurnos: number;
  /** Whether the current month accepts enrollments and the next step if not. */
  readonly enrollment: {
    readonly open: boolean;
    readonly summary: string;
    readonly cta: string | null;
    readonly href: string | null;
  };
  /** The next month nobody has opened yet, opened in one click. */
  readonly openNext?: {
    readonly period: string;
    readonly label: string;
  } | null;
}

export type WorkshopFilterKey = keyof typeof adminMicrocopy.workshops.filters;

const copy = adminMicrocopy.workshops;

const FILTER_KEYS = Object.keys(copy.filters) as WorkshopFilterKey[];

const linkClasses =
  "inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

/**
 * Talleres list. Every link is a plain anchor: the Worker gate refuses the
 * `.data` requests a client navigation would make.
 */
export function WorkshopsList({
  rows,
  filter,
  feedback = null,
}: {
  rows: readonly WorkshopRow[];
  filter: WorkshopFilterKey;
  feedback?: "deleted" | "opened" | null;
}) {
  const saved: { title: string; message?: string } | null = feedback
    ? copy.feedback[feedback]
    : null;
  return (
    <section className="flex flex-col gap-4">
      <AdminPageHeader
        title={copy.title}
        breadcrumbs={[
          { label: "Panel", href: "/admin" },
          { label: copy.title },
        ]}
        actions={
          <AdminButtonLink href="/admin/talleres/nuevo">
            {copy.newAction}
          </AdminButtonLink>
        }
      />
      {saved ? (
        <AdminFeedback
          tone="success"
          title={saved.title}
          message={saved.message}
        />
      ) : null}
      <nav aria-label={copy.filterLabel}>
        <ul className="flex flex-wrap gap-4">
          {FILTER_KEYS.map((key) => (
            <li key={key}>
              <a
                href={`/admin/talleres?estado=${key}`}
                aria-current={key === filter ? "page" : undefined}
                className={`${linkClasses} ${key === filter ? "font-semibold" : ""}`}
              >
                {copy.filters[key]}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {rows.length === 0 ? (
        <AdminEmptyState
          title={copy.empty.title}
          message={copy.empty.message}
          action={{ href: "/admin/talleres/nuevo", label: copy.newAction }}
        />
      ) : (
        <ul
          aria-label={copy.title}
          className="grid grid-cols-1 gap-3 lg:grid-cols-2"
        >
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-3 rounded-md bg-surface p-4 shadow-card"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <a href={`/admin/talleres/${row.id}`} className={linkClasses}>
                  {row.name}
                </a>
                <StatusBadge status={row.status} />
              </div>
              <Text tone="muted">
                {row.teacherName ?? copy.noTeacher} · {copy.columns.turnos}:{" "}
                {String(row.activeTurnos)}
              </Text>
              <p
                data-enrollment={row.enrollment.open ? "open" : "pending"}
                className="font-semibold text-ink-900"
              >
                <span className="sr-only">{copy.enrollment}: </span>
                {row.enrollment.summary}
              </p>
              {row.enrollment.cta && row.enrollment.href ? (
                <div>
                  <AdminButtonLink href={row.enrollment.href}>
                    {row.enrollment.cta}
                  </AdminButtonLink>
                </div>
              ) : null}
              {row.openNext ? (
                <form method="post" className="flex">
                  <input type="hidden" name="intent" value="open-month" />
                  <input type="hidden" name="workshopId" value={row.id} />
                  <input
                    type="hidden"
                    name="period"
                    value={row.openNext.period}
                  />
                  <AdminButton type="submit">
                    {copy.openMonth(row.openNext.label)}
                  </AdminButton>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
