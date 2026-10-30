import { Heading, Text } from "../atoms/heading";
import { ADMIN_NAV } from "./admin-nav";
import { adminMicrocopy } from "./microcopy";

export interface AdminPanelSummary {
  readonly period: string;
  readonly monthLabel: string;
  readonly nextMonthLabel: string;
  readonly occupancy: {
    readonly percent: number;
    readonly confirmed: number;
    readonly capacity: number;
    readonly free: number;
  };
  readonly pending: { readonly total: number; readonly older: number };
  readonly confirmedThisMonth: number;
  readonly income: {
    readonly total: string;
    readonly fee: string;
    readonly materials: string;
  };
  readonly materialsToOrder: {
    readonly orders: number;
    readonly units: number;
  };
  readonly alerts: {
    readonly withoutOpenPeriod: readonly {
      readonly workshopId: string;
      readonly name: string;
    }[];
  };
}

const copy = adminMicrocopy.landing;

const linkClasses =
  "inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

function SummaryCard({
  label,
  value,
  detail,
  href,
  action,
}: {
  label: string;
  value: string;
  detail: string;
  href: string;
  action: string;
}) {
  return (
    <li className="flex flex-col gap-1 rounded-md bg-surface p-4 shadow-card">
      <p className="text-base text-ink-600">{label}</p>
      <p className="font-display text-h2 font-medium text-ink-900">{value}</p>
      <p className="text-base text-ink-700">{detail}</p>
      <a href={href} className={linkClasses}>
        {action}
        <span className="sr-only">: {label}</span>
      </a>
    </li>
  );
}

function Alerts({ summary }: { summary: AdminPanelSummary }) {
  const alerts = copy.alerts;
  const items = [
    ...(summary.pending.older > 0
      ? [
          {
            key: "overdue",
            text: alerts.overdue(summary.pending.older),
            href: "/admin/inscripciones?estado=pending_confirmation",
            action: alerts.overdueAction,
          },
        ]
      : []),
    ...summary.alerts.withoutOpenPeriod.map((workshop) => ({
      key: `period-${workshop.workshopId}`,
      text: alerts.withoutPeriod(workshop.name, summary.nextMonthLabel),
      href: `/admin/talleres/${workshop.workshopId}/periodos`,
      action: alerts.withoutPeriodAction(workshop.name),
    })),
    ...(summary.materialsToOrder.orders > 0
      ? [
          {
            key: "materials",
            text: alerts.materials(summary.materialsToOrder.orders),
            href: "/admin/inscripciones/materiales",
            action: alerts.materialsAction,
          },
        ]
      : []),
  ];
  return (
    <section aria-labelledby="panel-alerts" className="flex flex-col gap-3">
      <Heading level={2} size="h3" id="panel-alerts">
        {alerts.title}
      </Heading>
      {items.length === 0 ? (
        <Text>{alerts.empty}</Text>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex flex-col gap-1 rounded-md border-l-4 border-terracotta-700 bg-surface p-4 shadow-card"
            >
              <p className="text-base text-ink-900">{item.text}</p>
              <a href={item.href} className={linkClasses}>
                {item.action}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * The general panel: greeting, the month's figures, pending alerts and
 * shortcuts to the areas. Plain anchors only: the Worker gate refuses the
 * `.data` requests a client navigation would make.
 */
export function AdminLanding({
  email,
  summary,
}: {
  email: string;
  summary: AdminPanelSummary;
}) {
  const cards = copy.cards;
  const enrollments = "/admin/inscripciones";
  const statistics = `/admin/estadisticas?mes=${summary.period}`;
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Heading level={1}>{copy.title}</Heading>
        <Text>{copy.greeting(email)}</Text>
        <Text tone="muted">{copy.intro}</Text>
      </div>
      <Alerts summary={summary} />
      <section aria-labelledby="panel-summary" className="flex flex-col gap-3">
        <Heading level={2} size="h3" id="panel-summary">
          {copy.summaryTitle(summary.monthLabel)}
        </Heading>
        <ul className="grid gap-3 sm:grid-cols-2">
          <SummaryCard
            label={cards.occupancy.label}
            value={cards.occupancy.value(summary.occupancy.percent)}
            detail={cards.occupancy.detail(
              summary.occupancy.confirmed,
              summary.occupancy.capacity,
              summary.occupancy.free,
            )}
            href={statistics}
            action={cards.occupancy.action}
          />
          <SummaryCard
            label={cards.pending.label}
            value={String(summary.pending.total)}
            detail={cards.pending.detail(summary.pending.older)}
            href={`${enrollments}?estado=pending_confirmation`}
            action={cards.pending.action}
          />
          <SummaryCard
            label={cards.confirmed.label}
            value={String(summary.confirmedThisMonth)}
            detail={cards.confirmed.detail}
            href={`${enrollments}?estado=paid&mes=${summary.period}`}
            action={cards.confirmed.action}
          />
          <SummaryCard
            label={cards.income.label}
            value={summary.income.total}
            detail={cards.income.detail(
              summary.income.fee,
              summary.income.materials,
            )}
            href={statistics}
            action={cards.income.action}
          />
          <SummaryCard
            label={cards.materials.label}
            value={String(summary.materialsToOrder.units)}
            detail={cards.materials.detail(
              summary.materialsToOrder.orders,
              summary.materialsToOrder.units,
            )}
            href={`${enrollments}/materiales`}
            action={cards.materials.action}
          />
        </ul>
      </section>
      <section aria-labelledby="panel-areas" className="flex flex-col gap-3">
        <Heading level={2} size="h3" id="panel-areas">
          {copy.areasTitle}
        </Heading>
        <ul className="grid gap-3 sm:grid-cols-2">
          {ADMIN_NAV.map((entry) => (
            <li
              key={entry.href}
              className="flex flex-col gap-1 rounded-md bg-surface p-4 shadow-card"
            >
              <a
                href={entry.href}
                className="flex min-h-11 items-center font-display text-h3 text-ink-900 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800"
              >
                {entry.label}
              </a>
              {copy.areaHints[entry.href] ? (
                <p className="text-base text-ink-700">
                  {copy.areaHints[entry.href]}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
