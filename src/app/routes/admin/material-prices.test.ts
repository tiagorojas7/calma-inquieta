import { describe, expect, it } from "vitest";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import {
  adminContext,
  getRequest,
  postRequest,
  thrownStatus,
} from "~/testing/admin/route-kit";
import {
  MATERIAL_SUPPLIER_ID,
  materialsFixture,
} from "~/testing/admin/material-kit";
import { action, loader } from "./material-prices";

const actor = testAdminActor();

async function setup() {
  const fixture = await materialsFixture();
  await fixture.service.importCatalog(
    actor,
    MATERIAL_SUPPLIER_ID,
    "Categoría;Producto;Medida;Precio\nTazas;Taza;Chica;1000\nTazas;Taza;A consultar;\n",
  );
  return {
    fixture,
    env: { materials: fixture.service, suppliers: fixture.suppliersService },
  };
}

function submit(
  env: Awaited<ReturnType<typeof setup>>["env"],
  fields: Record<string, string>,
  options: { admin?: boolean } = {},
) {
  return action({
    request: postRequest("/admin/materiales/precios", fields),
    params: {},
    context: adminContext(env, options),
  } as never);
}

describe("admin price raise route", () => {
  it("offers suppliers and categories", async () => {
    const { env } = await setup();
    const result = await loader({
      request: getRequest("/admin/materiales/precios"),
      params: {},
      context: adminContext(env),
    } as never);
    expect(result.categories).toEqual(["Tazas"]);
    expect(result.suppliers).toHaveLength(1);
  });

  it("previews with a comma percentage and changes nothing", async () => {
    const { env, fixture } = await setup();
    const result = (await submit(env, {
      intent: "preview",
      supplierId: MATERIAL_SUPPLIER_ID,
      category: "",
      percent: "10,5",
    })) as { plan: { afterTotal: number; skippedWithoutPrice: number } };
    expect(result.plan).toMatchObject({
      afterTotal: 1105,
      skippedWithoutPrice: 1,
    });
    const stored = [...fixture.repository.materials.values()][0];
    expect(stored?.variants[0]?.price?.toCentavos()).toBe(100000);
  });

  it("applies the raise and redirects with the raised code", async () => {
    const { env, fixture } = await setup();
    const response = (await submit(env, {
      intent: "apply",
      supplierId: "",
      category: "Tazas",
      percent: "10",
    })) as Response;
    expect(response.headers.get("Location")).toBe(
      "/admin/materiales?ok=raised",
    );
    const stored = [...fixture.repository.materials.values()][0];
    expect(stored?.variants.map((v) => v.price?.toCentavos() ?? null)).toEqual([
      110000,
      null,
    ]);
  });

  it("answers 422 for a bad percentage or a missing scope", async () => {
    const { env } = await setup();
    const bad = (await submit(env, {
      intent: "preview",
      supplierId: MATERIAL_SUPPLIER_ID,
      percent: "abc",
    })) as unknown as {
      init: { status: number };
      data: { percentError: string };
    };
    expect(bad.init.status).toBe(422);
    expect(bad.data.percentError).toContain("porcentaje");

    const noScope = (await submit(env, {
      intent: "preview",
      percent: "10",
    })) as unknown as { init: { status: number }; data: { formError: string } };
    expect(noScope.init.status).toBe(422);
    expect(noScope.data.formError).toContain("proveedor o una categoría");
  });

  it("rejects an unknown intent and denies non-admins", async () => {
    const { env } = await setup();
    expect(await thrownStatus(() => submit(env, { intent: "x" }))).toBe(400);
    expect(
      await thrownStatus(() =>
        submit(env, { intent: "preview" }, { admin: false }),
      ),
    ).toBe(403);
  });
});
