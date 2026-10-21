import { describe, expect, it } from "vitest";
import { createUnavailableService } from "~/composition/unavailable-service";
import type { MonthlyWorkshopsService } from "~/modules/workshops";
import {
  adminContext,
  getRequest,
  postRequest,
  thrownStatus,
  workshopsFixture,
} from "~/testing/admin/route-kit";
import { WORKSHOP_FIELDS, seedTeacher } from "~/testing/admin/workshop-seed";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { action, loader } from "./workshop-new";

type Fixture = ReturnType<typeof workshopsFixture>;

function context(fixture: Fixture, options: { admin?: boolean } = {}) {
  return adminContext(
    { monthlyWorkshops: fixture.service, teachers: fixture.teachers.service },
    options,
  );
}

function submit(
  fixture: Fixture,
  fields: Record<string, string>,
  options: { admin?: boolean; headers?: Record<string, string> } = {},
) {
  return action({
    request: postRequest("/admin/talleres/nuevo", fields, options.headers),
    params: {},
    context: context(fixture, options),
  } as never);
}

describe("admin workshop create loader", () => {
  it("offers only active teachers to assign, with their modality", async () => {
    const fixture = workshopsFixture();
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
  });

  it("is denied for a non-admin", async () => {
    expect(
      await thrownStatus(() =>
        loader({
          request: getRequest("/admin/talleres/nuevo"),
          params: {},
          context: context(workshopsFixture(), { admin: false }),
        } as never),
      ),
    ).toBe(403);
  });
});

describe("admin workshop create action", () => {
  it("creates a draft as the admin, assigned to a third-party teacher with its percentage", async () => {
    const fixture = workshopsFixture();
    const teacherId = await seedTeacher(fixture, {
      name: "Beto Ruiz",
      modality: "third_party",
    });
    const response = await submit(fixture, {
      ...WORKSHOP_FIELDS,
      teacherId,
      percentage: "35,5",
    });
    expect((response as Response).status).toBe(302);
    expect((response as Response).headers.get("Location")).toBe(
      "/admin/talleres",
    );
    expect([...fixture.repository.items.values()]).toMatchObject([
      {
        slug: "ceramica-creativa",
        status: "draft",
        teacherId,
        percentage: { basisPoints: 3550 },
        audit: { updatedBy: "a@x.test" },
      },
    ]);
  });

  it("returns 422 with the typed values and Spanish field errors, storing nothing", async () => {
    const fixture = workshopsFixture();
    const result = await submit(fixture, {
      ...WORKSHOP_FIELDS,
      name: "  ",
      defaultFee: "12,5",
    });
    expect(result).toMatchObject({
      init: { status: 422 },
      data: {
        values: { name: "  ", defaultFee: "12,5", technique: "Cerámica" },
        errors: {
          name: "Completá este campo.",
          defaultFee: "El formato no es válido. Revisalo.",
        },
        formError: "Revisá los campos marcados e intentá de nuevo.",
      },
    });
    expect(fixture.repository.items.size).toBe(0);
  });

  it("rejects a fee of zero as out of range", async () => {
    const fixture = workshopsFixture();
    const result = await submit(fixture, {
      ...WORKSHOP_FIELDS,
      defaultFee: "0",
    });
    expect(result).toMatchObject({
      init: { status: 422 },
      data: {
        errors: { defaultFee: "El valor está fuera del rango permitido." },
      },
    });
  });

  it("words a duplicate slug on the slug field, and a percentage for an own teacher", async () => {
    const fixture = workshopsFixture();
    const own = await seedTeacher(fixture, { name: "Ana", modality: "own" });
    await submit(fixture, WORKSHOP_FIELDS);
    const result = await submit(fixture, {
      ...WORKSHOP_FIELDS,
      teacherId: own,
      percentage: "30",
    });
    expect(result).toMatchObject({
      init: { status: 422 },
      data: {
        errors: {
          slug: "Ese enlace ya lo usa otro taller.",
          percentage: "El porcentaje no corresponde en este caso.",
        },
      },
    });
  });

  it("asks for a percentage when a third-party teacher has none", async () => {
    const fixture = workshopsFixture();
    const teacherId = await seedTeacher(fixture, {
      name: "Beto",
      modality: "third_party",
    });
    const result = await submit(fixture, { ...WORKSHOP_FIELDS, teacherId });
    expect(result).toMatchObject({
      data: { errors: { percentage: "Completá este campo." } },
    });
  });

  it("is denied for a non-admin and for a cross-site post", async () => {
    const fixture = workshopsFixture();
    expect(
      await thrownStatus(() =>
        submit(fixture, WORKSHOP_FIELDS, { admin: false }),
      ),
    ).toBe(403);
    expect(
      await thrownStatus(() =>
        submit(fixture, WORKSHOP_FIELDS, {
          headers: { Origin: "https://evil.example.test" },
        }),
      ),
    ).toBe(403);
    expect(fixture.repository.items.size).toBe(0);
  });

  it("answers 503 when the workshops service is unavailable", async () => {
    const status = await thrownStatus(() =>
      action({
        request: postRequest("/admin/talleres/nuevo", WORKSHOP_FIELDS),
        params: {},
        context: adminContext({
          monthlyWorkshops: createUnavailableService<MonthlyWorkshopsService>(),
        }),
      } as never),
    );
    expect(status).toBe(503);
  });
});
