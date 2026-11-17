import { err, ok, Money, type Result } from "~/modules/_shared";
import { requireAdminActor, type AdminActor } from "~/modules/admin-access";
import { monthLabel } from "../domain/whatsapp-message";
import type {
  AdminEnrollmentStore,
  ConsolidationLine,
  DeliveryOrder,
} from "./admin-enrollment-store";

type Actor = AdminActor | Record<string, unknown> | null | undefined;

export interface ConsolidatedMaterial {
  readonly materialName: string;
  readonly variantLabel: string;
  readonly quantity: number;
  readonly total: Money;
  /** The workshop (intensivo) the units are for; absent on monthly lines. */
  readonly origin?: string;
  /** The id of that workshop, present with `origin`. */
  readonly originId?: string;
}

/**
 * A `supplier` line of a confirmed workshop request: units the studio's stock
 * could not cover. Another module owns them; composition wires the reader.
 */
export interface WorkshopSupplierLine {
  readonly workshopId: string;
  readonly workshopName: string;
  readonly supplierId: string;
  /** The name frozen on the request line, like the monthly lines. */
  readonly supplierName: string;
  readonly materialName: string;
  readonly variantLabel: string;
  readonly quantity: number;
  /** The supplier cost frozen when the seat was confirmed; null when unknown. */
  readonly unitCostCentavos: number | null;
}

/** The workshop lines of the workshops held in a month (`YYYY-MM`). */
export interface WorkshopSupplierLines {
  /** Only the lines not marked as ordered yet. */
  lines(period: string): Promise<readonly WorkshopSupplierLine[]>;
  /**
   * Marks the not-yet-ordered lines one supplier owes a workshop as ordered
   * and returns how many moved; 0 when there was nothing left to mark.
   */
  markOrdered(workshopId: string, supplierId: string): Promise<number>;
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
  /** Paid orders of the month with materials, from still to request to already handed, one per order. */
  deliveries(
    actor: Actor,
    period: string,
  ): Promise<Result<readonly DeliveryOrder[], ConsolidationError>>;
  /**
   * The owner ordered a workshop's materials from one supplier: those lines
   * leave the purchase list. Repeating it changes nothing (count 0).
   */
  markWorkshopOrdered(
    actor: Actor,
    workshopId: string,
    supplierId: string,
  ): Promise<Result<{ readonly count: number }, ConsolidationError>>;
}

const PERIOD_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Code-point order, so the text never depends on the runtime's locale data. */
const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function sumOf(amounts: readonly Money[]): Money {
  return amounts.reduce((total, amount) => total.add(amount), Money.zero());
}

/** A monthly line or a workshop line, as the supplier sections count them. */
interface NeedLine {
  readonly supplierId: string;
  readonly supplierName: string;
  readonly materialName: string;
  readonly variantLabel: string;
  readonly quantity: number;
  readonly unitPrice: Money;
  /** The workshop name; null on monthly lines. */
  readonly origin: string | null;
  /** The workshop id; null on monthly lines. */
  readonly originId: string | null;
  /** The paid order the bulk "requested" mark applies to; null on workshop lines. */
  readonly requestableOrderId: string | null;
}

const monthlyNeed = (line: ConsolidationLine): NeedLine => ({
  supplierId: line.supplierId,
  supplierName: line.supplierName,
  materialName: line.materialName,
  variantLabel: line.variantLabel,
  quantity: line.quantity,
  unitPrice: line.unitPrice,
  origin: null,
  originId: null,
  requestableOrderId: line.status === "paid" ? line.orderId : null,
});

/** A workshop line is valued at its captured cost: it has no sale price. */
const workshopNeed = (line: WorkshopSupplierLine): NeedLine => {
  const cost =
    line.unitCostCentavos === null
      ? null
      : Money.fromCentavos(line.unitCostCentavos);
  return {
    supplierId: line.supplierId,
    supplierName: line.supplierName,
    materialName: line.materialName,
    variantLabel: line.variantLabel,
    quantity: line.quantity,
    unitPrice: cost?.ok ? cost.value : Money.zero(),
    origin: line.workshopName,
    originId: line.workshopId,
    requestableOrderId: null,
  };
};

/** Units of the same material added up, optionally keeping each origin apart. */
function groupMaterials(
  lines: readonly NeedLine[],
  byOrigin: boolean,
): ConsolidatedMaterial[] {
  const groups = new Map<string, NeedLine[]>();
  for (const item of lines) {
    const origin = byOrigin ? (item.originId ?? "") : "";
    const key = `${item.materialName}\u0000${item.variantLabel}\u0000${origin}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.values()]
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
        ...(byOrigin && head.origin !== null && head.originId !== null
          ? { origin: head.origin, originId: head.originId }
          : {}),
      };
    })
    .sort(
      (a, b) =>
        byText(a.materialName, b.materialName) ||
        byText(a.variantLabel, b.variantLabel) ||
        byText(a.origin ?? "", b.origin ?? "") ||
        byText(a.originId ?? "", b.originId ?? ""),
    );
}

function sectionOf(
  period: string,
  lines: readonly NeedLine[],
): SupplierSection {
  const first = lines[0];
  if (first === undefined) throw new Error("a supplier section has lines");
  // The screen keeps each workshop apart; the supplier gets one quantity.
  const materials = groupMaterials(lines, true);
  const summary = [
    `Pedido a ${first.supplierName}`,
    `Mes: ${monthLabel(period)}`,
    ...groupMaterials(lines, false).map(
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
        lines.flatMap((item) =>
          item.requestableOrderId === null ? [] : [item.requestableOrderId],
        ),
      ),
    ].sort(byText),
  };
}

export function createUnavailableSupplierConsolidationService(): SupplierConsolidationUseCases {
  const unavailable = (actor: Actor) => {
    const admin = requireAdminActor(actor);
    return Promise.resolve(
      admin.ok ? err({ kind: "unavailable" as const }) : admin,
    );
  };
  return {
    consolidate: unavailable,
    deliveries: unavailable,
    markWorkshopOrdered: unavailable,
  };
}

export function createSupplierConsolidationService(deps: {
  readonly store: Pick<
    AdminEnrollmentStore,
    "consolidationLines" | "deliveryOrders"
  >;
  /** Workshop supplier lines joining the monthly ones; absent means none. */
  readonly workshopLines?: WorkshopSupplierLines;
}): SupplierConsolidationUseCases {
  return {
    async deliveries(actor, period) {
      const admin = requireAdminActor(actor);
      if (!admin.ok) return admin;
      if (!PERIOD_KEY.test(period)) return err({ kind: "invalid" });
      try {
        return ok(await deps.store.deliveryOrders(period));
      } catch {
        return err({ kind: "unavailable" });
      }
    },
    async markWorkshopOrdered(actor, workshopId, supplierId) {
      const admin = requireAdminActor(actor);
      if (!admin.ok) return admin;
      if (!deps.workshopLines) return err({ kind: "unavailable" });
      try {
        return ok({
          count: await deps.workshopLines.markOrdered(workshopId, supplierId),
        });
      } catch {
        return err({ kind: "unavailable" });
      }
    },
    async consolidate(actor, period) {
      const admin = requireAdminActor(actor);
      if (!admin.ok) return admin;
      if (!PERIOD_KEY.test(period)) return err({ kind: "invalid" });
      let read;
      let workshop: readonly WorkshopSupplierLine[] = [];
      try {
        read = await deps.store.consolidationLines(period);
        if (deps.workshopLines)
          workshop = await deps.workshopLines.lines(period);
      } catch {
        return err({ kind: "unavailable" });
      }
      const bySupplier = new Map<string, NeedLine[]>();
      const needs = [
        ...read.lines.map(monthlyNeed),
        ...workshop.map(workshopNeed),
      ];
      for (const item of needs) {
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
