import { describe, expect, it } from "vitest";
import { err, ok, type Result } from "~/modules/_shared";
import {
  createAdminEnrollmentService,
  createUnavailableAdminEnrollmentService,
} from "./admin-enrollment-service";
import type {
  AdminEnrollmentStoreError,
  CreateSaleInput,
  MaterialSaleStore,
} from "./admin-enrollment-store";
import type { OfferedMaterial } from "./offered-materials";
import {
  InMemoryAdminEnrollmentStore,
  InMemoryOrderRepository,
} from "~/testing/fakes/enrollments-order-repository";
import { InMemoryOfferedMaterials } from "~/testing/fakes/enrollments-offered-materials";
import { InMemorySeatLedger } from "~/testing/fakes/enrollments-seat-ledger";
import {
  materialFixture,
  orderDraft,
  pesos,
} from "~/testing/fakes/enrollments-builders";

const admin = { kind: "admin-actor" as const, email: "admin@example.com" };
// 23:30 on 31 December in Córdoba is already 1 January in UTC.
const now = new Date("2027-01-01T02:30:00Z");

async function fixture(
  options: {
    readonly saleResult?: Result<
      { id: string; number: string },
      AdminEnrollmentStoreError
    >;
    readonly catalog?: readonly OfferedMaterial[];
    readonly withoutSales?: boolean;
  } = {},
) {
  const orders = new InMemoryOrderRepository();
  const created = await orders.create(orderDraft());
  if (!created.ok) throw new Error("fixture order");
  const calls: CreateSaleInput[] = [];
  const saleStore: MaterialSaleStore = {
    createSale(input) {
      calls.push(input);
      return Promise.resolve(
        options.saleResult ?? ok({ id: "sale-1", number: "CI-2026-0002" }),
      );
    },
  };
  const catalog = new InMemoryOfferedMaterials({
    // The sale catalog ignores the period; the parent's period id is passed through.
    "p-1": options.catalog ?? [materialFixture()],
  });
  const service = createAdminEnrollmentService({
    store: new InMemoryAdminEnrollmentStore(orders, new InMemorySeatLedger(), {
      find: () => Promise.resolve({ status: "open" as const, capacity: 8 }),
    }),
    clock: { now: () => now },
    offers: { findOffer: () => Promise.resolve(null) },
    createPending: () => Promise.reject(new Error("not expected")),
    ...(options.withoutSales === true
      ? {}
      : {
          sales: {
            store: saleStore,
            catalog,
            random: {
              bytes: (length: number) => new Uint8Array(length).fill(7),
            },
          },
        }),
  });
  return { service, calls, parentId: created.value.id };
}

const cart = (variantId: string, quantity: number, materialId = "m-1") => ({
  materialId,
  variantId,
  quantity,
});

describe("admin enrollment service: material sales", () => {
  it("creates a sale under the monthly record from catalog lines priced and sourced at that moment", async () => {
    const stocked = materialFixture({
      variants: [
        {
          variantId: "v-1",
          label: "Grande",
          unitPrice: pesos(12500),
          available: true,
          onHand: 5,
          unitCost: pesos(8000),
        },
        {
          variantId: "v-2",
          label: "Chico",
          unitPrice: pesos(4000),
          available: true,
          onHand: 1,
        },
      ],
    });
    const { service, calls, parentId } = await fixture({ catalog: [stocked] });

    const result = await service.createMaterialSale(admin, {
      orderId: parentId,
      lines: [cart("v-1", 2), cart("v-2", 3)],
    });

    expect(result).toEqual(ok({ id: "sale-1", number: "CI-2026-0002" }));
    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call).toMatchObject({
      parentOrderId: parentId,
      // Córdoba is still on 31 December, so the number sequence is that year's.
      year: 2026,
      actor: { email: "admin@example.com" },
      now,
    });
    expect(call?.publicId).toMatch(/^[A-Za-z0-9_-]{22,}$/);
    expect(call?.materialsTotal.toCentavos()).toBe(
      (12500 * 2 + 4000 * 3) * 100,
    );
    expect(
      call?.lines.map((line) => [
        line.variantId,
        line.quantity,
        line.source,
        line.unitCost?.toCentavos() ?? null,
      ]),
    ).toEqual([
      ["v-1", 2, "stock", 800000],
      // Not enough units on hand: ordered from the supplier.
      ["v-2", 3, "supplier", null],
    ]);
  });

  it("refuses an empty selection, a bad quantity and a material that is not for sale, and stores nothing", async () => {
    const { service, calls, parentId } = await fixture({
      catalog: [
        materialFixture(),
        materialFixture({ materialId: "m-2", name: "Off", active: false }),
        materialFixture({
          materialId: "m-3",
          variants: [
            {
              variantId: "v-9",
              label: "Sin precio",
              unitPrice: null,
              available: true,
            },
          ],
        }),
      ],
    });
    const refuse = (lines: ReturnType<typeof cart>[]) =>
      service.createMaterialSale(admin, { orderId: parentId, lines });

    await expect(refuse([])).resolves.toEqual(err({ kind: "empty-sale" }));
    await expect(refuse([cart("v-1", 0)])).resolves.toMatchObject({
      ok: false,
      error: { kind: "invalid-quantity" },
    });
    await expect(refuse([cart("v-1", 21)])).resolves.toMatchObject({
      ok: false,
      error: { kind: "invalid-quantity" },
    });
    await expect(refuse([cart("v-1", 1, "m-9")])).resolves.toMatchObject({
      ok: false,
      error: { kind: "material-not-offered" },
    });
    await expect(refuse([cart("v-1", 1, "m-2")])).resolves.toMatchObject({
      ok: false,
      error: { kind: "material-unavailable" },
    });
    await expect(refuse([cart("v-9", 1, "m-3")])).resolves.toMatchObject({
      ok: false,
      error: { kind: "material-unavailable" },
    });
    expect(calls).toEqual([]);
  });

  it("answers not found for a record that does not exist, and passes the store's refusal through", async () => {
    const missing = await fixture();
    await expect(
      missing.service.createMaterialSale(admin, {
        orderId: "missing",
        lines: [cart("v-1", 1)],
      }),
    ).resolves.toEqual(err({ kind: "not-found" }));
    expect(missing.calls).toEqual([]);

    const cancelled = await fixture({
      saleResult: err({ kind: "not-sellable" }),
    });
    await expect(
      cancelled.service.createMaterialSale(admin, {
        orderId: cancelled.parentId,
        lines: [cart("v-1", 1)],
      }),
    ).resolves.toEqual(err({ kind: "not-sellable" }));
  });

  it("denies a non-admin before reading anything, and is unavailable without a sale store", async () => {
    const { service, calls, parentId } = await fixture();
    await expect(
      service.createMaterialSale(null, {
        orderId: parentId,
        lines: [cart("v-1", 1)],
      }),
    ).resolves.toMatchObject({ ok: false, error: { kind: "denied" } });
    expect(calls).toEqual([]);

    const bare = await fixture({ withoutSales: true });
    await expect(
      bare.service.createMaterialSale(admin, {
        orderId: bare.parentId,
        lines: [cart("v-1", 1)],
      }),
    ).resolves.toEqual(err({ kind: "unavailable" }));
    await expect(
      createUnavailableAdminEnrollmentService().createMaterialSale(admin, {
        orderId: parentId,
        lines: [],
      }),
    ).resolves.toEqual(err({ kind: "unavailable" }));
  });

  it("is unavailable when the catalog cannot be read", async () => {
    const orders = new InMemoryOrderRepository();
    const created = await orders.create(orderDraft());
    if (!created.ok) throw new Error("fixture order");
    const service = createAdminEnrollmentService({
      store: new InMemoryAdminEnrollmentStore(
        orders,
        new InMemorySeatLedger(),
        {
          find: () => Promise.resolve({ status: "open" as const, capacity: 8 }),
        },
      ),
      clock: { now: () => now },
      offers: { findOffer: () => Promise.resolve(null) },
      createPending: () => Promise.reject(new Error("not expected")),
      sales: {
        store: { createSale: () => Promise.reject(new Error("not expected")) },
        catalog: { listForPeriod: () => Promise.reject(new Error("down")) },
        random: { bytes: (length) => new Uint8Array(length) },
      },
    });

    await expect(
      service.createMaterialSale(admin, {
        orderId: created.value.id,
        lines: [cart("v-1", 1)],
      }),
    ).resolves.toEqual(err({ kind: "unavailable" }));
  });
});
