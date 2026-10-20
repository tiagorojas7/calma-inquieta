import { createSuppliersService } from "~/modules/materials";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import { InMemorySupplierRepository } from "~/testing/fakes/in-memory-supplier-repository";

/** Real suppliers service over the in-memory repository, ids s1, s2, ... */
export function suppliersFixture() {
  const repository = new InMemorySupplierRepository();
  let next = 0;
  const service = createSuppliersService({
    repository,
    clock: fixedClock(new Date("2026-10-05T12:00:00.000Z")),
    newId: () => `s${String(++next)}`,
  });
  return { repository, service };
}
