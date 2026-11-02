import { err, Money, ok, type Clock, type Result } from "~/modules/_shared";
import type { AdminActor } from "~/modules/admin-access";
import { parseCatalogCsv, type CatalogRow } from "../domain/catalog-csv";
import { materialNameKey, variantLabelKey } from "../domain/material-core";
import type {
  CatalogImportError,
  CatalogImportIssue,
  CatalogImportItem,
  CatalogImportPlan,
  Material,
  MaterialVariant,
  PriceRaiseError,
  PriceRaisePlan,
  PriceRaiseScope,
} from "./contracts";
import type { MaterialRepository } from "./material-repository";
import type { SupplierRepository } from "./supplier-repository";

export const MAX_RAISE_PERCENT = 200;
const PREVIEW_ITEM_LIMIT = 400;

export interface CatalogToolsDeps {
  readonly repository: MaterialRepository;
  readonly suppliers: SupplierRepository;
  readonly clock: Clock;
  readonly newId: () => string;
  readonly newVariantId: () => string;
}

const toMoney = (pesos: number): Money => {
  const money = Money.fromCentavos(pesos * 100);
  if (!money.ok) throw new RangeError("catalog price out of range");
  return money.value;
};
const pesosOf = (money: Money | null): number | null =>
  money === null ? null : money.toCentavos() / 100;

interface Write {
  readonly mode: "insert" | "update";
  readonly material: Material;
}

interface ImportPlanned {
  readonly plan: CatalogImportPlan;
  readonly writes: readonly Write[];
}

interface RaisePlanned {
  readonly plan: PriceRaisePlan;
  readonly updates: readonly Material[];
}

/**
 * Bulk catalog operations: the supplier CSV import and the percentage price
 * raise. Both compute a plan first; applying writes exactly that plan, so the
 * preview and the result cannot disagree.
 */
export function createCatalogTools(deps: CatalogToolsDeps) {
  const { repository, suppliers, clock } = deps;

  const stamp = (actor: AdminActor) => ({
    updatedBy: actor.email,
    updatedAt: clock.now(),
  });

  async function planImport(
    actor: AdminActor,
    supplierId: string,
    csv: string,
  ): Promise<Result<ImportPlanned, CatalogImportError>> {
    const supplier = await suppliers.findById(supplierId);
    if (!supplier) return err({ kind: "not-found" });
    if (!supplier.active)
      return err({
        kind: "invalid",
        issues: [{ field: "supplierId", code: "not-selectable" }],
      });
    const parsed = parseCatalogCsv(csv);
    if (!parsed.ok) return err({ kind: "file", reason: parsed.error });

    const groups = new Map<string, CatalogRow[]>();
    for (const row of parsed.rows) {
      const key = materialNameKey(row.product);
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }

    const errors: CatalogImportIssue[] = [...parsed.errors];
    const items: CatalogImportItem[] = [];
    const writes: Write[] = [];
    let newMaterials = 0;
    let newVariants = 0;
    let priceChanges = 0;
    let unchanged = 0;

    for (const rows of groups.values()) {
      const first = rows[0];
      if (!first) continue;
      const existing = await repository.findActiveByName(first.product);
      if (existing && existing.supplier.id !== supplier.id) {
        for (const row of rows)
          errors.push({ line: row.line, code: "other-supplier" });
        continue;
      }

      const byLabel = new Map(
        (existing?.variants ?? []).map((variant) => [
          variantLabelKey(variant.label),
          variant,
        ]),
      );
      const edited = new Map<string, MaterialVariant>();
      const added: MaterialVariant[] = [];
      let position = Math.max(
        -1,
        ...(existing?.variants ?? []).map((variant) => variant.position),
      );

      for (const row of rows) {
        const current = byLabel.get(variantLabelKey(row.measure));
        const item = {
          line: row.line,
          product: row.product,
          measure: row.measure,
        };
        if (current) {
          const from = pesosOf(current.price);
          if (from === row.price) {
            unchanged += 1;
            items.push({ ...item, kind: "unchanged", from, to: row.price });
          } else {
            priceChanges += 1;
            edited.set(current.id, {
              ...current,
              price: row.price === null ? null : toMoney(row.price),
            });
            items.push({ ...item, kind: "price-change", from, to: row.price });
          }
          continue;
        }
        newVariants += 1;
        position += 1;
        added.push({
          id: deps.newVariantId(),
          label: row.measure,
          price: row.price === null ? null : toMoney(row.price),
          available: true,
          used: false,
          position,
          swatch: null,
        });
        items.push({
          ...item,
          kind: existing ? "new-variant" : "new-material",
          from: null,
          to: row.price,
        });
      }

      if (!existing) {
        newMaterials += 1;
        writes.push({
          mode: "insert",
          material: {
            id: deps.newId(),
            name: first.product,
            description: `${first.product} (${first.category})`,
            category: first.category,
            supplier,
            available: true,
            active: true,
            image: null,
            variants: added,
            audit: stamp(actor),
          },
        });
      } else if (edited.size > 0 || added.length > 0) {
        writes.push({
          mode: "update",
          material: {
            ...existing,
            variants: [
              ...existing.variants.map(
                (variant) => edited.get(variant.id) ?? variant,
              ),
              ...added,
            ],
            audit: stamp(actor),
          },
        });
      }
    }

    errors.sort((left, right) => left.line - right.line);
    return ok({
      plan: {
        supplierName: supplier.name,
        rowCount: parsed.rows.length,
        newMaterials,
        newVariants,
        priceChanges,
        unchanged,
        errors,
        items: items
          .filter((item) => item.kind !== "unchanged")
          .sort((left, right) => left.line - right.line)
          .slice(0, PREVIEW_ITEM_LIMIT),
      },
      writes,
    });
  }

  async function planRaise(
    actor: AdminActor,
    scope: PriceRaiseScope,
    percent: number,
  ): Promise<Result<RaisePlanned, PriceRaiseError>> {
    if (
      !Number.isFinite(percent) ||
      percent <= 0 ||
      percent > MAX_RAISE_PERCENT
    )
      return err({ kind: "invalid-percent" });
    if (!scope.supplierId && !scope.category) return err({ kind: "no-scope" });

    const materials = await repository.list({
      state: "active",
      ...(scope.supplierId ? { supplierId: scope.supplierId } : {}),
      ...(scope.category ? { category: scope.category } : {}),
    });
    const updates: Material[] = [];
    const changes: PriceRaisePlan["changes"][number][] = [];
    let variantCount = 0;
    let skipped = 0;
    let beforeTotal = 0;
    let afterTotal = 0;

    for (const material of materials) {
      const changed: PriceRaisePlan["changes"][number]["variants"][number][] =
        [];
      const variants = material.variants.map((variant) => {
        if (variant.price === null) {
          skipped += 1;
          return variant;
        }
        const from = variant.price.toCentavos() / 100;
        const to = Math.round((from * (100 + percent)) / 100);
        beforeTotal += from;
        afterTotal += to;
        if (to === from) return variant;
        variantCount += 1;
        changed.push({ label: variant.label, from, to });
        return { ...variant, price: toMoney(to) };
      });
      if (changed.length === 0) continue;
      changes.push({
        materialId: material.id,
        name: material.name,
        variants: changed,
      });
      updates.push({ ...material, variants, audit: stamp(actor) });
    }

    return ok({
      plan: {
        percent,
        materialCount: updates.length,
        variantCount,
        skippedWithoutPrice: skipped,
        beforeTotal,
        afterTotal,
        changes,
      },
      updates,
    });
  }

  return {
    async previewCatalogImport(
      actor: AdminActor,
      supplierId: string,
      csv: string,
    ): Promise<Result<CatalogImportPlan, CatalogImportError>> {
      const planned = await planImport(actor, supplierId, csv);
      return planned.ok ? ok(planned.value.plan) : planned;
    },

    async importCatalog(
      actor: AdminActor,
      supplierId: string,
      csv: string,
    ): Promise<Result<CatalogImportPlan, CatalogImportError>> {
      const planned = await planImport(actor, supplierId, csv);
      if (!planned.ok) return planned;
      if (planned.value.plan.errors.length > 0)
        return err({ kind: "has-errors" });
      for (const write of planned.value.writes) {
        if (write.mode === "insert") await repository.insert(write.material);
        else await repository.update(write.material);
      }
      return ok(planned.value.plan);
    },

    async previewPriceRaise(
      actor: AdminActor,
      scope: PriceRaiseScope,
      percent: number,
    ): Promise<Result<PriceRaisePlan, PriceRaiseError>> {
      const raised = await planRaise(actor, scope, percent);
      return raised.ok ? ok(raised.value.plan) : raised;
    },

    async raisePrices(
      actor: AdminActor,
      scope: PriceRaiseScope,
      percent: number,
    ): Promise<Result<PriceRaisePlan, PriceRaiseError>> {
      const raised = await planRaise(actor, scope, percent);
      if (!raised.ok) return raised;
      for (const material of raised.value.updates)
        await repository.update(material);
      return ok(raised.value.plan);
    },
  };
}
