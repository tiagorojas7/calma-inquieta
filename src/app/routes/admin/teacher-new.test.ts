import { describe, expect, it } from "vitest";
import { createUnavailableService } from "~/composition/unavailable-service";
import type { TeachersService } from "~/modules/teachers";
import {
  adminContext,
  postRequest,
  teachersFixture,
  thrownStatus,
} from "~/testing/admin/route-kit";
import { action } from "./teacher-new";

const VALID = {
  intent: "save",
  name: "  Lucía Pérez ",
  bioLine: "Ceramista",
  phone: "",
  email: "",
  modality: "own",
};

function submit(
  service: TeachersService,
  fields: Record<string, string>,
  options: { admin?: boolean; headers?: Record<string, string> } = {},
) {
  return action({
    request: postRequest("/admin/profesores/nuevo", fields, options.headers),
    params: {},
    context: adminContext({ teachers: service }, options),
  } as never);
}

describe("admin teacher create action", () => {
  it("creates the teacher as the admin and redirects to the list", async () => {
    const { service, repository } = teachersFixture();
    const response = await submit(service, VALID);
    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(302);
    expect((response as Response).headers.get("Location")).toBe(
      "/admin/profesores",
    );
    const stored = [...repository.teachers.values()];
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      name: "Lucía Pérez",
      active: true,
      audit: { updatedBy: "a@x.test" },
    });
  });

  it("returns 422 with the typed values and Spanish field errors, storing nothing", async () => {
    const { service, repository } = teachersFixture();
    const result = await submit(service, {
      ...VALID,
      name: "   ",
      email: "mal",
    });
    expect(result).toMatchObject({
      init: { status: 422 },
      data: {
        values: { name: "   ", email: "mal", modality: "own" },
        errors: {
          name: "Completá este campo.",
          email: "El formato no es válido. Revisalo.",
        },
        formError: "Revisá los campos marcados e intentá de nuevo.",
      },
    });
    expect(repository.teachers.size).toBe(0);
  });

  it("reports a duplicate active name on the name field", async () => {
    const { service } = teachersFixture();
    await submit(service, VALID);
    const result = await submit(service, { ...VALID, name: "lucía pérez" });
    expect(result).toMatchObject({
      init: { status: 422 },
      data: { errors: { name: "Ya existe uno activo con el mismo nombre." } },
    });
  });

  it("never stores a percentage even when one is posted", async () => {
    const { service, repository } = teachersFixture();
    await submit(service, { ...VALID, percentage: "30" });
    expect(
      Object.keys([...repository.teachers.values()][0] ?? {}),
    ).not.toContain("percentage");
  });

  it("is denied for a non-admin and for a cross-site post", async () => {
    const { service, repository } = teachersFixture();
    expect(
      await thrownStatus(() => submit(service, VALID, { admin: false })),
    ).toBe(403);
    expect(
      await thrownStatus(() =>
        submit(service, VALID, {
          headers: { Origin: "https://evil.example.test" },
        }),
      ),
    ).toBe(403);
    expect(repository.teachers.size).toBe(0);
  });

  it("answers 503 when the service is unavailable", async () => {
    expect(
      await thrownStatus(() =>
        submit(createUnavailableService<TeachersService>(), VALID),
      ),
    ).toBe(503);
  });
});
