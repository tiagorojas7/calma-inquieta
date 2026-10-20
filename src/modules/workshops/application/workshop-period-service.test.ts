import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import type { Material, MaterialLookup } from "~/modules/materials";
import { createWorkshopPeriodsService } from "./workshop-period-service";
import { InMemoryWorkshopPeriodRepository } from "~/testing/fakes/in-memory-workshop-period-repository";
import { InMemoryMonthlyWorkshopRepository } from "~/testing/fakes/in-memory-monthly-workshop-repository";
import { InMemoryTurnoRepository } from "~/testing/fakes/in-memory-turno-repository";
import { InMemoryTeacherRepository } from "~/testing/fakes/in-memory-teacher-repository";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import {
  buildImageUse,
  buildMaterial,
  buildTeacher,
  buildWorkshopPeriod,
} from "~/testing/fakes/admin-builders";

const fee = (() => {
  const value = Money.fromCentavos(4000000);
  if (!value.ok) throw new Error("fixture money");
  return value.value;
})();

async function setup(now = "2026-10-15T12:00:00Z") {
  const workshops = new InMemoryMonthlyWorkshopRepository();
  const turnos = new InMemoryTurnoRepository();
  const teachers = new InMemoryTeacherRepository();
  const periods = new InMemoryWorkshopPeriodRepository();
  await teachers.insert(buildTeacher({ modality: "third_party" }));
  await workshops.insert({
    id: "w",
    slug: "w",
    name: "Workshop",
    summary: "s",
    description: "d",
    technique: "t",
    defaultFee: fee,
    teacherId: "teacher-1",
    percentage: { basisPoints: 3000 },
    status: "published",
    audit: { updatedBy: "old", updatedAt: new Date(0) },
  });
  await turnos.insert({
    id: "t",
    workshopId: "w",
    label: "Morning",
    labelKey: "morning",
    weekday: 1,
    startsAt: "10:00",
    endsAt: "12:00",
    defaultCapacity: 8,
    active: true,
  });
  const materials = new Map<string, Material>([
    ["material-1", buildMaterial({ id: "material-1", name: "Clay" })],
    [
      "material-2",
      buildMaterial({ id: "material-2", name: "Paint", active: false }),
    ],
    [
      "material-3",
      buildMaterial({ id: "material-3", name: "Glue", available: false }),
    ],
    ["material-4", buildMaterial({ id: "material-4", name: "Ink" })],
  ]);
  const materialLookupCalls: string[][] = [];
  const materialLookup: MaterialLookup = {
    async findByIds(ids) {
      materialLookupCalls.push([...ids]);
      return new Map(
        ids.flatMap((id) => {
          const material = materials.get(id);
          return material ? [[id, material] as const] : [];
        }),
      );
    },
  };
  return {
    periods,
    workshops,
    turnos,
    teachers,
    materials,
    materialLookupCalls,
    service: createWorkshopPeriodsService({
      repository: periods,
      workshops,
      turnos,
      teachers,
      materials: materialLookup,
      clock: fixedClock(new Date(now)),
      newId: (() => {
        let sequence = 0;
        return () => (sequence++ === 0 ? "p" : `p-${sequence.toString()}`);
      })(),
    }),
  };
}

const periodsCount = (
  result: Awaited<
    ReturnType<ReturnType<typeof createWorkshopPeriodsService>["list"]>
  >,
) => (result.ok ? result.value.periods.length : -1);

const draft = {
  fee: "41000",
  materialsRequired: false,
  projectTitle: "",
  projectDescription: "",
  projectImages: [],
  capacities: [{ turnoId: "t", capacity: "7" }],
  snapshotPercentage: "30",
  materialIds: [],
};

describe("WorkshopPeriodsService", () => {
  it("denies every operation before invoking any dependency", async () => {
    let calls = 0;
    const called = () => {
      calls += 1;
      throw new Error("dependency must not be called");
    };
    const service = createWorkshopPeriodsService({
      repository: {
        insert: called,
        update: called,
        findById: called,
        findByWorkshopPeriod: called,
        listForWorkshop: called,
        latestBefore: called,
        isTurnoUsed: called,
        deleteDraft: called,
      },
      workshops: { findById: called },
      turnos: { listForWorkshop: called },
      teachers: { findByIds: called },
      materials: { findByIds: called },
      clock: fixedClock(new Date("2026-10-15T12:00:00Z")),
    } as never);

    await expect(service.list(null, "w")).resolves.toEqual({
      ok: false,
      error: { kind: "denied" },
    });
    await expect(service.get(null, "w", "2026-10")).resolves.toEqual({
      ok: false,
      error: { kind: "denied" },
    });
    await expect(service.openMonth(null, "w", "2026-10")).resolves.toEqual({
      ok: false,
      error: { kind: "denied" },
    });
    await expect(service.update(null, "p", draft)).resolves.toEqual({
      ok: false,
      error: { kind: "denied" },
    });
    await expect(service.publish(null, "p")).resolves.toEqual({
      ok: false,
      error: { kind: "denied" },
    });
    await expect(service.close(null, "p")).resolves.toEqual({
      ok: false,
      error: { kind: "denied" },
    });
    await expect(service.delete(null, "p")).resolves.toEqual({
      ok: false,
      error: { kind: "denied" },
    });
    expect(calls).toBe(0);
  });

  it("opens from defaults, aggregates eligibility rules, and rejects duplicates", async () => {
    const { service } = await setup();
    expect(await service.openMonth(null, "w", "2026-10")).toEqual({
      ok: false,
      error: { kind: "denied" },
    });
    const opened = await service.openMonth(testAdminActor(), "w", "2026-10");
    expect(opened).toMatchObject({
      ok: true,
      value: {
        status: "draft",
        fee,
        turnos: [{ turnoId: "t", capacity: 8 }],
        snapshot: {
          modality: "third_party",
          percentage: { basisPoints: 3000 },
        },
      },
    });
    expect(await service.openMonth(testAdminActor(), "w", "2026-10")).toEqual({
      ok: false,
      error: { kind: "period-exists", periodId: "p" },
    });
  });

  it("suggests current month then one after greatest existing period and observes its range", async () => {
    const { service } = await setup("2026-11-01T02:59:00Z");
    expect(await service.list(testAdminActor(), "w")).toMatchObject({
      ok: true,
      value: { suggestedNext: "2026-10" },
    });
    await service.openMonth(testAdminActor(), "w", "2026-10");
    expect(await service.list(testAdminActor(), "w")).toMatchObject({
      ok: true,
      value: { suggestedNext: "2026-11" },
    });
  });

  it("effectively closes elapsed drafts without writing and refuses later mutations", async () => {
    const { service, periods } = await setup("2026-11-01T03:00:00Z");
    periods.items.set("p", {
      id: "p",
      workshopId: "w",
      period: "2026-10",
      fee,
      materialsRequired: false,
      status: "draft",
      project: { title: "", description: "", images: [] },
      turnos: [],
      materials: [],
      snapshot: {
        teacher: { id: "teacher-1", name: "Cami", active: true },
        modality: "third_party",
        percentage: { basisPoints: 3000 },
      },
      openedBy: "old",
      openedAt: new Date(0),
      audit: { updatedBy: "old", updatedAt: new Date(0) },
    });
    expect(await service.get(testAdminActor(), "w", "2026-10")).toMatchObject({
      ok: true,
      value: { status: "closed" },
    });
    expect(periods.items.get("p")?.status).toBe("draft");
    expect(await service.update(testAdminActor(), "p", draft)).toEqual({
      ok: false,
      error: { kind: "period-closed" },
    });
    expect(await service.publish(testAdminActor(), "p")).toEqual({
      ok: false,
      error: { kind: "transition-refused", from: "closed", to: "open" },
    });
    expect(await service.close(testAdminActor(), "p")).toEqual({
      ok: false,
      error: { kind: "transition-refused", from: "closed", to: "closed" },
    });
    expect(await service.delete(testAdminActor(), "p")).toEqual({
      ok: false,
      error: { kind: "transition-refused", from: "closed", to: "draft" },
    });
    expect(periods.items.get("p")).toMatchObject({
      status: "draft",
      audit: { updatedBy: "old", updatedAt: new Date(0) },
    });
  });

  it("refuses nonempty deferred images rather than discarding them", async () => {
    const { service } = await setup();
    await service.openMonth(testAdminActor(), "w", "2026-10");
    expect(
      await service.update(testAdminActor(), "p", {
        ...draft,
        projectImages: [{} as never],
      }),
    ).toEqual({ ok: false, error: { kind: "unavailable" } });
  });

  it("preserves stored deferred images while an empty material selection clears offers", async () => {
    const { service, periods } = await setup();
    await service.openMonth(testAdminActor(), "w", "2026-10");
    const stored = periods.items.get("p");
    if (!stored) throw new Error("fixture period missing");
    periods.items.set("p", {
      ...stored,
      project: { ...stored.project, images: [buildImageUse()] },
      materials: [
        { id: "material-1", name: "Clay", active: true, available: true },
      ],
    });

    expect(await service.update(testAdminActor(), "p", draft)).toMatchObject({
      ok: true,
      value: { project: { images: [buildImageUse()] }, materials: [] },
    });
  });

  it("does not silently discard deferred source images while opening", async () => {
    const { service, periods } = await setup();
    await service.openMonth(testAdminActor(), "w", "2026-10");
    const stored = periods.items.get("p");
    if (!stored) throw new Error("fixture period missing");
    periods.items.set("p", {
      ...stored,
      project: { ...stored.project, images: [buildImageUse()] },
      materials: [
        { id: "material-1", name: "Clay", active: true, available: true },
      ],
    });

    expect(await service.openMonth(testAdminActor(), "w", "2026-11")).toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
    expect(await periods.findByWorkshopPeriod("w", "2026-11")).toBeNull();
  });

  it("prefills only the latest earlier period and the current active turno set", async () => {
    const { service, turnos } = await setup();
    await service.openMonth(testAdminActor(), "w", "2026-10");
    await service.update(testAdminActor(), "p", {
      ...draft,
      fee: "45000",
      projectTitle: "October project",
      capacities: [{ turnoId: "t", capacity: "7" }],
    });
    await turnos.insert({
      id: "late",
      workshopId: "w",
      label: "Late",
      labelKey: "late",
      weekday: 2,
      startsAt: "18:00",
      endsAt: "20:00",
      defaultCapacity: 5,
      active: true,
    });
    expect(
      await service.openMonth(testAdminActor(), "w", "2026-11"),
    ).toMatchObject({
      ok: true,
      value: {
        fee: (() => {
          const parsed = Money.fromCentavos(4500000);
          return parsed.ok ? parsed.value : undefined;
        })(),
        project: { title: "October project" },
        turnos: [
          { turnoId: "t", capacity: 7 },
          { turnoId: "late", capacity: 5 },
        ],
      },
    });
  });

  it("keeps own snapshots percentage-free and names a submitted percentage precisely", async () => {
    const { service, teachers, workshops } = await setup();
    const teacher = teachers.teachers.get("teacher-1");
    const workshop = await workshops.findById("w");
    if (!teacher || !workshop) throw new Error("fixture missing");
    teachers.teachers.set("teacher-1", { ...teacher, modality: "own" });
    workshops.items.set("w", { ...workshop, percentage: null });
    await service.openMonth(testAdminActor(), "w", "2026-10");

    expect(
      await service.update(testAdminActor(), "p", {
        ...draft,
        snapshotPercentage: "35",
      }),
    ).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [
          {
            field: "snapshotPercentage",
            code: "percentage-not-applicable",
          },
        ],
      },
    });
  });

  it("returns period validation issues and every opening rule together", async () => {
    const { service, workshops, teachers, turnos } = await setup();
    const workshop = await workshops.findById("w");
    const teacher = teachers.teachers.get("teacher-1");
    if (!workshop || !teacher) throw new Error("fixture missing");
    workshops.items.set("w", {
      ...workshop,
      status: "draft",
      teacherId: null,
      percentage: null,
    });
    teachers.teachers.set("teacher-1", { ...teacher, active: false });
    const turno = turnos.items.get("t");
    if (!turno) throw new Error("fixture turno missing");
    turnos.items.set("t", { ...turno, active: false });

    expect(await service.openMonth(testAdminActor(), "w", "2026-13")).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "period", code: "invalid-format" }],
        rules: ["workshop-status", "teacher", "active-turno"],
      },
    });
    expect(await service.openMonth(testAdminActor(), "w", "2027-11")).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "period", code: "out-of-range" }],
        rules: ["workshop-status", "teacher", "active-turno"],
      },
    });
    expect(periodsCount(await service.list(testAdminActor(), "w"))).toBe(0);
  });

  it("requires a complete unique capacity set and updates third-party snapshot precision", async () => {
    const { service, periods } = await setup();
    await service.openMonth(testAdminActor(), "w", "2026-10");
    expect(
      await service.update(testAdminActor(), "p", {
        ...draft,
        capacities: [],
      }),
    ).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "capacities", code: "required" }],
      },
    });
    expect(
      await service.update(testAdminActor(), "p", {
        ...draft,
        snapshotPercentage: "12.34",
      }),
    ).toMatchObject({
      ok: true,
      value: { snapshot: { percentage: { basisPoints: 1234 } } },
    });
    expect(periods.items.get("p")?.snapshot.percentage).toEqual({
      basisPoints: 1234,
    });
  });

  it("keeps opened snapshots immutable while a later opening snapshots current assignment values", async () => {
    const { service, teachers, workshops } = await setup();
    await service.openMonth(testAdminActor(), "w", "2026-10");
    const teacher = teachers.teachers.get("teacher-1");
    const workshop = await workshops.findById("w");
    if (!teacher || !workshop) throw new Error("fixture missing");
    teachers.teachers.set("teacher-1", {
      ...teacher,
      name: "Renegotiated teacher",
    });
    workshops.items.set("w", {
      ...workshop,
      percentage: { basisPoints: 4250 },
    });

    expect(await service.get(testAdminActor(), "w", "2026-10")).toMatchObject({
      ok: true,
      value: {
        snapshot: {
          teacher: { id: "teacher-1", name: "Cami" },
          modality: "third_party",
          percentage: { basisPoints: 3000 },
        },
      },
    });
    expect(
      await service.openMonth(testAdminActor(), "w", "2026-11"),
    ).toMatchObject({
      ok: true,
      value: {
        snapshot: {
          teacher: { id: "teacher-1", name: "Renegotiated teacher" },
          modality: "third_party",
          percentage: { basisPoints: 4250 },
        },
      },
    });
  });

  it("aggregates fee, capacity, and percentage failures without changing audit data", async () => {
    const { service, periods } = await setup();
    await service.openMonth(testAdminActor(), "w", "2026-10");
    const before = periods.items.get("p");
    if (!before) throw new Error("fixture missing");
    expect(
      await service.update(testAdminActor(), "p", {
        ...draft,
        fee: "0.5",
        capacities: [
          { turnoId: "t", capacity: "0" },
          { turnoId: "t", capacity: "2" },
          { turnoId: "unknown", capacity: "3" },
        ],
        snapshotPercentage: "100.001",
      }),
    ).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [
          { field: "fee", code: "invalid-format" },
          { field: "capacities", code: "out-of-range" },
          { field: "capacities", code: "out-of-range" },
          { field: "capacities", code: "unknown-reference" },
          { field: "snapshotPercentage", code: "too-many-decimals" },
        ],
      },
    });
    expect(periods.items.get("p")).toEqual(before);
  });

  it("prefills from the greatest earlier period, ignores future periods, and retains retired turnos only historically", async () => {
    const { service, periods, turnos } = await setup();
    await service.openMonth(testAdminActor(), "w", "2026-10");
    await service.update(testAdminActor(), "p", {
      ...draft,
      capacities: [{ turnoId: "t", capacity: "6" }],
    });
    await service.openMonth(testAdminActor(), "w", "2026-12");
    const future = periods.items.get("p-2");
    if (!future) throw new Error("future fixture missing");
    periods.items.set("p-2", { ...future, fee: fee });
    const turno = turnos.items.get("t");
    if (!turno) throw new Error("fixture turno missing");
    turnos.items.set("t", { ...turno, active: false });
    await turnos.insert({
      id: "new-turno",
      workshopId: "w",
      label: "New",
      labelKey: "new",
      weekday: 2,
      startsAt: "18:00",
      endsAt: "20:00",
      defaultCapacity: 5,
      active: true,
    });

    expect(
      await service.openMonth(testAdminActor(), "w", "2026-11"),
    ).toMatchObject({
      ok: true,
      value: {
        fee: (() => {
          const value = Money.fromCentavos(4100000);
          return value.ok ? value.value : undefined;
        })(),
        turnos: [{ turnoId: "new-turno", capacity: 5 }],
      },
    });
    expect(await service.get(testAdminActor(), "w", "2026-10")).toMatchObject({
      ok: true,
      value: { turnos: [{ turnoId: "t", turnoActive: true, capacity: 6 }] },
    });
  });

  it("lists newest-first totals, returns no suggestion beyond the range, and reports missing periods", async () => {
    const { service, periods } = await setup();
    await periods.insert(
      buildWorkshopPeriod({
        id: "older",
        workshopId: "w",
        period: "2026-10",
        fee,
        turnos: [
          {
            turnoId: "t",
            label: "Morning",
            weekday: 1,
            startsAt: "10:00",
            endsAt: "12:00",
            turnoActive: true,
            capacity: 3,
          },
          {
            turnoId: "t2",
            label: "Evening",
            weekday: 2,
            startsAt: "18:00",
            endsAt: "20:00",
            turnoActive: false,
            capacity: 4,
          },
        ],
      }),
    );
    await periods.insert(
      buildWorkshopPeriod({
        id: "furthest",
        workshopId: "w",
        period: "2027-10",
        fee,
      }),
    );

    expect(await service.get(testAdminActor(), "w", "2026-11")).toEqual({
      ok: false,
      error: { kind: "not-found" },
    });
    expect(await service.list(testAdminActor(), "w")).toMatchObject({
      ok: true,
      value: {
        periods: [
          { id: "furthest", period: "2027-10", totalCapacity: 0 },
          { id: "older", period: "2026-10", totalCapacity: 7 },
        ],
        suggestedNext: null,
      },
    });
  });

  it("persists explicit closure, rejects invalid transitions, and exposes deterministic summaries", async () => {
    const { service, periods } = await setup();
    await service.openMonth(testAdminActor(), "w", "2026-10");
    expect(await service.close(testAdminActor(), "p")).toEqual({
      ok: false,
      error: { kind: "transition-refused", from: "draft", to: "closed" },
    });
    expect(await service.publish(testAdminActor(), "p")).toMatchObject({
      ok: true,
      value: { status: "open", audit: { updatedBy: testAdminActor().email } },
    });
    expect(await service.close(testAdminActor(), "p")).toMatchObject({
      ok: true,
      value: { status: "closed", audit: { updatedBy: testAdminActor().email } },
    });
    expect(await service.delete(testAdminActor(), "p")).toEqual({
      ok: false,
      error: { kind: "transition-refused", from: "closed", to: "draft" },
    });
    expect(await service.list(testAdminActor(), "w")).toMatchObject({
      ok: true,
      value: {
        periods: [
          { id: "p", period: "2026-10", status: "closed", totalCapacity: 8 },
        ],
      },
    });
    expect(periods.items.get("p")?.status).toBe("closed");
  });

  it("rejects duplicate, unknown, inactive, and unavailable material selections without mutation", async () => {
    const { service, periods, materialLookupCalls } = await setup();
    await service.openMonth(testAdminActor(), "w", "2026-10");
    const before = await periods.findById("p");

    expect(
      await service.update(testAdminActor(), "p", {
        ...draft,
        materialIds: ["material-1", "material-1"],
      }),
    ).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "materialIds", code: "duplicate" }],
      },
    });
    expect(materialLookupCalls).toEqual([]);

    for (const [materialId, code] of [
      ["missing", "unknown-reference"],
      ["material-2", "not-selectable"],
      ["material-3", "not-selectable"],
    ] as const) {
      expect(
        await service.update(testAdminActor(), "p", {
          ...draft,
          materialIds: [materialId],
        }),
      ).toEqual({
        ok: false,
        error: { kind: "invalid", issues: [{ field: "materialIds", code }] },
      });
    }
    expect(await periods.findById("p")).toEqual(before);
  });

  it("replaces the flat material list in submitted order and clears it explicitly", async () => {
    const { service } = await setup();
    await service.openMonth(testAdminActor(), "w", "2026-10");

    expect(
      await service.update(testAdminActor(), "p", {
        ...draft,
        materialIds: ["material-4", "material-1"],
      }),
    ).toMatchObject({
      ok: true,
      value: {
        materials: [
          { id: "material-4", name: "Ink" },
          { id: "material-1", name: "Clay" },
        ],
      },
    });
    expect(
      await service.update(testAdminActor(), "p", {
        ...draft,
        materialIds: ["material-1"],
      }),
    ).toMatchObject({
      ok: true,
      value: { materials: [{ id: "material-1", name: "Clay" }] },
    });
    expect(
      await service.update(testAdminActor(), "p", {
        ...draft,
        materialIds: [],
      }),
    ).toMatchObject({ ok: true, value: { materials: [] } });
  });

  it("copies only currently selectable historical materials in source order", async () => {
    const { service, periods, materialLookupCalls } = await setup();
    const historicalMaterials = [
      { id: "material-4", name: "Old ink", active: true, available: true },
      { id: "material-2", name: "Old paint", active: true, available: true },
      { id: "missing", name: "Removed", active: true, available: true },
      { id: "material-1", name: "Old clay", active: true, available: true },
      { id: "material-3", name: "Old glue", active: true, available: true },
    ];
    await periods.insert(
      buildWorkshopPeriod({
        id: "source",
        workshopId: "w",
        period: "2026-10",
        fee,
        materials: historicalMaterials,
      }),
    );

    expect(
      await service.openMonth(testAdminActor(), "w", "2026-11"),
    ).toMatchObject({
      ok: true,
      value: {
        materials: [
          { id: "material-4", name: "Ink", active: true, available: true },
          { id: "material-1", name: "Clay", active: true, available: true },
        ],
      },
    });
    expect(materialLookupCalls).toEqual([
      ["material-4", "material-2", "missing", "material-1", "material-3"],
    ]);
    expect((await periods.findById("source"))?.materials).toEqual(
      historicalMaterials,
    );
  });

  it("refuses explicit and effective closure before material lookup", async () => {
    const { service, periods, materialLookupCalls } = await setup();
    await service.openMonth(testAdminActor(), "w", "2026-10");
    await service.publish(testAdminActor(), "p");
    await service.close(testAdminActor(), "p");

    expect(
      await service.update(testAdminActor(), "p", {
        ...draft,
        materialIds: ["material-1"],
      }),
    ).toEqual({ ok: false, error: { kind: "period-closed" } });

    await periods.insert(
      buildWorkshopPeriod({
        id: "elapsed",
        workshopId: "w",
        period: "2026-09",
        fee,
        status: "open",
      }),
    );
    expect(
      await service.update(testAdminActor(), "elapsed", {
        ...draft,
        materialIds: ["material-1"],
      }),
    ).toEqual({ ok: false, error: { kind: "period-closed" } });
    expect(materialLookupCalls).toEqual([]);
  });
});
