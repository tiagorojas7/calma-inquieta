import { describe, expect, it } from "vitest";
import { runTurnoRepositoryContract } from "~/testing/contracts/turno-repository.contract";
import { InMemoryTurnoRepository } from "./in-memory-turno-repository";

runTurnoRepositoryContract(() =>
  Promise.resolve(new InMemoryTurnoRepository()),
);

describe("InMemoryTurnoRepository defensive normalization", () => {
  it("derives both uniqueness keys from labels rather than trusting supplied keys", async () => {
    const repository = new InMemoryTurnoRepository();
    await repository.insert({
      id: "first",
      workshopId: "workshop-a",
      label: "Ñandú",
      labelKey: "unsafe-first-key",
      weekday: 1,
      startsAt: "09:00",
      endsAt: "10:00",
      defaultCapacity: 8,
      active: true,
    });

    expect((await repository.findById("first"))?.labelKey).toBe("ñandú");

    await expect(
      repository.insert({
        id: "second",
        workshopId: "workshop-a",
        label: "n\u0303ANDÚ",
        labelKey: "unsafe-second-key",
        weekday: 2,
        startsAt: "09:00",
        endsAt: "10:00",
        defaultCapacity: 8,
        active: true,
      }),
    ).resolves.toEqual({ ok: false, error: { kind: "label-conflict" } });
  });
});
