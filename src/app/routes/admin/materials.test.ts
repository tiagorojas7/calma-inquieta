import { describe, expect, it } from "vitest";
import { createUnavailableService } from "~/composition/unavailable-service";
import type { MaterialsService, SuppliersService } from "~/modules/materials";
import {
  adminContext,
  getRequest,
  thrownStatus,
} from "~/testing/admin/route-kit";
import {
  MATERIAL_SUPPLIER_ID,
  materialsFixture,
} from "~/testing/admin/material-kit";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { loader } from "./materials";

const actor = testAdminActor();

const draft = (name: string, category: string) => ({
  name,
  description: "Para pintar",
  category,
  supplierId: MATERIAL_SUPPLIER_ID,
  available: true,
  image: null,
  variants: [{ label: "Única", price: "1000", available: true, swatch: "" }],
});

async function seeded() {
  const { service, suppliersService } = await materialsFixture();
  await service.create(actor, draft("Pincel plano", "Pinceles"));
  await service.create(actor, draft("Bastidor", "Bastidores"));
  const retired = await service.create(actor, draft("Esponja", "Pinceles"));
  if (!retired.ok)
    throw new Error(`seed failed: ${JSON.stringify(retired.error)}`);
  await service.deactivate(actor, retired.value.id);
  return { materials: service, suppliers: suppliersService };
}

interface Env {
  readonly materials: MaterialsService;
  readonly suppliers: SuppliersService;
}

function call(env: Env, query = "", options: { admin?: boolean } = {}) {
  return loader({
    request: getRequest(`/admin/materiales${query}`),
    params: {},
    context: adminContext(env, options),
  } as never);
}

describe("admin materials list loader", () => {
  it("lists active materials by name by default, with the closed projection", async () => {
    const env = await seeded();
    const result = await call(env);
    expect(result.filter).toBe("activos");
    expect(result.rows.map((row) => row.name)).toEqual([
      "Bastidor",
      "Pincel plano",
    ]);
    expect(Object.keys(result.rows[0] ?? {}).sort()).toEqual(
      [
        "available",
        "active",
        "category",
        "id",
        "name",
        "supplierName",
        "variantCount",
      ].sort(),
    );
    expect(result.rows[0]).toMatchObject({
      category: "Bastidores",
      supplierName: "Casa Pincel",
      variantCount: 1,
      active: true,
      available: true,
    });
  });

  it("filters inactive and all materials from the query", async () => {
    const env = await seeded();
    const inactive = await call(env, "?estado=inactivos");
    expect(inactive.filter).toBe("inactivos");
    expect(inactive.rows.map((row) => row.name)).toEqual(["Esponja"]);
    expect((await call(env, "?estado=todos")).rows).toHaveLength(3);
  });

  it("filters by category and supplier, ignoring a malformed supplier id", async () => {
    const env = await seeded();
    const byCategory = await call(env, "?estado=todos&categoria=Pinceles");
    expect(byCategory.category).toBe("Pinceles");
    expect(byCategory.rows.map((row) => row.name)).toEqual([
      "Esponja",
      "Pincel plano",
    ]);
    const bySupplier = await call(env, `?proveedor=${MATERIAL_SUPPLIER_ID}`);
    expect(bySupplier.rows).toHaveLength(2);
    const other = await call(
      env,
      "?proveedor=00000000-0000-4000-8000-0000000000ff",
    );
    expect(other.rows).toEqual([]);
    const malformed = await call(env, "?proveedor=nope");
    expect(malformed.supplierId).toBe("");
    expect(malformed.rows).toHaveLength(2);
  });

  it("offers the categories and suppliers to filter by", async () => {
    const env = await seeded();
    const result = await call(env);
    expect(result.categories).toEqual(["Bastidores", "Pinceles"]);
    expect(result.suppliers).toEqual([
      { value: MATERIAL_SUPPLIER_ID, label: "Casa Pincel" },
    ]);
  });

  it("returns an empty list when there are no materials", async () => {
    const fixture = await materialsFixture();
    const env = {
      materials: fixture.service,
      suppliers: fixture.suppliersService,
    };
    expect((await call(env)).rows).toEqual([]);
  });

  it("is denied for a non-admin and answers 503 when unavailable", async () => {
    const unavailable = createUnavailableService<MaterialsService>();
    expect(
      await thrownStatus(() =>
        call(
          {
            materials: unavailable,
            suppliers: createUnavailableService<SuppliersService>(),
          },
          "",
          { admin: false },
        ),
      ),
    ).toBe(403);
    expect(
      await thrownStatus(() =>
        call({
          materials: unavailable,
          suppliers: createUnavailableService<SuppliersService>(),
        }),
      ),
    ).toBe(503);
  });
});
