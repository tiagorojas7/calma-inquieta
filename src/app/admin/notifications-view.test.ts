import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import type {
  NotificationsView,
  NoveltyItem,
  PendingPaymentItem,
} from "~/modules/insights";
import { toNotificationsScreen } from "./notifications-view";

const pesos = (amount: number) => {
  const money = Money.fromCentavos(amount * 100);
  if (!money.ok) throw new Error("fixture money");
  return money.value;
};

const novelty = (overrides: Partial<NoveltyItem>): NoveltyItem => ({
  kind: "enrollment",
  id: "11111111-1111-4111-8111-111111111111",
  intensiveId: null,
  name: "Ana Pérez",
  workshopName: "Cerámica",
  period: "2026-11",
  eventDate: null,
  requestedAt: new Date("2026-10-30T15:00:00.000Z"),
  ...overrides,
});

const payment = (
  overrides: Partial<PendingPaymentItem>,
): PendingPaymentItem => ({
  kind: "enrollment",
  id: "22222222-2222-4222-8222-222222222222",
  intensiveId: null,
  name: "Ana Pérez",
  workshopName: "Cerámica",
  period: "2026-11",
  amount: pesos(58_000),
  requestedAt: new Date("2026-10-30T15:00:00.000Z"),
  ...overrides,
});

const view = (
  novelties: NoveltyItem[],
  pendingPayments: PendingPaymentItem[],
): NotificationsView => ({
  unseen: novelties.length,
  novelties,
  pendingPayments,
});

describe("notifications screen", () => {
  it("links each novelty to the admin page that opens it and marks it read", () => {
    const screen = toNotificationsScreen(
      view(
        [
          novelty({}),
          novelty({
            kind: "workshop-request",
            id: "33333333-3333-4333-8333-333333333333",
            intensiveId: "44444444-4444-4444-8444-444444444444",
            name: "Bea Gómez",
            workshopName: "Taller de torno",
            period: null,
          }),
          novelty({
            kind: "private-event",
            id: "55555555-5555-4555-8555-555555555555",
            name: "Dora Ruiz",
            workshopName: null,
            period: null,
            eventDate: "2026-12-05",
          }),
        ],
        [],
      ),
    );

    expect(screen.unseen).toBe(3);
    expect(
      screen.novelties.map(({ href, kindLabel, name }) => [
        href,
        kindLabel,
        name,
      ]),
    ).toEqual([
      [
        "/admin/inscripciones/11111111-1111-4111-8111-111111111111",
        "Inscripción",
        "Ana Pérez",
      ],
      [
        "/admin/intensivos/44444444-4444-4444-8444-444444444444/reservas",
        "Reserva de workshop",
        "Bea Gómez",
      ],
      [
        "/admin/eventos/55555555-5555-4555-8555-555555555555",
        "Evento privado",
        "Dora Ruiz",
      ],
    ]);
    expect(screen.novelties[0]?.detail).toBe("Cerámica · noviembre 2026");
    expect(screen.novelties[1]?.detail).toBe("Taller de torno");
    expect(screen.novelties[2]?.detail).toBe("Fecha deseada: 05/12/2026");
    expect(screen.novelties[0]?.receivedAt).toBe("30/10/2026 12:00");
  });

  it("says what each pending payment owes, how much, and where to collect it", () => {
    const screen = toNotificationsScreen(
      view(
        [],
        [
          payment({}),
          payment({
            kind: "material-sale",
            id: "66666666-6666-4666-8666-666666666666",
            amount: pesos(4_000),
          }),
          payment({
            kind: "workshop-deposit",
            id: "77777777-7777-4777-8777-777777777777",
            intensiveId: "44444444-4444-4444-8444-444444444444",
            workshopName: "Taller de torno",
            period: null,
            amount: pesos(15_000),
          }),
          payment({
            kind: "workshop-balance",
            id: "88888888-8888-4888-8888-888888888888",
            intensiveId: "44444444-4444-4444-8444-444444444444",
            workshopName: "Taller de torno",
            period: null,
            amount: pesos(25_000),
          }),
        ],
      ),
    );

    expect(
      screen.payments.map(({ href, owedLabel, amount }) => [
        href,
        owedLabel,
        amount,
      ]),
    ).toEqual([
      [
        "/admin/inscripciones/22222222-2222-4222-8222-222222222222",
        "Cuota del mes",
        "$ 58.000",
      ],
      [
        "/admin/inscripciones/66666666-6666-4666-8666-666666666666",
        "Venta de materiales",
        "$ 4.000",
      ],
      [
        "/admin/intensivos/44444444-4444-4444-8444-444444444444/reservas",
        "Seña de workshop",
        "$ 15.000",
      ],
      [
        "/admin/intensivos/44444444-4444-4444-8444-444444444444/reservas",
        "Saldo de workshop",
        "$ 25.000",
      ],
    ]);
    expect(screen.payments[0]).toMatchObject({
      name: "Ana Pérez",
      detail: "Cerámica · noviembre 2026",
    });
  });

  it("falls back to the workshops list when a seat request lost its workshop, and to a plain label without a name", () => {
    const screen = toNotificationsScreen(
      view(
        [
          novelty({
            kind: "workshop-request",
            intensiveId: null,
            workshopName: null,
            period: null,
          }),
        ],
        [],
      ),
    );

    expect(screen.novelties[0]?.href).toBe("/admin/intensivos");
    expect(screen.novelties[0]?.detail).toBeNull();
  });

  it("colours each notice by the menu section it belongs to", () => {
    const screen = toNotificationsScreen(
      view(
        [
          novelty({}),
          novelty({ kind: "workshop-request", period: null }),
          novelty({ kind: "private-event", workshopName: null, period: null }),
        ],
        [
          payment({}),
          payment({ kind: "material-sale" }),
          payment({ kind: "workshop-deposit" }),
          payment({ kind: "workshop-balance" }),
        ],
      ),
    );

    expect(screen.novelties.map((card) => card.area)).toEqual([
      "enrollments",
      "intensives",
      "events",
    ]);
    expect(screen.payments.map((card) => card.area)).toEqual([
      "enrollments",
      "materials",
      "intensives",
      "intensives",
    ]);
  });

  it("carries no due date or overdue wording", () => {
    const screen = toNotificationsScreen(view([novelty({})], [payment({})]));

    expect(JSON.stringify(screen)).not.toMatch(/vencid|overdue|dueDate/i);
  });
});
