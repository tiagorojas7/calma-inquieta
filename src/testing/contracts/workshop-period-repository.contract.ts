import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import type {
  StoredWorkshopPeriod,
  WorkshopPeriodRepository,
} from "~/modules/workshops/application/workshop-period-repository";

const money = (() => {
  const parsed = Money.fromCentavos(100);
  if (!parsed.ok) throw new Error("fixture money");
  return parsed.value;
})();
const period = (
  overrides: Partial<StoredWorkshopPeriod> = {},
): StoredWorkshopPeriod => ({
  id: "period-1",
  workshopId: "workshop-1",
  period: "2026-10",
  fee: money,
  materialsRequired: false,
  status: "draft",
  project: { title: "", description: "", images: [] },
  turnos: [
    {
      turnoId: "turno-1",
      label: "Morning",
      weekday: 1,
      startsAt: "10:00",
      endsAt: "12:00",
      turnoActive: true,
      capacity: 8,
    },
  ],
  materials: [],
  snapshot: {
    teacher: { id: "teacher-1", name: "Teacher", active: true },
    modality: "own",
    percentage: null,
  },
  openedBy: "owner@example.com",
  openedAt: new Date("2026-10-01T03:00:00Z"),
  audit: {
    updatedBy: "owner@example.com",
    updatedAt: new Date("2026-10-01T03:00:00Z"),
  },
  ...overrides,
});

export function runWorkshopPeriodRepositoryContract(
  create: () => Promise<WorkshopPeriodRepository>,
): void {
  describe("WorkshopPeriodRepository contract", () => {
    it("round-trips snapshots and capacities newest-first", async () => {
      const repository = await create();
      await repository.insert(period({ id: "old", period: "2026-09" }));
      await repository.insert(period({ id: "new" }));
      expect(
        (await repository.listForWorkshop("workshop-1")).map(
          (value) => value.id,
        ),
      ).toEqual(["new", "old"]);
      expect((await repository.findById("new"))?.turnos[0]?.capacity).toBe(8);
      expect((await repository.findById("new"))?.snapshot.teacher.name).toBe(
        "Teacher",
      );
    });
    it("returns typed duplicates, updates, and deletes drafts only", async () => {
      const repository = await create();
      await repository.insert(period());
      expect(await repository.insert(period({ id: "other" }))).toEqual({
        ok: false,
        error: { kind: "period-exists", periodId: "period-1" },
      });
      expect(
        await repository.update(
          period({ fee: money, materialsRequired: true }),
        ),
      ).toEqual({ ok: true, value: undefined });
      expect((await repository.findById("period-1"))?.materialsRequired).toBe(
        true,
      );
      expect(await repository.deleteDraft("period-1")).toBe("deleted");
    });

    it("isolates nested values and preserves historical turno, snapshot, and audit data", async () => {
      const repository = await create();
      await repository.insert(
        period({
          project: {
            title: "Project",
            description: "Description",
            images: [
              {
                assetId: "asset-1",
                alt: "Alt",
                asset: {
                  id: "asset-1",
                  fileName: "file.jpg",
                  src: "/imagenes/asset-1.jpg",
                  contentType: "image/jpeg",
                  byteSize: 1,
                  width: 1,
                  height: 1,
                  createdBy: "owner@example.com",
                  createdAt: new Date("2026-10-01T03:00:00Z"),
                },
              },
            ],
          },
          turnos: [
            {
              turnoId: "retired-turno",
              label: "Retired",
              weekday: 1,
              startsAt: "10:00",
              endsAt: "12:00",
              turnoActive: false,
              capacity: 8,
            },
          ],
        }),
      );
      const read = await repository.findById("period-1");
      if (!read) throw new Error("contract fixture missing");
      const image = read.project.images[0];
      if (!image) throw new Error("contract image missing");
      (image.asset as { fileName: string }).fileName = "changed.jpg";
      (read.turnos[0] as { capacity: number }).capacity = 99;
      (read.snapshot.teacher as { name: string }).name = "Changed";
      (read.audit as { updatedBy: string }).updatedBy = "other@example.com";

      const again = await repository.findById("period-1");
      expect(again).toMatchObject({
        project: { images: [{ asset: { fileName: "file.jpg" } }] },
        turnos: [{ turnoId: "retired-turno", capacity: 8 }],
        snapshot: { teacher: { name: "Teacher" } },
        audit: { updatedBy: "owner@example.com" },
      });
      expect(await repository.isTurnoUsed("retired-turno")).toBe(true);
    });

    it("finds only the greatest earlier period and isolates workshop and turno usage", async () => {
      const repository = await create();
      await repository.insert(period({ id: "old", period: "2026-08" }));
      await repository.insert(period({ id: "earlier", period: "2026-10" }));
      await repository.insert(period({ id: "future", period: "2026-12" }));
      await repository.insert(
        period({
          id: "other-workshop",
          workshopId: "workshop-2",
          period: "2026-11",
          turnos: [],
        }),
      );
      expect((await repository.latestBefore("workshop-1", "2026-11"))?.id).toBe(
        "earlier",
      );
      expect(await repository.latestBefore("workshop-1", "2026-08")).toBeNull();
      expect(await repository.isTurnoUsed("turno-1")).toBe(true);
      expect(await repository.isTurnoUsed("missing-turno")).toBe(false);
      expect(await repository.listForWorkshop("workshop-2")).toHaveLength(1);
    });

    it("makes concurrent duplicate inserts deterministic and reports missing write outcomes", async () => {
      const repository = await create();
      const results = await Promise.all([
        repository.insert(period({ id: "one" })),
        repository.insert(period({ id: "two" })),
      ]);
      expect(results.filter((result) => result.ok)).toHaveLength(1);
      expect(results.filter((result) => !result.ok)).toHaveLength(1);
      expect(await repository.update(period({ id: "missing" }))).toEqual({
        ok: false,
        error: { kind: "not-found" },
      });
      expect(await repository.deleteDraft("missing")).toBe("not-found");
      await repository.insert(
        period({ id: "open", period: "2026-11", status: "open" }),
      );
      expect(await repository.deleteDraft("open")).toBe("not-draft");
    });
  });
}
