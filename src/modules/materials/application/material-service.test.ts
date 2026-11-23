import { describe, expect, it, vi } from "vitest";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { buildMediaAsset, buildSupplier } from "~/testing/fakes/admin-builders";
import { advancingClock } from "~/testing/fakes/fixed-clock";
import { InMemoryStockStore } from "~/testing/fakes/in-memory-stock-store";
import { InMemoryMaterialRepository } from "~/testing/fakes/in-memory-material-repository";
import { InMemorySupplierRepository } from "~/testing/fakes/in-memory-supplier-repository";
import type { MediaAsset, MediaLookup } from "~/modules/media";
import type { MaterialDraft } from "./contracts";
import {
  MaterialNameConflictError,
  MaterialVariantLabelConflictError,
} from "./material-repository";
import {
  createMaterialLookup,
  createMaterialsService,
} from "./material-service";

const NOW = new Date("2026-10-20T12:00:00.000Z");
const actor = testAdminActor("owner@example.com");
const other = testAdminActor("other@example.com");
const supplier = buildSupplier({ id: "supplier-1", name: "Casa Pincel" });
const asset = buildMediaAsset({ id: "asset-1" });

const draft = (overrides: Partial<MaterialDraft> = {}): MaterialDraft => ({
  name: "Bastidor",
  description: "Madera natural",
  category: "Bastidores",
  supplierId: supplier.id,
  available: true,
  image: null,
  variants: [
    {
      label: "Única",
      price: "12500",
      available: true,
      swatch: "",
    },
  ],
  ...overrides,
});

async function setup() {
  const repository = new InMemoryMaterialRepository();
  const suppliers = new InMemorySupplierRepository();
  await suppliers.insert(supplier);
  const assets = new Map<string, MediaAsset>([[asset.id, asset]]);
  const media: MediaLookup = {
    findAssets(ids) {
      const found = new Map<string, MediaAsset>();
      for (const id of ids) {
        const stored = assets.get(id);
        if (stored) found.set(id, stored);
      }
      return Promise.resolve(found);
    },
  };
  const clock = advancingClock(NOW);
  const stock = new InMemoryStockStore();
  let materialId = 0;
  let variantId = 0;
  const service = createMaterialsService({
    repository,
    suppliers,
    media,
    clock,
    stock,
    newId: () => `material-${String(++materialId)}`,
    newVariantId: () => `variant-${String(++variantId)}`,
  });
  return { repository, suppliers, assets, media, clock, stock, service };
}

function valueOf<T>(result: { readonly ok: boolean; readonly value?: T }): T {
  if (!result.ok || result.value === undefined) throw new Error("expected ok");
  return result.value;
}

describe("material service", () => {
  it.each([null, undefined])(
    "denies all methods actor-first for %s",
    async (missingActor) => {
      const { repository, suppliers, media, service } = await setup();
      const repositorySpies = [
        vi.spyOn(repository, "insert"),
        vi.spyOn(repository, "update"),
        vi.spyOn(repository, "findById"),
        vi.spyOn(repository, "findActiveByName"),
        vi.spyOn(repository, "findByIds"),
        vi.spyOn(repository, "list"),
      ];
      const supplierSpy = vi.spyOn(suppliers, "findById");
      const mediaSpy = vi.spyOn(media, "findAssets");
      const denied = { ok: false, error: { kind: "denied" } };

      expect(await service.list(missingActor, { state: "all" })).toEqual(
        denied,
      );
      expect(await service.listSelectable(missingActor)).toEqual(denied);
      expect(await service.get(missingActor, "id")).toEqual(denied);
      expect(await service.create(missingActor, draft())).toEqual(denied);
      expect(await service.update(missingActor, "id", draft())).toEqual(denied);
      expect(await service.deactivate(missingActor, "id")).toEqual(denied);
      expect(await service.deletePermanent(missingActor, "id")).toEqual(denied);
      expect(await service.reactivate(missingActor, "id")).toEqual(denied);
      expect(await service.categorySuggestions(missingActor)).toEqual(denied);
      expect(await service.stockOf(missingActor, "id")).toEqual(denied);
      expect(
        await service.adjustStock(missingActor, "id", "variant", {
          delta: "1",
          reason: "Compra",
        }),
      ).toEqual(denied);
      expect(
        await service.setImage(missingActor, "id", { assetId: "a", alt: "b" }),
      ).toEqual(denied);
      expect(repositorySpies.every((spy) => spy.mock.calls.length === 0)).toBe(
        true,
      );
      expect(supplierSpy).not.toHaveBeenCalled();
      expect(mediaSpy).not.toHaveBeenCalled();
    },
  );

  it("creates an audited normalized material with one explicit Única variant and hydrated image", async () => {
    const { service } = await setup();
    const created = valueOf(
      await service.create(
        actor,
        draft({
          name: "  Bastidor A\u0301mbar ",
          category: " Bastidores ",
          image: { assetId: asset.id, alt: " Bastidor ámbar " },
          variants: [
            {
              label: " Única ",
              price: "12500",
              available: true,
              swatch: " #AABBCC ",
            },
          ],
        }),
      ),
    );

    expect(created).toMatchObject({
      id: "material-1",
      name: "Bastidor Ámbar",
      category: "Bastidores",
      supplier,
      available: true,
      active: true,
      image: { assetId: asset.id, alt: "Bastidor ámbar", asset },
      variants: [
        {
          id: "variant-1",
          label: "Única",
          available: true,
          used: false,
          position: 0,
          swatch: "#aabbcc",
        },
      ],
      audit: { updatedBy: actor.email, updatedAt: NOW },
    });
    expect(created.variants[0]?.price?.toCentavos()).toBe(1_250_000);
  });

  it("stores the supplier cost per variant, none when blank, and keeps it for a retained used variant", async () => {
    const { repository, service } = await setup();
    const created = valueOf(
      await service.create(
        actor,
        draft({
          variants: [
            {
              label: "Used",
              price: "12500",
              cost: "8.000",
              available: true,
              swatch: "",
            },
            { label: "Plain", price: "15000", available: true, swatch: "" },
          ],
        }),
      ),
    );
    const [used, plain] = created.variants;
    if (!used || !plain) throw new Error("expected variants");
    expect(used.cost?.toCentavos()).toBe(800_000);
    expect(plain.cost).toBeNull();
    repository.materials.set(created.id, {
      ...created,
      variants: [{ ...used, used: true }, plain],
    });

    const updated = valueOf(
      await service.update(
        other,
        created.id,
        draft({
          variants: [
            {
              id: plain.id,
              label: "Plain",
              price: "15000",
              cost: "9000",
              available: true,
              swatch: "",
            },
          ],
        }),
      ),
    );
    expect(
      updated.variants.map((variant) => variant.cost?.toCentavos() ?? null),
    ).toEqual([900_000, 800_000]);
  });

  describe("stock", () => {
    async function withVariant() {
      const context = await setup();
      const created = valueOf(await context.service.create(actor, draft()));
      const variant = created.variants[0];
      if (!variant) throw new Error("expected variant");
      return { ...context, material: created, variant };
    }

    it("reads 0 for a variant without a stock row", async () => {
      const { service, material, variant } = await withVariant();
      expect(valueOf(await service.stockOf(actor, material.id))).toEqual(
        new Map([[variant.id, 0]]),
      );
    });

    it("adds and subtracts units and audits each change with who, when and why", async () => {
      const { service, stock, material, variant } = await withVariant();
      const adjust = (delta: string, reason: string) =>
        service.adjustStock(actor, material.id, variant.id, { delta, reason });

      expect(await adjust("+5", " Compra al proveedor ")).toEqual({
        ok: true,
        value: { onHand: 5 },
      });
      expect(await adjust("-1", "Rotura")).toEqual({
        ok: true,
        value: { onHand: 4 },
      });
      expect(valueOf(await service.stockOf(actor, material.id))).toEqual(
        new Map([[variant.id, 4]]),
      );
      expect(stock.adjustments).toMatchObject([
        {
          variantId: variant.id,
          delta: 5,
          reason: "Compra al proveedor",
          by: actor.email,
        },
        { variantId: variant.id, delta: -1, reason: "Rotura", by: actor.email },
      ]);
      expect(stock.adjustments[0]?.at).toBeInstanceOf(Date);
    });

    it("refuses to go below zero with a field error and changes nothing", async () => {
      const { service, stock, material, variant } = await withVariant();
      await service.adjustStock(actor, material.id, variant.id, {
        delta: "2",
        reason: "Compra",
      });
      const before = structuredClone([...stock.levels]);

      expect(
        await service.adjustStock(actor, material.id, variant.id, {
          delta: "-3",
          reason: "Rotura",
        }),
      ).toEqual({
        ok: false,
        error: { kind: "insufficient-stock", onHand: 2 },
      });
      expect([...stock.levels]).toEqual(before);
      expect(stock.adjustments).toHaveLength(1);
    });

    it("validates the delta and the reason before touching the store", async () => {
      const { service, stock, material, variant } = await withVariant();
      const spy = vi.spyOn(stock, "adjust");
      const adjust = (delta: string, reason: string) =>
        service.adjustStock(actor, material.id, variant.id, { delta, reason });

      expect(await adjust("", "")).toEqual({
        ok: false,
        error: {
          kind: "invalid",
          issues: [
            { field: "delta", code: "required" },
            { field: "reason", code: "required" },
          ],
        },
      });
      expect(await adjust("0", "x")).toMatchObject({
        error: { issues: [{ field: "delta", code: "out-of-range" }] },
      });
      expect(await adjust("1,5", "x")).toMatchObject({
        error: { issues: [{ field: "delta", code: "invalid-format" }] },
      });
      expect(spy).not.toHaveBeenCalled();
    });

    it("answers not-found for an unknown material or a variant of another material", async () => {
      const { service, material, variant } = await withVariant();
      const draftValue = { delta: "1", reason: "Compra" };
      expect(
        await service.adjustStock(actor, "nope", variant.id, draftValue),
      ).toEqual({ ok: false, error: { kind: "not-found" } });
      expect(
        await service.adjustStock(actor, material.id, "nope", draftValue),
      ).toEqual({ ok: false, error: { kind: "not-found" } });
      expect(await service.stockOf(actor, "nope")).toEqual({
        ok: false,
        error: { kind: "not-found" },
      });
    });

    it("keeps variant ids, so the count survives a material save", async () => {
      const { service, stock, material, variant } = await withVariant();
      await service.adjustStock(actor, material.id, variant.id, {
        delta: "6",
        reason: "Compra",
      });

      const saved = valueOf(
        await service.update(
          other,
          material.id,
          draft({
            variants: [
              {
                id: variant.id,
                label: "Única",
                price: "99999",
                available: true,
                swatch: "",
              },
            ],
          }),
        ),
      );

      expect(saved.variants.map((value) => value.id)).toEqual([variant.id]);
      expect(stock.levels.get(variant.id)).toBe(6);
    });
  });

  it("aggregates pure validation before supplier or media lookups", async () => {
    const { suppliers, media, service } = await setup();
    const supplierSpy = vi.spyOn(suppliers, "findById");
    const mediaSpy = vi.spyOn(media, "findAssets");

    expect(
      await service.create(
        actor,
        draft({ name: "", category: "", supplierId: "", variants: [] }),
      ),
    ).toMatchObject({
      ok: false,
      error: {
        kind: "invalid",
        issues: [
          { field: "name", code: "required" },
          { field: "category", code: "required" },
          { field: "supplierId", code: "required" },
          { field: "variants", code: "required" },
        ],
      },
    });
    expect(supplierSpy).not.toHaveBeenCalled();
    expect(mediaSpy).not.toHaveBeenCalled();
  });

  it("requires an active supplier and a known image with nonblank alt", async () => {
    const { suppliers, service } = await setup();
    expect(
      await service.create(actor, draft({ supplierId: "missing-supplier" })),
    ).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "supplierId", code: "unknown-reference" }],
      },
    });

    await suppliers.update({ ...supplier, active: false });
    expect(await service.create(actor, draft())).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "supplierId", code: "not-selectable" }],
      },
    });

    await suppliers.update(supplier);
    expect(
      await service.create(
        actor,
        draft({ image: { assetId: "missing", alt: "" } }),
      ),
    ).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "image", code: "required" }],
      },
    });
    expect(
      await service.create(
        actor,
        draft({ image: { assetId: "missing", alt: "Missing" } }),
      ),
    ).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "image", code: "unknown-reference" }],
      },
    });
  });

  it("returns not-found on update and replaces variants while preserving active state", async () => {
    const { clock, service } = await setup();
    expect(await service.update(actor, "missing", draft())).toEqual({
      ok: false,
      error: { kind: "not-found" },
    });
    const created = valueOf(await service.create(actor, draft()));
    await service.deactivate(actor, created.id);
    clock.advance(1);
    const updated = valueOf(
      await service.update(
        other,
        created.id,
        draft({
          variants: [
            {
              label: "Grande",
              price: "20000",
              available: false,
              swatch: "",
            },
          ],
        }),
      ),
    );
    expect(updated.active).toBe(false);
    expect(updated.variants).toHaveLength(1);
    expect(updated.variants[0]).toMatchObject({
      id: "variant-2",
      label: "Grande",
      position: 0,
      available: false,
    });
    expect(updated.audit).toEqual({
      updatedBy: other.email,
      updatedAt: new Date(NOW.getTime() + 1),
    });
  });

  it("preserves omitted used variants as unavailable while allowing unused variants to be removed", async () => {
    const { repository, service } = await setup();
    const created = valueOf(
      await service.create(
        actor,
        draft({
          variants: [
            { label: "Used", price: "12500", available: true, swatch: "" },
            { label: "Unused", price: "15000", available: true, swatch: "" },
          ],
        }),
      ),
    );
    const [used, unused] = created.variants;
    if (!used || !unused) throw new Error("expected variants");
    repository.materials.set(created.id, {
      ...created,
      variants: [{ ...used, used: true }, unused],
    });

    const updated = valueOf(
      await service.update(
        other,
        created.id,
        draft({
          variants: [
            {
              id: unused.id,
              label: "Unused",
              price: "15000",
              available: true,
              swatch: "",
            },
          ],
        }),
      ),
    );

    expect(updated.variants).toEqual([
      expect.objectContaining({ id: unused.id, used: false, available: true }),
      expect.objectContaining({ id: used.id, used: true, available: false }),
    ]);
  });

  it("keeps an empty update as the minimum-one-variant validation failure", async () => {
    const { repository, service } = await setup();
    const created = valueOf(await service.create(actor, draft()));
    const [firstVariant] = created.variants;
    if (!firstVariant) throw new Error("expected created material variant");
    repository.materials.set(created.id, {
      ...created,
      variants: [{ ...firstVariant, used: true }],
    });

    expect(
      await service.update(actor, created.id, draft({ variants: [] })),
    ).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "variants", code: "required" }],
      },
    });
  });

  it("retains its archived supplier but refuses a changed archived supplier", async () => {
    const { suppliers, service } = await setup();
    const created = valueOf(await service.create(actor, draft()));
    await suppliers.update({ ...supplier, active: false });

    expect(await service.update(actor, created.id, draft())).toMatchObject({
      ok: true,
      value: { supplier: { id: supplier.id, active: false } },
    });

    const archivedOther = buildSupplier({
      id: "supplier-2",
      name: "Archived other",
      active: false,
    });
    await suppliers.insert(archivedOther);
    expect(
      await service.update(
        actor,
        created.id,
        draft({ supplierId: archivedOther.id }),
      ),
    ).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "supplierId", code: "not-selectable" }],
      },
    });
  });

  it("maps active-name prechecks and write races to a name duplicate issue", async () => {
    const { repository, service } = await setup();
    await service.create(actor, draft());
    expect(
      await service.create(actor, draft({ name: " BASTIDOR " })),
    ).toMatchObject({
      ok: false,
      error: { issues: [{ field: "name", code: "duplicate" }] },
    });

    repository.findActiveByName = () => Promise.resolve(null);
    repository.insert = () => Promise.reject(new MaterialNameConflictError());
    expect(await service.create(actor, draft({ name: "Other" }))).toMatchObject(
      {
        ok: false,
        error: { issues: [{ field: "name", code: "duplicate" }] },
      },
    );

    const variantRace = await setup();
    variantRace.repository.insert = () =>
      Promise.reject(new MaterialVariantLabelConflictError());
    expect(await variantRace.service.create(actor, draft())).toMatchObject({
      ok: false,
      error: { issues: [{ field: "variants", code: "duplicate" }] },
    });
  });

  it("deactivates idempotently and reactivation rechecks active-name uniqueness", async () => {
    const { clock, repository, service } = await setup();
    const first = valueOf(await service.create(actor, draft()));
    clock.advance(1);
    const inactive = valueOf(await service.deactivate(other, first.id));
    expect(inactive).toMatchObject({
      active: false,
      audit: { updatedBy: other.email, updatedAt: new Date(NOW.getTime() + 1) },
    });
    clock.advance(1);
    expect(await service.deactivate(actor, first.id)).toEqual({
      ok: true,
      value: inactive,
    });
    await repository.insert({
      ...first,
      id: "material-other",
      active: true,
      variants: first.variants.map((variant) => ({
        ...variant,
        id: "variant-other",
      })),
    });
    expect(await service.reactivate(actor, first.id)).toMatchObject({
      ok: false,
      error: { issues: [{ field: "name", code: "duplicate" }] },
    });
    expect(await service.deactivate(actor, "missing")).toEqual({
      ok: false,
      error: { kind: "not-found" },
    });
  });

  it("permanently deletes only a material the repository confirms is unused", async () => {
    const { repository, service } = await setup();
    const created = valueOf(await service.create(actor, draft()));
    const refused = vi
      .spyOn(repository, "deleteIfUnused")
      .mockResolvedValueOnce("in-use");
    expect(await service.deletePermanent(actor, created.id)).toEqual({
      ok: false,
      error: { kind: "in-use" },
    });
    expect(await repository.findById(created.id)).not.toBeNull();
    refused.mockRestore();
    expect(await service.deletePermanent(actor, created.id)).toEqual({
      ok: true,
      value: undefined,
    });
    expect(await repository.findById(created.id)).toBeNull();
    expect(await service.deletePermanent(actor, created.id)).toEqual({
      ok: false,
      error: { kind: "not-found" },
    });
  });

  it("filters lists, returns active+available selectable items, and suggests categories", async () => {
    const { service } = await setup();
    const alpha = valueOf(
      await service.create(
        actor,
        draft({ name: "Álvaro", category: " Hilos " }),
      ),
    );
    const unavailable = valueOf(
      await service.create(
        actor,
        draft({ name: "Beto", category: "hIlOs", available: false }),
      ),
    );
    const inactive = valueOf(
      await service.create(
        actor,
        draft({ name: "Ñandú", category: "Arcillas" }),
      ),
    );
    await service.deactivate(actor, inactive.id);

    expect(
      valueOf(
        await service.list(actor, { state: "active", category: "HILOS" }),
      ).map((item) => item.id),
    ).toEqual([alpha.id, unavailable.id]);
    expect(
      valueOf(await service.listSelectable(actor)).map((item) => item.id),
    ).toEqual([alpha.id]);
    expect(valueOf(await service.categorySuggestions(actor))).toEqual([
      "Arcillas",
      "Hilos",
    ]);
  });

  it("sets a photo on an existing material and lists only the photoless ones on request", async () => {
    const { service } = await setup();
    const plain = valueOf(
      await service.create(actor, draft({ name: "Plano" })),
    );
    const withPhoto = valueOf(
      await service.create(actor, draft({ name: "Con foto" })),
    );

    expect(
      valueOf(
        await service.setImage(actor, withPhoto.id, {
          assetId: asset.id,
          alt: "  Frasco  ",
        }),
      ).image,
    ).toMatchObject({ assetId: asset.id, alt: "Frasco" });
    expect(
      valueOf(await service.list(actor, { state: "all" })).map((item) => [
        item.name,
        item.hasImage,
      ]),
    ).toEqual([
      ["Con foto", true],
      ["Plano", false],
    ]);
    expect(
      valueOf(
        await service.list(actor, { state: "all", withoutImage: true }),
      ).map((item) => item.id),
    ).toEqual([plain.id]);
  });

  it("refuses a photo with blank alt text, an unknown asset or an unknown material", async () => {
    const { service } = await setup();
    const created = valueOf(await service.create(actor, draft()));
    expect(
      await service.setImage(actor, created.id, {
        assetId: asset.id,
        alt: " ",
      }),
    ).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "image", code: "required" }],
      },
    });
    expect(
      await service.setImage(actor, created.id, { assetId: "nope", alt: "x" }),
    ).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "image", code: "unknown-reference" }],
      },
    });
    expect(
      await service.setImage(actor, "missing", { assetId: asset.id, alt: "x" }),
    ).toEqual({ ok: false, error: { kind: "not-found" } });
  });

  it("hydrates a missing stored image as asset null and supports MaterialLookup", async () => {
    const { assets, media, repository, service } = await setup();
    const created = valueOf(
      await service.create(
        actor,
        draft({ image: { assetId: asset.id, alt: "Imagen" } }),
      ),
    );
    assets.clear();

    expect(await service.get(actor, created.id)).toMatchObject({
      ok: true,
      value: { image: { assetId: asset.id, alt: "Imagen", asset: null } },
    });
    const lookup = createMaterialLookup({ repository, media });
    expect(
      (await lookup.findByIds([created.id, "missing"])).get(created.id),
    ).toMatchObject({ image: { asset: null } });
  });
});

describe("material stock overview and creation with starting stock", () => {
  it("records each variant's initial units under its own id", async () => {
    const { service, stock } = await setup();
    const created = valueOf(
      await service.createWithStock(
        actor,
        draft({
          variants: [
            { label: "Rojo", price: "1000", available: true, swatch: "" },
            { label: "Azul", price: "1200", available: true, swatch: "" },
          ],
        }),
        ["2", "5"],
      ),
    );
    expect(created.onHand).toBe(7);
    expect(
      created.material.variants.map((variant) => stock.levels.get(variant.id)),
    ).toEqual([2, 5]);
  });

  it("rejects bad units on an added variant before creating the material", async () => {
    const { service, repository, stock } = await setup();
    const result = await service.createWithStock(
      actor,
      draft({
        variants: [
          { label: "Rojo", price: "1000", available: true, swatch: "" },
          { label: "Azul", price: "1200", available: true, swatch: "" },
        ],
      }),
      ["2", "x"],
    );
    expect(result).toMatchObject({
      ok: false,
      error: {
        issues: [{ field: "startingStockExtra:0", code: "invalid-format" }],
      },
    });
    expect(await repository.list({ state: "all" })).toEqual([]);
    expect(stock.adjustments).toEqual([]);
  });
  it("lists each material with its variants, price and units on hand, and the total", async () => {
    const { service, stock } = await setup();
    const paint = valueOf(
      await service.create(
        actor,
        draft({
          name: "Acrílico",
          variants: [
            { label: "Rojo", price: "1500", available: true, swatch: "" },
            { label: "Azul", price: "1800", available: true, swatch: "" },
          ],
        }),
      ),
    );
    const clay = valueOf(
      await service.create(actor, draft({ name: "Arcilla" })),
    );
    const [red] = paint.variants;
    if (!red) throw new Error("expected variant");
    stock.levels.set(red.id, 4);

    const rows = valueOf(await service.listWithStock(actor, { state: "all" }));

    expect(rows.map((row) => row.name)).toEqual(["Acrílico", "Arcilla"]);
    expect(rows[0]).toMatchObject({
      id: paint.id,
      supplierName: supplier.name,
      active: true,
      available: true,
      onHand: 4,
      variants: [
        { label: "Rojo", onHand: 4, price: 1500 },
        { label: "Azul", onHand: 0, price: 1800 },
      ],
    });
    expect(rows[1]).toMatchObject({ id: clay.id, onHand: 0 });
  });

  it("reads one stock query for every variant and honors the state filter", async () => {
    const { service, stock } = await setup();
    const kept = valueOf(await service.create(actor, draft({ name: "Hilo" })));
    const archived = valueOf(
      await service.create(actor, draft({ name: "Cinta" })),
    );
    await service.deactivate(actor, archived.id);
    const onHand = vi.spyOn(stock, "onHand");

    const active = valueOf(
      await service.listWithStock(actor, { state: "active" }),
    );
    expect(active.map((row) => row.id)).toEqual([kept.id]);
    expect(onHand).toHaveBeenCalledTimes(1);
    expect(
      valueOf(await service.listWithStock(actor, { state: "inactive" })).map(
        (row) => row.id,
      ),
    ).toEqual([archived.id]);
  });

  it("shows a price on request as no price", async () => {
    const { service } = await setup();
    valueOf(
      await service.create(
        actor,
        draft({
          variants: [
            {
              label: "Única",
              price: "",
              priceOnRequest: true,
              available: true,
              swatch: "",
            },
          ],
        }),
      ),
    );
    const [row] = valueOf(
      await service.listWithStock(actor, { state: "active" }),
    );
    expect(row?.variants[0]?.price).toBeNull();
  });

  it("creates the material and records its starting stock with an audited reason", async () => {
    const { service, stock } = await setup();
    const created = valueOf(await service.createWithStock(actor, draft(), "6"));

    const variant = created.material.variants[0];
    expect(created.onHand).toBe(6);
    expect(stock.levels.get(variant?.id ?? "")).toBe(6);
    expect(stock.adjustments).toMatchObject([
      {
        variantId: variant?.id,
        delta: 6,
        reason: "Stock inicial",
        by: actor.email,
      },
    ]);
  });

  it.each(["", "  ", "0"])(
    "creates the material without stock movement for %j",
    async (units) => {
      const { service, stock } = await setup();
      const created = valueOf(
        await service.createWithStock(actor, draft(), units),
      );
      expect(created.onHand).toBe(0);
      expect(stock.adjustments).toEqual([]);
    },
  );

  it.each([
    ["abc", "invalid-format"],
    ["-3", "invalid-format"],
    ["1.5", "invalid-format"],
    ["100001", "out-of-range"],
  ])("refuses starting stock %j and creates nothing", async (units, code) => {
    const { service, repository, stock } = await setup();
    const result = await service.createWithStock(actor, draft(), units);
    expect(result).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "startingStock", code }],
      },
    });
    expect(await repository.list({ state: "all" })).toEqual([]);
    expect(stock.adjustments).toEqual([]);
  });

  it("reports the material's own issues too and records no stock when the material is refused", async () => {
    const { service, repository, stock } = await setup();
    const result = await service.createWithStock(
      actor,
      draft({ name: "" }),
      "3",
    );
    expect(result).toMatchObject({
      ok: false,
      error: { kind: "invalid", issues: [{ field: "name", code: "required" }] },
    });
    const bad = await service.createWithStock(actor, draft({ name: "" }), "x");
    expect(bad).toMatchObject({
      ok: false,
      error: {
        issues: [
          { field: "name", code: "required" },
          { field: "startingStock", code: "invalid-format" },
        ],
      },
    });
    expect(await repository.list({ state: "all" })).toEqual([]);
    expect(stock.adjustments).toEqual([]);
  });

  it("keeps the same refusals as create for a duplicate name and an unknown supplier", async () => {
    const { service, stock } = await setup();
    valueOf(await service.create(actor, draft()));
    expect(await service.createWithStock(actor, draft(), "2")).toMatchObject({
      ok: false,
      error: { issues: [{ field: "name", code: "duplicate" }] },
    });
    expect(
      await service.createWithStock(
        actor,
        draft({ name: "Otro", supplierId: "nope" }),
        "2",
      ),
    ).toMatchObject({
      ok: false,
      error: { issues: [{ field: "supplierId", code: "unknown-reference" }] },
    });
    expect(stock.adjustments).toEqual([]);
  });

  it("denies a missing actor on both new methods", async () => {
    const { service } = await setup();
    expect(await service.listWithStock(null, { state: "all" })).toEqual({
      ok: false,
      error: { kind: "denied" },
    });
    expect(await service.createWithStock(undefined, draft(), "2")).toEqual({
      ok: false,
      error: { kind: "denied" },
    });
  });

  it("keeps create as it was for a caller that gives no quantity", async () => {
    const { service, stock } = await setup();
    valueOf(await service.create(actor, draft()));
    expect(stock.adjustments).toEqual([]);
  });
});

describe("materials kept in the studio", () => {
  it("creates a material not kept unless the draft says it is", async () => {
    const { service } = await setup();
    const plain = valueOf(await service.create(actor, draft({ name: "Hilo" })));
    const kept = valueOf(
      await service.create(
        actor,
        draft({ name: "Arcilla", keptInStudio: true }),
      ),
    );
    expect(plain.keptInStudio).toBe(false);
    expect(kept.keptInStudio).toBe(true);
  });

  it("saves the flag on update, and leaves it as it was when the draft says nothing", async () => {
    const { service, repository } = await setup();
    const created = valueOf(
      await service.create(actor, draft({ keptInStudio: true })),
    );

    valueOf(await service.update(actor, created.id, draft()));
    expect((await repository.findById(created.id))?.keptInStudio).toBe(true);

    valueOf(
      await service.update(actor, created.id, draft({ keptInStudio: false })),
    );
    expect((await repository.findById(created.id))?.keptInStudio).toBe(false);
  });

  it("marks and unmarks one material alone, keeping everything else", async () => {
    const { service, repository } = await setup();
    const created = valueOf(await service.create(actor, draft()));

    const marked = valueOf(
      await service.setKeptInStudio(other, created.id, true),
    );
    expect(marked.keptInStudio).toBe(true);
    expect(marked.audit.updatedBy).toBe(other.email);
    const stored = await repository.findById(created.id);
    expect(stored).toMatchObject({
      keptInStudio: true,
      name: created.name,
      active: true,
    });
    expect(stored?.variants).toHaveLength(1);

    valueOf(await service.setKeptInStudio(actor, created.id, false));
    expect((await repository.findById(created.id))?.keptInStudio).toBe(false);
  });

  it("preserves an availability edit interleaved at audit stamping", async () => {
    const { service, repository, clock } = await setup();
    const created = valueOf(await service.create(actor, draft()));
    let intervened: Promise<boolean> | undefined;
    clock.now = () => {
      intervened = repository.update({ ...created, available: false });
      return new Date(NOW);
    };
    valueOf(await service.setKeptInStudio(actor, created.id, true));
    expect(await intervened).toBe(true);
    expect(await repository.findById(created.id)).toMatchObject({
      available: false,
      keptInStudio: true,
    });
  });

  it("preserves a studio flag toggle when an edit omits that flag", async () => {
    const { service, repository, clock } = await setup();
    const created = valueOf(await service.create(actor, draft()));
    let intervened: Promise<unknown> | undefined;
    clock.now = () => {
      intervened = repository.setKeptInStudio(created.id, true, {
        updatedBy: other.email,
        updatedAt: new Date(NOW),
      });
      return new Date(NOW);
    };

    const updated = valueOf(
      await service.update(actor, created.id, draft({ name: "Arcilla" })),
    );
    await intervened;
    expect(updated.keptInStudio).toBe(true);
    expect(await repository.findById(created.id)).toMatchObject({
      name: "Arcilla",
      keptInStudio: true,
    });
  });

  it("does not report failure after saving an edit when another read fails", async () => {
    const { service, repository } = await setup();
    const created = valueOf(await service.create(actor, draft()));
    const findById = repository.findById.bind(repository);
    let reads = 0;
    repository.findById = (id) => {
      reads += 1;
      if (reads > 1) throw new Error("read unavailable");
      return findById(id);
    };

    expect(
      valueOf(
        await service.update(actor, created.id, draft({ name: "Arcilla" })),
      ).name,
    ).toBe("Arcilla");
    expect(repository.materials.get(created.id)?.name).toBe("Arcilla");
  });

  it("refuses to mark without an actor or for an unknown material", async () => {
    const { service } = await setup();
    expect(await service.setKeptInStudio(null, "id", true)).toEqual({
      ok: false,
      error: { kind: "denied" },
    });
    expect(await service.setKeptInStudio(actor, "nope", true)).toEqual({
      ok: false,
      error: { kind: "not-found" },
    });
  });

  it("carries the flag on the stock overview rows", async () => {
    const { service } = await setup();
    const kept = valueOf(
      await service.create(
        actor,
        draft({ name: "Arcilla", keptInStudio: true }),
      ),
    );
    const plain = valueOf(await service.create(actor, draft({ name: "Hilo" })));
    const rows = valueOf(await service.listWithStock(actor, { state: "all" }));
    expect(rows.map((row) => [row.id, row.keptInStudio])).toEqual([
      [kept.id, true],
      [plain.id, false],
    ]);
  });
});
