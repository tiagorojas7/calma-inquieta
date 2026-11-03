import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import type { AdminEnrollmentStore } from "~/modules/enrollments/application/admin-enrollment-store";
import type {
  AuditEntry,
  OrderDraft,
  StoredOrder,
} from "~/modules/enrollments/application/enrollment-repository";

const pesos = (amount: number) => {
  const result = Money.fromCentavos(amount * 100);
  if (!result.ok) throw new Error("contract money fixture");
  return result.value;
};

const actor = { email: "admin@example.com" };
const now = new Date("2026-10-31T15:00:00Z");
const paidAt = new Date("2026-10-30T15:00:00Z");

export interface AdminEnrollmentStoreContractHarness {
  readonly store: AdminEnrollmentStore;
  readonly capacity: number;
  createOrder(overrides?: Partial<OrderDraft>): Promise<StoredOrder>;
  seatCount(order: StoredOrder): Promise<number>;
  audit(order: StoredOrder): Promise<readonly AuditEntry[]>;
  /** A test-only fixture that fails after claiming a seat during confirmation. */
  failingAfterSeatMutation(): Promise<AdminEnrollmentStoreContractHarness>;
}

const confirm = (
  store: AdminEnrollmentStore,
  order: StoredOrder,
  note = "bank transfer",
) =>
  store.confirm({
    orderId: order.id,
    amount: order.total,
    paidAt,
    note,
    actor,
    now,
  });

const cancel = (store: AdminEnrollmentStore, order: StoredOrder) =>
  store.cancel({
    orderId: order.id,
    reason: "changed plans",
    actor,
    now,
  });

/** Behavior every transactional admin enrollment store implementation must share. */
export function runAdminEnrollmentStoreContract(
  setup: () =>
    | Promise<AdminEnrollmentStoreContractHarness>
    | AdminEnrollmentStoreContractHarness,
): void {
  describe("AdminEnrollmentStore contract", () => {
    it("confirms a pending order atomically with payment, audit, and seat counter", async () => {
      const harness = await setup();
      const order = await harness.createOrder();

      await expect(confirm(harness.store, order)).resolves.toEqual({
        ok: true,
        value: { kind: "confirmed" },
      });
      await expect(harness.seatCount(order)).resolves.toBe(1);
      await expect(harness.store.detail(order.id)).resolves.toMatchObject({
        ok: true,
        value: {
          status: "paid",
          paidAt,
          paidAmount: order.total,
          confirmedBy: actor.email,
          paymentNote: "bank transfer",
        },
      });
      await expect(harness.audit(order)).resolves.toEqual([
        expect.objectContaining({ to: "pending_confirmation" }),
        {
          at: now,
          actor: actor.email,
          from: "pending_confirmation",
          to: "paid",
          note: "bank transfer",
        },
      ]);
    });

    it("makes repeat confirmation idempotent", async () => {
      const harness = await setup();
      const order = await harness.createOrder();
      await confirm(harness.store, order);
      const audit = await harness.audit(order);

      await expect(confirm(harness.store, order)).resolves.toEqual({
        ok: true,
        value: { kind: "already-confirmed" },
      });
      await expect(harness.seatCount(order)).resolves.toBe(1);
      await expect(harness.audit(order)).resolves.toEqual(audit);
    });

    it("leaves order and audit unchanged when the turno is full", async () => {
      const harness = await setup();
      const first = await harness.createOrder();
      const full = await harness.createOrder({
        student: {
          fullName: "Full Turno",
          email: "full@example.com",
          phoneDigits: "5493515559999",
        },
      });
      await confirm(harness.store, first);
      if (harness.capacity > 1) {
        const second = await harness.createOrder({
          student: {
            fullName: "Second Seat",
            email: "second@example.com",
            phoneDigits: "5493515559998",
          },
        });
        await confirm(harness.store, second);
      }
      const audit = await harness.audit(full);

      await expect(confirm(harness.store, full)).resolves.toEqual({
        ok: false,
        error: { kind: "turno-full" },
      });
      await expect(harness.store.detail(full.id)).resolves.toMatchObject({
        ok: true,
        value: { status: "pending_confirmation" },
      });
      await expect(harness.audit(full)).resolves.toEqual(audit);
      await expect(harness.seatCount(full)).resolves.toBe(harness.capacity);
    });

    it("does not release a seat for a pending cancellation and retains payment evidence after a paid cancellation", async () => {
      const harness = await setup();
      const pending = await harness.createOrder();

      await expect(cancel(harness.store, pending)).resolves.toEqual({
        ok: true,
        value: { kind: "cancelled" },
      });
      await expect(harness.seatCount(pending)).resolves.toBe(0);

      const paid = await harness.createOrder({
        student: {
          fullName: "Paid Student",
          email: "paid@example.com",
          phoneDigits: "5493515559997",
        },
      });
      await confirm(harness.store, paid, "cash");
      await expect(cancel(harness.store, paid)).resolves.toEqual({
        ok: true,
        value: { kind: "cancelled" },
      });
      await expect(harness.seatCount(paid)).resolves.toBe(0);
      await expect(harness.store.detail(paid.id)).resolves.toMatchObject({
        ok: true,
        value: {
          status: "cancelled",
          paidAt,
          paidAmount: paid.total,
          confirmedBy: actor.email,
          paymentNote: "cash",
        },
      });
    });

    it("makes repeat cancellation idempotent", async () => {
      const harness = await setup();
      const order = await harness.createOrder();
      await confirm(harness.store, order);
      await cancel(harness.store, order);
      const audit = await harness.audit(order);

      await expect(cancel(harness.store, order)).resolves.toEqual({
        ok: true,
        value: { kind: "already-cancelled" },
      });
      await expect(harness.seatCount(order)).resolves.toBe(0);
      await expect(harness.audit(order)).resolves.toEqual(audit);
    });

    it("transitions materials with audit rows and writes no audit for illegal transitions", async () => {
      const harness = await setup();
      const order = await harness.createOrder({
        lines: [
          {
            materialId: "m-1",
            variantId: "v-1",
            materialName: "Clay",
            variantLabel: "Large",
            unitPrice: pesos(1),
            quantity: 1,
            supplierId: "supplier-1",
            supplierName: "Supplier",
          },
        ],
        materialsTotal: pesos(1),
        total: pesos(58001),
      });
      await confirm(harness.store, order);

      await expect(
        harness.store.markMaterials({
          orderId: order.id,
          to: "materials_requested",
          actor,
          now,
        }),
      ).resolves.toEqual({ ok: true, value: undefined });
      await expect(
        harness.store.markMaterials({
          orderId: order.id,
          to: "materials_received",
          actor,
          now,
        }),
      ).resolves.toEqual({ ok: true, value: undefined });
      const audit = await harness.audit(order);
      await expect(
        harness.store.markMaterials({
          orderId: order.id,
          to: "materials_requested",
          actor,
          now,
        }),
      ).resolves.toEqual({
        ok: false,
        error: {
          kind: "illegal-transition",
          from: "materials_received",
          to: "materials_requested",
        },
      });
      await expect(harness.audit(order)).resolves.toEqual(audit);
    });

    it("keeps list and detail projections in parity", async () => {
      const harness = await setup();
      const order = await harness.createOrder();

      await expect(harness.store.list({})).resolves.toMatchObject({
        page: 1,
        pageSize: 50,
        items: [
          {
            number: order.number,
            studentName: order.student.fullName,
            phoneDigits: order.student.phoneDigits,
            workshopName: order.workshopName,
            period: order.period,
            turnoLabel: order.turnoLabel,
            status: order.status,
            total: order.total,
          },
        ],
      });
      await expect(harness.store.detail(order.id)).resolves.toMatchObject({
        ok: true,
        value: {
          number: order.number,
          status: order.status,
          total: order.total,
          student: order.student,
        },
      });
    });

    it("rolls back order, counter, and audit when confirmation fails after the seat mutation", async () => {
      const configured = await setup();
      const harness = await configured.failingAfterSeatMutation();
      const order = await harness.createOrder();
      const audit = await harness.audit(order);

      await expect(confirm(harness.store, order)).resolves.toEqual({
        ok: false,
        error: { kind: "unavailable" },
      });
      await expect(harness.seatCount(order)).resolves.toBe(0);
      await expect(harness.audit(order)).resolves.toEqual(audit);
      await expect(harness.store.detail(order.id)).resolves.toMatchObject({
        ok: true,
        value: { status: "pending_confirmation" },
      });
    });

    it("consumes one seat for concurrent duplicate confirmation", async () => {
      const harness = await setup();
      const order = await harness.createOrder();

      await expect(
        Promise.all([
          confirm(harness.store, order),
          confirm(harness.store, order),
        ]),
      ).resolves.toEqual(
        expect.arrayContaining([
          { ok: true, value: { kind: "confirmed" } },
          { ok: true, value: { kind: "already-confirmed" } },
        ]),
      );
      await expect(harness.seatCount(order)).resolves.toBe(1);
      await expect(harness.audit(order)).resolves.toHaveLength(2);
    });

    it("keeps cancel and confirm on one order synchronized", async () => {
      const harness = await setup();
      const order = await harness.createOrder();
      await confirm(harness.store, order);

      const results = await Promise.all([
        cancel(harness.store, order),
        confirm(harness.store, order),
      ]);

      expect(results).toContainEqual({
        ok: true,
        value: { kind: "cancelled" },
      });
      const confirmation = results.find(
        (result) => !(result.ok && result.value.kind === "cancelled"),
      );
      if (!confirmation) throw new Error("missing concurrent confirmation");
      if (confirmation.ok) {
        expect(confirmation.value).toEqual({ kind: "already-confirmed" });
      } else {
        expect(confirmation.error).toEqual({
          kind: "illegal-transition",
          from: "cancelled",
          to: "paid",
        });
      }
      await expect(harness.seatCount(order)).resolves.toBe(0);
      await expect(harness.store.detail(order.id)).resolves.toMatchObject({
        ok: true,
        value: { status: "cancelled" },
      });
    });

    it("lists consolidation lines of paid and requested orders by stored period", async () => {
      const harness = await setup();
      const materialLine = (materialName: string, quantity: number) => ({
        materialId: "m-1",
        variantId: "v-1",
        materialName,
        variantLabel: "Grande",
        unitPrice: pesos(1_000),
        quantity,
        supplierId: "supplier-1",
        supplierName: "Papelería Sur",
      });
      const withLines = (
        period: string,
        materialName: string,
        quantity: number,
        overrides: Partial<OrderDraft> = {},
      ) => {
        const materialsTotal = pesos(1_000 * quantity);
        return harness.createOrder({
          period,
          lines: [materialLine(materialName, quantity)],
          materialsTotal,
          total: pesos(58_000 + 1_000 * quantity),
          ...overrides,
        });
      };
      const paid = await withLines("2026-11", "Arcilla", 2);
      const requested = await withLines("2026-11", "Esmalte", 1, {
        turnoId: "t-2",
      });
      const received = await withLines("2026-11", "Pincel", 1, {
        turnoId: "t-2",
      });
      await withLines("2026-11", "Torno", 1);
      const cancelled = await withLines("2026-11", "Horno", 1);
      const otherPeriod = await withLines("2026-10", "Arcilla", 5, {
        requestedAt: new Date("2026-11-01T01:00:00Z"),
      });
      for (const order of [paid, requested, received, otherPeriod])
        await confirm(harness.store, order);
      for (const [order, to] of [
        [requested, "materials_requested"],
        [received, "materials_requested"],
        [received, "materials_received"],
      ] as const)
        await harness.store.markMaterials({
          orderId: order.id,
          to,
          actor,
          now,
        });
      await cancel(harness.store, cancelled);

      const november = await harness.store.consolidationLines("2026-11");

      expect(
        november.lines
          .map((item) => ({
            orderId: item.orderId,
            status: item.status,
            supplierName: item.supplierName,
            materialName: item.materialName,
            variantLabel: item.variantLabel,
            quantity: item.quantity,
            unitPrice: item.unitPrice.toCentavos(),
          }))
          .sort((a, b) => a.materialName.localeCompare(b.materialName)),
      ).toEqual([
        {
          orderId: paid.id,
          status: "paid",
          supplierName: "Papelería Sur",
          materialName: "Arcilla",
          variantLabel: "Grande",
          quantity: 2,
          unitPrice: 100_000,
        },
        {
          orderId: requested.id,
          status: "materials_requested",
          supplierName: "Papelería Sur",
          materialName: "Esmalte",
          variantLabel: "Grande",
          quantity: 1,
          unitPrice: 100_000,
        },
      ]);
      expect(november.pendingOrders).toBe(1);
      const october = await harness.store.consolidationLines("2026-10");
      expect(october.lines.map((item) => item.orderId)).toEqual([
        otherPeriod.id,
      ]);
      await expect(
        harness.store.consolidationLines("2026-12"),
      ).resolves.toEqual({ lines: [], pendingOrders: 0 });
    });

    it("lists, per order, the students whose materials were paid, requested or received", async () => {
      const harness = await setup();
      const withLine = (
        period: string,
        materialName: string,
        quantity: number,
        overrides: Partial<OrderDraft> = {},
      ) =>
        harness.createOrder({
          period,
          lines: [
            {
              materialId: "m-1",
              variantId: "v-1",
              materialName,
              variantLabel: "Grande",
              unitPrice: pesos(1_000),
              quantity,
              supplierId: "supplier-1",
              supplierName: "Papelería Sur",
            },
          ],
          materialsTotal: pesos(1_000 * quantity),
          total: pesos(58_000 + 1_000 * quantity),
          ...overrides,
        });
      const paid = await withLine("2026-11", "Arcilla", 2, {
        student: {
          fullName: "Ana Paga",
          email: "ana-paga@example.com",
          phoneDigits: "5493515550001",
        },
      });
      const requested = await withLine("2026-11", "Esmalte", 1, {
        turnoId: "t-2",
        student: {
          fullName: "Bea Pedida",
          email: "bea@example.com",
          phoneDigits: "5493515550002",
        },
      });
      const received = await withLine("2026-11", "Pincel", 3, {
        turnoId: "t-2",
        student: {
          fullName: "Cata Recibida",
          email: "cata@example.com",
          phoneDigits: "5493515550003",
        },
      });
      await withLine("2026-11", "Torno", 1);
      const cancelled = await withLine("2026-11", "Horno", 1);
      const noLines = await harness.createOrder({ period: "2026-11" });
      const otherPeriod = await withLine("2026-10", "Arcilla", 5);
      for (const order of [paid, requested, received, noLines, otherPeriod])
        await confirm(harness.store, order);
      for (const [order, to] of [
        [requested, "materials_requested"],
        [received, "materials_requested"],
        [received, "materials_received"],
      ] as const)
        await harness.store.markMaterials({
          orderId: order.id,
          to,
          actor,
          now,
        });
      await cancel(harness.store, cancelled);

      const november = await harness.store.deliveryOrders("2026-11");

      expect(
        november.map((order) => ({
          id: order.id,
          number: order.number,
          status: order.status,
          studentName: order.studentName,
          phoneDigits: order.phoneDigits,
          workshopName: order.workshopName,
          turnoLabel: order.turnoLabel,
          lines: order.lines,
        })),
      ).toEqual([
        {
          id: paid.id,
          number: paid.number,
          status: "paid",
          studentName: "Ana Paga",
          phoneDigits: "5493515550001",
          workshopName: paid.workshopName,
          turnoLabel: paid.turnoLabel,
          lines: [
            {
              materialName: "Arcilla",
              variantLabel: "Grande",
              quantity: 2,
              supplierName: "Papelería Sur",
              unitPrice: pesos(1_000),
            },
          ],
        },
        {
          id: requested.id,
          number: requested.number,
          status: "materials_requested",
          studentName: "Bea Pedida",
          phoneDigits: "5493515550002",
          workshopName: requested.workshopName,
          turnoLabel: requested.turnoLabel,
          lines: [
            {
              materialName: "Esmalte",
              variantLabel: "Grande",
              quantity: 1,
              supplierName: "Papelería Sur",
              unitPrice: pesos(1_000),
            },
          ],
        },
        {
          id: received.id,
          number: received.number,
          status: "materials_received",
          studentName: "Cata Recibida",
          phoneDigits: "5493515550003",
          workshopName: received.workshopName,
          turnoLabel: received.turnoLabel,
          lines: [
            {
              materialName: "Pincel",
              variantLabel: "Grande",
              quantity: 3,
              supplierName: "Papelería Sur",
              unitPrice: pesos(1_000),
            },
          ],
        },
      ]);
      await expect(harness.store.deliveryOrders("2026-12")).resolves.toEqual(
        [],
      );
    });

    it("allows different turnos to progress independently", async () => {
      const harness = await setup();
      const first = await harness.createOrder();
      const second = await harness.createOrder({
        turnoId: "t-2",
        student: {
          fullName: "Other Turno",
          email: "other-turno@example.com",
          phoneDigits: "5493515559996",
        },
      });

      await expect(
        Promise.all([
          confirm(harness.store, first),
          confirm(harness.store, second),
        ]),
      ).resolves.toEqual([
        { ok: true, value: { kind: "confirmed" } },
        { ok: true, value: { kind: "confirmed" } },
      ]);
      await expect(harness.seatCount(first)).resolves.toBe(1);
      await expect(harness.seatCount(second)).resolves.toBe(1);
    });
  });
}
