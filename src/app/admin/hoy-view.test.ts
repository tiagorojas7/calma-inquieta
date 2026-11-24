import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import type {
  NotificationsView,
  PanelView,
  PendingPaymentItem,
} from "~/modules/insights";
import { buildStoredPrivateEvent } from "~/testing/contracts/private-event-repository.contract";
import { TODO_LIMIT, toHoyScreen, type HoyInput } from "./hoy-view";

const pesos = (amount: number) => {
  const money = Money.fromCentavos(amount * 100);
  if (!money.ok) throw new Error("bad amount");
  return money.value;
};

const panel: PanelView = {
  period: "2026-10",
  nextPeriod: "2026-11",
  occupancy: { capacity: 10, confirmed: 4, free: 6, percent: 40 },
  pending: { total: 0, older: 0 },
  confirmedThisMonth: 3,
  income: {
    orders: 3,
    fee: pesos(25_000),
    materials: pesos(3_000),
    total: pesos(28_000),
  },
  materialsToOrder: { orders: 0, units: 0 },
  month: {
    enrolled: 9,
    capacity: 23,
    occupancyPercent: 39,
    collected: pesos(96_000),
    teacherPay: pesos(27_000),
    materialsCost: pesos(6_000),
    profit: pesos(63_000),
  },
  today: {
    suppliersToOrder: [],
    ordersToDeliver: 0,
    pendingIntensiveRequests: 0,
  },
  alerts: {
    pendingOverdue: 0,
    withoutOpenPeriod: [],
    materialsNotRequested: { orders: 0, units: 0 },
  },
};

const payment = (
  overrides: Partial<PendingPaymentItem> = {},
): PendingPaymentItem => ({
  kind: "enrollment",
  id: "order-1",
  intensiveId: null,
  name: "Ana Pérez",
  workshopName: "Cerámica",
  period: "2026-10",
  amount: pesos(45_000),
  requestedAt: new Date("2026-10-20T12:00:00.000Z"),
  ...overrides,
});

const notifications = (
  pendingPayments: readonly PendingPaymentItem[] = [],
): NotificationsView => ({ unseen: 0, novelties: [], pendingPayments });

function input(overrides: Partial<HoyInput> = {}): HoyInput {
  return {
    panel,
    notifications: notifications(),
    events: [],
    emptyMonths: [],
    openMonths: [],
    classes: [],
    today: "2026-10-05",
    ...overrides,
  };
}

describe("toHoyScreen figures", () => {
  it("shows cobrado, por cobrar and what is left for the studio", () => {
    const screen = toHoyScreen(
      input({
        notifications: notifications([
          payment({ amount: pesos(45_000) }),
          payment({ id: "order-2", amount: pesos(5_000) }),
        ]),
      }),
    );

    expect(screen.monthLabel).toBe("octubre 2026");
    expect(screen.figures).toEqual({
      collected: "$ 96.000",
      toCollect: "$ 50.000",
      studio: "$ 63.000",
      studioTone: "income",
    });
  });

  it("keeps occupancy and teacher pay for the 'Ver más' part", () => {
    expect(toHoyScreen(input()).more).toEqual({
      occupancy: "39 %",
      occupancyDetail: "9 de 23 lugares",
      teachers: "$ 27.000",
      statisticsHref: "/admin/estadisticas?mes=2026-10",
    });
  });

  it("reads a month at a loss as money out", () => {
    const loss = Money.fromCentavos(-5_000_00);
    if (!loss.ok) throw new Error("bad amount");
    const screen = toHoyScreen(
      input({
        panel: { ...panel, month: { ...panel.month, profit: loss.value } },
      }),
    );
    expect(screen.figures.studioTone).toBe("expense");
  });
});

describe("toHoyScreen to-do cards", () => {
  it("turns a pending fee into 'Cobrar $X' with the order and its total", () => {
    const [card] = toHoyScreen(
      input({ notifications: notifications([payment()]) }),
    ).todo.cards;

    expect(card).toMatchObject({
      kind: "form",
      id: "cobrar-order-1",
      title: "Ana Pérez",
      facts: "Cuota · Cerámica · octubre 2026",
      intent: "confirm-order",
      label: "Cobrar $ 45.000",
      ariaLabel: "Cobrar $ 45.000 a Ana Pérez",
      fields: { orderId: "order-1", amount: "45000" },
    });
  });

  it("words a material sale, a deposit and a balance after what they charge", () => {
    const cards = toHoyScreen(
      input({
        notifications: notifications([
          payment({
            kind: "material-sale",
            id: "sale-1",
            amount: pesos(4_000),
            requestedAt: new Date("2026-10-01T12:00:00.000Z"),
          }),
          payment({
            kind: "workshop-deposit",
            id: "req-1",
            intensiveId: "int-1",
            workshopName: "Taller de torno",
            period: null,
            amount: pesos(15_000),
            requestedAt: new Date("2026-10-02T12:00:00.000Z"),
          }),
          payment({
            kind: "workshop-balance",
            id: "req-2",
            intensiveId: "int-1",
            workshopName: "Taller de torno",
            period: null,
            amount: pesos(25_000),
            requestedAt: new Date("2026-10-03T12:00:00.000Z"),
          }),
        ]),
      }),
    ).todo.cards;

    expect(
      cards.map((card) => ({
        id: card.id,
        summary: card.summary,
        intent: card.kind === "form" ? card.intent : null,
        label: card.kind === "form" ? card.label : null,
        fields: card.kind === "form" ? card.fields : null,
      })),
    ).toEqual([
      {
        id: "materiales-sale-1",
        summary: "Debe $ 4.000",
        intent: "confirm-order",
        label: "Cobrar materiales $ 4.000",
        fields: { orderId: "sale-1", amount: "4000" },
      },
      {
        id: "sena-req-1",
        summary: "Debe $ 15.000",
        intent: "confirm-deposit",
        label: "Confirmar seña $ 15.000",
        fields: { intensiveId: "int-1", requestId: "req-1", amount: "15000" },
      },
      {
        id: "saldo-req-2",
        summary: "Debe $ 25.000",
        intent: "record-balance",
        label: "Cobrar saldo $ 25.000",
        fields: { intensiveId: "int-1", requestId: "req-2", amount: "25000" },
      },
    ]);
  });

  it("opens the workshops list when a reservation lost its workshop", () => {
    const [card] = toHoyScreen(
      input({
        notifications: notifications([
          payment({ kind: "workshop-deposit", intensiveId: null }),
        ]),
      }),
    ).todo.cards;

    expect(card).toMatchObject({ kind: "link", href: "/admin/intensivos" });
  });

  it("shows a new private event with a link to open it and its WhatsApp", () => {
    const [card] = toHoyScreen(
      input({ events: [buildStoredPrivateEvent({ id: "ev-1" })] }),
    ).todo.cards;

    expect(card).toMatchObject({
      kind: "event",
      id: "evento-ev-1",
      title: "Ana Pérez",
      facts: "Evento privado · para el 05/12/2026",
      href: "/admin/eventos/ev-1",
    });
    expect(card?.kind === "event" && card.whatsappHref).toContain("wa.me");
  });

  it("offers 'Abrir <mes>' for each month the shared rule says can be opened", () => {
    const [card] = toHoyScreen(
      input({
        openMonths: [
          { workshopId: "w2", workshopName: "Acuarela", period: "2026-11" },
        ],
      }),
    ).todo.cards;

    expect(card).toMatchObject({
      kind: "form",
      id: "abrir-w2",
      title: "Acuarela",
      intent: "open-month",
      label: "Abrir noviembre",
      fields: { workshopId: "w2", period: "2026-11" },
    });
  });

  it("orders the oldest request first, events among payments, undated cards last", () => {
    const cards = toHoyScreen(
      input({
        notifications: notifications([
          payment({
            id: "old",
            requestedAt: new Date("2026-10-01T12:00:00.000Z"),
          }),
          payment({
            id: "new",
            requestedAt: new Date("2026-10-25T12:00:00.000Z"),
          }),
        ]),
        events: [
          buildStoredPrivateEvent({
            id: "mid",
            createdAt: new Date("2026-10-10T12:00:00.000Z"),
          }),
        ],
        openMonths: [
          { workshopId: "w2", workshopName: "Acuarela", period: "2026-11" },
        ],
      }),
    ).todo.cards;

    expect(cards.map((card) => card.id)).toEqual([
      "cobrar-old",
      "evento-mid",
      "cobrar-new",
      "abrir-w2",
    ]);
  });

  it("shows the first few and a 'Ver todo' link, or every card when asked", () => {
    const many = Array.from({ length: TODO_LIMIT + 3 }, (_, index) =>
      payment({
        id: `order-${String(index)}`,
        requestedAt: new Date(Date.UTC(2026, 9, index + 1)),
      }),
    );

    const short = toHoyScreen(input({ notifications: notifications(many) }));
    expect(short.todo.cards).toHaveLength(TODO_LIMIT);
    expect(short.todo.cards[0]?.id).toBe("cobrar-order-0");
    expect(short.todo.seeAllHref).toBe("/admin?ver=todo#para-hacer");

    const full = toHoyScreen(
      input({ notifications: notifications(many), showAll: true }),
    );
    expect(full.todo.cards).toHaveLength(TODO_LIMIT + 3);
    expect(full.todo.seeAllHref).toBeNull();
  });

  it("keeps the old reminders to order and hand over materials as links", () => {
    const cards = toHoyScreen(
      input({
        panel: {
          ...panel,
          today: {
            suppliersToOrder: ["Arcilla SA", "Pinceles SRL"],
            ordersToDeliver: 2,
            pendingIntensiveRequests: 0,
          },
        },
      }),
    ).todo.cards;

    expect(cards).toMatchObject([
      { id: "pedir", title: "Pedir materiales a Arcilla SA y Pinceles SRL" },
      { id: "entregar", title: "2 para entregar" },
    ]);
  });

  it("has no card when nothing is due", () => {
    expect(toHoyScreen(input()).todo.cards).toEqual([]);
  });
});

describe("toHoyScreen classes and news", () => {
  it("shows each class today with its time, students and the attendance sheet", () => {
    const { classes } = toHoyScreen(
      input({
        classes: [
          {
            periodId: "p1",
            turnoId: "t1",
            workshopName: "Cerámica",
            turnoLabel: "Lunes tarde",
            startsAt: "18:00",
            endsAt: "20:00",
            students: 3,
          },
          {
            periodId: "p1",
            turnoId: "t2",
            workshopName: "Acuarela",
            turnoLabel: "Lunes noche",
            startsAt: "20:00",
            endsAt: "21:00",
            students: null,
          },
        ],
      }),
    );

    expect(classes).toEqual([
      {
        key: "p1:t1",
        title: "Cerámica",
        facts: "18:00 a 20:00 h · 3 alumnas",
        href: "/admin/asistencia/p1/t1/2026-10-05",
      },
      {
        key: "p1:t2",
        title: "Acuarela",
        facts: "20:00 a 21:00 h",
        href: "/admin/asistencia/p1/t2/2026-10-05",
      },
    ]);
  });

  it("lists the unseen novelties as cards that open the item, a few at a time", () => {
    const novelties = Array.from({ length: 10 }, (_, index) => ({
      kind: "enrollment" as const,
      id: `order-${String(index)}`,
      intensiveId: null,
      name: `Alumna ${String(index)}`,
      workshopName: "Cerámica",
      period: "2026-10",
      eventDate: null,
      requestedAt: new Date("2026-10-30T12:00:00.000Z"),
    }));

    const screen = toHoyScreen(
      input({ notifications: { unseen: 10, novelties, pendingPayments: [] } }),
    );

    expect(screen.novelties).toHaveLength(8);
    expect(screen.novelties[0]).toMatchObject({
      name: "Alumna 0",
      href: "/admin/inscripciones/order-0",
    });
    expect(screen.moreNews).toBe(true);
  });
});
