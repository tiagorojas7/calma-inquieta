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
const IDS = {
  workshop: "00000000-0000-4000-8000-000000000001",
  otherWorkshop: "00000000-0000-4000-8000-000000000002",
  period: "00000000-0000-4000-8000-000000000101",
  turno: "00000000-0000-4000-8000-000000000201",
  teacher: "00000000-0000-4000-8000-000000000301",
};
const period = (
  overrides: Partial<StoredWorkshopPeriod> = {},
): StoredWorkshopPeriod => ({
  id: IDS.period,
  workshopId: IDS.workshop,
  period: "2026-10",
  fee: money,
  materialsRequired: false,
  status: "draft",
  project: { title: "", description: "", images: [] },
  turnos: [
    {
      turnoId: IDS.turno,
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
    teacher: { id: IDS.teacher, name: "Teacher", active: true },
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
  options: { readonly persistsImages: boolean } = { persistsImages: true },
): void {
  describe("WorkshopPeriodRepository contract", () => {
    it("round-trips snapshots and capacities newest-first", async () => {
      const repository = await create();
      const old = "00000000-0000-4000-8000-000000000102";
      const newest = "00000000-0000-4000-8000-000000000103";
      await repository.insert(period({ id: old, period: "2026-09" }));
      await repository.insert(period({ id: newest }));
      expect(
        (await repository.listForWorkshop(IDS.workshop)).map(
          (value) => value.id,
        ),
      ).toEqual([newest, old]);
      expect((await repository.findById(newest))?.turnos[0]?.capacity).toBe(8);
      expect((await repository.findById(newest))?.snapshot.teacher.name).toBe(
        "Teacher",
      );
    });

    it("returns typed duplicates, updates, and deletes drafts only", async () => {
      const repository = await create();
      await repository.insert(period());
      expect(
        await repository.insert(
          period({ id: "00000000-0000-4000-8000-000000000104" }),
        ),
      ).toEqual({
        ok: false,
        error: { kind: "period-exists", periodId: IDS.period },
      });
      expect(
        await repository.update(period({ materialsRequired: true })),
      ).toEqual({ ok: true, value: undefined });
      expect((await repository.findById(IDS.period))?.materialsRequired).toBe(
        true,
      );
      expect(await repository.deleteDraft(IDS.period)).toBe("deleted");
    });

    it("isolates nested values and preserves historical turno, snapshot, and audit data", async () => {
      const repository = await create();
      const retiredTurno = "00000000-0000-4000-8000-000000000202";
      await repository.insert(
        period({
          project: {
            title: "Project",
            description: "Description",
            images: options.persistsImages
              ? [
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
                ]
              : [],
          },
          turnos: [
            {
              turnoId: retiredTurno,
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
      const read = await repository.findById(IDS.period);
      if (!read) throw new Error("contract fixture missing");
      if (options.persistsImages) {
        const image = read.project.images[0];
        if (!image) throw new Error("contract image missing");
        (image.asset as { fileName: string }).fileName = "changed.jpg";
      } else {
        expect(read.project.images).toEqual([]);
      }
      (read.turnos[0] as { capacity: number }).capacity = 99;
      (read.snapshot.teacher as { name: string }).name = "Changed";
      (read.audit as { updatedBy: string }).updatedBy = "other@example.com";

      const again = await repository.findById(IDS.period);
      expect(again).toMatchObject({
        project: options.persistsImages
          ? { images: [{ asset: { fileName: "file.jpg" } }] }
          : { images: [] },
        turnos: [{ turnoId: retiredTurno, capacity: 8 }],
        snapshot: { teacher: { name: "Teacher" } },
        audit: { updatedBy: "owner@example.com" },
      });
      expect(await repository.isTurnoUsed(retiredTurno)).toBe(true);
    });

    it("finds only the greatest earlier period and isolates workshop and turno usage", async () => {
      const repository = await create();
      await repository.insert(
        period({
          id: "00000000-0000-4000-8000-000000000105",
          period: "2026-08",
        }),
      );
      const earlier = "00000000-0000-4000-8000-000000000106";
      await repository.insert(period({ id: earlier, period: "2026-10" }));
      await repository.insert(
        period({
          id: "00000000-0000-4000-8000-000000000107",
          period: "2026-12",
        }),
      );
      await repository.insert(
        period({
          id: "00000000-0000-4000-8000-000000000108",
          workshopId: IDS.otherWorkshop,
          period: "2026-11",
          turnos: [],
        }),
      );
      expect((await repository.latestBefore(IDS.workshop, "2026-11"))?.id).toBe(
        earlier,
      );
      expect(await repository.latestBefore(IDS.workshop, "2026-08")).toBeNull();
      expect(await repository.isTurnoUsed(IDS.turno)).toBe(true);
      expect(
        await repository.isTurnoUsed("00000000-0000-4000-8000-000000000299"),
      ).toBe(false);
      expect(await repository.listForWorkshop(IDS.otherWorkshop)).toHaveLength(
        1,
      );
    });

    it("makes concurrent duplicate inserts deterministic and reports missing write outcomes", async () => {
      const repository = await create();
      const results = await Promise.all([
        repository.insert(
          period({ id: "00000000-0000-4000-8000-000000000109" }),
        ),
        repository.insert(
          period({ id: "00000000-0000-4000-8000-000000000110" }),
        ),
      ]);
      expect(results.filter((result) => result.ok)).toHaveLength(1);
      expect(results.filter((result) => !result.ok)).toHaveLength(1);
      const missing = "00000000-0000-4000-8000-000000000111";
      expect(await repository.update(period({ id: missing }))).toEqual({
        ok: false,
        error: { kind: "not-found" },
      });
      expect(await repository.deleteDraft(missing)).toBe("not-found");
      const open = "00000000-0000-4000-8000-000000000112";
      await repository.insert(
        period({ id: open, period: "2026-11", status: "open" }),
      );
      expect(await repository.deleteDraft(open)).toBe("not-draft");
    });
  });
}
