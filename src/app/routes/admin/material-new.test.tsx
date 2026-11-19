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

/** What the short form posts: name, price, how many, and the rest left behind. */
const SHORT = {
  name: "  Pintura acrílica ",
  variantLabel: "Única",
  variantPrice: "12500",
  startingStock: "6",
  supplierId: MATERIAL_SUPPLIER_ID,
  variantSwatch: "",
  variantAvailable: "0",
  available: "on",
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
) {
  return action({
    request: new Request("https://panel.example.test/admin/materiales/nuevo", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: "https://panel.example.test",
      },
      body: new URLSearchParams([...fields]),
    }),
    params: {},
    context: adminContext(services),
  } as never);
}

async function setup() {
  const fixture = await materialsFixture();
  return {
    fixture,
    services: {
      materials: fixture.service,
      suppliers: fixture.suppliersService,
    },
  };
}

describe("admin material create route: the short flow", () => {
  it("loads only active suppliers", async () => {
    const { fixture, services } = await setup();
    const supplier = await fixture.suppliers.findById(MATERIAL_SUPPLIER_ID);
    if (!supplier) throw new Error("missing fixture supplier");
    await fixture.suppliers.update({ ...supplier, active: false });
    expect(await callLoader(services)).toEqual({ suppliers: [] });
  });

  it("creates from name, price and quantity, records the stock and lands on the new material", async () => {
    const { fixture, services } = await setup();
    const response = (await submit(services, SHORT)) as Response;
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "/admin/materiales?ok=created&nuevo=material-1#material-material-1",
    );
    const [created] = [...fixture.repository.materials.values()];
    expect(created).toMatchObject({
      name: "Pintura acrílica",
      supplier: { id: MATERIAL_SUPPLIER_ID },
      audit: { updatedBy: "a@x.test" },
    });
    expect(created?.variants[0]?.price?.toCentavos()).toBe(1250000);
    const variantId = created?.variants[0]?.id ?? "";
    expect(fixture.stock.levels.get(variantId)).toBe(6);
    expect(fixture.stock.adjustments).toMatchObject([
      { variantId, delta: 6, reason: "Stock inicial", by: "a@x.test" },
    ]);
  });

  it("fills the description with the name and the category with General when the short form leaves them out", async () => {
    const { fixture, services } = await setup();
    await submit(services, SHORT);
    expect([...fixture.repository.materials.values()][0]).toMatchObject({
      description: "Pintura acrílica",
      category: "General",
    });
  });

  it("keeps what the owner wrote in the description and the category", async () => {
    const { fixture, services } = await setup();
    await submit(services, {
      ...SHORT,
      description: "Para pintar",
      category: " Pinturas ",
    });
    expect([...fixture.repository.materials.values()][0]).toMatchObject({
      description: "Para pintar",
      category: "Pinturas",
    });
  });

  it.each(["", "0"])(
    "creates the material without moving stock when the quantity is %j",
    async (startingStock) => {
      const { fixture, services } = await setup();
      const response = (await submit(services, {
        ...SHORT,
        startingStock,
      })) as Response;
      expect(response.status).toBe(302);
      expect(fixture.repository.materials.size).toBe(1);
      expect(fixture.stock.adjustments).toEqual([]);
    },
  );

  it.each(["x", "-2", "1.5", "100001"])(
    "refuses the quantity %j on its own field and creates nothing",
    async (startingStock) => {
      const { fixture, services } = await setup();
      const result = await submit(services, { ...SHORT, startingStock });
      expect(result).toMatchObject({
        init: { status: 422 },
        data: {
          values: { name: "  Pintura acrílica ", stock: startingStock },
          errors: { stock: expect.stringMatching(/\S/) as string },
          formError: "No pudimos guardar. Revisá los campos.",
        },
      });
      expect(fixture.repository.materials.size).toBe(0);
      expect(fixture.stock.adjustments).toEqual([]);
    },
  );

  it("keeps the validation of the name, the supplier and the price", async () => {
    const { fixture, services } = await setup();
    expect(await submit(services, { ...SHORT, name: "   " })).toMatchObject({
      init: { status: 422 },
      data: { errors: { name: "Completá este campo." } },
    });
    expect(await submit(services, { ...SHORT, supplierId: "" })).toMatchObject({
      init: { status: 422 },
      data: { errors: { supplierId: "Completá este campo." } },
    });
    expect(
      await submit(services, { ...SHORT, variantPrice: "0" }),
    ).toMatchObject({
      init: { status: 422 },
      data: { errors: { price: "Ingresá un precio mayor a cero." } },
    });
    expect(
      await submit(services, { ...SHORT, variantPrice: "12,5" }),
    ).toMatchObject({
      init: { status: 422 },
      data: {
        errors: { price: "Ingresá solo números, por ejemplo 12500 o 12.500." },
      },
    });
    expect(fixture.repository.materials.size).toBe(0);
    expect(fixture.stock.adjustments).toEqual([]);
  });

  it("refuses a repeated name without recording stock", async () => {
    const { fixture, services } = await setup();
    await submit(services, SHORT);
    const again = await submit(services, SHORT);
    expect(again).toMatchObject({
      init: { status: 422 },
      data: { errors: { name: expect.stringMatching(/\S/) as string } },
    });
    expect(fixture.stock.adjustments).toHaveLength(1);
  });

  it.each(["12.500", "$ 12.500", "12500"])(
    "creates a material from the written price %s",
    async (variantPrice) => {
      const { fixture, services } = await setup();
      await submit(services, { ...SHORT, variantPrice });
      const [created] = [...fixture.repository.materials.values()];
      expect(created?.variants[0]?.price?.toCentavos()).toBe(1250000);
    },
  );

  it("stores the cost and the price on request that were behind Más opciones", async () => {
    const { fixture, services } = await setup();
    await submit(services, {
      ...SHORT,
      variantCost: "8000",
      variantPriceOnRequest: "0",
    });
    const [created] = [...fixture.repository.materials.values()];
    expect(created?.variants[0]?.cost?.toCentavos()).toBe(800000);
    expect(created?.variants[0]?.price).toBeNull();
  });

  it("keeps the photo values when the form comes back with errors", async () => {
    const { services } = await setup();
    const result = await submit(services, {
      ...SHORT,
      name: "   ",
      imageAssetId: MATERIAL_ASSET.id,
      imageSrc: "/imagenes/asset-1",
      imageAlt: "Pote de pintura",
    });
    expect(result).toMatchObject({
      init: { status: 422 },
      data: {
        values: {
          image: {
            assetId: MATERIAL_ASSET.id,
            src: "/imagenes/asset-1",
            alt: "Pote de pintura",
          },
        },
        errors: { name: "Completá este campo." },
      },
    });
  });

  it("maps a dangling image and a missing alternative text to the photo", async () => {
    const { services } = await setup();
    expect(
      await submit(services, {
        ...SHORT,
        imageAssetId: "missing-image",
        imageAlt: "Imagen conservada",
      }),
    ).toMatchObject({
      init: { status: 422 },
      data: {
        errors: { image: "Lo que elegiste ya no existe. Elegí otra opción." },
      },
    });
    expect(
      await submit(services, {
        ...SHORT,
        imageAssetId: MATERIAL_ASSET.id,
        imageAlt: "",
      }),
    ).toMatchObject({
      init: { status: 422 },
      data: { errors: { image: "Completá este campo." } },
    });
  });

  it("persists a material as unavailable when its availability checkbox is absent", async () => {
    const { fixture, services } = await setup();
    const without = Object.fromEntries(
      Object.entries(SHORT).filter(([key]) => key !== "available"),
    );
    await submit(services, without);
    expect([...fixture.repository.materials.values()][0]).toMatchObject({
      available: false,
    });
  });

  it("creates extra variants from Más opciones, with the stock on the first one", async () => {
    const { fixture, services } = await setup();
    const response = (await submitEntries(services, [
      ["name", "Acrílico"],
      ["variantLabel", "Única"],
      ["variantPrice", "1500"],
      ["startingStock", "2"],
      ["supplierId", MATERIAL_SUPPLIER_ID],
      ["variantCost", ""],
      ["variantSwatch", ""],
      ["variantAvailable", "0"],
      ["available", "on"],
      ["variantLabel", "Azul"],
      ["variantPrice", "1800"],
      ["variantCost", "900"],
      ["variantSwatch", ""],
      ["variantAvailable", "1"],
    ])) as Response;
    expect(response.status).toBe(302);
    const [created] = [...fixture.repository.materials.values()];
    expect(created?.variants.map((variant) => variant.label)).toEqual([
      "Única",
      "Azul",
    ]);
    expect(
      created?.variants.map((variant) => variant.price?.toCentavos()),
    ).toEqual([150000, 180000]);
    expect(created?.variants[1]?.cost?.toCentavos()).toBe(90000);
    expect(created?.variants.every((variant) => variant.available)).toBe(true);
    expect(fixture.stock.levels.get(created?.variants[0]?.id ?? "")).toBe(2);
    expect(fixture.stock.levels.get(created?.variants[1]?.id ?? "")).toBe(
      undefined,
    );
  });

  it("reports a repeated variant name on its row", async () => {
    const { fixture, services } = await setup();
    const result = await submitEntries(services, [
      ["name", "Acrílico"],
      ["variantLabel", "Grande"],
      ["variantPrice", "1500"],
      ["startingStock", ""],
      ["supplierId", MATERIAL_SUPPLIER_ID],
      ["variantSwatch", ""],
      ["variantAvailable", "0"],
      ["available", "on"],
      ["variantLabel", "grande"],
      ["variantPrice", "1800"],
      ["variantSwatch", ""],
      ["variantAvailable", "1"],
    ]);
    expect(result).toMatchObject({
      init: { status: 422 },
      data: {
        errors: { extras: [{ label: "Ya hay otra variante con ese nombre." }] },
        values: { extras: [{ label: "grande", price: "1800" }] },
      },
    });
    expect(fixture.repository.materials.size).toBe(0);
  });

  it("denies malformed and cross-origin posts before material creation", async () => {
    const { fixture, services } = await setup();
    const create = vi.spyOn(fixture.service, "createWithStock");
    expect(
      await thrownStatus(() =>
        submit(services, { name: "" }, { admin: false }),
      ),
    ).toBe(403);
    expect(
      await thrownStatus(() =>
        submit(services, SHORT, {
          headers: { Origin: "https://evil.example.test" },
        }),
      ),
    ).toBe(403);
    expect(create).not.toHaveBeenCalled();
    expect(fixture.repository.materials.size).toBe(0);
  });

  it("denies first and reports service failures", async () => {
    const services = {
      materials: createUnavailableService<MaterialsService>(),
      suppliers: createUnavailableService<SuppliersService>(),
    };
    expect(
      await thrownStatus(() => callLoader(services, { admin: false })),
    ).toBe(403);
    expect(
      await thrownStatus(() => submit(services, SHORT, { admin: false })),
    ).toBe(403);
    expect(await thrownStatus(() => callLoader(services))).toBe(503);
    expect(await thrownStatus(() => submit(services, SHORT))).toBe(503);
  });
});
