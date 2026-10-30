import { describe, expect, it, vi } from "vitest";
import { Money } from "~/modules/_shared";
import type {
  ConsolidationLine,
  DeliveryOrder,
} from "./admin-enrollment-store";
import {
  createSupplierConsolidationService,
  createUnavailableSupplierConsolidationService,
} from "./supplier-consolidation";

const pesos = (amount: number) => {
  const money = Money.fromCentavos(amount * 100);
  if (!money.ok) throw new Error("invalid test money");
  return money.value;
};

const admin = { kind: "admin-actor" as const, email: "admin@example.com" };

function line(overrides: Partial<ConsolidationLine>): ConsolidationLine {
  return {
    orderId: "o1",
    status: "paid",
    supplierId: "s1",
    supplierName: "Papelería Sur",
    materialName: "Arcilla",
    variantLabel: "Grande",
    quantity: 1,
    unitPrice: pesos(1_000),
    ...overrides,
  };
}

function serviceWith(lines: readonly ConsolidationLine[], pendingOrders = 0) {
  const consolidationLines = vi.fn(() =>
    Promise.resolve({ lines, pendingOrders }),
  );
  return {
    consolidationLines,
    service: createSupplierConsolidationService({
      store: { consolidationLines, deliveryOrders: vi.fn() },
    }),
  };
}

// Order 1 has M "Grande" x2 (S1); order 2 has M "Grande" x1 (S1) and N "Chico" x1 (S2).
const example: ConsolidationLine[] = [
  line({ orderId: "o1", quantity: 2 }),
  line({ orderId: "o2", quantity: 1 }),
  line({
    orderId: "o2",
    supplierId: "s2",
    supplierName: "Cerámica Norte",
    materialName: "Esmalte",
    variantLabel: "Chico",
    unitPrice: pesos(2_500),
  }),
];

describe("supplier consolidation", () => {
  it("groups by supplier, material and variant and sums with Money", async () => {
    const { service } = serviceWith(example, 2);
    const result = await service.consolidate(admin, "2026-11");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { suppliers, grandTotal, pendingOrders } = result.value;
    expect(pendingOrders).toBe(2);
    expect(suppliers.map((s) => s.supplierName)).toEqual([
      "Cerámica Norte",
      "Papelería Sur",
    ]);
    const south = suppliers.find((s) => s.supplierId === "s1");
    expect(south?.materials).toEqual([
      {
        materialName: "Arcilla",
        variantLabel: "Grande",
        quantity: 3,
        total: pesos(3_000),
      },
    ]);
    expect(south?.total.toCentavos()).toBe(300_000);
    const north = suppliers.find((s) => s.supplierId === "s2");
    expect(north?.materials).toMatchObject([
      { materialName: "Esmalte", variantLabel: "Chico", quantity: 1 },
    ]);
    expect(grandTotal.toCentavos()).toBe(550_000);
  });

  it("keeps the grand total equal to the sum of supplier totals", async () => {
    const { service } = serviceWith([
      ...example,
      line({ orderId: "o3", quantity: 7, unitPrice: pesos(1_300) }),
    ]);
    const result = await service.consolidate(admin, "2026-11");

    if (!result.ok) throw new Error("expected a consolidation");
    const sum = result.value.suppliers.reduce(
      (total, supplier) => total + supplier.total.toCentavos(),
      0,
    );
    expect(result.value.grandTotal.toCentavos()).toBe(sum);
  });

  it("lists only paid orders for the bulk request, once each", async () => {
    const { service } = serviceWith([
      line({ orderId: "o1", status: "paid" }),
      line({ orderId: "o1", status: "paid", materialName: "Pincel" }),
      line({ orderId: "o2", status: "materials_requested" }),
    ]);
    const result = await service.consolidate(admin, "2026-11");

    if (!result.ok) throw new Error("expected a consolidation");
    expect(result.value.suppliers[0]?.pendingRequestOrderIds).toEqual(["o1"]);
  });

  it("returns an empty list, not an error, for a month without orders", async () => {
    const { service } = serviceWith([]);

    await expect(service.consolidate(admin, "2026-11")).resolves.toMatchObject({
      ok: true,
      value: { suppliers: [], pendingOrders: 0 },
    });
  });

  it("builds a deterministic summary without student data or fee prices", async () => {
    const forward = serviceWith(example).service;
    const shuffled = serviceWith([...example].reverse()).service;
    const a = await forward.consolidate(admin, "2026-11");
    const b = await shuffled.consolidate(admin, "2026-11");

    if (!a.ok || !b.ok) throw new Error("expected consolidations");
    expect(a.value.suppliers.map((s) => s.summary)).toEqual(
      b.value.suppliers.map((s) => s.summary),
    );
    expect(a.value.suppliers[1]?.summary).toBe(
      [
        "Pedido a Papelería Sur",
        "Mes: noviembre 2026",
        "- Arcilla Grande x3",
      ].join("\n"),
    );
    expect(a.value.suppliers[1]?.summary).not.toMatch(/\$/);
  });

  it("never copies student fields into the result", async () => {
    const tainted = {
      ...line({}),
      studentName: "SENTINEL-NAME",
      email: "sentinel@example.com",
    } as ConsolidationLine;
    const result = await serviceWith([tainted]).service.consolidate(
      admin,
      "2026-11",
    );

    expect(JSON.stringify(result)).not.toMatch(/SENTINEL|sentinel/);
  });

  it.each([null, undefined, {}, { email: "" }])(
    "refuses %o as denied before reading",
    async (actor) => {
      const { service, consolidationLines } = serviceWith(example);

      await expect(service.consolidate(actor, "2026-11")).resolves.toEqual({
        ok: false,
        error: { kind: "denied" },
      });
      expect(consolidationLines).not.toHaveBeenCalled();
    },
  );

  it("rejects a malformed month before reading", async () => {
    const { service, consolidationLines } = serviceWith(example);

    await expect(service.consolidate(admin, "noviembre")).resolves.toEqual({
      ok: false,
      error: { kind: "invalid" },
    });
    expect(consolidationLines).not.toHaveBeenCalled();
  });

  it("fails closed when the store rejects", async () => {
    const service = createSupplierConsolidationService({
      store: {
        consolidationLines: () => Promise.reject(new Error("read failed")),
        deliveryOrders: () => Promise.reject(new Error("read failed")),
      },
    });

    await expect(service.consolidate(admin, "2026-11")).resolves.toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
  });

  it("fails closed from the placeholder service, still denying non-admins first", async () => {
    const placeholder = createUnavailableSupplierConsolidationService();

    await expect(placeholder.consolidate(admin, "2026-11")).resolves.toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
    await expect(placeholder.consolidate(null, "2026-11")).resolves.toEqual({
      ok: false,
      error: { kind: "denied" },
    });
  });

  describe("deliveries", () => {
    const order = (overrides: Partial<DeliveryOrder>): DeliveryOrder => ({
      id: "o1",
      number: "CI-2026-0001",
      status: "materials_requested",
      studentName: "Ana Pérez",
      phoneDigits: "5493515550001",
      workshopName: "Cerámica",
      turnoLabel: "Lunes 18:00",
      lines: [{ materialName: "Arcilla", variantLabel: "Grande", quantity: 2 }],
      ...overrides,
    });

    it("returns the month's delivery orders to an admin, validating the period", async () => {
      const deliveryOrders = vi.fn(() => Promise.resolve([order({})]));
      const service = createSupplierConsolidationService({
        store: { consolidationLines: vi.fn(), deliveryOrders },
      });

      await expect(service.deliveries(admin, "2026-11")).resolves.toEqual({
        ok: true,
        value: [order({})],
      });
      expect(deliveryOrders).toHaveBeenCalledWith("2026-11");
      await expect(service.deliveries(admin, "2026-13")).resolves.toEqual({
        ok: false,
        error: { kind: "invalid" },
      });
    });

    it("denies non-admins before reading and fails closed on store errors", async () => {
      const deliveryOrders = vi.fn(() => Promise.reject(new Error("db down")));
      const service = createSupplierConsolidationService({
        store: { consolidationLines: vi.fn(), deliveryOrders },
      });

      await expect(service.deliveries(null, "2026-11")).resolves.toEqual({
        ok: false,
        error: { kind: "denied" },
      });
      expect(deliveryOrders).not.toHaveBeenCalled();
      await expect(service.deliveries(admin, "2026-11")).resolves.toEqual({
        ok: false,
        error: { kind: "unavailable" },
      });
      await expect(
        createUnavailableSupplierConsolidationService().deliveries(
          admin,
          "2026-11",
        ),
      ).resolves.toEqual({ ok: false, error: { kind: "unavailable" } });
    });
  });
});
