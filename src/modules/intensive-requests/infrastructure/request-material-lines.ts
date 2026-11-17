import { and, asc, eq, isNotNull, or, sql } from "drizzle-orm";
import { intensiveRequestMaterial } from "~/platform/db/schema/intensive-requests";
import type { DbSessionFactory } from "~/platform/db/session";
import type {
  RequestStockPort,
  RequestStockStamp,
} from "../application/intensive-request-repository";

type Db = Awaited<ReturnType<DbSessionFactory>>["db"];

interface BillRow extends Record<string, unknown> {
  readonly position: number;
  readonly variant_id: string;
  readonly quantity: number;
  readonly material_name: string;
  readonly variant_label: string;
  readonly supplier_id: string;
  readonly supplier_name: string;
  /** A bigint column: the driver returns it as text. */
  readonly unit_cost: string | null;
}

/**
 * Copies a project's bill of materials onto a request and takes each line from
 * the studio stock, inside the caller's transaction and once, when the deposit
 * is confirmed. A line whose stock is short becomes a `supplier` line instead
 * of blocking the confirmation: the owner arranges the alternative outside the
 * software. Names, supplier and cost are frozen on the line, so later edits of
 * the bill or the catalog never change what was allocated.
 *
 * The bill and the catalog belong to other modules, so their tables are read
 * with raw SQL (their schemas are not imported). A bill line whose variant no
 * longer exists in the catalog has nothing to name and is skipped. Lines are
 * taken in variant order, so concurrent confirmations lock stock rows in one
 * order and never deadlock.
 */
export async function allocateProjectMaterials(
  tx: Db,
  stock: RequestStockPort<Db>,
  requestId: string,
  projectId: string,
  stamp: RequestStockStamp,
): Promise<void> {
  const bill = await tx.execute<BillRow>(
    sql`SELECT bill.position, bill.variant_id, bill.quantity,
               material.name AS material_name, variant.label AS variant_label,
               material.supplier_id, supplier.name AS supplier_name,
               variant.cost_centavos AS unit_cost
        FROM intensive_project_material AS bill
        JOIN material_variant AS variant ON variant.id = bill.variant_id
        JOIN material ON material.id = variant.material_id
        JOIN supplier ON supplier.id = material.supplier_id
        WHERE bill.project_id = ${projectId}
        ORDER BY bill.variant_id, bill.position`,
  );
  const lines = [];
  for (const line of bill.rows) {
    const taken = await stock.take(tx, line.variant_id, line.quantity, stamp);
    lines.push({
      requestId,
      position: line.position,
      variantId: line.variant_id,
      materialName: line.material_name,
      variantLabel: line.variant_label,
      supplierId: line.supplier_id,
      supplierName: line.supplier_name,
      quantity: line.quantity,
      unitCostCentavos: line.unit_cost === null ? null : Number(line.unit_cost),
      source: taken ? ("stock" as const) : ("supplier" as const),
    });
  }
  if (lines.length > 0) await tx.insert(intensiveRequestMaterial).values(lines);
}

/**
 * Puts back the units of a request's `stock` lines inside the caller's
 * transaction, once, when a confirmed request is cancelled. A `supplier` line
 * took nothing from the stock: while it was not ordered there is nothing to
 * return, but once the owner marked it as ordered the units are hers, so they
 * join the studio stock.
 */
export async function returnRequestStock(
  tx: Db,
  stock: RequestStockPort<Db>,
  requestId: string,
  stamp: RequestStockStamp,
): Promise<void> {
  const lines = await tx
    .select({
      variantId: intensiveRequestMaterial.variantId,
      quantity: intensiveRequestMaterial.quantity,
    })
    .from(intensiveRequestMaterial)
    .where(
      and(
        eq(intensiveRequestMaterial.requestId, requestId),
        or(
          eq(intensiveRequestMaterial.source, "stock"),
          and(
            eq(intensiveRequestMaterial.source, "supplier"),
            isNotNull(intensiveRequestMaterial.requestedAt),
          ),
        ),
      ),
    )
    .orderBy(
      asc(intensiveRequestMaterial.variantId),
      asc(intensiveRequestMaterial.position),
    );
  for (const line of lines)
    await stock.put(tx, line.variantId, line.quantity, stamp);
}
