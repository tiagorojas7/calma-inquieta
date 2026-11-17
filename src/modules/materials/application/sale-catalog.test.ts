import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import {
  buildMaterial,
  buildMaterialVariant,
  buildSupplier,
} from "~/testing/fakes/admin-builders";
import { advancingClock } from "~/testing/fakes/fixed-clock";
import { InMemoryMaterialRepository } from "~/testing/fakes/in-memory-material-repository";
import { InMemoryStockStore } from "~/testing/fakes/in-memory-stock-store";
import { InMemorySupplierRepository } from "~/testing/fakes/in-memory-supplier-repository";
import { createMaterialsService } from "./material-service";
import { createSaleCatalogReader } from "./sale-catalog";

function pesos(value: number): Money {
  const money = Money.fromCentavos(value * 100);
  if (!money.ok) throw new Error("fixture money");
  return money.value;
}

const supplier = buildSupplier({ id: "supplier-1", name: "Casa Pincel" });
const variant = (id: string, label: string, price: Money | null, ok = true) =>
  buildMaterialVariant({
    id,
    label,
    price,
    available: ok,
    position: Number(id.replace(/\D/g, "")),
  });

async function catalog() {
  const repository = new InMemoryMaterialRepository();
  await repository.insert(
    buildMaterial({
      id: "m-clay",
      name: "Arcilla",
      supplier,
      variants: [
        variant("v-1", "1 kg", pesos(4000)),
        variant("v-2", "5 kg", null),
        variant("v-3", "10 kg", pesos(7000), false),
      ],
    }),
  );
  await repository.insert(
    buildMaterial({
      id: "m-off",
      name: "Barniz",
      supplier,
      available: false,
      variants: [variant("v-4", "1 l", pesos(3000))],
    }),
  );
  await repository.insert(
    buildMaterial({
      id: "m-archived",
      name: "Esmalte",
      supplier,
      active: false,
      variants: [variant("v-5", "1 l", pesos(3500))],
    }),
  );
  await repository.insert(
    buildMaterial({
      id: "m-brush",
      name: "Pincel",
      supplier,
      variants: [variant("v-6", "Chico", pesos(1500))],
    }),
  );
  return repository;
}

describe("sale catalog for hand-made enrollments", () => {
  it("offers only active, available variants that have a price, by material name", async () => {
    const repository = await catalog();
    const service = createMaterialsService({
      repository,
      suppliers: new InMemorySupplierRepository(),
      media: { findAssets: () => Promise.resolve(new Map()) },
      stock: new InMemoryStockStore(),
      clock: advancingClock(new Date("2026-11-16T12:00:00.000Z")),
    });
    const listed = await service.listSaleVariants(testAdminActor());
    expect(listed).toEqual({
      ok: true,
      value: [
        {
          materialId: "m-clay",
          variantId: "v-1",
          materialName: "Arcilla",
          variantLabel: "1 kg",
          unitPrice: pesos(4000),
        },
        {
          materialId: "m-brush",
          variantId: "v-6",
          materialName: "Pincel",
          variantLabel: "Chico",
          unitPrice: pesos(1500),
        },
      ],
    });
  });

  it("denies a missing actor before reading", async () => {
    const service = createMaterialsService({
      repository: await catalog(),
      suppliers: new InMemorySupplierRepository(),
      media: { findAssets: () => Promise.resolve(new Map()) },
      stock: new InMemoryStockStore(),
      clock: advancingClock(new Date("2026-11-16T12:00:00.000Z")),
    });
    expect(await service.listSaleVariants(null)).toEqual({
      ok: false,
      error: { kind: "denied" },
    });
  });

  it("reads every material, archived and unavailable ones included, with the supplier snapshot facts", async () => {
    const reader = createSaleCatalogReader({ materials: await catalog() });
    const all = await reader.listSaleCatalog();
    expect(all.map((m) => [m.materialId, m.active, m.available])).toEqual([
      ["m-clay", true, true],
      ["m-off", true, false],
      ["m-archived", false, true],
      ["m-brush", true, true],
    ]);
    expect(all[0]).toEqual({
      materialId: "m-clay",
      name: "Arcilla",
      active: true,
      available: true,
      supplierId: "supplier-1",
      supplierName: "Casa Pincel",
      variants: [
        {
          variantId: "v-1",
          label: "1 kg",
          unitPrice: pesos(4000),
          available: true,
        },
        { variantId: "v-2", label: "5 kg", unitPrice: null, available: true },
        {
          variantId: "v-3",
          label: "10 kg",
          unitPrice: pesos(7000),
          available: false,
        },
      ],
    });
  });
});
