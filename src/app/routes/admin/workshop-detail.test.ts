import { describe, expect, it } from "vitest";
import { createUnavailableService } from "~/composition/unavailable-service";
import { err } from "~/modules/_shared";
import type {
  MonthlyWorkshopsService,
  WorkshopPeriodsService,
} from "~/modules/workshops";
import {
  adminContext,
  getRequest,
  postRequest,
  thrownStatus,
  withOverrides,
  workshopsFixture,
} from "~/testing/admin/route-kit";
import {
  WORKSHOP_FIELDS,
  seedTeacher,
  seedWorkshop,
} from "~/testing/admin/workshop-seed";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { action, loader } from "./workshop-detail";

type Fixture = ReturnType<typeof workshopsFixture>;

const TURNO = {
  label: "Mañana",
  weekday: "2",
  startsAt: "10:00",
  endsAt: "12:00",
  defaultCapacity: "8",
};

const noPeriods = withOverrides(
  createUnavailableService<WorkshopPeriodsService>(),
  {
    get: () => Promise.resolve(err({ kind: "not-found" })),
  },
);

function context(fixture: Fixture, options: { admin?: boolean } = {}) {
  return adminContext(
    {
      monthlyWorkshops: fixture.service,
      teachers: fixture.teachers.service,
      workshopPeriods: noPeriods,
    },
    options,
  );
}

function load(fixture: Fixture, id: string) {
  return loader({
    request: getRequest(`/admin/talleres/${id}`),
    params: { id },
    context: context(fixture),
  } as never);
}

function submit(
  fixture: Fixture,
  id: string,
  fields: Record<string, string>,
  options: { admin?: boolean } = {},
) {
  return action({
    request: postRequest(`/admin/talleres/${id}`, fields),
    params: { id },
    context: context(fixture, options),
  } as never);
}

/** A draft assigned to an own teacher with one active turno: publishable. */
async function publishable(fixture: Fixture) {
  const teacher = await seedTeacher(fixture, { name: "Ana", modality: "own" });
  const id = await seedWorkshop(fixture, { teacherId: teacher });
  await fixture.service.addTurno(testAdminActor(), id, TURNO);
  return id;
}

function stored(fixture: Fixture, id: string) {
  const found = fixture.repository.items.get(id);
  if (!found) throw new Error("missing workshop");
  return found;
}

describe("admin workshop detail loader", () => {
  it("loads the workshop as form values with the formatted fee and percentage", async () => {
    const fixture = workshopsFixture();
    const teacher = await seedTeacher(fixture, {
      name: "Beto Ruiz",
      modality: "third_party",
    });
    const id = await seedWorkshop(fixture, {
      teacherId: teacher,
      percentage: "35,5",
    });
    await fixture.service.addTurno(testAdminActor(), id, TURNO);
    expect(await load(fixture, id)).toMatchObject({
      id,
      name: "Cerámica Creativa",
      status: "draft",
      published: false,
      values: {
        name: "Cerámica Creativa",
        slug: "ceramica-creativa",
        summary: "Modelado y torno",
        description: "Un taller para empezar de cero.",
        technique: "Cerámica",
        defaultFee: "12000",
        teacherId: teacher,
        percentage: "35,5",
      },
      teachers: [{ id: teacher, name: "Beto Ruiz", modality: "third_party" }],
      activeTurnos: 1,
      feedback: null,
      readiness: {
        summary: "Falta publicar el taller",
        complete: false,
        next: {
          cta: "Publicar el taller",
          href: `/admin/talleres/${id}#estado`,
        },
      },
    });
  });

  it("reports a feedback code only when it is declared", async () => {
    const fixture = workshopsFixture();
    const id = await seedWorkshop(fixture);
    const known = await loader({
      request: getRequest(`/admin/talleres/${id}?ok=created`),
      params: { id },
      context: context(fixture),
    } as never);
    const unknown = await loader({
      request: getRequest(`/admin/talleres/${id}?ok=nope`),
      params: { id },
      context: context(fixture),
    } as never);
    expect(known.feedback).toBe("created");
    expect(unknown.feedback).toBeNull();
  });

  it("keeps an archived assigned teacher selectable so the form can save", async () => {
    const fixture = workshopsFixture();
    const teacher = await seedTeacher(fixture, {
      name: "Ana",
      modality: "own",
    });
    const id = await seedWorkshop(fixture, { teacherId: teacher });
    await fixture.teachers.service.archive(testAdminActor(), teacher);
    const result = await load(fixture, id);
    expect(result.teachers).toEqual([
      { id: teacher, name: "Ana (archivado)", modality: "own" },
    ]);
  });

  it("answers 404 for an unknown workshop and 503 when unavailable", async () => {
    expect(await thrownStatus(() => load(workshopsFixture(), "nope"))).toBe(
      404,
    );
    expect(
      await thrownStatus(() =>
        loader({
          request: getRequest("/admin/talleres/w1"),
          params: { id: "w1" },
          context: adminContext({
            monthlyWorkshops:
              createUnavailableService<MonthlyWorkshopsService>(),
          }),
        } as never),
      ),
    ).toBe(503);
  });
});

describe("admin workshop detail action", () => {
  it("saves every field as the admin and redirects to the workshop with feedback", async () => {
    const fixture = workshopsFixture();
    const id = await seedWorkshop(fixture);
    const response = await submit(fixture, id, {
      ...WORKSHOP_FIELDS,
      name: "Cerámica Nueva",
      defaultFee: "15000",
    });
    expect((response as Response).headers.get("Location")).toBe(
      `/admin/talleres/${id}?ok=saved`,
    );
    expect(stored(fixture, id)).toMatchObject({
      name: "Cerámica Nueva",
      audit: { updatedBy: "a@x.test" },
    });
    expect(stored(fixture, id).defaultFee.toCentavos()).toBe(1_500_000);
  });

  it("returns 422 with typed values and errors, changing nothing", async () => {
    const fixture = workshopsFixture();
    const id = await seedWorkshop(fixture);
    const result = await submit(fixture, id, {
      ...WORKSHOP_FIELDS,
      slug: "Mal Enlace!",
    });
    expect(result).toMatchObject({
      init: { status: 422 },
      data: {
        values: { slug: "Mal Enlace!" },
        errors: { slug: "El formato no es válido. Revisalo." },
      },
    });
    expect(stored(fixture, id).slug).toBe("ceramica-creativa");
  });

  it("asks to confirm a slug change on a published workshop", async () => {
    const fixture = workshopsFixture();
    const id = await publishable(fixture);
    await submit(fixture, id, { intent: "publish" });
    const refused = await submit(fixture, id, {
      ...WORKSHOP_FIELDS,
      slug: "otro-enlace",
    });
    expect(refused).toMatchObject({ init: { status: 422 } });
    expect(JSON.stringify(refused)).toContain("Marcá la confirmación");
    await submit(fixture, id, {
      ...WORKSHOP_FIELDS,
      slug: "otro-enlace",
      confirmSlugChange: "on",
    });
    expect(stored(fixture, id).slug).toBe("otro-enlace");
  });

  it("publishes a workshop that meets the rules and returns to its page", async () => {
    const fixture = workshopsFixture();
    const id = await publishable(fixture);
    const response = await submit(fixture, id, { intent: "publish" });
    expect((response as Response).headers.get("Location")).toBe(
      `/admin/talleres/${id}?ok=published#estado`,
    );
    expect(stored(fixture, id).status).toBe("published");
  });

  it("names every unmet publish rule and stays draft", async () => {
    const fixture = workshopsFixture();
    const id = await seedWorkshop(fixture);
    const result = await submit(fixture, id, { intent: "publish" });
    expect(result).toMatchObject({
      init: { status: 422 },
      data: {
        stateError:
          "Para publicar falta: un profesor asignado, al menos un turno activo.",
      },
    });
    expect(stored(fixture, id).status).toBe("draft");
  });

  it("refuses a pause from draft with the Spanish state names", async () => {
    const fixture = workshopsFixture();
    const id = await seedWorkshop(fixture);
    expect(await submit(fixture, id, { intent: "pause" })).toMatchObject({
      init: { status: 422 },
      data: { stateError: "No se puede pasar de Borrador a Pausado." },
    });
    expect(stored(fixture, id).status).toBe("draft");
  });

  it("pauses, resumes, archives and restores through the lifecycle", async () => {
    const fixture = workshopsFixture();
    const id = await publishable(fixture);
    const steps: [string, string][] = [
      ["publish", "published"],
      ["pause", "paused"],
      ["publish", "published"],
      ["archive", "archived"],
      ["restore", "draft"],
    ];
    for (const [intent, status] of steps) {
      await submit(fixture, id, { intent });
      expect(stored(fixture, id).status).toBe(status);
    }
  });

  it("deletes a draft without periods and redirects to the list", async () => {
    const fixture = workshopsFixture();
    const id = await seedWorkshop(fixture);
    const response = await submit(fixture, id, { intent: "delete" });
    expect((response as Response).headers.get("Location")).toBe(
      "/admin/talleres?ok=deleted",
    );
    expect(fixture.repository.items.has(id)).toBe(false);
  });

  it("refuses to delete a workshop that is not a draft", async () => {
    const fixture = workshopsFixture();
    const id = await publishable(fixture);
    await submit(fixture, id, { intent: "publish" });
    const refused = await submit(fixture, id, { intent: "delete" });
    expect(refused).toMatchObject({ init: { status: 422 } });
    expect(JSON.stringify(refused)).toContain("período");
    expect(fixture.repository.items.has(id)).toBe(true);
  });

  it("answers 400 to an unknown intent and 404 to an unknown workshop", async () => {
    const fixture = workshopsFixture();
    const id = await seedWorkshop(fixture);
    expect(await thrownStatus(() => submit(fixture, id, { intent: "x" }))).toBe(
      400,
    );
    expect(
      await thrownStatus(() => submit(fixture, "nope", { intent: "archive" })),
    ).toBe(404);
  });

  it("is denied for a non-admin and changes nothing", async () => {
    const fixture = workshopsFixture();
    const id = await seedWorkshop(fixture);
    expect(
      await thrownStatus(() =>
        submit(fixture, id, { intent: "archive" }, { admin: false }),
      ),
    ).toBe(403);
    expect(stored(fixture, id).status).toBe("draft");
  });
});
