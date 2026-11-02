import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createUnavailableService } from "~/composition/unavailable-service";
import type { MaterialsService, SuppliersService } from "~/modules/materials";
import {
  adminContext,
  getRequest,
  ORIGIN,
  postRequest,
  thrownStatus,
} from "~/testing/admin/route-kit";
import {
  MATERIAL_SUPPLIER_ID,
  materialsFixture,
} from "~/testing/admin/material-kit";
import { action, loader } from "./material-import";

const HEADER = "Categoría;Producto;Medida;Precio";
const OCTOBER = readFileSync(
  new URL(
    "../../../../docs/materials/catalogo-octubre-2026.csv",
    import.meta.url,
  ),
  "utf8",
);

interface Env {
  readonly materials: MaterialsService;
  readonly suppliers: SuppliersService;
}

async function setup() {
  const fixture = await materialsFixture();
  return {
    fixture,
    env: { materials: fixture.service, suppliers: fixture.suppliersService },
  };
}

function submit(
  env: Env,
  fields: Record<string, string>,
  options: { admin?: boolean } = {},
) {
  return action({
    request: postRequest("/admin/materiales/importar", fields),
    params: {},
    context: adminContext(env, options),
  } as never);
}

function submitFile(env: Env, supplierId: string, file: File) {
  const body = new FormData();
  body.set("intent", "preview");
  body.set("supplierId", supplierId);
  body.set("file", file);
  return action({
    request: new Request(`${ORIGIN}/admin/materiales/importar`, {
      method: "POST",
      headers: { Origin: ORIGIN },
      body,
    }),
    params: {},
    context: adminContext(env),
  } as never);
}

describe("admin catalog import route", () => {
  it("offers the active suppliers", async () => {
    const { env } = await setup();
    const result = await loader({
      request: getRequest("/admin/materiales/importar"),
      params: {},
      context: adminContext(env),
    } as never);
    expect(result.suppliers).toEqual([
      { id: MATERIAL_SUPPLIER_ID, name: "Casa Pincel" },
    ]);
  });

  it("previews pasted text without writing anything", async () => {
    const { env, fixture } = await setup();
    const result = (await submit(env, {
      intent: "preview",
      supplierId: MATERIAL_SUPPLIER_ID,
      csv: `${HEADER}\nTazas;Taza;Grande;1000\n`,
    })) as { plan: { newMaterials: number }; values: { csv: string } };
    expect(result.plan.newMaterials).toBe(1);
    expect(result.values.csv).toContain("Taza");
    expect(fixture.repository.materials.size).toBe(0);
  });

  it("previews an uploaded file and uses it over the pasted text", async () => {
    const { env } = await setup();
    const result = (await submitFile(
      env,
      MATERIAL_SUPPLIER_ID,
      new File([OCTOBER], "catalogo.csv", { type: "text/csv" }),
    )) as { plan: { newMaterials: number; newVariants: number } };
    expect(result.plan).toMatchObject({ newMaterials: 95, newVariants: 189 });
  });

  it("applies the import and redirects with the imported code", async () => {
    const { env, fixture } = await setup();
    const response = (await submit(env, {
      intent: "apply",
      supplierId: MATERIAL_SUPPLIER_ID,
      csv: OCTOBER,
    })) as Response;
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "/admin/materiales?ok=imported",
    );
    const stored = [...fixture.repository.materials.values()];
    expect(stored).toHaveLength(95);
    expect(stored.flatMap((material) => material.variants)).toHaveLength(189);
  });

  it("refuses to apply while the file still has errors", async () => {
    const { env, fixture } = await setup();
    const result = (await submit(env, {
      intent: "apply",
      supplierId: MATERIAL_SUPPLIER_ID,
      csv: `${HEADER}\nTazas;Taza;Grande;abc\n`,
    })) as unknown as { init: { status: number }; data: { formError: string } };
    expect(result.init.status).toBe(422);
    expect(result.data.formError).toContain("errores");
    expect(fixture.repository.materials.size).toBe(0);
  });

  it("returns 422 messages for a missing supplier, empty input, a bad header and a big file", async () => {
    const { env } = await setup();
    const status = async (fields: Record<string, string>) => {
      const result = (await submit(env, fields)) as unknown as {
        init: { status: number };
        data: Record<string, string>;
      };
      return [result.init.status, result.data] as const;
    };
    expect(
      await status({ intent: "preview", supplierId: "", csv: "x" }),
    ).toEqual([
      422,
      expect.objectContaining({ supplierError: "Elegí un proveedor." }),
    ]);
    expect(
      await status({
        intent: "preview",
        supplierId: MATERIAL_SUPPLIER_ID,
        csv: " ",
      }),
    ).toEqual([
      422,
      expect.objectContaining({ csvError: expect.any(String) as unknown }),
    ]);
    expect(
      await status({
        intent: "preview",
        supplierId: MATERIAL_SUPPLIER_ID,
        csv: "Producto;Precio\nA;1",
      }),
    ).toEqual([
      422,
      expect.objectContaining({
        csvError: expect.stringContaining("Categoría;Producto") as unknown,
      }),
    ]);

    const big = (await submitFile(
      env,
      MATERIAL_SUPPLIER_ID,
      new File(["x".repeat(1_000_001)], "big.csv"),
    )) as unknown as { init: { status: number }; data: { csvError: string } };
    expect(big.init.status).toBe(422);
    expect(big.data.csvError).toContain("1 MB");
  });

  it("rejects an unknown intent with 400 and denies non-admins", async () => {
    const { env } = await setup();
    expect(await thrownStatus(() => submit(env, { intent: "nope" }))).toBe(400);
    expect(
      await thrownStatus(() =>
        submit(
          {
            materials: createUnavailableService<MaterialsService>(),
            suppliers: env.suppliers,
          },
          { intent: "preview" },
          { admin: false },
        ),
      ),
    ).toBe(403);
  });
});
