import { describe, expect, it } from "vitest";
import { createUnavailableService } from "~/composition/unavailable-service";
import type { MonthlyWorkshopsService } from "~/modules/workshops";
import { err } from "~/modules/_shared";
import {
  adminContext,
  getRequest,
  postRequest,
  thrownStatus,
  withOverrides,
  workshopsFixture,
} from "~/testing/admin/route-kit";
import { seedTeacher, seedWorkshop } from "~/testing/admin/workshop-seed";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { action as workshopAction } from "./workshop-detail";
import { action, loader } from "./turnos";

type Fixture = ReturnType<typeof workshopsFixture>;

const MORNING = {
  label: "Mañana",
  weekday: "2",
  startsAt: "10:00",
  endsAt: "12:00",
  defaultCapacity: "8",
};

function context(
  fixture: Fixture,
  options: { admin?: boolean } = {},
  service: MonthlyWorkshopsService = fixture.service,
) {
  return adminContext({ monthlyWorkshops: service }, options);
}

function load(fixture: Fixture, id: string, query = "") {
  return loader({
    request: getRequest(`/admin/talleres/${id}/turnos${query}`),
    params: { id },
    context: context(fixture),
  } as never);
}

function submit(
  fixture: Fixture,
  id: string,
  fields: Record<string, string>,
  options: { admin?: boolean } = {},
  service?: MonthlyWorkshopsService,
) {
  return action({
    request: postRequest(`/admin/talleres/${id}/turnos`, fields),
    params: { id },
    context: context(fixture, options, service),
  } as never);
}

function publish(fixture: Fixture, id: string) {
  return workshopAction({
    request: postRequest(`/admin/talleres/${id}`, { intent: "publish" }),
    params: { id },
    context: context(fixture),
  } as never);
}

async function addTurno(fixture: Fixture, id: string, label = "Mañana") {
  const added = await fixture.service.addTurno(testAdminActor(), id, {
    ...MORNING,
    label,
  });
  if (!added.ok) throw new Error("turno seed failed");
  const turno = added.value.turnos.find((item) => item.label === label);
  if (!turno) throw new Error("turno missing");
  return turno.id;
}

function turnoOf(fixture: Fixture, turnoId: string) {
  const found = fixture.turnos.items.get(turnoId);
  if (!found) throw new Error("missing turno");
  return found;
}

describe("admin turnos loader", () => {
  it("lists the workshop's turnos with day, time range and capacity", async () => {
    const fixture = workshopsFixture();
    const id = await seedWorkshop(fixture);
    const turnoId = await addTurno(fixture, id);
    expect(await load(fixture, id)).toEqual({
      workshopId: id,
      workshopName: "Cerámica Creativa",
      turnos: [
        {
          id: turnoId,
          label: "Mañana",
          day: "Martes",
          range: "10:00 a 12:00",
          capacity: 8,
          active: true,
          usedByPeriods: false,
        },
      ],
      editing: null,
    });
  });

  it("prefills the form of the turno named in ?editar=", async () => {
    const fixture = workshopsFixture();
    const id = await seedWorkshop(fixture);
    const turnoId = await addTurno(fixture, id);
    expect(await load(fixture, id, `?editar=${turnoId}`)).toMatchObject({
      editing: { turnoId, values: MORNING },
    });
  });

  it("answers 404 for an unknown workshop or an unknown turno to edit", async () => {
    const fixture = workshopsFixture();
    const id = await seedWorkshop(fixture);
    expect(await thrownStatus(() => load(fixture, "nope"))).toBe(404);
    expect(await thrownStatus(() => load(fixture, id, "?editar=nope"))).toBe(
      404,
    );
  });

  it("is denied for a non-admin and 503 while the service is unavailable", async () => {
    const fixture = workshopsFixture();
    const id = await seedWorkshop(fixture);
    expect(
      await thrownStatus(() =>
        loader({
          request: getRequest(`/admin/talleres/${id}/turnos`),
          params: { id },
          context: context(fixture, { admin: false }),
        } as never),
      ),
    ).toBe(403);
    expect(
      await thrownStatus(() =>
        loader({
          request: getRequest(`/admin/talleres/${id}/turnos`),
          params: { id },
          context: adminContext({
            monthlyWorkshops:
              createUnavailableService<MonthlyWorkshopsService>(),
          }),
        } as never),
      ),
    ).toBe(503);
  });
});

describe("admin turnos action", () => {
  it("adds a turno as the admin, active, and returns to the turnos page", async () => {
    const fixture = workshopsFixture();
    const id = await seedWorkshop(fixture);
    const response = await submit(fixture, id, { intent: "save", ...MORNING });
    expect((response as Response).headers.get("Location")).toBe(
      `/admin/talleres/${id}/turnos`,
    );
    expect([...fixture.turnos.items.values()]).toMatchObject([
      {
        workshopId: id,
        label: "Mañana",
        weekday: 2,
        startsAt: "10:00",
        endsAt: "12:00",
        defaultCapacity: 8,
        active: true,
      },
    ]);
    expect(fixture.repository.items.get(id)?.audit.updatedBy).toBe("a@x.test");
  });

  it("updates the turno named by turnoId", async () => {
    const fixture = workshopsFixture();
    const id = await seedWorkshop(fixture);
    const turnoId = await addTurno(fixture, id);
    await submit(fixture, id, {
      intent: "save",
      turnoId,
      ...MORNING,
      endsAt: "13:00",
      defaultCapacity: "10",
    });
    expect(turnoOf(fixture, turnoId)).toMatchObject({
      endsAt: "13:00",
      defaultCapacity: 10,
    });
    expect(fixture.turnos.items.size).toBe(1);
  });

  it.each([
    [
      "end before start",
      { startsAt: "12:00", endsAt: "10:00" },
      "timeRange",
      "El horario de fin tiene que ser posterior al de inicio.",
    ],
    [
      "equal start and end",
      { startsAt: "10:00", endsAt: "10:00" },
      "timeRange",
      "El horario de fin tiene que ser posterior al de inicio.",
    ],
    [
      "badly formed time",
      { startsAt: "diez" },
      "timeRange",
      "Ingresá los horarios con el formato HH:MM, por ejemplo 10:00.",
    ],
    [
      "zero capacity",
      { defaultCapacity: "0" },
      "defaultCapacity",
      "Ingresá un número entero de 1 a 500.",
    ],
    [
      "fractional capacity",
      { defaultCapacity: "2,5" },
      "defaultCapacity",
      "Ingresá un número entero de 1 a 500.",
    ],
    [
      "weekday outside Monday to Sunday",
      { weekday: "8" },
      "weekday",
      "Elegí un día de la semana.",
    ],
    ["missing label", { label: "" }, "label", "Completá este campo."],
  ])(
    "returns 422 naming the field for %s and stores nothing",
    async (_name, patch, field, message) => {
      const fixture = workshopsFixture();
      const id = await seedWorkshop(fixture);
      const fields = { ...MORNING, ...patch };
      const result = await submit(fixture, id, { intent: "save", ...fields });
      expect(result).toMatchObject({
        init: { status: 422 },
        data: { values: fields, errors: { [field]: message }, turnoId: "" },
      });
      expect(fixture.turnos.items.size).toBe(0);
    },
  );

  it("refuses a duplicate label ignoring case, but allows it in another workshop", async () => {
    const fixture = workshopsFixture();
    const id = await seedWorkshop(fixture);
    const other = await seedWorkshop(fixture, { name: "Bordado" });
    await addTurno(fixture, id, "Tarde");
    expect(
      await submit(fixture, id, { intent: "save", ...MORNING, label: "tarde" }),
    ).toMatchObject({
      init: { status: 422 },
      data: {
        errors: { label: "Ya hay un turno con ese nombre en este taller." },
      },
    });
    const allowed = await submit(fixture, other, {
      intent: "save",
      ...MORNING,
      label: "tarde",
    });
    expect((allowed as Response).headers.get("Location")).toBe(
      `/admin/talleres/${other}/turnos`,
    );
  });

  it("keeps the turno being edited in the 422 so the form stays in edit mode", async () => {
    const fixture = workshopsFixture();
    const id = await seedWorkshop(fixture);
    const turnoId = await addTurno(fixture, id);
    expect(
      await submit(fixture, id, {
        intent: "save",
        turnoId,
        ...MORNING,
        defaultCapacity: "0",
      }),
    ).toMatchObject({ init: { status: 422 }, data: { turnoId } });
  });

  it("retires and reactivates a turno", async () => {
    const fixture = workshopsFixture();
    const id = await seedWorkshop(fixture);
    const turnoId = await addTurno(fixture, id);
    await submit(fixture, id, { intent: "retire", turnoId });
    expect(turnoOf(fixture, turnoId).active).toBe(false);
    await submit(fixture, id, { intent: "reactivate", turnoId });
    expect(turnoOf(fixture, turnoId).active).toBe(true);
  });

  it("refuses to retire the last active turno of a published workshop", async () => {
    const fixture = workshopsFixture();
    const teacher = await seedTeacher(fixture, {
      name: "Ana",
      modality: "own",
    });
    const id = await seedWorkshop(fixture, { teacherId: teacher });
    const turnoId = await addTurno(fixture, id);
    await fixture.service.publish(testAdminActor(), id);
    expect(
      await submit(fixture, id, { intent: "retire", turnoId }),
    ).toMatchObject({
      init: { status: 422 },
      data: {
        listError:
          "Es el único turno activo de un taller publicado. Pausá el taller primero.",
      },
    });
    expect(turnoOf(fixture, turnoId).active).toBe(true);
  });

  it("reactivates a retired turno without reusing its label", async () => {
    const fixture = workshopsFixture();
    const id = await seedWorkshop(fixture);
    const turnoId = await addTurno(fixture, id, "Tarde");
    await submit(fixture, id, { intent: "retire", turnoId });
    expect(turnoOf(fixture, turnoId).active).toBe(false);

    await submit(fixture, id, { intent: "reactivate", turnoId });
    expect(turnoOf(fixture, turnoId)).toMatchObject({
      label: "Tarde",
      active: true,
    });
  });

  it("deletes an unused turno", async () => {
    const fixture = workshopsFixture();
    const id = await seedWorkshop(fixture);
    const turnoId = await addTurno(fixture, id);
    await submit(fixture, id, { intent: "delete", turnoId });
    expect(fixture.turnos.items.has(turnoId)).toBe(false);
  });

  it("refuses to delete a turno a period used and says to retire it", async () => {
    const fixture = workshopsFixture();
    const id = await seedWorkshop(fixture);
    const turnoId = await addTurno(fixture, id);
    const used = withOverrides(fixture.service, {
      deleteTurno: () =>
        Promise.resolve(err({ kind: "rules-unmet", rules: ["turno-used"] })),
    });
    expect(
      await submit(fixture, id, { intent: "delete", turnoId }, {}, used),
    ).toMatchObject({
      init: { status: 422 },
      data: {
        listError:
          "Algún mes ya usó este turno, así que no se puede eliminar. Retiralo para que no se ofrezca más.",
      },
    });
    expect(fixture.turnos.items.has(turnoId)).toBe(true);
  });

  it("answers 400 to an unknown intent or a row action without a turno, and 404 to unknown ids", async () => {
    const fixture = workshopsFixture();
    const id = await seedWorkshop(fixture);
    expect(await thrownStatus(() => submit(fixture, id, { intent: "x" }))).toBe(
      400,
    );
    expect(
      await thrownStatus(() => submit(fixture, id, { intent: "retire" })),
    ).toBe(400);
    expect(
      await thrownStatus(() =>
        submit(fixture, id, { intent: "retire", turnoId: "nope" }),
      ),
    ).toBe(404);
    expect(
      await thrownStatus(() =>
        submit(fixture, "nope", { intent: "save", ...MORNING }),
      ),
    ).toBe(404);
  });

  it("is denied for a non-admin and 503 while unavailable, changing nothing", async () => {
    const fixture = workshopsFixture();
    const id = await seedWorkshop(fixture);
    expect(
      await thrownStatus(() =>
        submit(fixture, id, { intent: "save", ...MORNING }, { admin: false }),
      ),
    ).toBe(403);
    expect(
      await thrownStatus(() =>
        submit(
          fixture,
          id,
          { intent: "save", ...MORNING },
          {},
          createUnavailableService<MonthlyWorkshopsService>(),
        ),
      ),
    ).toBe(503);
    expect(fixture.turnos.items.size).toBe(0);
  });

  it("lets a workshop publish once a turno was added from this screen", async () => {
    const fixture = workshopsFixture();
    const teacher = await seedTeacher(fixture, {
      name: "Ana",
      modality: "own",
    });
    const id = await seedWorkshop(fixture, { teacherId: teacher });
    expect(await publish(fixture, id)).toMatchObject({
      init: { status: 422 },
    });

    await submit(fixture, id, { intent: "save", ...MORNING });
    const published = await publish(fixture, id);
    expect((published as Response).headers.get("Location")).toBe(
      `/admin/talleres/${id}`,
    );
    expect(fixture.repository.items.get(id)?.status).toBe("published");
  });
});
