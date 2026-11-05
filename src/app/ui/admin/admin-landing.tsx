import { Icon } from "../atoms/icon";
import { AreaChip } from "./admin-area";
import { ADMIN_NAV_MAIN } from "./admin-nav";
import { AdminButtonLink } from "./admin-button-link";
import { AdminPageHeader } from "./admin-page";
import { AdminSection } from "./admin-sections";
import { adminMicrocopy } from "./microcopy";

/** One thing due today: what it is and the single button that handles it. */
export interface TodayTask {
  readonly key: string;
  readonly text: string;
  /** The button label. */
  readonly action: string;
  /** Names the button for screen readers, since several say "Ver". */
  readonly hint: string;
  readonly href: string;
}

export interface AdminPanelSummary {
  readonly period: string;
  readonly monthLabel: string;
  readonly tasks: readonly TodayTask[];
  readonly figures: {
    readonly collected: string;
    readonly profit: string;
    readonly teachers: string;
    readonly occupancy: string;
    readonly occupancyDetail: string;
  };
}

const copy = adminMicrocopy.landing;

function Figure({
  label,
  value,
  detail,
  highlight = false,
}: {
  label: string;
  value: string;
  detail?: string;
  highlight?: boolean;
}) {
  return (
    <li
      className={`flex flex-col gap-1 rounded-md p-4 ${highlight ? "bg-sand-200" : "bg-sand-100"}`}
    >
      <p className="text-sm font-semibold text-ink-700">{label}</p>
      <p className="font-display text-3xl font-semibold tabular-nums text-ink-900">
        {value}
      </p>
      {detail ? <p className="text-sm text-ink-700">{detail}</p> : null}
    </li>
  );
}

/**
 * The home: "Hoy tenés que…" with an ordered list of actions, each with its
 * one button, and the month's four figures. Plain anchors only: the Worker
 * gate refuses the `.data` requests a client navigation would make.
 */
export function AdminLanding({ summary }: { summary: AdminPanelSummary }) {
  const { figures } = summary;
  return (
    <section className="flex flex-col gap-6">
      <AdminPageHeader title={copy.title} description={copy.subtitle} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <AdminSection title={copy.todayTitle}>
          {summary.tasks.length === 0 ? (
            <p className="text-lg text-ink-900">{copy.allDone}</p>
          ) : (
            <ol className="flex flex-col divide-y divide-admin-line">
              {summary.tasks.map((task, index) => (
                <li
                  key={task.key}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="text-lg text-ink-900">{task.text}</p>
                  <AdminButtonLink
                    href={task.href}
                    variant={index === 0 ? "primary" : "secondary"}
                    ariaLabel={`${task.action}: ${task.hint}`}
                    next
                  >
                    {task.action}
                  </AdminButtonLink>
                </li>
              ))}
            </ol>
          )}
        </AdminSection>
        <AdminSection
          title={copy.monthTitle(summary.monthLabel)}
          actions={
            <AdminButtonLink
              href={`/admin/estadisticas?mes=${summary.period}`}
              variant="secondary"
            >
              {copy.seeStatistics}
            </AdminButtonLink>
          }
        >
          <ul className="grid gap-3 sm:grid-cols-2">
            <Figure label={copy.figures.collected} value={figures.collected} />
            <Figure
              label={copy.figures.profit}
              value={figures.profit}
              highlight
            />
            <Figure
              label={copy.figures.occupancy}
              value={figures.occupancy}
              detail={figures.occupancyDetail}
            />
            <Figure label={copy.figures.teachers} value={figures.teachers} />
          </ul>
        </AdminSection>
      </div>
      <AdminSection title={copy.areasTitle} className="lg:hidden">
        <nav aria-label={copy.areasLabel}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {ADMIN_NAV_MAIN.filter((entry) => entry.area !== "home").map(
              (entry) => (
                <li key={entry.href}>
                  <a
                    href={entry.href}
                    data-area={entry.area}
                    className="flex min-h-16 items-center gap-4 rounded-md border border-admin-line p-3 text-lg font-bold text-ink-900 hover:bg-sand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800"
                  >
                    <AreaChip area={entry.area} size={28} />
                    <span className="flex-1">{entry.label}</span>
                    <Icon
                      name="chevron-right"
                      size={24}
                      aria-hidden="true"
                      className="text-clay-800"
                    />
                  </a>
                </li>
              ),
            )}
          </ul>
        </nav>
      </AdminSection>
    </section>
  );
}
