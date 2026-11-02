import { describe, expect, it, vi } from "vitest";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { buildMediaAsset, buildSupplier } from "~/testing/fakes/admin-builders";
import { advancingClock } from "~/testing/fakes/fixed-clock";
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
  let materialId = 0;
  let variantId = 0;
  const service = createMaterialsService({
    repository,
    suppliers,
    media,
    clock,
    newId: () => `material-${String(++materialId)}`,
    newVariantId: () => `variant-${String(++variantId)}`,
  });
  return { repository, suppliers, assets, media, clock, service };
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
      expect(await service.reactivate(missingActor, "id")).toEqual(denied);
      expect(await service.categorySuggestions(missingActor)).toEqual(denied);
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
