import type { StudentOrderSource } from "~/modules/students";
import {
  normalizeStudentEmail,
  type StudentSourceOrder,
} from "~/modules/students";

/** Student source orders in memory, matched by normalized email like the database. */
export class InMemoryStudentOrderSource implements StudentOrderSource {
  readonly orders: StudentSourceOrder[] = [];

  /** Every monthly record; a material sale is never listed here, like the database. */
  all(): Promise<readonly StudentSourceOrder[]> {
    return Promise.resolve(
      this.orders.filter((order) => order.kind !== "material_sale"),
    );
  }

  byEmail(email: string): Promise<readonly StudentSourceOrder[]> {
    const key = normalizeStudentEmail(email);
    return Promise.resolve(
      this.orders.filter(
        (order) => normalizeStudentEmail(order.studentEmail) === key,
      ),
    );
  }
}
