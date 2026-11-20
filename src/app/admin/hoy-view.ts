import { dateLabel, monthLabel } from "~/app/enrollment/order-labels";
import { formatTimeRange } from "~/app/catalog/format";
import type { AdminAreaKey } from "~/app/ui/admin/admin-areas";
import type { ClassCard, HoyScreen, TodoCard } from "~/app/ui/admin/hoy";
import { hoyCopy } from "~/app/ui/admin/copy/hoy";
import { Money } from "~/modules/_shared";
import { formatPesos } from "~/modules/enrollments";
import type {
  NotificationsView,
  PanelView,
  PendingPaymentKind,
} from "~/modules/insights";
import type { PrivateEvent } from "~/modules/private-events";
import { toNotificationsScreen } from "./notifications-view";
import type { EmptyMonthTask } from "./empty-months";
import type { OpenMonthTask } from "./hoy-open-months";
import { monthName } from "./workshop-readiness";
import { whatsappHref } from "./whatsapp-href";

const copy = hoyCopy;

/** Cards shown before "Ver todo". */
export const TODO_LIMIT = 8;

/** How many new-request cards are shown; the bell page lists the rest. */
export const NEWS_LIMIT = 8;

/** The posts Hoy's own action accepts. */
export type HoyIntent =
  "confirm-order" | "confirm-deposit" | "record-balance" | "open-month";

/** A class today, as the loader read it. `students` is null when unknown. */
export interface TodayClass {
  readonly periodId: string;
  readonly turnoId: string;
  readonly workshopName: string;
  readonly turnoLabel: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly students: number | null;
}

export interface HoyInput {
  readonly panel: PanelView;
  readonly notifications: NotificationsView;
  /** Private events still marked as new. */
  readonly events: readonly PrivateEvent[];
  readonly emptyMonths: readonly EmptyMonthTask[];
  /** Months the shared open-month rule offers, up to the next one. */
  readonly openMonths: readonly OpenMonthTask[];
  readonly classes: readonly TodayClass[];
  /** Today in Córdoba, `YYYY-MM-DD`. */
  readonly today: string;
  /** Show every card instead of the first few. */
  readonly showAll?: boolean;
}

const PAYMENT_AREA: Record<PendingPaymentKind, AdminAreaKey> = {
  enrollment: "enrollments",
  "material-sale": "materials",
  "workshop-deposit": "intensives",
  "workshop-balance": "intensives",
};

const pesosOf = (amount: Money) => String(amount.toCentavos() / 100);

function sumOf(amounts: readonly Money[]): string {
  const total = Money.fromCentavos(
    amounts.reduce((sum, amount) => sum + amount.toCentavos(), 0),
  );
  return total.ok ? formatPesos(total.value) : "";
}

const joined = (parts: readonly (string | null)[]) =>
  parts.filter((part): part is string => part !== null).join(" · ");

/** A payment still owed as the card with its one button. */
function paymentCard(
  item: NotificationsView["pendingPayments"][number],
): TodoCard {
  const amount = formatPesos(item.amount);
  const base = {
    title: item.name,
    summary: `Debe ${amount}`,
    area: PAYMENT_AREA[item.kind],
  };
  const where = item.workshopName;
  const month = item.period === null ? null : monthLabel(item.period);
  if (item.kind === "enrollment" || item.kind === "material-sale") {
    const sale = item.kind === "material-sale";
    const label = sale
      ? copy.todo.chargeMaterials(amount)
      : copy.todo.charge(amount);
    return {
      ...base,
      kind: "form",
      id: `${sale ? "materiales" : "cobrar"}-${item.id}`,
      facts: joined([sale ? copy.todo.materials : copy.todo.fee, where, month]),
      intent: "confirm-order",
      label,
      ariaLabel: copy.todo.chargeTo(label, item.name),
      fields: { orderId: item.id, amount: pesosOf(item.amount) },
    };
  }
  const deposit = item.kind === "workshop-deposit";
  const id = `${deposit ? "sena" : "saldo"}-${item.id}`;
  const facts = joined([
    deposit ? copy.todo.deposit : copy.todo.balance,
    where,
  ]);
  // A request whose workshop is gone cannot be posted: the list opens instead.
  if (item.intensiveId === null)
    return {
      ...base,
      kind: "link",
      id,
      facts,
      label: copy.todo.seeWorkshop,
      href: "/admin/intensivos",
    };
  const label = deposit
    ? copy.todo.confirmDeposit(amount)
    : copy.todo.chargeBalance(amount);
  return {
    ...base,
    kind: "form",
    id,
    facts,
    intent: deposit ? "confirm-deposit" : "record-balance",
    label,
    ariaLabel: copy.todo.chargeTo(label, item.name),
    fields: {
      intensiveId: item.intensiveId,
      requestId: item.id,
      amount: pesosOf(item.amount),
    },
  };
}

function eventCard(event: PrivateEvent): TodoCard {
  return {
    kind: "event",
    id: `evento-${event.id}`,
    title: event.fullName,
    facts: joined([
      copy.todo.privateEvent,
      copy.todo.forDate(dateLabel(event.desiredDate)),
    ]),
    area: "events",
    href: `/admin/eventos/${event.id}`,
    whatsappHref: whatsappHref(event.phoneDigits),
  };
}

function listOf(names: readonly string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1] ?? ""}`;
}

/** Cards without a date, after the dated ones: months to open, then materials. */
function undatedCards(input: HoyInput): TodoCard[] {
  const { panel } = input;
  const cards: TodoCard[] = [];
  for (const task of input.openMonths) {
    const month = monthName(task.period);
    cards.push({
      kind: "form",
      id: `abrir-${task.workshopId}`,
      title: task.workshopName,
      facts: copy.todo.openFacts(month),
      area: "workshops",
      intent: "open-month",
      label: copy.todo.open(month),
      ariaLabel: `${copy.todo.open(month)}: ${task.workshopName}`,
      fields: { workshopId: task.workshopId, period: task.period },
    });
  }
  for (const empty of input.emptyMonths)
    cards.push({
      kind: "link",
      id: `turnos-${empty.periodId}`,
      title: empty.workshopName,
      facts: copy.todo.emptyMonth(empty.month),
      area: "workshops",
      label: copy.todo.addTurno,
      href: `/admin/talleres/${empty.workshopId}`,
    });
  if (panel.today.suppliersToOrder.length > 0)
    cards.push({
      kind: "link",
      id: "pedir",
      title: copy.todo.orderTitle(listOf(panel.today.suppliersToOrder)),
      facts: "",
      area: "materials",
      label: copy.todo.order,
      href: "/admin/materiales",
    });
  if (panel.today.ordersToDeliver > 0)
    cards.push({
      kind: "link",
      id: "entregar",
      title: copy.todo.deliverTitle(panel.today.ordersToDeliver),
      facts: "",
      area: "materials",
      label: copy.todo.deliver,
      href: "/admin/materiales",
    });
  return cards;
}

/** Payments and new events, the oldest request first. */
function datedCards(input: HoyInput): TodoCard[] {
  const dated = [
    ...input.notifications.pendingPayments.map((item) => ({
      at: item.requestedAt.getTime(),
      card: paymentCard(item),
    })),
    ...input.events.map((event) => ({
      at: event.createdAt.getTime(),
      card: eventCard(event),
    })),
  ];
  return dated.sort((a, b) => a.at - b.at).map((entry) => entry.card);
}

function classCard(item: TodayClass, today: string): ClassCard {
  return {
    key: `${item.periodId}:${item.turnoId}`,
    title: item.workshopName,
    facts: joined([
      formatTimeRange(item.startsAt, item.endsAt),
      item.students === null ? null : copy.classes.students(item.students),
    ]),
    href: `/admin/asistencia/${item.periodId}/${item.turnoId}/${today}`,
  };
}

/** Everything Hoy shows, as plain strings, links and cards. */
export function toHoyScreen(input: HoyInput): HoyScreen {
  const { panel } = input;
  const all = [...datedCards(input), ...undatedCards(input)];
  const hidden = !input.showAll && all.length > TODO_LIMIT;
  const novelties = toNotificationsScreen(input.notifications).novelties;
  return {
    monthLabel: monthLabel(panel.period),
    figures: {
      collected: formatPesos(panel.month.collected),
      toCollect: sumOf(
        input.notifications.pendingPayments.map((item) => item.amount),
      ),
      studio: formatPesos(panel.month.profit),
      studioTone: panel.month.profit.toCentavos() < 0 ? "expense" : "income",
    },
    more: {
      occupancy: `${String(panel.month.occupancyPercent)} %`,
      occupancyDetail: copy.more.occupancyDetail(
        panel.month.enrolled,
        panel.month.capacity,
      ),
      teachers: formatPesos(panel.month.teacherPay),
      statisticsHref: `/admin/estadisticas?mes=${panel.period}`,
    },
    todo: {
      cards: hidden ? all.slice(0, TODO_LIMIT) : all,
      seeAllHref: hidden ? "/admin?ver=todo#para-hacer" : null,
    },
    classes: input.classes.map((item) => classCard(item, input.today)),
    novelties: novelties.slice(0, NEWS_LIMIT),
    moreNews: novelties.length > NEWS_LIMIT,
  };
}
