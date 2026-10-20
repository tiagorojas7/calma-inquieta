import { describe, expect, it } from "vitest";
import { createUnavailableService } from "~/composition/unavailable-service";
import type { MonthlyWorkshopsService } from "~/modules/workshops";
import {
  adminContext,
  getRequest,
  thrownStatus,
  workshopsFixture,
} from "~/testing/admin/route-kit";
import { seedTeacher, seedWorkshop } from "~/testing/admin/workshop-seed";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { loader } from "./workshops";

async function seeded() {
  const fixture = workshopsFixture();
  const teacher = await seedTeacher(fixture, {
    name: "Ana Gómez",
    modality: "own",
  });
  await seedWorkshop(fixture, { name: "Bordado", teacherId: teacher });
  const archived = await seedWorkshop(fixture, { name: "Acuarela" });
  await fixture.service.archive(testAdminActor(), archived);
  return fixture.service;
}

function call(
  service: MonthlyWorkshopsService,
  query = "",
  options: { admin?: boolean } = {},
) {
  return loader({
    request: getRequest(`/admin/talleres${query}`),
    params: {},
    context: adminContext({ monthlyWorkshops: service }, options),
  } as never);
}

describe("admin workshops list loader", () => {
  it("lists live workshops with teacher, status and active turnos, archived excluded", async () => {
    const result = await call(await seeded());
    expect(result.filter).toBe("vigentes");
    expect(result.rows).toEqual([
      {
        id: "w1",
        name: "Bordado",
        teacherName: "Ana Gómez",
        status: "draft",
        activeTurnos: 0,
      },
    ]);
  });

  it("filters by status from the query", async () => {
    const service = await seeded();
    const archived = await call(service, "?estado=archivados");
    expect(archived.filter).toBe("archivados");
    expect(archived.rows.map((row) => row.name)).toEqual(["Acuarela"]);
    expect((await call(service, "?estado=publicados")).rows).toEqual([]);
  });

  it("is denied for a non-admin before reading anything", async () => {
    expect(
      await thrownStatus(() =>
        call(createUnavailableService<MonthlyWorkshopsService>(), "", {
          admin: false,
        }),
      ),
    ).toBe(403);
  });

  it("answers 503 when the workshops service is unavailable", async () => {
    expect(
      await thrownStatus(() =>
        call(createUnavailableService<MonthlyWorkshopsService>()),
      ),
    ).toBe(503);
  });
});
