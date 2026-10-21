import { describe, expect, it } from "vitest";
import { createUnavailableService } from "~/composition/unavailable-service";
import type { TeachersService } from "~/modules/teachers";
import {
  adminContext,
  getRequest,
  teachersFixture,
  thrownStatus,
} from "~/testing/admin/route-kit";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { loader } from "./teachers";

async function seeded() {
  const { service } = teachersFixture();
  const actor = testAdminActor();
  const base = { phone: "", email: "" };
  await service.create(actor, {
    ...base,
    name: "Beto Ruiz",
    bioLine: "Torno",
    modality: "third_party",
  });
  await service.create(actor, {
    ...base,
    name: "Ana Gómez",
    bioLine: "Cerámica",
    modality: "own",
  });
  const archived = await service.create(actor, {
    ...base,
    name: "Caro Paz",
    bioLine: "Esmaltes",
    modality: "own",
  });
  if (!archived.ok) throw new Error("seed failed");
  await service.archive(actor, archived.value.id);
  return service;
}

function call(
  service: TeachersService,
  query = "",
  options: { admin?: boolean } = {},
) {
  return loader({
    request: getRequest(`/admin/profesores${query}`),
    params: {},
    context: adminContext({ teachers: service }, options),
  } as never);
}

describe("admin teachers list loader", () => {
  it("lists active teachers by name by default", async () => {
    const result = await call(await seeded());
    expect(result.filter).toBe("activos");
    expect(result.rows.map((row) => row.name)).toEqual([
      "Ana Gómez",
      "Beto Ruiz",
    ]);
    expect(result.rows[0]).toMatchObject({
      name: "Ana Gómez",
      modality: "own",
      active: true,
    });
    expect(Object.keys(result.rows[0] ?? {}).sort()).toEqual([
      "active",
      "id",
      "modality",
      "name",
    ]);
  });

  it("filters archived and all teachers from the query", async () => {
    const service = await seeded();
    const archived = await call(service, "?estado=archivados");
    expect(archived.filter).toBe("archivados");
    expect(archived.rows.map((row) => row.name)).toEqual(["Caro Paz"]);
    const all = await call(service, "?estado=todos");
    expect(all.rows).toHaveLength(3);
  });

  it("returns an empty list when there are no teachers", async () => {
    const { service } = teachersFixture();
    expect((await call(service)).rows).toEqual([]);
  });

  it("is denied for a non-admin before reading anything", async () => {
    const status = await thrownStatus(() =>
      call(createUnavailableService<TeachersService>(), "", { admin: false }),
    );
    expect(status).toBe(403);
  });

  it("answers 503 when the teachers service is unavailable", async () => {
    const status = await thrownStatus(() =>
      call(createUnavailableService<TeachersService>()),
    );
    expect(status).toBe(503);
  });
});
