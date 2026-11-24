import { describe, expect, it } from "vitest";
import { runStudentOrderSourceContract } from "~/testing/contracts/student-order-source.contract";
import { InMemoryStudentOrderSource } from "./in-memory-student-order-source";
import { studentOrder } from "./student-builders";

runStudentOrderSourceContract(() => {
  const source = new InMemoryStudentOrderSource();
  let next = 0;
  return {
    source,
    add(overrides = {}) {
      next += 1;
      const order = studentOrder(next, overrides);
      source.orders.push(order);
      return Promise.resolve(order);
    },
  };
});

describe("InMemoryStudentOrderSource sales", () => {
  it("lists a student's material sales in her own history, but never in the registry listing, like the database", async () => {
    const source = new InMemoryStudentOrderSource();
    const record = studentOrder(1, { studentEmail: "ana@example.com" });
    const sale = studentOrder(2, {
      studentEmail: "ana@example.com",
      kind: "material_sale",
    });
    source.orders.push(record, sale);

    await expect(source.all()).resolves.toEqual([record]);
    await expect(source.byEmail("ana@example.com")).resolves.toEqual([
      record,
      sale,
    ]);
  });
});
