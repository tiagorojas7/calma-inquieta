import type { OrderRepository } from "~/modules/enrollments/application/enrollment-repository";
import { runAdminEnrollmentStoreContract } from "~/testing/contracts/admin-enrollment-store.contract";
import { orderDraft } from "./enrollments-builders";
import {
  InMemoryAdminEnrollmentStore,
  InMemoryOrderRepository,
} from "./enrollments-order-repository";
import { InMemorySeatLedger } from "./enrollments-seat-ledger";

const capacity = 2;

const periods = {
  find: () => Promise.resolve({ status: "open" as const, capacity }),
};

runAdminEnrollmentStoreContract(() => {
  const orders = new InMemoryOrderRepository();
  const seats = new InMemorySeatLedger();
  let nextOrder = 0;

  const createOrder = async (...args: Parameters<typeof orderDraft>) => {
    const created = await orders.create(
      orderDraft({
        publicId: `P${String(nextOrder).padStart(21, "0")}`,
        student: {
          fullName: `Student ${String(nextOrder)}`,
          email: `student-${String(nextOrder)}@example.com`,
          phoneDigits: `549351555${String(nextOrder).padStart(4, "0")}`,
        },
        ...args[0],
      }),
    );
    nextOrder += 1;
    if (!created.ok) throw new Error("fixture order");
    return created.value;
  };

  const harness = (repository: OrderRepository = orders) => ({
    store: new InMemoryAdminEnrollmentStore(repository, seats, periods),
    capacity,
    createOrder,
    seatCount: (order: Awaited<ReturnType<typeof createOrder>>) =>
      seats.confirmedSeats(order.periodId, order.turnoId),
    audit: (order: Awaited<ReturnType<typeof createOrder>>) =>
      orders.auditTrail(order.id),
    failingAfterSeatMutation: () =>
      Promise.resolve(
        harness({
          create: (draft) => orders.create(draft),
          findByPublicId: (publicId) => orders.findByPublicId(publicId),
          findForAdmin: (orderId) => orders.findForAdmin(orderId),
          listForAdmin: (query) => orders.listForAdmin(query),
          auditTrail: (orderId) => orders.auditTrail(orderId),
          transitionOrder: (orderId, to, context) =>
            to === "paid"
              ? Promise.reject(new Error("injected audit persistence failure"))
              : orders.transitionOrder(orderId, to, context),
        }),
      ),
  });

  return harness();
});
