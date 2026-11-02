import { Heading, Text } from "../atoms/heading";
import { AdminButton } from "./admin-button";
import { AdminButtonLink } from "./admin-button-link";
import { adminMicrocopy } from "./microcopy";
import { StatusChip } from "./status-chip";

const copy = adminMicrocopy.workshops;
const sections = copy.detailSections;

export interface OverviewTurno {
  readonly id: string;
  readonly label: string;
  readonly when: string;
  readonly capacity: number;
}

export interface OverviewEmptyMonth {
  readonly id: string;
  /** Capitalized month name. */
  readonly label: string;
}

export interface OverviewMonth {
  readonly period: string;
  readonly label: string;
  readonly status: keyof typeof copy.periods.statuses;
  readonly href: string;
}

const linkClasses =
  "inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

/**
 * What the taller needs at a glance: one status line with the single next
 * action, then its turnos and its months. Every link is a plain anchor: the
 * Worker gate refuses the `.data` requests a client navigation would make.
 */
export function WorkshopOverview({
  summary,
  open,
  next,
  turnos,
  months,
  emptyMonths = [],
  turnosHref,
  monthsHref,
}: {
  summary: string;
  /** Whether the current month already accepts enrollments. */
  open: boolean;
  next: { cta: string; href: string } | null;
  turnos: readonly OverviewTurno[];
  months: readonly OverviewMonth[];
  /** Open months without an active turno: nobody can enroll in them. */
  emptyMonths?: readonly OverviewEmptyMonth[];
  turnosHref: string;
  monthsHref: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <section
        aria-label={copy.enrollment}
        data-enrollment={open ? "open" : "pending"}
        className="flex flex-col gap-3 rounded-md bg-surface p-4 shadow-card"
      >
        <p className="text-lg font-semibold text-ink-900">{summary}</p>
        {next ? (
          <div>
            <AdminButtonLink href={next.href}>{next.cta}</AdminButtonLink>
          </div>
        ) : null}
      </section>
      {emptyMonths.map((month) => (
        <section
          key={month.id}
          role="alert"
          aria-label={copy.emptyMonth.warning(month.label)}
          className="flex flex-col gap-3 rounded-md border-2 border-clay-800 bg-surface p-4 shadow-card"
        >
          <p className="text-lg font-semibold text-ink-900">
            {copy.emptyMonth.warning(month.label)}
          </p>
          <form method="post">
            <input type="hidden" name="intent" value="fill-month" />
            <input type="hidden" name="periodId" value={month.id} />
            <AdminButton type="submit">
              {copy.emptyMonth.fix(month.label)}
            </AdminButton>
          </form>
        </section>
      ))}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section
          aria-labelledby="overview-turnos"
          className="flex flex-col gap-2 rounded-md bg-surface p-4 shadow-card"
        >
          <Heading level={2} id="overview-turnos">
            {sections.turnos}
          </Heading>
          {turnos.length === 0 ? (
            <Text tone="muted">{copy.summaryLine.noTurnos}</Text>
          ) : (
            <ul className="flex flex-col gap-1">
              {turnos.map((turno) => (
                <li key={turno.id}>
                  {turno.label}: {turno.when} · {copy.quick.capacity}{" "}
                  {String(turno.capacity)}
                </li>
              ))}
            </ul>
          )}
          <a href={turnosHref} className={linkClasses}>
            {sections.manageTurnos}
          </a>
        </section>
        <section
          aria-labelledby="overview-months"
          className="flex flex-col gap-2 rounded-md bg-surface p-4 shadow-card"
        >
          <Heading level={2} id="overview-months">
            {sections.months}
          </Heading>
          {months.length === 0 ? (
            <Text tone="muted">{sections.noMonths}</Text>
          ) : (
            <ul className="flex flex-col gap-1">
              {months.map((month) => (
                <li
                  key={month.period}
                  className="flex flex-wrap items-center gap-2"
                >
                  <a href={month.href} className={linkClasses}>
                    {month.label}
                  </a>
                  <StatusChip
                    status={month.status === "open" ? "active" : month.status}
                    label={copy.periods.statuses[month.status]}
                  />
                </li>
              ))}
            </ul>
          )}
          <a href={monthsHref} className={linkClasses}>
            {sections.manageMonths}
          </a>
        </section>
      </div>
    </div>
  );
}
