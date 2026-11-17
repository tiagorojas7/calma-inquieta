import { sql } from "drizzle-orm";
import {
  intensiveRequestMaterial as line,
  intensiveSeatRequest as request,
} from "~/platform/db/schema/intensive-requests";
import type { DbSessionFactory } from "~/platform/db/session";
import type { WorkshopSupplierLinesReader } from "../application/workshop-supplier-lines-reader";

interface LineRow extends Record<string, unknown> {
  readonly workshop_name: string;
  readonly supplier_id: string;
  readonly supplier_name: string;
  readonly material_name: string;
  readonly variant_label: string;
  readonly quantity: number;
  /** A bigint column: the driver returns it as text. */
  readonly unit_cost: string | null;
}

/**
 * The supplier lines of confirmed requests, by the month their workshop is
 * held. A cancelled request is left out, so its lines leave the purchase list.
 * The workshop table belongs to another module, so its schema is not imported:
 * only its name and event date are read with raw SQL.
 */
export function createDrizzleWorkshopSupplierLinesReader(
  openSession: DbSessionFactory,
): WorkshopSupplierLinesReader {
  return {
    async lines(period) {
      const session = await openSession();
      try {
        const { rows } = await session.db.execute<LineRow>(
          sql`SELECT workshop.name AS workshop_name,
                     ${line.supplierId} AS supplier_id,
                     ${line.supplierName} AS supplier_name,
                     ${line.materialName} AS material_name,
                     ${line.variantLabel} AS variant_label,
                     ${line.quantity} AS quantity,
                     ${line.unitCostCentavos} AS unit_cost
              FROM ${line}
              JOIN ${request} ON ${request.id} = ${line.requestId}
              JOIN intensive_workshop AS workshop
                ON workshop.id = ${request.intensiveId}
              WHERE ${request.status} = 'confirmed'
                AND ${line.source} = 'supplier'
                AND to_char(workshop.event_date, 'YYYY-MM') = ${period}
              ORDER BY workshop.event_date, ${line.requestId}, ${line.position}`,
        );
        return rows.map((row) => ({
          workshopName: row.workshop_name,
          supplierId: row.supplier_id,
          supplierName: row.supplier_name,
          materialName: row.material_name,
          variantLabel: row.variant_label,
          quantity: row.quantity,
          unitCostCentavos:
            row.unit_cost === null ? null : Number(row.unit_cost),
        }));
      } finally {
        await session.close();
      }
    },
  };
}
