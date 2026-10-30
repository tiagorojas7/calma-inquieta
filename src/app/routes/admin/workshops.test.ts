import { describe, expect, it } from "vitest";
import { createUnavailableService } from "~/composition/unavailable-service";
import { ok } from "~/modules/_shared";
import {
  cordobaMonthOf,
  type MonthlyWorkshopsService,
  type WorkshopPeriodsService,
} from "~/modules/workshops";
import {
  adminContext,
  getRequest,
  postRequest,
  thrownStatus,
  withOverrides,
  workshopsFixture,
} from "~/testing/admin/route-kit";
import { seedTeacher, seedWorkshop } from "~/testing/admin/workshop-seed";
import {
  FLOW_MONTH,
  FLOW_NEXT_MONTH,
  buildMaterial,
  workshopFlowFixture,
} from "~/testing/admin/workshop-flow-kit";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { monthName } from "~/app/admin/workshop-readiness";
import { action, loader } from "./workshops";

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

const MONTH = cordobaMonthOf(new Date());

function periodsReturning(
  periods: {
    period: string;
    status: "draft" | "open" | "closed";
    totalCapacity: number;
  }[],
) {
  return withOverrides(createUnavailableService<WorkshopPeriodsService>(), {
    list: () => Promise.resolve(ok({ periods, suggestedNext: MONTH })),
  } as Partial<WorkshopPeriodsService>);
}

function call(
  service: MonthlyWorkshopsService,
  query = "",
  options: { admin?: boolean } = {},
  periods: WorkshopPeriodsService = periodsReturning([]),
) {
  return loader({
    request: getRequest(`/admin/talleres${query}`),
    params: {},
    context: adminContext(
      { monthlyWorkshops: service, workshopPeriods: periods },
      options,
    ),
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
        enrollment: {
          open: false,
          summary: "Falta agregar un turno activo",
          cta: "Agregar un turno",
          href: "/admin/talleres/w1/turnos",
        },
        openNext: null,
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

describe("admin workshops list: Abrir <mes>", () => {
  async function published(periods = true) {
    const fixture = workshopFlowFixture([
      buildMaterial({ id: "m1", name: "Arcilla" }),
    ]);
    const teacherId = await seedTeacher(fixture, {
      name: "Ana",
      modality: "own",
    });
    const id = await seedWorkshop(fixture, { teacherId });
    await fixture.service.addTurno(testAdminActor(), id, {
      label: "Martes 10:00",
      weekday: "2",
      startsAt: "10:00",
      endsAt: "12:00",
      defaultCapacity: "8",
    });
    await fixture.service.publish(testAdminActor(), id);
    if (periods) {
      const opened = await fixture.periods.openMonth(
        testAdminActor(),
        id,
        FLOW_MONTH,
      );
      if (!opened.ok) throw new Error("open failed");
      await fixture.periods.publish(testAdminActor(), opened.value.id);
    }
    return { fixture, id };
  }
  const flowContext = (
    fixture: Awaited<ReturnType<typeof published>>["fixture"],
  ) =>
    adminContext({
      monthlyWorkshops: fixture.service,
      workshopPeriods: fixture.periods,
      teachers: fixture.teachers.service,
    });

  it("offers the next month once the current one is open", async () => {
    const { fixture, id } = await published();
    const result = await loader({
      request: getRequest("/admin/talleres"),
      params: {},
      context: flowContext(fixture),
    } as never);
    expect(result.rows).toMatchObject([
      {
        id,
        openNext: {
          period: FLOW_NEXT_MONTH,
          label: monthName(FLOW_NEXT_MONTH),
        },
      },
    ]);
  });

  it("offers the current month instead of the readiness link when none is open", async () => {
    const { fixture } = await published(false);
    const result = await loader({
      request: getRequest("/admin/talleres"),
      params: {},
      context: flowContext(fixture),
    } as never);
    expect(result.rows[0]).toMatchObject({
      openNext: { period: FLOW_MONTH, label: monthName(FLOW_MONTH) },
      enrollment: { cta: null, href: null },
    });
  });

  it("does not offer a month while the latest one is still a draft", async () => {
    const { fixture, id } = await published(false);
    await fixture.periods.openMonth(testAdminActor(), id, FLOW_MONTH);
    const result = await loader({
      request: getRequest("/admin/talleres"),
      params: {},
      context: flowContext(fixture),
    } as never);
    expect(result.rows[0]).toMatchObject({ openNext: null });
  });

  it("opens and publishes the next month copying the previous one in a single post", async () => {
    const { fixture, id } = await published();
    const response = await action({
      request: postRequest("/admin/talleres", {
        intent: "open-month",
        workshopId: id,
        period: FLOW_NEXT_MONTH,
      }),
      params: {},
      context: flowContext(fixture),
    } as never);
    expect(response.headers.get("Location")).toBe("/admin/talleres?ok=opened");
    expect(
      await fixture.periods.get(testAdminActor(), id, FLOW_NEXT_MONTH),
    ).toMatchObject({
      ok: true,
      value: { status: "open", turnos: [{ capacity: 8 }] },
    });
  });

  it("sends the owner to the taller when the month cannot be opened", async () => {
    const { fixture, id } = await published();
    const response = await action({
      request: postRequest("/admin/talleres", {
        intent: "open-month",
        workshopId: id,
        period: FLOW_MONTH,
      }),
      params: {},
      context: flowContext(fixture),
    } as never);
    expect(response.headers.get("Location")).toBe(
      `/admin/talleres/${id}?fallo=month`,
    );
  });

  it("rejects a malformed post, a non-admin and a cross-site post", async () => {
    const { fixture, id } = await published();
    const post = (
      fields: Record<string, string>,
      options: { admin?: boolean; headers?: Record<string, string> } = {},
    ) =>
      thrownStatus(() =>
        action({
          request: postRequest("/admin/talleres", fields, options.headers),
          params: {},
          context: adminContext(
            {
              monthlyWorkshops: fixture.service,
              workshopPeriods: fixture.periods,
            },
            options,
          ),
        } as never),
      );
    expect(await post({ workshopId: id, period: FLOW_NEXT_MONTH })).toBe(400);
    expect(
      await post({ intent: "open-month", workshopId: id, period: "nov" }),
    ).toBe(400);
    const valid = {
      intent: "open-month",
      workshopId: id,
      period: FLOW_NEXT_MONTH,
    };
    expect(await post(valid, { admin: false })).toBe(403);
    expect(
      await post(valid, { headers: { Origin: "https://evil.example.test" } }),
    ).toBe(403);
  });
});
