import { err, ok, Money, type Result } from "~/modules/_shared";
import { requireAdminActor, type AdminActor } from "~/modules/admin-access";
import { monthLabel } from "../domain/whatsapp-message";
import type {
  AdminEnrollmentStore,
  ConsolidationLine,
} from "./admin-enrollment-store";

type Actor = AdminActor | Record<string, unknown> | null | undefined;

export interface ConsolidatedMaterial {
  readonly materialName: string;
  readonly variantLabel: string;
  readonly quantity: number;
  readonly total: Money;
}

export interface SupplierSection {
  readonly supplierId: string;
  /** The name snapshotted on the order lines, not the current supplier name. */
  readonly supplierName: string;
  readonly materials: readonly ConsolidatedMaterial[];
  readonly total: Money;
  /** Plain text for the supplier: no student data and no fee prices. */
  readonly summary: string;
  /** Paid orders of this supplier that can still be marked as requested. */
  readonly pendingRequestOrderIds: readonly string[];
}

export interface SupplierConsolidation {
  readonly period: string;
  readonly suppliers: readonly SupplierSection[];
  readonly grandTotal: Money;
  /** Orders awaiting confirmation: shown apart, never part of the totals. */
  readonly pendingOrders: number;
}

export type ConsolidationError =
  | { readonly kind: "denied" }
  | { readonly kind: "invalid" }
  | { readonly kind: "unavailable" };

export interface SupplierConsolidationUseCases {
  consolidate(
    actor: Actor,
    period: string,
  ): Promise<Result<SupplierConsolidation, ConsolidationError>>;
}

const PERIOD_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Code-point order, so the text never depends on the runtime's locale data. */
const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function sumOf(amounts: readonly Money[]): Money {
  return amounts.reduce((total, amount) => total.add(amount), Money.zero());
}

function sectionOf(
  period: string,
  lines: readonly ConsolidationLine[],
): SupplierSection {
  const first = lines[0];
  if (first === undefined) throw new Error("a supplier section has lines");
  const byMaterial = new Map<string, ConsolidationLine[]>();
  for (const item of lines) {
    const key = `${item.materialName}\u0000${item.variantLabel}`;
    byMaterial.set(key, [...(byMaterial.get(key) ?? []), item]);
  }
  const materials = [...byMaterial.values()]
    .map((group): ConsolidatedMaterial => {
      const head = group[0];
      if (head === undefined) throw new Error("a material group has lines");
      return {
        materialName: head.materialName,
        variantLabel: head.variantLabel,
        quantity: group.reduce((sum, item) => sum + item.quantity, 0),
        total: sumOf(
          group.map((item) => item.unitPrice.multiply(item.quantity)),
        ),
      };
    })
    .sort(
      (a, b) =>
        byText(a.materialName, b.materialName) ||
        byText(a.variantLabel, b.variantLabel),
    );
  const summary = [
    `Pedido a ${first.supplierName}`,
    `Mes: ${monthLabel(period)}`,
    ...materials.map(
      (item) =>
        `- ${item.materialName} ${item.variantLabel} x${String(item.quantity)}`,
    ),
  ].join("\n");
  return {
    supplierId: first.supplierId,
    supplierName: first.supplierName,
    materials,
    total: sumOf(materials.map((item) => item.total)),
    summary,
    pendingRequestOrderIds: [
      ...new Set(
        lines.filter((item) => item.status === "paid").map((i) => i.orderId),
      ),
    ].sort(byText),
  };
}

export function createSupplierConsolidationService(deps: {
  readonly store: Pick<AdminEnrollmentStore, "consolidationLines">;
}): SupplierConsolidationUseCases {
  return {
    async consolidate(actor, period) {
      const admin = requireAdminActor(actor);
      if (!admin.ok) return admin;
      if (!PERIOD_KEY.test(period)) return err({ kind: "invalid" });
      let read;
      try {
        read = await deps.store.consolidationLines(period);
      } catch {
        return err({ kind: "unavailable" });
      }
      const bySupplier = new Map<string, ConsolidationLine[]>();
      for (const item of read.lines) {
        const key = `${item.supplierId}\u0000${item.supplierName}`;
        bySupplier.set(key, [...(bySupplier.get(key) ?? []), item]);
      }
      const suppliers = [...bySupplier.values()]
        .map((group) => sectionOf(period, group))
        .sort(
          (a, b) =>
            byText(a.supplierName, b.supplierName) ||
            byText(a.supplierId, b.supplierId),
        );
      return ok({
        period,
        suppliers,
        grandTotal: sumOf(suppliers.map((supplier) => supplier.total)),
        pendingOrders: read.pendingOrders,
      });
    },
  };
}
