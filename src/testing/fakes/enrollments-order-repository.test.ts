import { describe, expect, it } from "vitest";
import { runOrderRepositoryContract } from "~/testing/contracts/order-repository.contract";
import { orderDraft } from "./enrollments-builders";
import { InMemoryOrderRepository } from "./enrollments-order-repository";
import { InMemorySeatLedger } from "./enrollments-seat-ledger";
import { InMemoryStockStore } from "./in-memory-stock-store";
import { InMemoryStudentActivityStore } from "./enrollments-student-activity-store";

runOrderRepositoryContract(() => {
  const seats = new InMemorySeatLedger();
  const activity = new InMemoryStudentActivityStore();
  const stock = new InMemoryStockStore();
  const repository = new InMemoryOrderRepository(seats, activity, stock);
  return {
    repository,
    activity,
    stock: {
      seed: async (variantId, units) => {
        await stock.adjust({
          variantId,
          delta: units,
          reason: "test seed",
          by: "test",
          at: new Date("2026-10-01T12:00:00Z"),
        });
      },
      onHand: (variantId) => Promise.resolve(stock.levels.get(variantId) ?? 0),
    },
    confirmedSeats: (periodId, turnoId) =>
      seats.confirmedSeats(periodId, turnoId),
    failCreateAfterNumbering: async (draft) => {
      repository.failNextCreateAfterNumbering();
      return repository.create(draft);
    },
  };
});

describe("InMemoryOrderRepository rollback", () => {
  it("leaves no order and reuses the number when the create fails after numbering", async () => {
    const repo = new InMemoryOrderRepository();
    repo.failNextCreateAfterNumbering();
    await expect(repo.create(orderDraft())).rejects.toThrow();
    expect(await repo.findByPublicId(orderDraft().publicId)).toBeNull();
    const retry = await repo.create(orderDraft());
    expect(retry.ok && retry.value.number).toBe("CI-2026-0001");
  });
});
