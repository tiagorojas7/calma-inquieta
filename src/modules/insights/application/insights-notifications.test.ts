import { describe, expect, it } from "vitest";
import type {
  PendingOrderPaymentRow,
  UnseenOrderRow,
} from "~/modules/enrollments";
import type {
  PendingSeatPaymentRow,
  UnseenSeatRequestRow,
} from "~/modules/intensive-requests";
import { insightsFixture } from "~/testing/admin/insights-kit";
import { buildStoredPrivateEvent } from "~/testing/contracts/private-event-repository.contract";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import {
  createUnavailableInsightsService,
  type InsightsUseCases,
} from "../index";

const actor = testAdminActor();

const unseenOrder = (overrides: Partial<UnseenOrderRow>): UnseenOrderRow => ({
  id: "order-1",
  studentName: "Ana Pérez",
  workshopName: "Cerámica",
  period: "2026-10",
  requestedAt: new Date("2026-10-30T12:00:00.000Z"),
  ...overrides,
});

const pendingOrder = (
  overrides: Partial<PendingOrderPaymentRow>,
): PendingOrderPaymentRow => ({
  id: "order-1",
  kind: "enrollment",
  studentName: "Ana Pérez",
  workshopName: "Cerámica",
  period: "2026-10",
  totalCentavos: 58_000_00,
  requestedAt: new Date("2026-10-30T12:00:00.000Z"),
  ...overrides,
});

const unseenSeat = (
  overrides: Partial<UnseenSeatRequestRow>,
): UnseenSeatRequestRow => ({
  id: "request-1",
  intensiveId: "intensive-1",
  workshopName: "Taller de torno",
  fullName: "Bea Gómez",
  createdAt: new Date("2026-10-30T13:00:00.000Z"),
  ...overrides,
});

const seatPayment = (
  overrides: Partial<PendingSeatPaymentRow>,
): PendingSeatPaymentRow => ({
  id: "request-1",
  intensiveId: "intensive-1",
  workshopName: "Taller de torno",
  fullName: "Bea Gómez",
  kind: "deposit",
  amountCentavos: 15_000_00,
  createdAt: new Date("2026-10-30T13:00:00.000Z"),
  ...overrides,
});

describe("insights notifications", () => {
  it("lists the unopened novelties of the three sources, newest first, and counts only them", async () => {
    const { service, orders, intensiveRequests, privateEvents } =
      insightsFixture();
    orders.unseenRows = [
      unseenOrder({ id: "order-1" }),
      unseenOrder({
        id: "order-2",
        studentName: "Cleo Díaz",
        requestedAt: new Date("2026-10-31T09:00:00.000Z"),
      }),
    ];
    intensiveRequests.unseenRows = [unseenSeat({})];
    await privateEvents.insert(
      buildStoredPrivateEvent({
        id: "event-1",
        fullName: "Dora Ruiz",
        desiredDate: "2026-12-05",
        createdAt: new Date("2026-10-30T18:00:00.000Z"),
      }),
    );
    // A pending payment is not a novelty: it never raises the count.
    orders.pendingPaymentRows = [pendingOrder({})];

    const view = await service.notifications(actor);

    expect(view).toMatchObject({ ok: true, value: { unseen: 4 } });
    if (!view.ok) throw new Error("no view");
    expect(
      view.value.novelties.map(({ kind, id, name }) => [kind, id, name]),
    ).toEqual([
      ["enrollment", "order-2", "Cleo Díaz"],
      ["private-event", "event-1", "Dora Ruiz"],
      ["workshop-request", "request-1", "Bea Gómez"],
      ["enrollment", "order-1", "Ana Pérez"],
    ]);
    expect(view.value.novelties[0]).toEqual({
      kind: "enrollment",
      id: "order-2",
      intensiveId: null,
      name: "Cleo Díaz",
      workshopName: "Cerámica",
      period: "2026-10",
      eventDate: null,
      requestedAt: new Date("2026-10-31T09:00:00.000Z"),
    });
    expect(view.value.novelties[2]).toMatchObject({
      kind: "workshop-request",
      intensiveId: "intensive-1",
      workshopName: "Taller de torno",
    });
    expect(view.value.novelties[1]).toMatchObject({
      kind: "private-event",
      eventDate: "2026-12-05",
      workshopName: null,
    });
  });

  it("lists every pending payment, oldest first, with what is owed and no due date", async () => {
    const { service, orders, intensiveRequests } = insightsFixture();
    orders.pendingPaymentRows = [
      pendingOrder({
        id: "sale-1",
        kind: "material_sale",
        totalCentavos: 4_000_00,
        requestedAt: new Date("2026-10-29T12:00:00.000Z"),
      }),
      pendingOrder({ id: "order-1" }),
    ];
    intensiveRequests.pendingPaymentRows = [
      seatPayment({}),
      seatPayment({
        id: "request-2",
        kind: "balance",
        amountCentavos: 25_000_00,
        createdAt: new Date("2026-10-20T10:00:00.000Z"),
      }),
    ];

    const view = await service.notifications(actor);

    if (!view.ok) throw new Error("no view");
    expect(
      view.value.pendingPayments.map(({ kind, id, amount }) => [
        kind,
        id,
        amount.toCentavos(),
      ]),
    ).toEqual([
      ["workshop-balance", "request-2", 25_000_00],
      ["material-sale", "sale-1", 4_000_00],
      ["enrollment", "order-1", 58_000_00],
      ["workshop-deposit", "request-1", 15_000_00],
    ]);
    expect(view.value.pendingPayments[3]).toMatchObject({
      intensiveId: "intensive-1",
      name: "Bea Gómez",
      workshopName: "Taller de torno",
    });
    expect(JSON.stringify(view.value)).not.toMatch(/overdue|dueDate|dueOn/i);
    expect(view.value.unseen).toBe(0);
  });

  it("shows empty lists and a zero count when nothing is new or owed", async () => {
    const { service } = insightsFixture();

    expect(await service.notifications(actor)).toEqual({
      ok: true,
      value: { unseen: 0, novelties: [], pendingPayments: [] },
    });
  });

  it("answers the unseen count alone for the layout badge", async () => {
    const { service, orders, intensiveRequests } = insightsFixture();
    orders.unseenRows = [unseenOrder({})];
    intensiveRequests.unseenRows = [unseenSeat({})];
    orders.pendingPaymentRows = [pendingOrder({})];

    expect(await service.unseenCount(actor)).toEqual({ ok: true, value: 2 });
  });

  it("denies without an admin actor, and fails closed as unavailable when a reader fails", async () => {
    const { service, orders } = insightsFixture();
    const denied = { ok: false, error: { kind: "denied" } };

    expect(await service.notifications(null)).toEqual(denied);
    expect(await service.unseenCount(undefined)).toEqual(denied);

    orders.unseenOrders = () => Promise.reject(new Error("db down"));
    const unavailable = { ok: false, error: { kind: "unavailable" } };
    expect(await service.notifications(actor)).toEqual(unavailable);
    expect(await service.unseenCount(actor)).toEqual(unavailable);
  });

  it("reports unavailable from the unavailable service once the actor is authorized", async () => {
    const service: InsightsUseCases = createUnavailableInsightsService();

    expect(await service.notifications(actor)).toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
    expect(await service.unseenCount(actor)).toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
  });
});
