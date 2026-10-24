import { describe, expect, it } from "vitest";
import { createWorkshopOfferedMaterialIdsLookup } from "./offered-materials";
import { buildWorkshopPeriod } from "~/testing/fakes/admin-builders";

describe("offered material ids lookup", () => {
  it("returns the B9 period offer ids in their persisted order", async () => {
    const period = buildWorkshopPeriod({
      id: "period-1",
      materials: [
        { id: "material-2", name: "Second", active: false, available: false },
        { id: "material-1", name: "First", active: true, available: true },
      ],
    });
    const lookup = createWorkshopOfferedMaterialIdsLookup({
      periods: {
        findById: (id) => Promise.resolve(id === period.id ? period : null),
      },
    });

    await expect(lookup.listOfferedMaterialIds("period-1")).resolves.toEqual([
      "material-2",
      "material-1",
    ]);
  });

  it("returns ordinary absence when the period does not exist", async () => {
    const lookup = createWorkshopOfferedMaterialIdsLookup({
      periods: { findById: () => Promise.resolve(null) },
    });

    await expect(lookup.listOfferedMaterialIds("missing")).resolves.toEqual([]);
  });
});
