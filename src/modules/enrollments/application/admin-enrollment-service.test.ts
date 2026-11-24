import { describe, expect, it } from "vitest";
import type { Clock } from "~/modules/_shared";
import {
  createAdminEnrollmentService,
  createUnavailableAdminEnrollmentService,
  type AdminEnrollmentUseCases,
} from "./admin-enrollment-service";
import type { AdminEnrollmentStore } from "./admin-enrollment-store";
import type { CreatePendingEnrollment } from "./admin-enrollment-service";
import type { OrderRepository } from "./enrollment-repository";
import type { EnrollmentOfferLookup } from "./offer-lookup";
import type { SeatLedger } from "./seat-ledger";
import {
  InMemoryAdminEnrollmentStore,
  InMemoryOrderRepository,
} from "~/testing/fakes/enrollments-order-repository";
import { InMemorySeatLedger } from "~/testing/fakes/enrollments-seat-ledger";
import {
  offerFixture,
  orderDraft,
  pesos,
} from "~/testing/fakes/enrollments-builders";

const admin = { kind: "admin-actor" as const, email: "admin@example.com" };
const now = new Date("2026-11-01T02:59:00Z");
const offer = { status: "open" as const, capacity: 8 };
const payment = { amount: "58000", paidOn: "2026-10-31" };
const noOffers: EnrollmentOfferLookup = {
  findOffer: () => Promise.resolve(null),
};
const notCalled = () => Promise.reject(new Error("createPending not expected"));
const pendingInput = {
  slug: "ceramica",
  period: "2026-11",
  turnoId: "turno-1",
  student: {
    fullName: "Ana Perez",
    email: "ana@example.com",
    phone: "+54 9 351 555 1000",
    policyAccepted: true,
    honeypot: "",
  },
  lines: [],
};

async function fixture(
  overrides: {
    readonly capacity?: number;
    readonly clock?: Clock;
    readonly periods?: {
      find(
        periodId: string,
        turnoId: string,
      ): Promise<{
        readonly status: "open" | "closed";
        readonly capacity: number;
      } | null>;
    };
    readonly repository?: OrderRepository;
    readonly offers?: EnrollmentOfferLookup;
    readonly createPending?: (
      orders: InMemoryOrderRepository,
    ) => CreatePendingEnrollment;
  } = {},
) {
  const orders = new InMemoryOrderRepository();
  const seats = new InMemorySeatLedger();
  const pendingCalls: unknown[] = [];
  const created = await orders.create(orderDraft());
  if (!created.ok) throw new Error("fixture order");
  const service = createAdminEnrollmentService({
    store: new InMemoryAdminEnrollmentStore(
      overrides.repository ?? orders,
      seats,
      overrides.periods ?? {
        find: () =>
          Promise.resolve({
            ...offer,
            capacity: overrides.capacity ?? offer.capacity,
          }),
      },
    ),
    clock: overrides.clock ?? { now: () => now },
    offers: overrides.offers ?? noOffers,
    createPending:
      overrides.createPending?.(orders) ??
      ((input, actorEmail, options) => {
        pendingCalls.push({
          input,
          actorEmail,
          ...(options === undefined ? {} : { options }),
        });
        return Promise.resolve({
          ok: true,
          value: {
            publicId: "A".repeat(22),
            number: "CI-2026-0002",
            status: "pending_confirmation" as const,
            studentName: input.student.fullName,
            workshopName: "Ceramica",
            period: input.period,
            turnoLabel: "Lunes 18:00",
            weekday: 1,
            startsAt: "18:00",
            endsAt: "20:00",
            lines: [],
            fee: pesos(58000),
            materialsTotal: pesos(0),
            total: pesos(58000),
          },
        });
      }),
  });
  return { service, orders, seats, pendingCalls, order: created.value };
}

async function createOrder(
  orders: InMemoryOrderRepository,
  index: number,
  overrides: Partial<ReturnType<typeof orderDraft>> = {},
) {
  const created = await orders.create(
    orderDraft({
      publicId: String.fromCharCode(65 + index).repeat(22),
      student: {
        fullName: `Student ${String(index)}`,
        email: `student-${String(index)}@example.com`,
        phoneDigits: `5493515551${String(index).padStart(3, "0")}`,
      },
      ...overrides,
    }),
  );
  if (!created.ok) throw new Error("fixture order");
  return created.value;
}

const materialsLine = {
  materialId: "m-1",
  variantId: "v-1",
  materialName: "Clay",
  variantLabel: "Large",
  unitPrice: pesos(1),
  quantity: 1,
  supplierId: "supplier-1",
  supplierName: "Supplier",
};

describe("admin enrollment service", () => {
  it("hands an admin-set fee to the creation and leaves a priced order pending", async () => {
    const { service, pendingCalls, seats } = await fixture();
    const before = seats.snapshot();

    const created = await service.createPending(admin, pendingInput, {
      fee: pesos(40000),
    });

    expect(created).toMatchObject({
      ok: true,
      value: { status: "pending_confirmation" },
    });
    expect(pendingCalls).toEqual([
      {
        input: pendingInput,
        actorEmail: "admin@example.com",
        options: { fee: pesos(40000) },
      },
    ]);
    expect(seats.snapshot()).toEqual(before);
  });

  it("hands a $0 fee to the creation with the Córdoba creation date and returns its paid order without a second step", async () => {
    const paid = {
      ok: true as const,
      value: {
        publicId: "F".repeat(22),
        number: "CI-2026-0003",
        status: "paid" as const,
        studentName: "Ana Perez",
        workshopName: "Ceramica",
        period: "2026-11",
        turnoLabel: "Lunes 18:00",
        weekday: 1,
        startsAt: "18:00",
        endsAt: "20:00",
        lines: [],
        fee: pesos(0),
        materialsTotal: pesos(0),
        total: pesos(0),
      },
    };
    const calls: unknown[] = [];
    const { service, seats } = await fixture({
      createPending: () => (input, actorEmail, options) => {
        calls.push({ input, actorEmail, options });
        return Promise.resolve(paid);
      },
    });
    const before = seats.snapshot();

    await expect(
      service.createPending(admin, pendingInput, { fee: pesos(0) }),
    ).resolves.toEqual(paid);
    expect(calls).toEqual([
      {
        input: pendingInput,
        actorEmail: "admin@example.com",
        options: {
          fee: pesos(0),
          paidAtIfFree: new Date("2026-10-31T03:00:00.000Z"),
        },
      },
    ]);
    expect(seats.snapshot()).toEqual(before);
  });

  it("asks for the order to be stored paid in full on the Córdoba day when the owner took the payment", async () => {
    const { service, pendingCalls } = await fixture();

    await service.createPending(admin, pendingInput, {
      fee: pesos(40000),
      paid: true,
    });
    await service.createPending(admin, pendingInput, { paid: true });
    await service.createPending(admin, pendingInput, {
      fee: pesos(0),
      paid: true,
    });

    // `paid` is the owner's word; the creation only gets the date and the fee.
    const paidAt = new Date("2026-10-31T03:00:00.000Z");
    expect(pendingCalls).toEqual([
      {
        input: pendingInput,
        actorEmail: "admin@example.com",
        options: { fee: pesos(40000), paidAt },
      },
      {
        input: pendingInput,
        actorEmail: "admin@example.com",
        options: { paidAt },
      },
      {
        input: pendingInput,
        actorEmail: "admin@example.com",
        options: { fee: pesos(0), paidAt },
      },
    ]);
  });

  it("keeps a pending request as it was when the payment was not taken", async () => {
    const { service, pendingCalls } = await fixture();

    await service.createPending(admin, pendingInput, {
      fee: pesos(40000),
      paid: false,
    });

    expect(pendingCalls).toEqual([
      {
        input: pendingInput,
        actorEmail: "admin@example.com",
        options: { fee: pesos(40000) },
      },
    ]);
  });

  it("returns the turno-full refusal of a free enrollment untouched", async () => {
    const { service } = await fixture({
      createPending: () => () =>
        Promise.resolve({ ok: false, error: { kind: "turno-full" } }),
    });

    await expect(
      service.createPending(admin, pendingInput, { fee: pesos(0) }),
    ).resolves.toEqual({ ok: false, error: { kind: "turno-full" } });
  });

  it("creates a pending monthly enrollment as the authorized admin", async () => {
    const { service, pendingCalls } = await fixture();

    const created = await service.createPending(admin, pendingInput);

    expect(created).toMatchObject({
      ok: true,
      value: { status: "pending_confirmation", studentName: "Ana Perez" },
    });
    expect(pendingCalls).toEqual([
      { input: pendingInput, actorEmail: "admin@example.com" },
    ]);
  });

  it("refuses a manual enrollment from a non-admin without creating it", async () => {
    const { service, pendingCalls } = await fixture();

    await expect(
      service.createPending({ kind: "visitor" }, pendingInput),
    ).resolves.toEqual({ ok: false, error: { kind: "denied" } });
    expect(pendingCalls).toEqual([]);
  });

  it.each([
    [
      "confirmPayment",
      (service: AdminEnrollmentUseCases, orderId: string) =>
        service.confirmPayment(undefined, { orderId, ...payment }),
      { ok: false, error: { kind: "denied" } },
    ],
    [
      "cancel",
      (service: AdminEnrollmentUseCases, orderId: string) =>
        service.cancel(null, { orderId, reason: "changed mind" }),
      { ok: false, error: { kind: "denied" } },
    ],
    [
      "markMaterialsRequested",
      (service: AdminEnrollmentUseCases, orderId: string) =>
        service.markMaterialsRequested({}, orderId),
      { ok: false, error: { kind: "denied" } },
    ],
    [
      "markMaterialsReceived",
      (service: AdminEnrollmentUseCases, orderId: string) =>
        service.markMaterialsReceived(
          { kind: "visitor", email: "x@example.com" },
          orderId,
        ),
      { ok: false, error: { kind: "denied" } },
    ],
    [
      "markMaterialsRequestedBulk",
      (service: AdminEnrollmentUseCases, orderId: string) =>
        service.markMaterialsRequestedBulk({ kind: "admin-actor", email: "" }, [
          orderId,
        ]),
      [
        {
          orderId: "order-1",
          result: { ok: false, error: { kind: "denied" } },
        },
      ],
    ],
  ] as const)(
    "authorizes %s before every repository or ledger access",
    async (_, call, expected) => {
      const { service, orders, seats, order } = await fixture();
      const reads = orders.readCount();
      const ledgerCalls = seats.callCount();

      await expect(call(service, order.id)).resolves.toEqual(expected);
      expect(orders.readCount()).toBe(reads);
      expect(seats.callCount()).toBe(ledgerCalls);
    },
  );

  it("authorizes list and detail before every read", async () => {
    const { service, orders, seats, order } = await fixture();
    const reads = orders.readCount();
    const ledgerCalls = seats.callCount();

    await expect(service.list(undefined)).resolves.toEqual({
      ok: false,
      error: { kind: "denied" },
    });
    await expect(service.detail(null, order.id)).resolves.toEqual({
      ok: false,
      error: { kind: "denied" },
    });
    expect(orders.readCount()).toBe(reads);
    expect(seats.callCount()).toBe(ledgerCalls);
  });

  it("authorizes every unavailable placeholder method before failing closed", async () => {
    const service = createUnavailableAdminEnrollmentService();
    const denied = { ok: false, error: { kind: "denied" } };

    await expect(
      service.confirmPayment(undefined, { orderId: "order-1", ...payment }),
    ).resolves.toEqual(denied);
    await expect(
      service.cancel(undefined, {
        orderId: "order-1",
        reason: "changed plans",
      }),
    ).resolves.toEqual(denied);
    await expect(
      service.markMaterialsRequested(undefined, "order-1"),
    ).resolves.toEqual(denied);
    await expect(
      service.markMaterialsReceived(undefined, "order-1"),
    ).resolves.toEqual(denied);
    await expect(service.list(undefined)).resolves.toEqual(denied);
    await expect(service.detail(undefined, "order-1")).resolves.toEqual(denied);
    await expect(
      service.createPending(undefined, pendingInput),
    ).resolves.toEqual(denied);
    await expect(service.createPending(admin, pendingInput)).resolves.toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
    await expect(
      service.markMaterialsRequestedBulk(undefined, ["order-1"]),
    ).resolves.toEqual([{ orderId: "order-1", result: denied }]);
    await expect(
      service.markMaterialsReceivedBulk(undefined, ["order-1"]),
    ).resolves.toEqual([{ orderId: "order-1", result: denied }]);
  });

  it("captures one Clock instant for date validation, period boundary, and audit", async () => {
    const instants = [
      new Date("2026-11-01T02:59:00Z"),
      new Date("2026-11-01T03:00:00Z"),
    ];
    let calls = 0;
    const { service, orders, order } = await fixture({
      clock: {
        now: () => {
          const instant = instants[Math.min(calls++, 1)];
          if (!instant) throw new Error("fixture clock");
          return instant;
        },
      },
    });

    await expect(
      service.confirmPayment(admin, {
        orderId: order.id,
        ...payment,
        note: "cash",
      }),
    ).resolves.toEqual({
      ok: true,
      value: { kind: "confirmed" },
    });
    expect(calls).toBe(1);
    expect((await orders.auditTrail(order.id)).at(-1)).toEqual({
      actor: admin.email,
      at: instants[0],
      from: "pending_confirmation",
      to: "paid",
      note: "cash",
    });
  });

  it.each([
    [
      "decimal amount",
      { ...payment, amount: "58000,50" },
      { field: "amount", code: "not-whole-pesos" },
    ],
    [
      "wrong whole amount",
      { ...payment, amount: "57999" },
      { kind: "amount-mismatch" },
    ],
    [
      "invalid calendar date",
      { ...payment, paidOn: "2026-02-29" },
      { field: "paidOn", code: "invalid-calendar-date" },
    ],
    [
      "future payment date",
      { ...payment, paidOn: "2026-11-01" },
      { field: "paidOn", code: "future-date" },
    ],
  ] as const)(
    "refuses %s without a transition audit",
    async (_, input, expected) => {
      const { service, orders, seats, order } = await fixture();
      const audit = await orders.auditTrail(order.id);

      const result = await service.confirmPayment(admin, {
        orderId: order.id,
        ...input,
      });
      if ("kind" in expected) {
        expect(result).toEqual({ ok: false, error: expected });
      } else {
        expect(result).toEqual({
          ok: false,
          error: { kind: "invalid", issues: [expected] },
        });
      }
      expect(await orders.auditTrail(order.id)).toEqual(audit);
      expect(await seats.confirmedSeats(order.periodId, order.turnoId)).toBe(0);
    },
  );

  it("records the complete transition audit and writes none for a full turno", async () => {
    const success = await fixture();
    await expect(
      success.service.confirmPayment(admin, {
        orderId: success.order.id,
        ...payment,
        note: "bank transfer",
      }),
    ).resolves.toEqual({
      ok: true,
      value: { kind: "confirmed" },
    });
    expect((await success.orders.auditTrail(success.order.id)).at(-1)).toEqual({
      actor: admin.email,
      at: now,
      from: "pending_confirmation",
      to: "paid",
      note: "bank transfer",
    });

    const full = await fixture({ capacity: 0 });
    const audit = await full.orders.auditTrail(full.order.id);
    await expect(
      full.service.confirmPayment(admin, {
        orderId: full.order.id,
        ...payment,
      }),
    ).resolves.toEqual({
      ok: false,
      error: { kind: "turno-full" },
    });
    expect(await full.orders.auditTrail(full.order.id)).toEqual(audit);
  });

  it("returns unavailable and rolls back order, audit, and seat when persistence fails during confirmation", async () => {
    const orders = new InMemoryOrderRepository();
    const created = await orders.create(orderDraft());
    if (!created.ok) throw new Error("fixture order");
    const failingRepository: OrderRepository = {
      create: (draft) => orders.create(draft),
      findByPublicId: (publicId) => orders.findByPublicId(publicId),
      findForAdmin: (orderId) => orders.findForAdmin(orderId),
      transitionOrder: () =>
        Promise.reject(new Error("audit persistence failed")),
      auditTrail: (orderId) => orders.auditTrail(orderId),
      listForAdmin: (query) => orders.listForAdmin(query),
    };
    const { service, seats } = await fixture({ repository: failingRepository });
    const before = await orders.findForAdmin(created.value.id);
    const audit = await orders.auditTrail(created.value.id);

    await expect(
      service.confirmPayment(admin, { orderId: created.value.id, ...payment }),
    ).resolves.toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
    expect(await orders.findForAdmin(created.value.id)).toEqual(before);
    expect(await orders.auditTrail(created.value.id)).toEqual(audit);
    expect(
      await seats.confirmedSeats(created.value.periodId, created.value.turnoId),
    ).toBe(0);
  });

  it("validates cancellation reasons and distinguishes pending, paid, idempotent, closed-period, and material states", async () => {
    const pending = await fixture();
    await expect(
      pending.service.cancel(admin, {
        orderId: pending.order.id,
        reason: "  ",
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "reason", code: "required" }],
      },
    });
    await expect(
      pending.service.cancel(admin, {
        orderId: pending.order.id,
        reason: "x".repeat(301),
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "reason", code: "too-long" }],
      },
    });
    await expect(
      pending.service.cancel(admin, {
        orderId: pending.order.id,
        reason: "changed mind",
      }),
    ).resolves.toEqual({
      ok: true,
      value: { kind: "cancelled" },
    });
    expect(
      await pending.seats.confirmedSeats(
        pending.order.periodId,
        pending.order.turnoId,
      ),
    ).toBe(0);

    const paid = await fixture();
    await expect(
      paid.service.confirmPayment(admin, {
        orderId: paid.order.id,
        ...payment,
      }),
    ).resolves.toEqual({ ok: true, value: { kind: "confirmed" } });
    const closedStore = new InMemoryAdminEnrollmentStore(
      paid.orders,
      paid.seats,
      { find: () => Promise.resolve({ status: "closed", capacity: 8 }) },
    );
    const closedService = createAdminEnrollmentService({
      store: closedStore,
      clock: { now: () => now },
      createPending: notCalled,
      offers: noOffers,
    });
    await expect(
      closedService.cancel(admin, {
        orderId: paid.order.id,
        reason: "closed period cancellation",
        refund: { amount: "58000", refundedOn: "2026-10-31" },
      }),
    ).resolves.toEqual({
      ok: true,
      value: { kind: "cancelled" },
    });
    await expect(
      closedService.cancel(admin, {
        orderId: paid.order.id,
        reason: "closed period cancellation",
        refund: { amount: "58000", refundedOn: "2026-10-31" },
      }),
    ).resolves.toEqual({
      ok: true,
      value: { kind: "already-cancelled" },
    });

    const material = await fixture();
    const withLines = await createOrder(material.orders, 1, {
      lines: [materialsLine],
      materialsTotal: pesos(1),
      total: pesos(58001),
    });
    await material.service.confirmPayment(admin, {
      orderId: withLines.id,
      amount: "58001",
      paidOn: payment.paidOn,
    });
    await material.service.markMaterialsRequested(admin, withLines.id);
    await expect(
      material.service.cancel(admin, {
        orderId: withLines.id,
        reason: "materials already requested",
        refund: { amount: "58000", refundedOn: "2026-10-31" },
      }),
    ).resolves.toEqual({ ok: true, value: { kind: "cancelled" } });
    expect(
      await material.seats.confirmedSeats(
        withLines.periodId,
        withLines.turnoId,
      ),
    ).toBe(0);
  });

  describe("refunds", () => {
    const paidFixture = async () => {
      const paid = await fixture();
      await paid.service.confirmPayment(admin, {
        orderId: paid.order.id,
        ...payment,
      });
      return paid;
    };
    const cancelWith = (
      paid: Awaited<ReturnType<typeof paidFixture>>,
      refund: { amount: string; refundedOn: string; note?: string },
    ) =>
      paid.service.cancel(admin, {
        orderId: paid.order.id,
        reason: "changed plans",
        refund,
      });
    const refused = (
      field: "amount" | "refundedOn" | "note",
      code: string,
    ) => ({
      ok: false,
      error: { kind: "invalid-refund", field, code },
    });

    it.each(["0", "25000", "58.000"])(
      "accepts a refund of %s pesos and records who returned it",
      async (amount) => {
        const paid = await paidFixture();

        await expect(
          cancelWith(paid, {
            amount,
            refundedOn: "2026-10-31",
            note: "  transfer back  ",
          }),
        ).resolves.toEqual({ ok: true, value: { kind: "cancelled" } });

        const stored = await paid.orders.findForAdmin(paid.order.id);
        expect(stored?.refund).toEqual({
          amount: pesos(Number(amount.replace(".", ""))),
          refundedAt: new Date("2026-10-31T03:00:00.000Z"),
          note: "transfer back",
          refundedBy: admin.email,
        });
        expect(stored?.paidAmount).toEqual(pesos(58000));
        await expect(
          paid.seats.confirmedSeats(paid.order.periodId, paid.order.turnoId),
        ).resolves.toBe(0);
      },
    );

    it.each([
      ["", "required"],
      ["-5", "invalid-format"],
      ["abc", "invalid-format"],
      ["100,50", "not-whole-pesos"],
      ["100.5", "not-whole-pesos"],
      ["99999999999999999999", "out-of-range"],
    ])("refuses the typed amount %j", async (amount, code) => {
      const paid = await paidFixture();

      await expect(
        cancelWith(paid, { amount, refundedOn: "2026-10-31" }),
      ).resolves.toEqual(refused("amount", code));
      await expect(
        paid.orders.findForAdmin(paid.order.id),
      ).resolves.toMatchObject({ status: "paid" });
    });

    it("refuses a refund above what was paid", async () => {
      const paid = await paidFixture();

      await expect(
        cancelWith(paid, { amount: "58001", refundedOn: "2026-10-31" }),
      ).resolves.toEqual(refused("amount", "above-paid"));
    });

    it.each([
      ["2026-02-30", "invalid-calendar-date"],
      ["31/10/2026", "invalid-calendar-date"],
      ["2026-11-01", "future-date"],
      ["2026-10-30", "before-payment"],
    ])("refuses the refund date %s", async (refundedOn, code) => {
      const paid = await paidFixture();

      await expect(
        cancelWith(paid, { amount: "100", refundedOn }),
      ).resolves.toEqual(refused("refundedOn", code));
    });

    it("refuses a note over 300 characters", async () => {
      const paid = await paidFixture();

      await expect(
        cancelWith(paid, {
          amount: "100",
          refundedOn: "2026-10-31",
          note: "x".repeat(301),
        }),
      ).resolves.toEqual(refused("note", "too-long"));
    });

    it("needs a refund to cancel a paid order and records none for a pending one", async () => {
      const paid = await paidFixture();
      await expect(
        paid.service.cancel(admin, {
          orderId: paid.order.id,
          reason: "changed plans",
        }),
      ).resolves.toEqual(refused("amount", "required"));

      const pending = await fixture();
      await expect(
        pending.service.cancel(admin, {
          orderId: pending.order.id,
          reason: "changed mind",
        }),
      ).resolves.toEqual({ ok: true, value: { kind: "cancelled" } });
      expect(
        (await pending.orders.findForAdmin(pending.order.id))?.refund,
      ).toBeUndefined();

      const other = await fixture();
      await expect(
        other.service.cancel(admin, {
          orderId: other.order.id,
          reason: "changed mind",
          refund: { amount: "0", refundedOn: "2026-10-31" },
        }),
      ).resolves.toEqual(refused("amount", "not-refundable"));
    });

    it("keeps the first refund when the cancellation is repeated", async () => {
      const paid = await paidFixture();
      await cancelWith(paid, { amount: "100", refundedOn: "2026-10-31" });

      await expect(
        cancelWith(paid, { amount: "58000", refundedOn: "2026-10-31" }),
      ).resolves.toEqual({ ok: true, value: { kind: "already-cancelled" } });
      expect(
        (await paid.orders.findForAdmin(paid.order.id))?.refund?.amount,
      ).toEqual(pesos(100));
    });
  });

  it("enforces the materials transition table and bulk-isolates three successes from one cancelled order", async () => {
    const { service, orders } = await fixture();
    const paid = await Promise.all(
      [1, 2, 3].map(async (index) => {
        const order = await createOrder(orders, index, {
          lines: [materialsLine],
          materialsTotal: pesos(1),
          total: pesos(58001),
        });
        await service.confirmPayment(admin, {
          orderId: order.id,
          amount: "58001",
          paidOn: payment.paidOn,
        });
        return order;
      }),
    );
    const cancelled = await createOrder(orders, 4, {
      lines: [materialsLine],
      materialsTotal: pesos(1),
      total: pesos(58001),
    });
    await service.cancel(admin, {
      orderId: cancelled.id,
      reason: "changed plans",
    });

    const bulk = await service.markMaterialsRequestedBulk(admin, [
      ...paid.map((order) => order.id),
      cancelled.id,
    ]);
    expect(bulk.map(({ orderId }) => orderId)).toEqual([
      ...paid.map((order) => order.id),
      cancelled.id,
    ]);
    expect(bulk.map(({ result }) => result)).toEqual([
      { ok: true, value: undefined },
      { ok: true, value: undefined },
      { ok: true, value: undefined },
      {
        ok: false,
        error: {
          kind: "illegal-transition",
          from: "cancelled",
          to: "materials_requested",
        },
      },
    ]);
    const firstPaid = paid[0];
    if (!firstPaid) throw new Error("fixture orders");
    await expect(
      service.markMaterialsReceived(admin, firstPaid.id),
    ).resolves.toEqual({ ok: true, value: undefined });
    await expect(
      service.markMaterialsRequested(admin, firstPaid.id),
    ).resolves.toEqual({
      ok: false,
      error: {
        kind: "illegal-transition",
        from: "materials_received",
        to: "materials_requested",
      },
    });
  });

  it("marks requested orders as received in bulk, isolating refusals and staying idempotent", async () => {
    const { service, orders } = await fixture();
    const requested = await Promise.all(
      [1, 2].map(async (index) => {
        const order = await createOrder(orders, index, {
          lines: [materialsLine],
          materialsTotal: pesos(1),
          total: pesos(58001),
        });
        await service.confirmPayment(admin, {
          orderId: order.id,
          amount: "58001",
          paidOn: payment.paidOn,
        });
        await service.markMaterialsRequested(admin, order.id);
        return order;
      }),
    );
    const cancelled = await createOrder(orders, 3, {
      lines: [materialsLine],
      materialsTotal: pesos(1),
      total: pesos(58001),
    });
    await service.cancel(admin, {
      orderId: cancelled.id,
      reason: "changed plans",
    });
    const ids = [...requested.map((order) => order.id), cancelled.id];

    const first = await service.markMaterialsReceivedBulk(admin, ids);
    expect(first.map(({ orderId }) => orderId)).toEqual(ids);
    expect(first.map(({ result }) => result)).toEqual([
      { ok: true, value: undefined },
      { ok: true, value: undefined },
      {
        ok: false,
        error: {
          kind: "illegal-transition",
          from: "cancelled",
          to: "materials_received",
        },
      },
    ]);
    const firstOrder = requested[0];
    if (!firstOrder) throw new Error("fixture orders");
    expect((await orders.auditTrail(firstOrder.id)).at(-1)).toMatchObject({
      actor: admin.email,
      from: "materials_requested",
      to: "materials_received",
    });

    const again = await service.markMaterialsReceivedBulk(admin, [
      firstOrder.id,
    ]);
    expect(again).toEqual([
      {
        orderId: firstOrder.id,
        result: {
          ok: false,
          error: {
            kind: "illegal-transition",
            from: "materials_received",
            to: "materials_received",
          },
        },
      },
    ]);
  });

  it("allows exactly three of eight distinct orders when capacity is 8 and five seats are confirmed", async () => {
    const { service, orders, seats } = await fixture({ capacity: 8 });
    seats.setConfirmed("p-1", "t-1", 5);
    const ordersToConfirm = await Promise.all(
      Array.from({ length: 8 }, (_, index) => createOrder(orders, index + 1)),
    );

    const results = await Promise.all(
      ordersToConfirm.map((order) =>
        service.confirmPayment(admin, { orderId: order.id, ...payment }),
      ),
    );
    expect(
      results.filter(
        (result) => result.ok && result.value.kind === "confirmed",
      ),
    ).toHaveLength(3);
    expect(
      results.filter(
        (result) => !result.ok && result.error.kind === "turno-full",
      ),
    ).toHaveLength(5);
    expect(await seats.confirmedSeats("p-1", "t-1")).toBe(8);
  });

  it("treats a simultaneous double click as one confirmation, one idempotent result, one seat, and one audit", async () => {
    const { service, orders, seats, order } = await fixture({ capacity: 1 });
    const results = await Promise.all([
      service.confirmPayment(admin, { orderId: order.id, ...payment }),
      service.confirmPayment(admin, { orderId: order.id, ...payment }),
    ]);

    expect(results).toContainEqual({ ok: true, value: { kind: "confirmed" } });
    expect(results).toContainEqual({
      ok: true,
      value: { kind: "already-confirmed" },
    });
    expect(await seats.confirmedSeats(order.periodId, order.turnoId)).toBe(1);
    expect(await orders.auditTrail(order.id)).toHaveLength(2);
  });

  it("does not make independent turnos contend", async () => {
    const { service, orders, seats, order } = await fixture({ capacity: 1 });
    const otherTurno = await createOrder(orders, 1, { turnoId: "t-2" });

    await expect(
      Promise.all([
        service.confirmPayment(admin, { orderId: order.id, ...payment }),
        service.confirmPayment(admin, { orderId: otherTurno.id, ...payment }),
      ]),
    ).resolves.toEqual([
      { ok: true, value: { kind: "confirmed" } },
      { ok: true, value: { kind: "confirmed" } },
    ]);
    expect(await seats.confirmedSeats("p-1", "t-1")).toBe(1);
    expect(await seats.confirmedSeats("p-1", "t-2")).toBe(1);
  });

  it("lists only newest pending orders by default, honors status, and uses Córdoba requested dates", async () => {
    const { service, orders, order } = await fixture();
    const older = await createOrder(orders, 1, {
      requestedAt: new Date("2026-10-30T12:00:00Z"),
    });
    const newer = await createOrder(orders, 2, {
      requestedAt: new Date("2026-11-01T01:00:00Z"),
    });
    const paid = await createOrder(orders, 3);
    await service.confirmPayment(admin, { orderId: paid.id, ...payment });

    await expect(service.list(admin)).resolves.toMatchObject({
      ok: true,
      value: {
        items: [
          { id: newer.id, number: newer.number, requestedOn: "2026-10-31" },
          { number: older.number, status: "pending_confirmation" },
          { number: order.number, status: "pending_confirmation" },
        ],
      },
    });
    await expect(
      service.list(admin, { status: "paid" }),
    ).resolves.toMatchObject({
      ok: true,
      value: { items: [{ number: paid.number, status: "paid" }] },
    });
  });

  it("captures one Clock instant for all successful bulk material audits", async () => {
    let calls = 0;
    const instant = new Date("2026-11-01T02:59:00Z");
    const { service, orders } = await fixture({
      clock: {
        now: () => {
          calls += 1;
          return instant;
        },
      },
    });
    const ordersToRequest = await Promise.all(
      [1, 2].map(async (index) => {
        const order = await createOrder(orders, index, {
          lines: [materialsLine],
          materialsTotal: pesos(1),
          total: pesos(58001),
        });
        await service.confirmPayment(admin, {
          orderId: order.id,
          amount: "58001",
          paidOn: payment.paidOn,
        });
        return order;
      }),
    );
    calls = 0;

    await expect(
      service.markMaterialsRequestedBulk(
        admin,
        ordersToRequest.map(({ id }) => id),
      ),
    ).resolves.toEqual(
      ordersToRequest.map(({ id }) => ({
        orderId: id,
        result: { ok: true, value: undefined },
      })),
    );
    expect(calls).toBe(1);
    await expect(
      Promise.all(ordersToRequest.map(({ id }) => orders.auditTrail(id))),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.arrayContaining([expect.objectContaining({ at: instant })]),
        expect.arrayContaining([expect.objectContaining({ at: instant })]),
      ]),
    );
  });

  it("does not let a blocked turno delay another turno", async () => {
    let unblock!: () => void;
    let entered!: () => void;
    const blocked = new Promise<void>((resolve) => {
      unblock = resolve;
    });
    const enteredFirst = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const { service, orders, order } = await fixture({
      periods: {
        find: async (periodId) => {
          if (periodId === "p-1") {
            entered();
            await blocked;
          }
          return { status: "open", capacity: 1 };
        },
      },
    });
    const other = await createOrder(orders, 1, {
      periodId: "p-2",
      turnoId: "t-2",
    });
    const first = service.confirmPayment(admin, {
      orderId: order.id,
      ...payment,
    });
    await enteredFirst;
    const second = service.confirmPayment(admin, {
      orderId: other.id,
      ...payment,
    });
    await expect(second).resolves.toEqual({
      ok: true,
      value: { kind: "confirmed" },
    });
    unblock();
    await first;
  });

  it("rolls back a paid cancellation when seat release fails", async () => {
    const paid = await fixture();
    await paid.service.confirmPayment(admin, {
      orderId: paid.order.id,
      ...payment,
    });
    const seats: SeatLedger = {
      confirmedSeats: (periodId, turnoId) =>
        paid.seats.confirmedSeats(periodId, turnoId),
      claim: (periodId, turnoId, capacity) =>
        paid.seats.claim(periodId, turnoId, capacity),
      release: () => Promise.reject(new Error("release failed")),
    };
    const service = createAdminEnrollmentService({
      store: new InMemoryAdminEnrollmentStore(paid.orders, seats, {
        find: () => Promise.resolve({ status: "open", capacity: 8 }),
      }),
      clock: { now: () => now },
      createPending: notCalled,
      offers: noOffers,
    });
    const before = await paid.orders.findForAdmin(paid.order.id);
    const audit = await paid.orders.auditTrail(paid.order.id);

    await expect(
      service.cancel(admin, {
        orderId: paid.order.id,
        reason: "changed plans",
        refund: { amount: "58000", refundedOn: "2026-10-31" },
      }),
    ).resolves.toEqual({ ok: false, error: { kind: "unavailable" } });
    await expect(paid.orders.findForAdmin(paid.order.id)).resolves.toEqual(
      before,
    );
    await expect(paid.orders.auditTrail(paid.order.id)).resolves.toEqual(audit);
    await expect(
      paid.seats.confirmedSeats(paid.order.periodId, paid.order.turnoId),
    ).resolves.toBe(1);
  });

  it("restores a released seat when cancellation persistence fails", async () => {
    const paid = await fixture();
    await paid.service.confirmPayment(admin, {
      orderId: paid.order.id,
      ...payment,
    });
    let releases = 0;
    const seats: SeatLedger = {
      confirmedSeats: (periodId, turnoId) =>
        paid.seats.confirmedSeats(periodId, turnoId),
      claim: (periodId, turnoId, capacity) =>
        paid.seats.claim(periodId, turnoId, capacity),
      release: (periodId, turnoId) => {
        releases += 1;
        return paid.seats.release(periodId, turnoId);
      },
    };
    const failingRepository: OrderRepository = {
      create: (draft) => paid.orders.create(draft),
      findByPublicId: (publicId) => paid.orders.findByPublicId(publicId),
      findForAdmin: (orderId) => paid.orders.findForAdmin(orderId),
      transitionOrder: () => Promise.reject(new Error("transition failed")),
      auditTrail: (orderId) => paid.orders.auditTrail(orderId),
      listForAdmin: (query) => paid.orders.listForAdmin(query),
    };
    const service = createAdminEnrollmentService({
      store: new InMemoryAdminEnrollmentStore(failingRepository, seats, {
        find: () => Promise.resolve({ status: "open", capacity: 8 }),
      }),
      clock: { now: () => now },
      createPending: notCalled,
      offers: noOffers,
    });

    await expect(
      service.cancel(admin, {
        orderId: paid.order.id,
        reason: "changed plans",
        refund: { amount: "58000", refundedOn: "2026-10-31" },
      }),
    ).resolves.toEqual({ ok: false, error: { kind: "unavailable" } });
    expect(releases).toBe(1);
    await expect(
      paid.seats.confirmedSeats(paid.order.periodId, paid.order.turnoId),
    ).resolves.toBe(1);
  });

  it("keeps a failed paid cancellation atomic against another confirmation on the same turno", async () => {
    const paid = await fixture({ capacity: 1 });
    await paid.service.confirmPayment(admin, {
      orderId: paid.order.id,
      ...payment,
    });
    const pending = await createOrder(paid.orders, 1);
    let transitionEntered!: () => void;
    let failTransition!: () => void;
    const entered = new Promise<void>((resolve) => {
      transitionEntered = resolve;
    });
    const failureGate = new Promise<void>((resolve) => {
      failTransition = resolve;
    });
    const repository: OrderRepository = {
      create: (draft) => paid.orders.create(draft),
      findByPublicId: (publicId) => paid.orders.findByPublicId(publicId),
      findForAdmin: (orderId) => paid.orders.findForAdmin(orderId),
      listForAdmin: (query) => paid.orders.listForAdmin(query),
      auditTrail: (orderId) => paid.orders.auditTrail(orderId),
      transitionOrder: async (orderId, to, context) => {
        if (to === "cancelled") {
          transitionEntered();
          await failureGate;
          throw new Error("cancel audit failed");
        }
        return paid.orders.transitionOrder(orderId, to, context);
      },
    };
    const service = createAdminEnrollmentService({
      store: new InMemoryAdminEnrollmentStore(repository, paid.seats, {
        find: () => Promise.resolve({ status: "open", capacity: 1 }),
      }),
      clock: { now: () => now },
      createPending: notCalled,
      offers: noOffers,
    });

    const cancellation = service.cancel(admin, {
      orderId: paid.order.id,
      reason: "changed plans",
      refund: { amount: "58000", refundedOn: "2026-10-31" },
    });
    await entered;
    const confirmation = service.confirmPayment(admin, {
      orderId: pending.id,
      ...payment,
    });
    failTransition();

    await expect(cancellation).resolves.toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
    await expect(confirmation).resolves.toEqual({
      ok: false,
      error: { kind: "turno-full" },
    });
    await expect(paid.seats.confirmedSeats("p-1", "t-1")).resolves.toBe(1);
  });

  it("maps read-port failures to unavailable", async () => {
    const store: AdminEnrollmentStore = {
      confirm: () =>
        Promise.resolve({ ok: false, error: { kind: "unavailable" } }),
      cancel: () =>
        Promise.resolve({ ok: false, error: { kind: "unavailable" } }),
      correct: () =>
        Promise.resolve({ ok: false, error: { kind: "unavailable" } }),
      consolidationLines: () => Promise.reject(new Error("read failed")),
      deliveryOrders: () => Promise.reject(new Error("read failed")),
      markMaterials: () =>
        Promise.resolve({ ok: false, error: { kind: "unavailable" } }),
      list: () => Promise.reject(new Error("read failed")),
      detail: () => Promise.reject(new Error("read failed")),
      markSeen: () => Promise.reject(new Error("read failed")),
    };
    const service = createAdminEnrollmentService({
      store,
      clock: { now: () => now },
      createPending: notCalled,
      offers: noOffers,
    });
    await expect(service.list(admin)).resolves.toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
    await expect(service.detail(admin, "order-1")).resolves.toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
  });

  it("expresses the admin list default, filters, pagination, and detail projection contract", async () => {
    type AdminReadModel = AdminEnrollmentUseCases & {
      list(
        actor: typeof admin,
        query?: {
          status?: "pending_confirmation";
          period?: string;
          workshopId?: string;
          text?: string;
          page?: number;
        },
      ): Promise<{
        readonly ok: true;
        readonly value: {
          readonly items: readonly {
            readonly number: string;
            readonly studentName: string;
            readonly workshopName: string;
            readonly period: string;
            readonly turnoLabel: string;
            readonly status: string;
            readonly total: unknown;
            readonly requestedOn: string;
          }[];
          readonly page: number;
          readonly pageSize: 50;
        };
      }>;
      detail(
        actor: typeof admin,
        orderId: string,
      ): Promise<{
        readonly ok: true;
        readonly value: {
          readonly email: string;
          readonly phoneDigits: string;
          readonly lines: readonly unknown[];
          readonly total: unknown;
          readonly paidAt?: Date;
          readonly confirmedBy?: string;
          readonly seat: {
            readonly confirmed: number;
            readonly capacity: number;
          };
          readonly audit: readonly unknown[];
        };
      }>;
    };
    const { service, order } = await fixture();
    const reader = service as AdminReadModel;

    await expect(reader.list(admin)).resolves.toMatchObject({
      ok: true,
      value: {
        page: 1,
        pageSize: 50,
        items: [{ status: "pending_confirmation" }],
      },
    });
    await expect(
      reader.list(admin, {
        period: "2026-10",
        workshopId: "w-1",
        text: "ana@",
        page: 2,
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: { page: 2, pageSize: 50 },
    });
    await expect(reader.detail(admin, order.id)).resolves.toMatchObject({
      ok: true,
      value: {
        email: "ana@example.com",
        phoneDigits: "5493515551234",
        lines: [],
        seat: { confirmed: 0, capacity: 8 },
      },
    });
    const detail = await reader.detail(admin, order.id);
    expect(detail.ok && Array.isArray(detail.value.audit)).toBe(true);
  });
});

describe("admin order corrections", () => {
  const offers = (offer = offerFixture()): EnrollmentOfferLookup => ({
    findOffer: () => Promise.resolve(offer),
  });
  const secondTurno = { slug: "ceramica", period: "2026-10", turnoId: "t-2" };

  it("denies a non-admin before reading anything", async () => {
    const { service, orders, seats, order } = await fixture();
    const reads = orders.readCount();
    const ledgerCalls = seats.callCount();

    await expect(
      service.correct(undefined, { orderId: order.id, fee: "50000" }),
    ).resolves.toEqual({ ok: false, error: { kind: "denied" } });
    await expect(
      createUnavailableAdminEnrollmentService().correct(undefined, {
        orderId: order.id,
        fee: "50000",
      }),
    ).resolves.toEqual({ ok: false, error: { kind: "denied" } });
    await expect(
      createUnavailableAdminEnrollmentService().correct(admin, {
        orderId: order.id,
        fee: "50000",
      }),
    ).resolves.toEqual({ ok: false, error: { kind: "unavailable" } });
    expect(orders.readCount()).toBe(reads);
    expect(seats.callCount()).toBe(ledgerCalls);
  });

  it("corrects a pending order to the picked turno and the typed fee", async () => {
    const { service, order } = await fixture({ offers: offers() });

    await expect(
      service.correct(admin, {
        orderId: order.id,
        target: secondTurno,
        fee: "$ 70.000",
        note: "  switched turno  ",
      }),
    ).resolves.toEqual({
      ok: true,
      value: { kind: "corrected", outcome: "kept-pending" },
    });

    await expect(service.detail(admin, order.id)).resolves.toMatchObject({
      ok: true,
      value: {
        status: "pending_confirmation",
        turnoId: "t-2",
        turnoLabel: "Jueves 10:00 a 12:00",
        weekday: 4,
        fee: pesos(70000),
        total: pesos(70000),
        corrections: [{ note: "switched turno", actor: admin.email }],
      },
    });
  });

  it("keeps the current place when no target is picked and accepts a $0 fee", async () => {
    const { service, order } = await fixture();

    await expect(
      service.correct(admin, { orderId: order.id, fee: "0" }),
    ).resolves.toEqual({
      ok: true,
      value: { kind: "corrected", outcome: "kept-pending" },
    });
    await expect(service.detail(admin, order.id)).resolves.toMatchObject({
      ok: true,
      value: { turnoId: "t-1", fee: pesos(0), total: pesos(0) },
    });
  });

  it.each([
    ["nothing", ""],
    ["cents", "100,50"],
    ["a negative amount", "-5"],
    ["text", "abc"],
  ])("refuses a fee of %s and changes nothing", async (_label, fee) => {
    const { service, order } = await fixture();
    const before = await service.detail(admin, order.id);

    await expect(
      service.correct(admin, { orderId: order.id, fee }),
    ).resolves.toEqual({ ok: false, error: { kind: "invalid-fee" } });
    await expect(service.detail(admin, order.id)).resolves.toEqual(before);
  });

  it("refuses a note longer than 300 characters", async () => {
    const { service, order } = await fixture();

    await expect(
      service.correct(admin, {
        orderId: order.id,
        fee: "50000",
        note: "x".repeat(301),
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "reason", code: "too-long" }],
      },
    });
  });

  it.each([
    [
      "an unknown workshop",
      (): EnrollmentOfferLookup => ({
        findOffer: () => Promise.resolve(null),
      }),
      "turno-not-offered",
    ],
    [
      "an unpublished workshop",
      () =>
        offers(
          offerFixture({
            workshop: {
              id: "w-1",
              name: "Cerámica inicial",
              published: false,
              paused: false,
            },
          }),
        ),
      "turno-not-offered",
    ],
    [
      "a paused workshop",
      () =>
        offers(
          offerFixture({
            workshop: {
              id: "w-1",
              name: "Cerámica inicial",
              published: true,
              paused: true,
            },
          }),
        ),
      "enrollments-paused",
    ],
    [
      "a workshop without that month",
      () => offers(offerFixture({ period: null })),
      "period-closed",
    ],
    [
      "a turno the month does not offer",
      () => offers(offerFixture({ turnos: [] })),
      "turno-not-offered",
    ],
    [
      "an offer lookup that fails",
      (): EnrollmentOfferLookup => ({
        findOffer: () => Promise.reject(new Error("offer failed")),
      }),
      "unavailable",
    ],
  ])("refuses %s and changes nothing", async (_label, lookup, kind) => {
    const { service, order, seats } = await fixture({ offers: lookup() });
    const before = await service.detail(admin, order.id);
    const ledgerCalls = seats.callCount();

    await expect(
      service.correct(admin, {
        orderId: order.id,
        target: secondTurno,
        fee: "50000",
      }),
    ).resolves.toEqual({ ok: false, error: { kind } });
    expect(seats.callCount()).toBe(ledgerCalls);
    await expect(service.detail(admin, order.id)).resolves.toEqual(before);
  });

  describe("on a paid order", () => {
    const paidFixture = async (options: Parameters<typeof fixture>[0] = {}) => {
      const paid = await fixture(options);
      await paid.service.confirmPayment(admin, {
        orderId: paid.order.id,
        ...payment,
      });
      return paid;
    };

    it("returns it to pending when the new total is higher, and the owner confirms the new total", async () => {
      const { service, order, seats } = await paidFixture();
      await expect(seats.confirmedSeats("p-1", "t-1")).resolves.toBe(1);

      await expect(
        service.correct(admin, { orderId: order.id, fee: "60000" }),
      ).resolves.toEqual({
        ok: true,
        value: { kind: "corrected", outcome: "returned-to-pending" },
      });
      await expect(seats.confirmedSeats("p-1", "t-1")).resolves.toBe(0);
      await expect(
        service.confirmPayment(admin, {
          orderId: order.id,
          ...payment,
        }),
      ).resolves.toEqual({
        ok: false,
        error: { kind: "amount-mismatch" },
      });
      await expect(
        service.confirmPayment(admin, {
          orderId: order.id,
          amount: "60000",
          paidOn: "2026-10-31",
        }),
      ).resolves.toEqual({ ok: true, value: { kind: "confirmed" } });
      await expect(seats.confirmedSeats("p-1", "t-1")).resolves.toBe(1);
    });

    it("keeps it paid and records the typed refund when the new total is lower", async () => {
      const { service, order } = await paidFixture();

      await expect(
        service.correct(admin, {
          orderId: order.id,
          fee: "50000",
          refund: {
            amount: " 8000 ",
            refundedOn: "2026-10-31",
            note: "  cash  ",
          },
        }),
      ).resolves.toEqual({
        ok: true,
        value: { kind: "corrected", outcome: "lowered" },
      });
      await expect(service.detail(admin, order.id)).resolves.toMatchObject({
        ok: true,
        value: {
          status: "paid",
          paidAmount: pesos(50000),
          corrections: [
            {
              refund: {
                amount: pesos(8000),
                refundedAt: new Date("2026-10-31T03:00:00.000Z"),
                note: "cash",
              },
            },
          ],
        },
      });
    });

    it.each([
      [
        "cents",
        { amount: "8000,50", refundedOn: "2026-10-31" },
        { kind: "invalid-refund", field: "amount", code: "not-whole-pesos" },
      ],
      [
        "a date that does not exist",
        { amount: "8000", refundedOn: "2026-02-31" },
        {
          kind: "invalid-refund",
          field: "refundedOn",
          code: "invalid-calendar-date",
        },
      ],
      [
        "a note that is too long",
        { amount: "8000", refundedOn: "2026-10-31", note: "x".repeat(301) },
        { kind: "invalid-refund", field: "note", code: "too-long" },
      ],
      [
        "more than the difference",
        { amount: "8001", refundedOn: "2026-10-31" },
        {
          kind: "invalid-refund",
          field: "amount",
          code: "above-difference",
        },
      ],
    ])(
      "refuses a refund with %s and changes nothing",
      async (_label, refund, error) => {
        const { service, order, seats } = await paidFixture();
        const before = await service.detail(admin, order.id);

        await expect(
          service.correct(admin, { orderId: order.id, fee: "50000", refund }),
        ).resolves.toEqual({ ok: false, error });
        await expect(service.detail(admin, order.id)).resolves.toEqual(before);
        await expect(seats.confirmedSeats("p-1", "t-1")).resolves.toBe(1);
      },
    );

    it("refuses the whole correction when the picked turno is full", async () => {
      const { service, order, seats, orders } = await paidFixture({
        offers: offers(),
        capacity: 1,
      });
      const other = await createOrder(orders, 1, { turnoId: "t-2" });
      await service.confirmPayment(admin, { orderId: other.id, ...payment });
      const before = await service.detail(admin, order.id);

      await expect(
        service.correct(admin, {
          orderId: order.id,
          target: secondTurno,
          fee: "58000",
        }),
      ).resolves.toEqual({ ok: false, error: { kind: "turno-full" } });
      await expect(service.detail(admin, order.id)).resolves.toEqual(before);
      await expect(seats.confirmedSeats("p-1", "t-1")).resolves.toBe(1);
      await expect(seats.confirmedSeats("p-1", "t-2")).resolves.toBe(1);
    });

    it("refuses to correct a cancelled order", async () => {
      const { service, order } = await paidFixture();
      await service.cancel(admin, {
        orderId: order.id,
        reason: "changed plans",
        refund: { amount: "58000", refundedOn: "2026-10-31" },
      });

      await expect(
        service.correct(admin, { orderId: order.id, fee: "1000" }),
      ).resolves.toEqual({ ok: false, error: { kind: "not-correctable" } });
    });
  });

  it("refuses a move into a month that is no longer open", async () => {
    const { service, order } = await fixture({
      offers: offers(),
      periods: {
        find: () => Promise.resolve({ status: "closed", capacity: 8 }),
      },
    });

    await expect(
      service.correct(admin, {
        orderId: order.id,
        target: secondTurno,
        fee: "58000",
      }),
    ).resolves.toEqual({ ok: false, error: { kind: "period-closed" } });
  });
});

describe("admin enrollment read state", () => {
  it("stamps the first opener and the clock time, and never overwrites them", async () => {
    const { service, orders, order } = await fixture();

    await expect(service.markSeen(admin, order.id)).resolves.toEqual({
      ok: true,
      value: { kind: "seen" },
    });
    await expect(
      service.markSeen(
        { kind: "admin-actor" as const, email: "other@example.com" },
        order.id,
      ),
    ).resolves.toEqual({ ok: true, value: { kind: "already-seen" } });
    expect(orders.seenMark(order.id)).toEqual({
      by: "admin@example.com",
      at: now,
    });
  });

  it("leaves an order an admin created already read", async () => {
    const { service, orders } = await fixture();
    const manual = await createOrder(orders, 2, { createdBy: admin.email });

    await expect(service.markSeen(admin, manual.id)).resolves.toEqual({
      ok: true,
      value: { kind: "already-seen" },
    });
  });

  it("denies without an admin actor and answers not found for an unknown order", async () => {
    const { service, order } = await fixture();

    await expect(service.markSeen(null, order.id)).resolves.toMatchObject({
      ok: false,
      error: { kind: "denied" },
    });
    await expect(service.markSeen(admin, "missing")).resolves.toEqual({
      ok: false,
      error: { kind: "not-found" },
    });
  });

  it("reports unavailable when the store fails", async () => {
    const { order } = await fixture();
    const failing = createAdminEnrollmentService({
      store: {
        markSeen: () => Promise.reject(new Error("db down")),
      } as unknown as AdminEnrollmentStore,
      clock: { now: () => now },
      offers: noOffers,
      createPending: notCalled,
    });

    await expect(failing.markSeen(admin, order.id)).resolves.toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
    await expect(
      createUnavailableAdminEnrollmentService().markSeen(admin, order.id),
    ).resolves.toEqual({ ok: false, error: { kind: "unavailable" } });
  });
});
