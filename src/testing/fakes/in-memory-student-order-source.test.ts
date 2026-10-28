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
