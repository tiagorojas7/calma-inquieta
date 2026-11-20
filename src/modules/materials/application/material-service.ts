import {
  err,
  ok,
  type AdminFailure,
  type Clock,
  type FieldIssue,
  type NotFound,
  type Result,
} from "~/modules/_shared";
import { requireAdminActor, type AdminActor } from "~/modules/admin-access";
import type { MediaAsset, MediaLookup } from "~/modules/media";
import {
  materialNameKey,
  validateMaterialDraft,
  type ValidMaterialDraft,
} from "../domain/material-core";
import { STOCK_DELTA_MAX, validateStockAdjustment } from "../domain/stock-core";
import type { StockStore } from "./stock-store";
import type {
  Material,
  MaterialError,
  MaterialField,
  MaterialLookup,
  MaterialStockRow,
  MaterialSummary,
  MaterialsService,
  MaterialVariant,
} from "./contracts";
import {
  MaterialNameConflictError,
  MaterialVariantLabelConflictError,
  type MaterialRepository,
} from "./material-repository";
import { createCatalogTools } from "./catalog-tools";
import { saleVariantsOf } from "./sale-catalog";
import type { SupplierRepository } from "./supplier-repository";

type MaybeActor = AdminActor | null | undefined;

export type MaterialUseCases = {
  [K in keyof MaterialsService]: MaterialsService[K] extends (
    actor: AdminActor,
    ...rest: infer Rest
  ) => infer Return
    ? (actor: MaybeActor, ...rest: Rest) => Return
    : never;
};

export interface MaterialServiceDeps {
  readonly repository: MaterialRepository;
  readonly suppliers: SupplierRepository;
  readonly media: MediaLookup;
  readonly clock: Clock;
  readonly stock: StockStore;
  readonly newId?: () => string;
  readonly newVariantId?: () => string;
}

export interface MaterialLookupDeps {
  readonly repository: MaterialRepository;
  readonly media: MediaLookup;
}

/** Blank is fine (no units); otherwise whole units up to one adjustment's limit. */
function startingStockIssue(text: string): FieldIssue<"startingStock"> | null {
  if (text === "") return null;
  if (!/^[0-9]+$/.test(text))
    return { field: "startingStock", code: "invalid-format" };
  return Number(text) > STOCK_DELTA_MAX
    ? { field: "startingStock", code: "out-of-range" }
    : null;
}

const notFound: NotFound = { kind: "not-found" };
const issue = (
  field: MaterialField,
  code: FieldIssue<MaterialField>["code"],
): FieldIssue<MaterialField> => ({ field, code });
const duplicateName: FieldIssue<"name"> = {
  field: "name",
  code: "duplicate",
};
const duplicateVariant = issue("variants", "duplicate");

async function hydrateMaterial(
  material: Material,
  media: MediaLookup,
): Promise<Material> {
  if (!material.image) return material;
  const asset = (await media.findAssets([material.image.assetId])).get(
    material.image.assetId,
  );
  return {
    ...material,
    image: { ...material.image, asset: asset ?? null },
  };
}

export function createMaterialLookup({
  repository,
  media,
}: MaterialLookupDeps): MaterialLookup {
  return {
    async findByIds(ids) {
      const stored = await repository.findByIds(ids);
      const result = new Map<string, Material>();
      for (const id of ids) {
        const material = stored.get(id);
        if (material) result.set(id, await hydrateMaterial(material, media));
      }
      return result;
    },
  };
}

export function createMaterialsService(
  deps: MaterialServiceDeps,
): MaterialUseCases {
  const { repository, suppliers, media, clock } = deps;
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const newVariantId = deps.newVariantId ?? (() => crypto.randomUUID());

  const tools = createCatalogTools({
    repository,
    suppliers,
    clock,
    newId,
    newVariantId,
  });

  const stamp = (actor: AdminActor) => ({
    updatedBy: actor.email,
    updatedAt: clock.now(),
  });

  const summary = (material: Material): MaterialSummary => ({
    id: material.id,
    name: material.name,
    hasImage: material.image !== null,
    category: material.category,
    supplierName: material.supplier.name,
    variantCount: material.variants.length,
    active: material.active,
    available: material.available,
  });

  const stockRow = (
    material: Material,
    onHand: ReadonlyMap<string, number>,
  ): MaterialStockRow => {
    const variants = material.variants.map((variant) => ({
      id: variant.id,
      label: variant.label,
      price: variant.price ? variant.price.toCentavos() / 100 : null,
      available: variant.available,
      onHand: onHand.get(variant.id) ?? 0,
    }));
    return {
      id: material.id,
      name: material.name,
      category: material.category,
      supplierName: material.supplier.name,
      active: material.active,
      available: material.available,
      keptInStudio: material.keptInStudio === true,
      variants,
      onHand: variants.reduce((sum, variant) => sum + variant.onHand, 0),
    };
  };

  async function isNameTaken(name: string, selfId: string): Promise<boolean> {
    const holder = await repository.findActiveByName(name);
    return holder !== null && holder.id !== selfId;
  }

  async function validateReferences(
    valid: ValidMaterialDraft,
    current: Material | null,
  ): Promise<{
    readonly supplier: Material["supplier"] | null;
    readonly imageAsset: MediaAsset | null;
    readonly issues: readonly FieldIssue<MaterialField>[];
  }> {
    const issues: FieldIssue<MaterialField>[] = [];
    const supplier = await suppliers.findById(valid.supplierId);
    if (!supplier) issues.push(issue("supplierId", "unknown-reference"));
    else if (!supplier.active && supplier.id !== current?.supplier.id)
      issues.push(issue("supplierId", "not-selectable"));

    let imageAsset: MediaAsset | null = null;
    if (valid.image) {
      imageAsset =
        (await media.findAssets([valid.image.assetId])).get(
          valid.image.assetId,
        ) ?? null;
      if (!imageAsset) issues.push(issue("image", "unknown-reference"));
    }
    return { supplier, imageAsset, issues };
  }

  function variantsFor(
    valid: ValidMaterialDraft,
    current: Material | null,
  ): readonly MaterialVariant[] {
    const currentById = new Map(
      current?.variants.map((variant) => [variant.id, variant]),
    );
    const submittedIds = new Set(
      valid.variants.flatMap((variant) => (variant.id ? [variant.id] : [])),
    );
    const submitted = valid.variants.map((variant) => {
      const existing = variant.id ? currentById.get(variant.id) : undefined;
      return {
        id: existing ? existing.id : newVariantId(),
        label: variant.label,
        price: variant.price,
        cost: variant.cost,
        available: variant.available,
        used: existing?.used ?? false,
        position: variant.position,
        swatch: variant.swatch,
      };
    });
    const retained = (current?.variants ?? []).filter(
      (variant) => variant.used && !submittedIds.has(variant.id),
    );
    return [
      ...submitted,
      ...retained.map((variant) => ({ ...variant, available: false })),
    ];
  }

  async function buildMaterial(
    actor: AdminActor,
    valid: ValidMaterialDraft,
    current: Material | null,
  ): Promise<Result<Material, MaterialError>> {
    const references = await validateReferences(valid, current);
    if (references.issues.length > 0)
      return err({ kind: "invalid", issues: references.issues });
    if (!references.supplier)
      return err({
        kind: "invalid",
        issues: [issue("supplierId", "unknown-reference")],
      });
    if (await isNameTaken(valid.name, current?.id ?? ""))
      return err({ kind: "invalid", issues: [duplicateName] });

    return ok({
      id: current?.id ?? newId(),
      name: valid.name,
      description: valid.description,
      category: valid.category,
      supplier: references.supplier,
      available: valid.available,
      keptInStudio: valid.keptInStudio ?? current?.keptInStudio ?? false,
      active: current?.active ?? true,
      image: valid.image
        ? {
            assetId: valid.image.assetId,
            alt: valid.image.alt,
            asset: references.imageAsset,
          }
        : null,
      variants: variantsFor(valid, current),
      audit: stamp(actor),
    });
  }

  async function save(
    mode: "insert" | "update",
    material: Material,
  ): Promise<Result<Material, MaterialError>> {
    try {
      if (mode === "insert") await repository.insert(material);
      else await repository.update(material);
      return ok(material);
    } catch (error) {
      if (error instanceof MaterialNameConflictError)
        return err({ kind: "invalid", issues: [duplicateName] });
      if (error instanceof MaterialVariantLabelConflictError)
        return err({ kind: "invalid", issues: [duplicateVariant] });
      throw error;
    }
  }

  async function loadForToggle(
    actor: MaybeActor,
    id: string,
  ): Promise<
    Result<
      { readonly actor: AdminActor; readonly material: Material },
      AdminFailure | NotFound
    >
  > {
    const authorized = requireAdminActor(actor);
    if (!authorized.ok) return authorized;
    const material = await repository.findById(id);
    return material ? ok({ actor: authorized.value, material }) : err(notFound);
  }

  return {
    async list(actor, filter) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const { withoutImage, ...stored } = filter;
      const listed = await repository.list(stored);
      return ok(
        listed
          .filter((material) => !withoutImage || material.image === null)
          .map(summary),
      );
    },

    async listWithStock(actor, filter) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const listed = await repository.list(filter);
      const onHand = await deps.stock.onHand(
        listed.flatMap((material) =>
          material.variants.map((variant) => variant.id),
        ),
      );
      return ok(listed.map((material) => stockRow(material, onHand)));
    },

    async listSelectable(actor) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const active = await repository.list({ state: "active" });
      return ok(active.filter((material) => material.available).map(summary));
    },

    async listSaleVariants(actor) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      return ok(saleVariantsOf(await repository.list({ state: "active" })));
    },

    async get(actor, id) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const material = await repository.findById(id);
      return material
        ? ok(await hydrateMaterial(material, media))
        : err(notFound);
    },

    async create(actor, draft) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const valid = validateMaterialDraft(draft);
      if (!valid.ok) return err({ kind: "invalid", issues: valid.error });
      const material = await buildMaterial(authorized.value, valid.value, null);
      if (!material.ok) return material;
      return save("insert", material.value);
    },

    async createWithStock(actor, draft, startingStock) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const text = startingStock.trim();
      const stockIssue = startingStockIssue(text);
      if (stockIssue) {
        const valid = validateMaterialDraft(draft);
        return err({
          kind: "invalid",
          issues: [...(valid.ok ? [] : valid.error), stockIssue],
        });
      }
      const valid = validateMaterialDraft(draft);
      if (!valid.ok) return err({ kind: "invalid", issues: valid.error });
      const material = await buildMaterial(authorized.value, valid.value, null);
      if (!material.ok) return material;
      const saved = await save("insert", material.value);
      if (!saved.ok) return saved;
      const units = Number(text === "" ? "0" : text);
      const first = saved.value.variants[0];
      if (units === 0 || !first)
        return ok({ material: saved.value, onHand: 0 });
      const outcome = await deps.stock.adjust({
        variantId: first.id,
        delta: units,
        reason: "Stock inicial",
        by: authorized.value.email,
        at: clock.now(),
      });
      // Adding units cannot go below zero: only a store failure lands here.
      if (outcome.kind !== "adjusted")
        throw new Error("starting stock was refused for a new variant");
      return ok({ material: saved.value, onHand: outcome.onHand });
    },

    async update(actor, id, draft) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const current = await repository.findById(id);
      if (!current) return err(notFound);
      const valid = validateMaterialDraft(draft);
      if (!valid.ok) return err({ kind: "invalid", issues: valid.error });
      const material = await buildMaterial(
        authorized.value,
        valid.value,
        current,
      );
      if (!material.ok) return material;
      return save("update", material.value);
    },

    async deactivate(actor, id) {
      const loaded = await loadForToggle(actor, id);
      if (!loaded.ok) return err(loaded.error);
      if (!loaded.value.material.active) return ok(loaded.value.material);
      const next = {
        ...loaded.value.material,
        active: false,
        audit: stamp(loaded.value.actor),
      };
      await repository.update(next);
      return ok(next);
    },

    async reactivate(actor, id) {
      const loaded = await loadForToggle(actor, id);
      if (!loaded.ok) return err(loaded.error);
      if (loaded.value.material.active) return ok(loaded.value.material);
      if (await isNameTaken(loaded.value.material.name, id))
        return err({ kind: "invalid", issues: [duplicateName] });
      const next = {
        ...loaded.value.material,
        active: true,
        audit: stamp(loaded.value.actor),
      };
      try {
        await repository.update(next);
      } catch (error) {
        if (error instanceof MaterialNameConflictError)
          return err({ kind: "invalid", issues: [duplicateName] });
        throw error;
      }
      return ok(next);
    },

    async setKeptInStudio(actor, id, kept) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const changed = await repository.setKeptInStudio(
        id,
        kept,
        stamp(authorized.value),
      );
      return changed ? ok(changed) : err(notFound);
    },

    async setImage(actor, id, image) {
      const loaded = await loadForToggle(actor, id);
      if (!loaded.ok) return err(loaded.error);
      const alt = image.alt.trim().normalize("NFC");
      if (!alt)
        return err({
          kind: "invalid",
          issues: [{ field: "image", code: "required" }],
        });
      const asset = (await media.findAssets([image.assetId])).get(
        image.assetId,
      );
      if (!asset)
        return err({
          kind: "invalid",
          issues: [{ field: "image", code: "unknown-reference" }],
        });
      const next = {
        ...loaded.value.material,
        image: { assetId: asset.id, alt, asset },
        audit: stamp(loaded.value.actor),
      };
      await repository.update(next);
      return ok(next);
    },

    async previewCatalogImport(actor, supplierId, csv) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      return tools.previewCatalogImport(authorized.value, supplierId, csv);
    },

    async importCatalog(actor, supplierId, csv) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      return tools.importCatalog(authorized.value, supplierId, csv);
    },

    async previewPriceRaise(actor, scope, percent) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      return tools.previewPriceRaise(authorized.value, scope, percent);
    },

    async raisePrices(actor, scope, percent) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      return tools.raisePrices(authorized.value, scope, percent);
    },

    async stockOf(actor, materialId) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const material = await repository.findById(materialId);
      if (!material) return err(notFound);
      return ok(await deps.stock.onHand(material.variants.map((v) => v.id)));
    },

    async adjustStock(actor, materialId, variantId, draft) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const material = await repository.findById(materialId);
      if (!material?.variants.some((variant) => variant.id === variantId))
        return err(notFound);
      const valid = validateStockAdjustment(draft);
      if (!valid.ok) return err({ kind: "invalid", issues: valid.error });
      const outcome = await deps.stock.adjust({
        variantId,
        delta: valid.value.delta,
        reason: valid.value.reason,
        by: authorized.value.email,
        at: clock.now(),
      });
      return outcome.kind === "adjusted"
        ? ok({ onHand: outcome.onHand })
        : err({ kind: "insufficient-stock", onHand: outcome.onHand });
    },

    async categorySuggestions(actor) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const categories = new Map<string, string>();
      for (const material of await repository.list({ state: "all" })) {
        const key = materialNameKey(material.category);
        if (!categories.has(key)) categories.set(key, material.category);
      }
      return ok(
        [...categories.entries()]
          .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
          .map(([, category]) => category),
      );
    },
  };
}
