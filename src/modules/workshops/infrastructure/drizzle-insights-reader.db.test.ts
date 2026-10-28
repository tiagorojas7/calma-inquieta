import { afterAll, describe, expect, it } from "vitest";
import { createDbSessionFactory } from "~/platform/db/session";
import { seedCatalog } from "~/testing/db/seed-catalog";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import {
  buildSeed,
  seedPeriod,
  seedTaller,
  seedTurno,
  type CatalogSeed,
} from "~/testing/fakes/catalog-seed";
import { createDrizzleWorkshopInsightsReader } from "./drizzle-insights-reader";

const created: TestDatabase[] = [];
afterAll(async () => {
  await Promise.all(created.map((database) => database.drop()));
});

async function readerFor(seed: CatalogSeed) {
  const database = await createTestDatabase();
  created.push(database);
  const openSession = createDbSessionFactory({
    connectionString: database.url,
  });
  await seedCatalog(openSession, seed);
  return createDrizzleWorkshopInsightsReader(openSession);
}

describe("createDrizzleWorkshopInsightsReader", () => {
  it("lists the capacity of each turno of the non-draft periods of a month", async () => {
    const martes = seedTurno({ label: "Martes", weekday: 2 });
    const jueves = seedTurno({ label: "Jueves", weekday: 4 });
    const open = seedPeriod({
      period: "2026-11",
      status: "open",
      capacities: [
        { turnoId: martes.id, capacity: 6 },
        { turnoId: jueves.id, capacity: 4 },
      ],
    });
    const lunes = seedTurno({ label: "Lunes" });
    const draft = seedPeriod({
      period: "2026-11",
      status: "draft",
      capacities: [{ turnoId: lunes.id, capacity: 9 }],
    });
    const other = seedPeriod({
      period: "2026-12",
      status: "open",
      capacities: [{ turnoId: martes.id, capacity: 5 }],
    });
    const ceramica = seedTaller({
      name: "Ceramica",
      turnos: [martes, jueves],
      periods: [open, other],
    });
    const acuarela = seedTaller({
      name: "Acuarela",
      turnos: [lunes],
      periods: [draft],
    });
    const reader = await readerFor(
      buildSeed({ talleres: [ceramica, acuarela] }),
    );

    const rows = await reader.capacity("2026-11");

    expect(rows).toHaveLength(2);
    expect(rows).toContainEqual({
      workshopId: ceramica.id,
      workshopName: "Ceramica",
      periodId: open.id,
      period: "2026-11",
      periodStatus: "open",
      turnoId: martes.id,
      turnoLabel: "Martes",
      capacity: 6,
    });
    expect(rows.map((row) => row.capacity).sort()).toEqual([4, 6]);
  });

  it("lists published workshops with the status of their period for the month, or null", async () => {
    const withOpen = seedTaller({
      name: "Con periodo",
      periods: [seedPeriod({ period: "2026-11", status: "open" })],
    });
    const withClosed = seedTaller({
      name: "Cerrado",
      periods: [seedPeriod({ period: "2026-11", status: "closed" })],
    });
    const without = seedTaller({ name: "Sin periodo" });
    const paused = seedTaller({ name: "Pausado", status: "paused" });
    const reader = await readerFor(
      buildSeed({ talleres: [withOpen, withClosed, without, paused] }),
    );

    const rows = await reader.publishedWorkshops("2026-11");

    expect(rows).toEqual([
      { workshopId: withClosed.id, name: "Cerrado", periodStatus: "closed" },
      { workshopId: withOpen.id, name: "Con periodo", periodStatus: "open" },
      { workshopId: without.id, name: "Sin periodo", periodStatus: null },
    ]);
  });

  it("reads the teacher snapshot of every period of a month, drafts included", async () => {
    const third = "33333333-3333-4333-8333-333333333333";
    const own = "44444444-4444-4444-8444-444444444444";
    const thirdPeriod = seedPeriod({
      period: "2026-11",
      status: "open",
      snapshotTeacherId: third,
      snapshotTeacherName: "Ana Gomez",
      snapshotTeacherModality: "third_party",
      snapshotPercentageBp: 3_050,
    });
    const ownDraft = seedPeriod({
      period: "2026-11",
      status: "draft",
      snapshotTeacherId: own,
      snapshotTeacherName: "Duena",
      snapshotTeacherModality: "own",
      snapshotPercentageBp: null,
    });
    const otherMonth = seedPeriod({ period: "2026-12" });
    const ceramica = seedTaller({ name: "Ceramica", periods: [thirdPeriod] });
    const acuarela = seedTaller({
      name: "Acuarela",
      periods: [ownDraft, otherMonth],
    });
    const reader = await readerFor(
      buildSeed({ talleres: [ceramica, acuarela] }),
    );

    const rows = await reader.periodTeachers("2026-11");

    expect(rows).toEqual([
      {
        periodId: ownDraft.id,
        workshopId: acuarela.id,
        workshopName: "Acuarela",
        teacherId: own,
        teacherName: "Duena",
        modality: "own",
        percentageBp: null,
      },
      {
        periodId: thirdPeriod.id,
        workshopId: ceramica.id,
        workshopName: "Ceramica",
        teacherId: third,
        teacherName: "Ana Gomez",
        modality: "third_party",
        percentageBp: 3_050,
      },
    ]);
  });
});
