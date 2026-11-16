import { describe, expect, it } from "vitest";
import { createMonthlyWorkshopsService } from "~/modules/workshops/application/monthly-workshop-service";
import { createWorkshopPeriodsService } from "~/modules/workshops/application/workshop-period-service";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import { InMemoryMonthlyWorkshopRepository } from "~/testing/fakes/in-memory-monthly-workshop-repository";
import { InMemoryTeacherRepository } from "~/testing/fakes/in-memory-teacher-repository";
import { InMemoryTurnoRepository } from "~/testing/fakes/in-memory-turno-repository";
import { InMemoryWorkshopPeriodRepository } from "~/testing/fakes/in-memory-workshop-period-repository";
import { buildTeacher } from "~/testing/fakes/admin-builders";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import {
  InMemoryEnrollmentInsightsReader,
  InMemoryIntensiveInsightsReader,
  InMemoryIntensiveRequestInsightsReader,
  InMemoryTeacherDirectory,
  InMemoryWorkshopInsightsReader,
} from "~/testing/fakes/in-memory-insights-readers";
import { createInsightsService } from "./insights-service";

const actor = testAdminActor();
const clock = fixedClock(new Date("2026-11-10T15:00:00.000Z"));

const WORKSHOP_ID = "00000000-0000-4000-8000-000000000001";
const TURNO_ID = "turno-1";

/**
 * The saved assignment travels: workshop form text, monthly workshop, period
 * snapshot, then the statistics and the teacher settlement. Everything is
 * real except the storage and the paid-order aggregation.
 */
async function pipeline() {
  const workshops = new InMemoryMonthlyWorkshopRepository();
  const turnos = new InMemoryTurnoRepository(workshops);
  const teacherRepository = new InMemoryTeacherRepository();
  const periods = new InMemoryWorkshopPeriodRepository();
  await teacherRepository.insert(
    buildTeacher({ id: "teacher-1", name: "Ana", modality: "third_party" }),
  );
  const monthly = createMonthlyWorkshopsService({
    repository: workshops,
    teachers: teacherRepository,
    media: { findAssets: () => Promise.resolve(new Map()) },
    turnos,
    turnoUsage: { isUsed: () => Promise.resolve(false) },
    periods: {
      hasPeriods: () => Promise.resolve(false),
      openPeriodIds: () => Promise.resolve([]),
    },
    clock,
    newId: () => WORKSHOP_ID,
  });
  const created = await monthly.create(actor, {
    name: "Ceramica",
    slug: "",
    summary: "resumen",
    description: "descripcion",
    technique: "torno",
    defaultFee: "40000",
    teacherId: "teacher-1",
    percentage: "70",
    images: [],
    confirmSlugChange: false,
  });
  if (!created.ok) throw new Error("workshop fixture rejected");
  await turnos.insert({
    id: TURNO_ID,
    workshopId: WORKSHOP_ID,
    label: "Martes 10:00",
    labelKey: "martes-10",
    weekday: 2,
    startsAt: "10:00",
    endsAt: "12:00",
    defaultCapacity: 8,
    active: true,
  });
  const stored = await workshops.findById(WORKSHOP_ID);
  if (!stored) throw new Error("workshop fixture missing");
  await workshops.update({ ...stored, status: "published" });
  const periodService = createWorkshopPeriodsService({
    repository: periods,
    workshops,
    turnos,
    teachers: teacherRepository,
    materials: { findByIds: () => Promise.resolve(new Map()) },
    clock,
    newId: (() => {
      let sequence = 0;
      return () => `period-${String(++sequence)}`;
    })(),
    confirmedSeats: { confirmedSeats: () => Promise.resolve(0) },
  });
  const opened = await periodService.openMonth(actor, WORKSHOP_ID, "2026-11");
  if (!opened.ok) throw new Error("period fixture rejected");

  const orders = new InMemoryEnrollmentInsightsReader();
  orders.registrationRows = [
    {
      period: "2026-11",
      periodId: "period-1",
      orders: 1,
      feeCentavos: 40_000_00,
      studentEmails: ["a@example.com"],
    },
  ];
  orders.incomeRows = [
    {
      workshopId: WORKSHOP_ID,
      workshopName: "Ceramica",
      period: "2026-11",
      orders: 1,
      feeCentavos: 40_000_00,
      materialsCentavos: 0,
    },
  ];
  const insightsWorkshops = new InMemoryWorkshopInsightsReader();
  const directory = new InMemoryTeacherDirectory();
  directory.add("teacher-1", "Ana", "third_party");
  // The reader the database serves: the snapshot columns of every period.
  insightsWorkshops.periodTeachers = (period) =>
    Promise.resolve(
      [...periods.items.values()]
        .filter((item) => item.period === period)
        .map((item) => ({
          periodId: item.id,
          period: item.period,
          workshopId: item.workshopId,
          workshopName: "Ceramica",
          teacherId: item.snapshot.teacher.id,
          teacherName: item.snapshot.teacher.name,
          modality: item.snapshot.modality,
          percentageBp: item.snapshot.percentage?.basisPoints ?? null,
        })),
    );
  const insights = createInsightsService({
    orders,
    workshops: insightsWorkshops,
    intensives: new InMemoryIntensiveInsightsReader(),
    intensiveRequests: new InMemoryIntensiveRequestInsightsReader(),
    teachers: directory,
    clock,
  });
  return { monthly, workshops, periodService, periods, insights };
}

describe("teacher percentage from the workshop form to the settlement", () => {
  it("settles a 70 % workshop at 70 % of the paid fee, in the settlement and the statistics", async () => {
    const { insights } = await pipeline();

    const settlements = await insights.settlements(actor, {
      period: "2026-11",
    });
    const earnings = await insights.earnings(actor, { period: "2026-11" });

    expect(settlements).toMatchObject({
      ok: true,
      value: {
        rows: [
          {
            teacherId: "teacher-1",
            percentagesBp: [7_000],
          },
        ],
      },
    });
    if (!settlements.ok || !earnings.ok) throw new Error("views rejected");
    expect(settlements.value.rows[0]?.estimate?.toCentavos()).toBe(28_000_00);
    expect(earnings.value.activities[0]?.teacherPay.toCentavos()).toBe(
      28_000_00,
    );
  });

  it("keeps the percentage frozen in an opened month when the workshop changes (S8 snapshot)", async () => {
    const { monthly, insights } = await pipeline();

    const updated = await monthly.update(actor, WORKSHOP_ID, {
      name: "Ceramica",
      slug: "ceramica",
      summary: "resumen",
      description: "descripcion",
      technique: "torno",
      defaultFee: "40000",
      teacherId: "teacher-1",
      percentage: "10",
      images: [],
      confirmSlugChange: false,
    });
    const settlements = await insights.settlements(actor, {
      period: "2026-11",
    });

    expect(updated.ok).toBe(true);
    expect(settlements).toMatchObject({
      ok: true,
      value: { rows: [{ percentagesBp: [7_000] }] },
    });
  });

  it("freezes the percentage the workshop held when the month was opened", async () => {
    const { monthly, periodService, periods, insights } = await pipeline();
    // A later month opens after the workshop was re-configured to 10 %.
    await monthly.update(actor, WORKSHOP_ID, {
      name: "Ceramica",
      slug: "ceramica",
      summary: "resumen",
      description: "descripcion",
      technique: "torno",
      defaultFee: "40000",
      teacherId: "teacher-1",
      percentage: "10",
      images: [],
      confirmSlugChange: false,
    });

    const december = await periodService.openMonth(
      actor,
      WORKSHOP_ID,
      "2026-12",
    );

    expect(december.ok).toBe(true);
    const stored = [...periods.items.values()].map(
      (item) => item.snapshot.percentage?.basisPoints,
    );
    expect(stored.sort()).toEqual([1_000, 7_000]);
    expect(
      await insights.settlements(actor, { period: "2026-11" }),
    ).toMatchObject({ value: { rows: [{ percentagesBp: [7_000] }] } });
  });
});
