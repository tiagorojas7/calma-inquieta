import { describe, expect, it, vi } from "vitest";
import { createUnavailableService } from "~/composition/unavailable-service";
import type { MaterialsService, SuppliersService } from "~/modules/materials";
import {
  adminContext,
  getRequest,
  postRequest,
  thrownStatus,
} from "~/testing/admin/route-kit";
import {
  MATERIAL_ASSET,
  MATERIAL_SUPPLIER_ID,
  materialsFixture,
} from "~/testing/admin/material-kit";
import { action, loader } from "./material-new";

const VALID = {
  intent: "save",
  name: "  Pintura acrílica ",
  description: "Para pintar",
  category: " Pinturas ",
  supplierId: MATERIAL_SUPPLIER_ID,
  available: "on",
  variantLabel: "Única",
  variantPrice: "12500",
  variantSwatch: "#AABBCC",
  variantAvailable: "0",
};

type Services = {
  readonly materials: MaterialsService;
  readonly suppliers: SuppliersService;
};

function callLoader(services: Services, options: { admin?: boolean } = {}) {
  return loader({
    request: getRequest("/admin/materiales/nuevo"),
    params: {},
    context: adminContext(services, options),
  } as never);
}

function submit(
  services: Services,
  fields: Record<string, string>,
  options: { admin?: boolean; headers?: Record<string, string> } = {},
) {
  return action({
    request: postRequest("/admin/materiales/nuevo", fields, options.headers),
    params: {},
    context: adminContext(services, options),
  } as never);
}

function submitEntries(
  services: Services,
  fields: readonly [string, string][],
  options: { admin?: boolean; headers?: Record<string, string> } = {},
) {
  return action({
    request: new Request("https://panel.example.test/admin/materiales/nuevo", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: "https://panel.example.test",
        ...options.headers,
      },
      body: new URLSearchParams([...fields]),
    }),
    params: {},
    context: adminContext(services, options),
  } as never);
}

describe("admin material create route", () => {
  it("loads only active suppliers", async () => {
    const fixture = await materialsFixture();
    const supplier = await fixture.suppliers.findById(MATERIAL_SUPPLIER_ID);
    if (!supplier) throw new Error("missing fixture supplier");
    await fixture.suppliers.update({ ...supplier, active: false });

    expect(
      await callLoader({
        materials: fixture.service,
        suppliers: fixture.suppliersService,
      }),
    ).toEqual({ suppliers: [] });
  });

  it("creates and redirects to the materials list", async () => {
    const fixture = await materialsFixture();
    const response = await submit(
      { materials: fixture.service, suppliers: fixture.suppliersService },
      VALID,
    );
    expect((response as Response).status).toBe(302);
    expect((response as Response).headers.get("Location")).toBe(
      "/admin/materiales",
    );
    expect([...fixture.repository.materials.values()]).toMatchObject([
      {
        name: "Pintura acrílica",
        supplier: { id: MATERIAL_SUPPLIER_ID },
        audit: { updatedBy: "a@x.test" },
      },
    ]);
  });

  it("returns 422 errors and preserves image values", async () => {
    const fixture = await materialsFixture();
    const result = await submit(
      { materials: fixture.service, suppliers: fixture.suppliersService },
      {
        ...VALID,
        name: "   ",
        imageAssetId: MATERIAL_ASSET.id,
        imageSrc: "/imagenes/asset-1",
        imageAlt: "Pote de pintura",
      },
    );
    expect(result).toMatchObject({
      init: { status: 422 },
      data: {
        values: {
          name: "   ",
          image: {
            assetId: MATERIAL_ASSET.id,
            src: "/imagenes/asset-1",
            alt: "Pote de pintura",
          },
        },
        errors: { name: "Completá este campo." },
        formError: "Revisá los campos marcados e intentá de nuevo.",
      },
    });
    expect(fixture.repository.materials.size).toBe(0);
  });

  it("maps a dangling image to its field", async () => {
    const fixture = await materialsFixture();
    const result = await submit(
      { materials: fixture.service, suppliers: fixture.suppliersService },
      {
        ...VALID,
        imageAssetId: "missing-image",
        imageSrc: "/imagenes/missing-image",
        imageAlt: "Imagen conservada",
      },
    );
    expect(result).toMatchObject({
      init: { status: 422 },
      data: {
        values: {
          image: {
            assetId: "missing-image",
            src: "/imagenes/missing-image",
            alt: "Imagen conservada",
          },
        },
        errors: {
          image: "Lo que elegiste ya no existe. Elegí otra opción.",
        },
      },
    });
  });

  it.each([
    ["name", "", "Completá este campo."],
    ["description", "", "Completá este campo."],
    ["category", "", "Completá este campo."],
    ["supplierId", "", "Completá este campo."],
  ])("returns 422 for a required %s", async (field, value, message) => {
    const fixture = await materialsFixture();
    const result = await submit(
      { materials: fixture.service, suppliers: fixture.suppliersService },
      { ...VALID, [field]: value },
    );
    expect(result).toMatchObject({
      init: { status: 422 },
      data: { errors: { [field]: message } },
    });
    expect(fixture.repository.materials.size).toBe(0);
  });

  it.each([
    ["0", "Ingresá un precio mayor a cero."],
    ["12,5", "Ingresá solo números, por ejemplo 12500 o 12.500."],
  ])(
    "returns 422 on the variant row for the price %s",
    async (price, message) => {
      const fixture = await materialsFixture();
      const result = await submit(
        { materials: fixture.service, suppliers: fixture.suppliersService },
        { ...VALID, variantPrice: price },
      );
      expect(result).toMatchObject({
        init: { status: 422 },
        data: { errors: { variants: { rows: [{ price: message }] } } },
      });
      expect(fixture.repository.materials.size).toBe(0);
    },
  );

  it.each(["12.500", "$ 12.500", "12500"])(
    "creates a material from the written price %s",
    async (price) => {
      const fixture = await materialsFixture();
      await submit(
        { materials: fixture.service, suppliers: fixture.suppliersService },
        { ...VALID, variantPrice: price, variantSwatch: "" },
      );
      const [created] = [...fixture.repository.materials.values()];
      expect(created?.variants[0]?.price.toCentavos()).toBe(1250000);
      expect(created?.variants[0]?.swatch).toBeNull();
    },
  );

  it("returns 422 on the variant row for a malformed swatch", async () => {
    const fixture = await materialsFixture();
    const result = await submit(
      { materials: fixture.service, suppliers: fixture.suppliersService },
      { ...VALID, variantSwatch: "blue" },
    );
    expect(result).toMatchObject({
      init: { status: 422 },
      data: {
        errors: {
          variants: { rows: [{ swatch: "Elegí un color con el selector." }] },
        },
      },
    });
  });

  it("returns 422 for case-insensitively duplicated variant labels", async () => {
    const fixture = await materialsFixture();
    const result = await submitEntries(
      { materials: fixture.service, suppliers: fixture.suppliersService },
      [
        ...Object.entries(VALID).filter(([key]) => !key.startsWith("variant")),
        ["variantLabel", "Grande"],
        ["variantPrice", "1200"],
        ["variantSwatch", ""],
        ["variantAvailable", "0"],
        ["variantLabel", "grande"],
        ["variantPrice", "1800"],
        ["variantSwatch", ""],
        ["variantAvailable", "1"],
      ],
    );
    expect(result).toMatchObject({
      init: { status: 422 },
      data: {
        errors: {
          variants: {
            rows: [{}, { label: "Ya hay otra variante con ese nombre." }],
          },
        },
      },
    });
  });

  it("returns 422 when an uploaded image has no alternative text", async () => {
    const fixture = await materialsFixture();
    const result = await submit(
      { materials: fixture.service, suppliers: fixture.suppliersService },
      { ...VALID, imageAssetId: MATERIAL_ASSET.id, imageAlt: "" },
    );
    expect(result).toMatchObject({
      init: { status: 422 },
      data: { errors: { image: "Completá este campo." } },
    });
  });

  it("persists a material as unavailable when its availability checkbox is absent", async () => {
    const fixture = await materialsFixture();
    const withoutAvailability = Object.fromEntries(
      Object.entries(VALID).filter(([key]) => key !== "available"),
    );
    await submit(
      { materials: fixture.service, suppliers: fixture.suppliersService },
      withoutAvailability,
    );
    expect([...fixture.repository.materials.values()][0]).toMatchObject({
      available: false,
    });
  });

  it("denies malformed and cross-origin posts before material creation", async () => {
    const fixture = await materialsFixture();
    const create = vi.spyOn(fixture.service, "create");
    const services = {
      materials: fixture.service,
      suppliers: fixture.suppliersService,
    };
    expect(
      await thrownStatus(() =>
        submit(services, { name: "" }, { admin: false }),
      ),
    ).toBe(403);
    expect(
      await thrownStatus(() =>
        submit(services, VALID, {
          headers: { Origin: "https://evil.example.test" },
        }),
      ),
    ).toBe(403);
    expect(create).not.toHaveBeenCalled();
    expect(fixture.repository.materials.size).toBe(0);
  });

  it("denies first and reports service failures", async () => {
    const unavailable = createUnavailableService<MaterialsService>();
    const unavailableSuppliers = createUnavailableService<SuppliersService>();
    const services = {
      materials: unavailable,
      suppliers: unavailableSuppliers,
    };
    expect(
      await thrownStatus(() => callLoader(services, { admin: false })),
    ).toBe(403);
    expect(
      await thrownStatus(() => submit(services, VALID, { admin: false })),
    ).toBe(403);
    expect(await thrownStatus(() => callLoader(services))).toBe(503);
    expect(await thrownStatus(() => submit(services, VALID))).toBe(503);
  });
});
