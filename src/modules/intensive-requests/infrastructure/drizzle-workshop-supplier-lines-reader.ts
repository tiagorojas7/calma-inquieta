import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  intensiveRequestMaterial as line,
  intensiveSeatRequest as request,
} from "~/platform/db/schema/intensive-requests";
import type { DbSessionFactory } from "~/platform/db/session";
import type { WorkshopSupplierLinesReader } from "../application/workshop-supplier-lines-reader";

interface LineRow extends Record<string, unknown> {
  readonly workshop_id: string;
  readonly workshop_name: string;
  readonly supplier_id: string;
  readonly supplier_name: string;
  readonly material_name: string;
  readonly variant_label: string;
  readonly quantity: number;
  /** A bigint column: the driver returns it as text. */
  readonly unit_cost: string | null;
  readonly student_name: string;
  readonly project_name: string | null;
}

/**
 * The supplier lines of confirmed requests that are not marked as ordered yet,
 * by the month their workshop is held. A cancelled request is left out, so its
 * lines leave the purchase list; marking them as ordered takes them out too.
 * The workshop table belongs to another module, so its schema is not imported:
 * only its name and event date, and the chosen project's name, are read with
 * raw SQL.
 */
export function createDrizzleWorkshopSupplierLinesReader(
  openSession: DbSessionFactory,
): WorkshopSupplierLinesReader {
  return {
    async lines(period) {
      const session = await openSession();
      try {
        const { rows } = await session.db.execute<LineRow>(
          sql`SELECT workshop.id AS workshop_id,
                     workshop.name AS workshop_name,
                     ${line.supplierId} AS supplier_id,
                     ${line.supplierName} AS supplier_name,
                     ${line.materialName} AS material_name,
                     ${line.variantLabel} AS variant_label,
                     ${line.quantity} AS quantity,
                     ${line.unitCostCentavos} AS unit_cost,
                     ${request.fullName} AS student_name,
                     project.name AS project_name
              FROM ${line}
              JOIN ${request} ON ${request.id} = ${line.requestId}
              JOIN intensive_workshop AS workshop
                ON workshop.id = ${request.intensiveId}
              LEFT JOIN intensive_project AS project
                ON project.id = ${request.projectId}
              WHERE ${request.status} = 'confirmed'
                AND ${line.source} = 'supplier'
                AND ${line.requestedAt} IS NULL
                AND to_char(workshop.event_date, 'YYYY-MM') = ${period}
              ORDER BY workshop.event_date, ${line.requestId}, ${line.position}`,
        );
        return rows.map((row) => ({
          workshopId: row.workshop_id,
          workshopName: row.workshop_name,
          supplierId: row.supplier_id,
          supplierName: row.supplier_name,
          materialName: row.material_name,
          variantLabel: row.variant_label,
          quantity: row.quantity,
          unitCostCentavos:
            row.unit_cost === null ? null : Number(row.unit_cost),
          studentName: row.student_name,
          projectName: row.project_name,
        }));
      } finally {
        await session.close();
      }
    },

    async markOrdered(workshopId, supplierId) {
      const session = await openSession();
      try {
        return await session.db.transaction(async (tx) => {
          // Lock the confirmed requests first, like a cancel does: whichever
          // comes second sees the first one's result, so a line is never
          // marked on a request that was cancelled meanwhile (its units would
          // never reach the stock) and a cancel never misses a mark.
          const locked = await tx
            .select({ id: request.id })
            .from(request)
            .where(
              and(
                eq(request.intensiveId, workshopId),
                eq(request.status, "confirmed"),
              ),
            )
            .orderBy(asc(request.id))
            .for("update");
          if (locked.length === 0) return 0;
          const marked = await tx
            .update(line)
            .set({ requestedAt: sql`now()` })
            .where(
              and(
                inArray(
                  line.requestId,
                  locked.map((row) => row.id),
                ),
                eq(line.source, "supplier"),
                eq(line.supplierId, supplierId),
                isNull(line.requestedAt),
              ),
            )
            .returning({ requestId: line.requestId });
          return marked.length;
        });
      } finally {
        await session.close();
      }
    },
  };
}
