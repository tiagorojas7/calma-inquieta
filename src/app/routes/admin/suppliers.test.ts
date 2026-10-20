import { describe, expect, it } from "vitest";
import { createUnavailableService } from "~/composition/unavailable-service";
import type { SuppliersService } from "~/modules/materials";
import {
  adminContext,
  getRequest,
  thrownStatus,
} from "~/testing/admin/route-kit";
import { suppliersFixture } from "~/testing/admin/supplier-kit";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { loader } from "./suppliers";

async function seeded() {
  const { service } = suppliersFixture();
  const actor = testAdminActor();
  const base = { phone: "", email: "", notes: "" };
  await service.create(actor, { ...base, name: "Casa Pincel" });
  await service.create(actor, { ...base, name: "Arcilla Sur", phone: "351 5" });
  const archived = await service.create(actor, { ...base, name: "Zeta" });
  if (!archived.ok) throw new Error("seed failed");
  await service.archive(actor, archived.value.id);
  return service;
}

function call(
  service: SuppliersService,
  query = "",
  options: { admin?: boolean } = {},
) {
  return loader({
    request: getRequest(`/admin/materiales/proveedores${query}`),
    params: {},
    context: adminContext({ suppliers: service }, options),
  } as never);
}

describe("admin suppliers list loader", () => {
  it("lists active suppliers by name by default", async () => {
    const result = await call(await seeded());
    expect(result.filter).toBe("activos");
    expect(result.rows.map((row) => row.name)).toEqual([
      "Arcilla Sur",
      "Casa Pincel",
    ]);
    expect(Object.keys(result.rows[0] ?? {}).sort()).toEqual([
      "active",
      "id",
      "name",
      "phone",
    ]);
    expect(result.rows[0]).toMatchObject({ phone: "351 5", active: true });
  });

  it("filters archived and all suppliers from the query", async () => {
    const service = await seeded();
    const archived = await call(service, "?estado=archivados");
    expect(archived.filter).toBe("archivados");
    expect(archived.rows.map((row) => row.name)).toEqual(["Zeta"]);
    expect((await call(service, "?estado=todos")).rows).toHaveLength(3);
  });

  it("returns an empty list when there are no suppliers", async () => {
    const { service } = suppliersFixture();
    expect((await call(service)).rows).toEqual([]);
  });

  it("is denied for a non-admin and answers 503 when unavailable", async () => {
    const unavailable = createUnavailableService<SuppliersService>();
    expect(
      await thrownStatus(() => call(unavailable, "", { admin: false })),
    ).toBe(403);
    expect(await thrownStatus(() => call(unavailable))).toBe(503);
  });
});
