import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import { buildWorkshopPeriod } from "./admin-builders";
import { InMemoryWorkshopPeriodRepository } from "./in-memory-workshop-period-repository";
import { runWorkshopPeriodRepositoryContract } from "~/testing/contracts/workshop-period-repository.contract";
import {
  createPeriodTurnoUsageLookup,
  createWorkshopPeriodLookup,
} from "~/modules/workshops/application/workshop-period-service";

const money = Money.fromCentavos(100);
if (!money.ok) throw new Error("fixture money");
const period = (id: string, key: string) =>
  buildWorkshopPeriod({ id, period: key, fee: money.value });

runWorkshopPeriodRepositoryContract(() =>
  Promise.resolve(new InMemoryWorkshopPeriodRepository()),
);

describe("InMemoryWorkshopPeriodRepository", () => {
  it("round-trips newest first and reports the existing duplicate", async () => {
    const repository = new InMemoryWorkshopPeriodRepository();
    await repository.insert(period("old", "2026-09"));
    await repository.insert(period("new", "2026-10"));
    expect(
      (await repository.listForWorkshop("workshop-1")).map((item) => item.id),
    ).toEqual(["new", "old"]);
    expect(await repository.insert(period("again", "2026-10"))).toEqual({
      ok: false,
      error: { kind: "period-exists", periodId: "new" },
    });
    expect((await repository.latestBefore("workshop-1", "2026-11"))?.id).toBe(
      "new",
    );
  });

  it("isolates round-tripped snapshots and reports historical turno use", async () => {
    const repository = new InMemoryWorkshopPeriodRepository();
    const value = {
      ...period("historical", "2026-10"),
      turnos: [
        {
          turnoId: "turno-1",
          label: "Morning",
          weekday: 1 as const,
          startsAt: "10:00",
          endsAt: "12:00",
          turnoActive: true,
          capacity: 10,
        },
      ],
    };
    await repository.insert(value);
    const read = await repository.findById("historical");
    if (!read) throw new Error("fixture period missing");
    (read.snapshot.teacher as { name: string }).name = "Changed";
    (read.turnos[0] as { capacity: number }).capacity = 99;
    expect(
      (await repository.findById("historical"))?.snapshot.teacher.name,
    ).toBe("Cami");
    expect((await repository.findById("historical"))?.turnos[0]?.capacity).toBe(
      10,
    );
    expect(
      await createPeriodTurnoUsageLookup(repository).isUsed("turno-1"),
    ).toBe(true);
    expect(
      await createPeriodTurnoUsageLookup(repository).isUsed("unknown"),
    ).toBe(false);
    expect(
      await createWorkshopPeriodLookup(repository).hasPeriods("workshop-1"),
    ).toBe(true);
    expect(
      await createWorkshopPeriodLookup(repository).hasPeriods("unknown"),
    ).toBe(false);
  });

  it("leaves no root behind when the composite insert fails and deletes only drafts", async () => {
    const repository = new InMemoryWorkshopPeriodRepository();
    repository.failNextInsert = true;
    await expect(
      repository.insert(period("broken", "2026-10")),
    ).rejects.toThrow("composite period insert failed");
    expect(await repository.findById("broken")).toBeNull();
    await repository.insert(period("draft", "2026-10"));
    expect(await repository.deleteDraft("draft")).toBe("deleted");
    await repository.insert({ ...period("open", "2026-11"), status: "open" });
    expect(await repository.deleteDraft("open")).toBe("not-draft");
  });

  it("atomically reserves uniqueness across concurrent inserts", async () => {
    const repository = new InMemoryWorkshopPeriodRepository();
    const [first, second] = await Promise.all([
      repository.insert(period("first", "2026-10")),
      repository.insert(period("second", "2026-10")),
    ]);
    expect([first, second].filter((result) => result.ok)).toHaveLength(1);
    expect([first, second].filter((result) => !result.ok)).toEqual([
      {
        ok: false,
        error: {
          kind: "period-exists",
          periodId: first.ok ? "first" : "second",
        },
      },
    ]);
  });

  it("rolls back the whole aggregate after a configured post-write failure", async () => {
    const repository = new InMemoryWorkshopPeriodRepository();
    const original = {
      ...period("period", "2026-10"),
      materials: [
        {
          id: "material-1",
          name: "Material 1",
          active: true,
          available: true,
        },
      ],
      turnos: [
        {
          turnoId: "turno-1",
          label: "Morning",
          weekday: 1 as const,
          startsAt: "10:00",
          endsAt: "12:00",
          turnoActive: true,
          capacity: 8,
        },
      ],
    };
    await repository.insert(original);

    const originalTurno = original.turnos[0];
    if (!originalTurno) throw new Error("fixture turno missing");
    repository.failNextUpdateAfterWrite = true;
    await expect(
      repository.update({
        ...original,
        fee: money.value,
        project: { ...original.project, title: "changed" },
        turnos: [{ ...originalTurno, capacity: 99 }],
        materials: [
          {
            id: "material-2",
            name: "Material 2",
            active: true,
            available: true,
          },
        ],
        snapshot: {
          ...original.snapshot,
          teacher: { ...original.snapshot.teacher, name: "Changed" },
        },
        audit: { ...original.audit, updatedBy: "other" },
      }),
    ).rejects.toThrow("composite period update failed after write");
    expect(await repository.findById("period")).toEqual(original);

    repository.failNextInsertAfterWrite = true;
    await expect(repository.insert(period("new", "2026-11"))).rejects.toThrow(
      "composite period insert failed after write",
    );
    expect(await repository.findById("new")).toBeNull();
  });
});
