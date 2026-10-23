import { describe, expect, it } from "vitest";
import { runOrderRepositoryContract } from "~/testing/contracts/order-repository.contract";
import { orderDraft } from "./enrollments-builders";
import { InMemoryOrderRepository } from "./enrollments-order-repository";

runOrderRepositoryContract(() => {
  const repository = new InMemoryOrderRepository();
  return {
    repository,
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
