import { describe, expect, it } from "vitest";
import { createUnavailableService } from "~/composition/unavailable-service";
import type { MonthlyWorkshopsService } from "~/modules/workshops";
import {
  adminContext,
  getRequest,
  postRequest,
  thrownStatus,
} from "~/testing/admin/route-kit";
import {
  FLOW_MONTH,
  buildMaterial,
  workshopFlowFixture,
} from "~/testing/admin/workshop-flow-kit";
import { seedTeacher } from "~/testing/admin/workshop-seed";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { action, loader } from "./workshop-new";

type Fixture = ReturnType<typeof workshopFlowFixture>;

function context(fixture: Fixture, options: { admin?: boolean } = {}) {
  return adminContext(
    {
      monthlyWorkshops: fixture.service,
      workshopPeriods: fixture.periods,
      teachers: fixture.teachers.service,
      materials: fixture.materials,
    },
    options,
  );
}

const FIELDS = {
  name: "Cerámica Creativa",
  description: "Un taller para empezar de cero.",
  teacherId: "",
  defaultFee: "12000",
  percentage: "",
  turnoWeekday: "2",
  turnoStartsAt: "10:00",
  turnoEndsAt: "12:00",
  turnoCapacity: "8",
};

/** The fields as a browser posts them: one value per turno row, five rows. */
function post(
  fields: Record<string, string | string[]>,
  headers?: Record<string, string>,
) {
  const merged: Record<string, string | string[]> = { ...FIELDS, ...fields };
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (key.startsWith("turno")) {
      const first = Array.isArray(value) ? value : [value];
      for (let row = 0; row < 5; row += 1) body.append(key, first[row] ?? "");
    } else
      for (const item of Array.isArray(value) ? value : [value])
        body.append(key, item);
  }
  const request = postRequest("/admin/talleres/nuevo", {}, headers);
  return new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body,
  });
}

function submit(
  fixture: Fixture,
  fields: Record<string, string | string[]>,
  options: { admin?: boolean; headers?: Record<string, string> } = {},
) {
  return action({
    request: post(fields, options.headers),
    params: {},
    context: context(fixture, options),
  } as never);
}

const location = (response: unknown) =>
  (response as Response).headers.get("Location");

describe("admin workshop create loader", () => {
  it("offers active teachers with their modality and the selectable materials", async () => {
    const fixture = workshopFlowFixture([
      buildMaterial({ id: "m1", name: "Arcilla" }),
    ]);
    await seedTeacher(fixture, { name: "Beto Ruiz", modality: "third_party" });
    const archived = await seedTeacher(fixture, {
      name: "Caro Paz",
      modality: "own",
    });
    await fixture.teachers.service.archive(testAdminActor(), archived);
    const result = await loader({
      request: getRequest("/admin/talleres/nuevo"),
      params: {},
      context: context(fixture),
    } as never);
    expect(result.teachers).toEqual([
      { id: "t1", name: "Beto Ruiz", modality: "third_party" },
    ]);
    expect(result.materials).toEqual([{ id: "m1", name: "Arcilla" }]);
  });

  it("is denied for a non-admin", async () => {
    expect(
      await thrownStatus(() =>
        loader({
          request: getRequest("/admin/talleres/nuevo"),
          params: {},
          context: context(workshopFlowFixture(), { admin: false }),
        } as never),
      ),
    ).toBe(403);
  });
});

describe("admin workshop create action", () => {
  it("publishes in one click: taller, turno, open month with its capacity, and a success banner", async () => {
    const fixture = workshopFlowFixture();
    const teacherId = await seedTeacher(fixture, {
      name: "Ana",
      modality: "own",
    });
    const response = await submit(fixture, { teacherId, intent: "publish" });
    expect((response as Response).status).toBe(302);
    expect(location(response)).toBe("/admin/talleres/w1?ok=published-open");
    expect([...fixture.repository.items.values()]).toMatchObject([
      {
        slug: "ceramica-creativa",
        status: "published",
        summary: "Un taller para empezar de cero.",
        audit: { updatedBy: "a@x.test" },
      },
    ]);
    expect(
      await fixture.periods.get(testAdminActor(), "w1", FLOW_MONTH),
    ).toMatchObject({
      ok: true,
      value: {
        status: "open",
        turnos: [{ weekday: 2, startsAt: "10:00", capacity: 8 }],
      },
    });
  });

  it("opens the month with the chosen materials and a third-party percentage", async () => {
    const fixture = workshopFlowFixture([
      buildMaterial({ id: "m1", name: "Arcilla" }),
    ]);
    const teacherId = await seedTeacher(fixture, {
      name: "Beto",
      modality: "third_party",
    });
    const response = await submit(fixture, {
      teacherId,
      percentage: "35,5",
      materialIds: ["m1"],
      intent: "publish",
    });
    expect(location(response)).toBe("/admin/talleres/w1?ok=published-open");
    expect(
      await fixture.periods.get(testAdminActor(), "w1", FLOW_MONTH),
    ).toMatchObject({
      ok: true,
      value: {
        status: "open",
        materials: [{ id: "m1" }],
        snapshot: { percentage: { basisPoints: 3550 } },
      },
    });
  });

  it("saves only a draft for the secondary button and lands on the taller", async () => {
    const fixture = workshopFlowFixture();
    const response = await submit(fixture, { intent: "draft" });
    expect(location(response)).toBe("/admin/talleres/w1?ok=created");
    expect([...fixture.repository.items.values()]).toMatchObject([
      { status: "draft" },
    ]);
    expect(fixture.periodRepository.items.size).toBe(0);
  });

  it("returns 422 with the typed values and Spanish field errors, storing nothing", async () => {
    const fixture = workshopFlowFixture();
    const result = await submit(fixture, {
      name: "  ",
      defaultFee: "12,5",
      intent: "publish",
    });
    expect(result).toMatchObject({
      init: { status: 422 },
      data: {
        values: { name: "", defaultFee: "12,5" },
        errors: {
          name: "Completá este campo.",
          defaultFee: "El formato no es válido. Revisalo.",
        },
        formError: "Revisá los campos marcados e intentá de nuevo.",
      },
    });
    expect(fixture.repository.items.size).toBe(0);
  });

  it("asks for the percentage of a third-party teacher and an own teacher cannot have one", async () => {
    const fixture = workshopFlowFixture();
    const third = await seedTeacher(fixture, {
      name: "Beto",
      modality: "third_party",
    });
    const own = await seedTeacher(fixture, { name: "Ana", modality: "own" });
    expect(await submit(fixture, { teacherId: third })).toMatchObject({
      data: { errors: { percentage: "Completá este campo." } },
    });
    expect(
      await submit(fixture, { teacherId: own, percentage: "30" }),
    ).toMatchObject({
      data: {
        errors: { percentage: "El porcentaje no corresponde en este caso." },
      },
    });
    expect(fixture.repository.items.size).toBe(0);
  });

  it("asks for a turno before publishing and stores nothing", async () => {
    const fixture = workshopFlowFixture();
    const result = await submit(fixture, {
      turnoWeekday: [],
      turnoStartsAt: [],
      turnoEndsAt: [],
      turnoCapacity: [],
      intent: "publish",
    });
    expect(result).toMatchObject({
      init: { status: 422 },
      data: {
        turnosError: "Agregá al menos un turno para poder publicar.",
      },
    });
    expect(fixture.repository.items.size).toBe(0);
  });

  it("flags a half-filled turno row and stores nothing", async () => {
    const fixture = workshopFlowFixture();
    const result = await submit(fixture, {
      turnoEndsAt: ["", "", ""],
      intent: "publish",
    });
    expect(result).toMatchObject({
      init: { status: 422 },
      data: {
        turnoErrors: {
          0: "Revisá este turno: elegí el día, un horario válido (desde antes que hasta) y cupos de 1 a 500.",
        },
      },
    });
    expect(fixture.repository.items.size).toBe(0);
  });

  it("keeps the taller as a draft and names the failed step when it cannot be published", async () => {
    const fixture = workshopFlowFixture();
    // No teacher: create and the turno persist, publishing is refused.
    const response = await submit(fixture, { intent: "publish" });
    expect(location(response)).toBe("/admin/talleres/w1?fallo=publish");
    expect([...fixture.repository.items.values()]).toMatchObject([
      { status: "draft" },
    ]);
    expect(fixture.periodRepository.items.size).toBe(0);
  });

  it("is denied for a non-admin and for a cross-site post", async () => {
    const fixture = workshopFlowFixture();
    expect(
      await thrownStatus(() => submit(fixture, {}, { admin: false })),
    ).toBe(403);
    expect(
      await thrownStatus(() =>
        submit(
          fixture,
          {},
          { headers: { Origin: "https://evil.example.test" } },
        ),
      ),
    ).toBe(403);
    expect(fixture.repository.items.size).toBe(0);
  });

  it("answers 503 when the workshops service is unavailable", async () => {
    const status = await thrownStatus(() =>
      action({
        request: post({ intent: "draft" }),
        params: {},
        context: adminContext({
          monthlyWorkshops: createUnavailableService<MonthlyWorkshopsService>(),
        }),
      } as never),
    );
    expect(status).toBe(503);
  });
});
