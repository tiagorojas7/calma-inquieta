import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { buildSupplier } from "~/testing/fakes/admin-builders";
import { advancingClock } from "~/testing/fakes/fixed-clock";
import { InMemoryMaterialRepository } from "~/testing/fakes/in-memory-material-repository";
import { InMemorySupplierRepository } from "~/testing/fakes/in-memory-supplier-repository";
import { createMaterialsService } from "./material-service";

const actor = testAdminActor("owner@example.com");
const supplier = buildSupplier({ id: "supplier-1", name: "Casa Pincel" });
const otherSupplier = buildSupplier({ id: "supplier-2", name: "Otra Casa" });
const HEADER = "Categoría;Producto;Medida;Precio";
const OCTOBER_CSV = readFileSync(
  new URL(
    "../../../../docs/materials/catalogo-octubre-2026.csv",
    import.meta.url,
  ),
  "utf8",
);

async function setup() {
  const repository = new InMemoryMaterialRepository();
  const suppliers = new InMemorySupplierRepository();
  await suppliers.insert(supplier);
  await suppliers.insert(otherSupplier);
  let ids = 0;
  const service = createMaterialsService({
    repository,
    suppliers,
    media: { findAssets: () => Promise.resolve(new Map()) },
    clock: advancingClock(new Date("2026-10-20T12:00:00.000Z")),
    newId: () => `material-${String(++ids)}`,
    newVariantId: () => `variant-${String(++ids)}`,
  });
  return { service, repository };
}

function unwrap<T>(
  result: { ok: true; value: T } | { ok: false; error: unknown },
) {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
}

describe("catalog import", () => {
  it("previews the October catalog without writing anything", async () => {
    const { service, repository } = await setup();
    const plan = unwrap(
      await service.previewCatalogImport(actor, supplier.id, OCTOBER_CSV),
    );
    expect(plan).toMatchObject({
      newMaterials: 95,
      newVariants: 189,
      priceChanges: 0,
      errors: [],
    });
    expect(repository.materials.size).toBe(0);
  });

  it("imports the October catalog: 95 materials, 189 variants, 4 without price", async () => {
    const { service, repository } = await setup();
    unwrap(await service.importCatalog(actor, supplier.id, OCTOBER_CSV));

    const stored = [...repository.materials.values()];
    const variants = stored.flatMap((material) => material.variants);
    expect(stored).toHaveLength(95);
    expect(variants).toHaveLength(189);
    expect(variants.filter((variant) => variant.price === null)).toHaveLength(
      4,
    );
    expect(
      stored.every((material) => material.supplier.id === supplier.id),
    ).toBe(true);
    const first = stored.find(
      (material) => material.name === "Canasto rectangular",
    );
    expect(first).toMatchObject({
      description: "Canasto rectangular (Canastos)",
      category: "Canastos",
      available: true,
      active: true,
    });
  });

  it("is idempotent: a second import changes nothing and duplicates nothing", async () => {
    const { service, repository } = await setup();
    unwrap(await service.importCatalog(actor, supplier.id, OCTOBER_CSV));
    const before = JSON.stringify([...repository.materials.values()]);

    const again = unwrap(
      await service.importCatalog(actor, supplier.id, OCTOBER_CSV),
    );
    expect(again).toMatchObject({
      newMaterials: 0,
      newVariants: 0,
      priceChanges: 0,
      unchanged: 189,
    });
    expect(JSON.stringify([...repository.materials.values()])).toBe(before);
  });

  it("updates changed prices, adds new measures and leaves rows missing from the file alone", async () => {
    const { service, repository } = await setup();
    unwrap(
      await service.importCatalog(
        actor,
        supplier.id,
        `${HEADER}\nTazas;Taza;Chica;1000\nTazas;Taza;Grande;2000\nTazas;Plato;Hondo;500\n`,
      ),
    );
    const plan = unwrap(
      await service.importCatalog(
        actor,
        supplier.id,
        `${HEADER}\nTazas;taza;CHICA;1500\nTazas;Taza;Mediana;1800\nTazas;Taza;Grande;\n`,
      ),
    );
    expect(plan).toMatchObject({
      newMaterials: 0,
      newVariants: 1,
      priceChanges: 2,
    });

    const cup = [...repository.materials.values()].find(
      (material) => material.name === "Taza",
    );
    expect(
      cup?.variants.map((variant) => [
        variant.label,
        variant.price === null ? null : variant.price.toCentavos() / 100,
      ]),
    ).toEqual([
      ["Chica", 1500],
      ["Grande", null],
      ["Mediana", 1800],
    ]);
    expect(
      [...repository.materials.values()].find(
        (material) => material.name === "Plato",
      )?.variants,
    ).toHaveLength(1);
  });

  it("reports line-numbered errors and refuses to import while any remain", async () => {
    const { service, repository } = await setup();
    const csv = `${HEADER}\nA;Taza;Chica;abc\nA;;Grande;100\n`;
    expect(
      unwrap(await service.previewCatalogImport(actor, supplier.id, csv))
        .errors,
    ).toEqual([
      { line: 2, code: "invalid-price" },
      { line: 3, code: "missing-product" },
    ]);
    expect(await service.importCatalog(actor, supplier.id, csv)).toEqual({
      ok: false,
      error: { kind: "has-errors" },
    });
    expect(repository.materials.size).toBe(0);
  });

  it("flags a product that already belongs to another supplier", async () => {
    const { service } = await setup();
    unwrap(
      await service.importCatalog(
        actor,
        otherSupplier.id,
        `${HEADER}\nA;Taza;Chica;1\n`,
      ),
    );
    const plan = unwrap(
      await service.previewCatalogImport(
        actor,
        supplier.id,
        `${HEADER}\nA;Taza;Grande;1\n`,
      ),
    );
    expect(plan.errors).toEqual([{ line: 2, code: "other-supplier" }]);
  });

  it("refuses an unknown supplier, an archived supplier and a bad file", async () => {
    const { service } = await setup();
    expect(
      await service.previewCatalogImport(actor, "nope", `${HEADER}\n`),
    ).toEqual({
      ok: false,
      error: { kind: "not-found" },
    });
    expect(
      await service.previewCatalogImport(
        actor,
        supplier.id,
        "Producto;Precio\n",
      ),
    ).toEqual({ ok: false, error: { kind: "file", reason: "bad-header" } });
  });

  it("denies a missing actor", async () => {
    const { service } = await setup();
    expect(
      await service.importCatalog(null, supplier.id, `${HEADER}\nA;B;C;1\n`),
    ).toEqual({ ok: false, error: { kind: "denied" } });
  });
});

describe("price raise", () => {
  async function seeded() {
    const context = await setup();
    unwrap(
      await context.service.importCatalog(
        actor,
        supplier.id,
        `${HEADER}\nTazas;Taza;Chica;1000\nTazas;Taza;Grande;1999\nTazas;Taza;A consultar;\nPinturas;Acrílico;1 l;500\n`,
      ),
    );
    return context;
  }

  it("previews before and after totals, rounds to whole pesos and skips no-price variants", async () => {
    const { service, repository } = await seeded();
    const plan = unwrap(
      await service.previewPriceRaise(actor, { supplierId: supplier.id }, 10),
    );
    expect(plan).toMatchObject({
      percent: 10,
      materialCount: 2,
      variantCount: 3,
      skippedWithoutPrice: 1,
      beforeTotal: 3499,
      afterTotal: 1100 + 2199 + 550,
    });
    expect(
      repository.materials
        .get(
          [...repository.materials.values()].find((m) => m.name === "Taza")
            ?.id ?? "",
        )
        ?.variants[0]?.price?.toCentavos(),
    ).toBe(100000);
  });

  it("applies the raise to a category only", async () => {
    const { service, repository } = await seeded();
    unwrap(await service.raisePrices(actor, { category: "pinturas" }, 20));
    const prices = Object.fromEntries(
      [...repository.materials.values()].map((material) => [
        material.name,
        material.variants.map((variant) => variant.price?.toCentavos() ?? null),
      ]),
    );
    expect(prices).toEqual({
      Taza: [100000, 199900, null],
      Acrílico: [60000],
    });
  });

  it.each([0, -5, 201, Number.NaN])("rejects percent %s", async (percent) => {
    const { service } = await seeded();
    expect(
      await service.previewPriceRaise(
        actor,
        { supplierId: supplier.id },
        percent,
      ),
    ).toEqual({ ok: false, error: { kind: "invalid-percent" } });
  });

  it("requires a supplier or a category", async () => {
    const { service } = await seeded();
    expect(await service.raisePrices(actor, {}, 10)).toEqual({
      ok: false,
      error: { kind: "no-scope" },
    });
  });
});

describe("bulk writes use batched repository calls", () => {
  function counted(repository: InMemoryMaterialRepository) {
    const calls = {
      findActiveByName: 0,
      findActiveByNames: 0,
      saveAll: 0,
      insert: 0,
      update: 0,
    };
    for (const name of Object.keys(calls) as (keyof typeof calls)[]) {
      const original = repository[name].bind(repository) as (
        ...args: never[]
      ) => unknown;
      (repository as unknown as Record<string, unknown>)[name] = (
        ...args: never[]
      ) => {
        calls[name] += 1;
        return original(...args);
      };
    }
    return calls;
  }

  it("imports the October catalog with one batched read and one write", async () => {
    const { service, repository } = await setup();
    const calls = counted(repository);
    unwrap(await service.importCatalog(actor, supplier.id, OCTOBER_CSV));

    expect(calls).toEqual({
      findActiveByName: 0,
      findActiveByNames: 1,
      saveAll: 1,
      insert: 0,
      update: 0,
    });
    expect(repository.materials.size).toBe(95);
  });

  it("writes nothing on a re-import with no changes", async () => {
    const { service, repository } = await setup();
    unwrap(await service.importCatalog(actor, supplier.id, OCTOBER_CSV));
    const calls = counted(repository);
    unwrap(await service.importCatalog(actor, supplier.id, OCTOBER_CSV));

    expect(calls.findActiveByNames).toBe(1);
    expect(calls.saveAll).toBe(0);
  });

  it("leaves the catalog untouched when a write in the middle fails", async () => {
    const { service, repository } = await setup();
    unwrap(
      await service.importCatalog(
        actor,
        supplier.id,
        `${HEADER}\nTazas;Taza;Chica;1000\n`,
      ),
    );
    const before = JSON.stringify([...repository.materials.values()]);
    const original = repository.saveAll.bind(repository);
    // Simulate a concurrent writer taking a name after the plan was read.
    repository.saveAll = (writes) => {
      const [first] = writes;
      if (first) void repository.insert({ ...first.material, id: "rival" });
      return original(writes);
    };
    await expect(
      service.importCatalog(
        actor,
        supplier.id,
        `${HEADER}\nTazas;Plato;Hondo;500\nTazas;Vaso;Alto;300\nTazas;Taza;Grande;2000\n`,
      ),
    ).rejects.toThrow();

    const after = [...repository.materials.values()].filter(
      (material) => material.id !== "rival",
    );
    expect(after.map((material) => material.name)).toEqual(["Taza"]);
    expect(JSON.stringify(after)).toBe(before);
  });

  it("applies a price raise as one batched write", async () => {
    const { service, repository } = await setup();
    unwrap(
      await service.importCatalog(
        actor,
        supplier.id,
        `${HEADER}\nTazas;Taza;Chica;1000\nTazas;Plato;Hondo;500\n`,
      ),
    );
    const calls = counted(repository);
    unwrap(await service.raisePrices(actor, { supplierId: supplier.id }, 10));

    expect(calls.saveAll).toBe(1);
    expect(calls.update).toBe(0);
  });
});
