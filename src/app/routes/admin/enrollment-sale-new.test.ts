import { describe, expect, it, vi } from "vitest";
import { err, Money, ok } from "~/modules/_shared";
import {
  createUnavailableAdminEnrollmentService,
  type AdminEnrollmentDetail,
  type AdminEnrollmentUseCases,
} from "~/modules/enrollments";
import type { MaterialsService, StockStore } from "~/modules/materials";
import { createUnavailableService } from "~/composition/unavailable-service";
import {
  adminContext,
  getRequest,
  postRequest,
  thrownStatus,
  withOverrides,
} from "~/testing/admin/route-kit";
import { action, loader } from "./enrollment-sale-new";

type CreateSale = AdminEnrollmentUseCases["createMaterialSale"];

const ID = "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b";
const SALE_ID = "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f";
const PATH = `/admin/inscripciones/${ID}/venta-nueva`;

function pesos(value: number): Money {
  const money = Money.fromCentavos(value * 100);
  if (!money.ok) throw new Error("invalid test money");
  return money.value;
}

const record = {
  id: ID,
  number: "CI-2026-0007",
  status: "paid",
  kind: "enrollment",
  workshopName: "Cerámica",
  period: "2026-11",
  turnoLabel: "Lunes",
  startsAt: "10:00",
  endsAt: "12:00",
  student: {
    fullName: "Ana Pérez",
    email: "ana@example.com",
    phoneDigits: "5493515550000",
  },
} as unknown as AdminEnrollmentDetail;

const saleVariants = [
  {
    materialId: "m-1",
    variantId: "v-1",
    materialName: "Arcilla",
    variantLabel: "1 kg",
    unitPrice: pesos(4000),
    keptInStudio: true,
  },
];
const onHand: StockStore["onHand"] = (ids) =>
  Promise.resolve(new Map(ids.map((id) => [id, 3] as const)));

function services(
  overrides: Partial<AdminEnrollmentUseCases> = {},
  listSaleVariants: MaterialsService["listSaleVariants"] = () =>
    Promise.resolve(ok(saleVariants)),
) {
  return {
    variantStock: { onHand },
    materials: withOverrides(createUnavailableService<MaterialsService>(), {
      listSaleVariants,
    }),
    enrollments: withOverrides(createUnavailableAdminEnrollmentService(), {
      detail: () => Promise.resolve(ok(record)),
      ...overrides,
    }),
  };
}

const load = (
  overrides: Partial<AdminEnrollmentUseCases> = {},
  options: { admin?: boolean; id?: string } = {},
) =>
  loader({
    request: getRequest(PATH),
    params: { id: options.id ?? ID },
    context: adminContext(services(overrides), options),
  } as never);

function submit(
  fields: Record<string, string> | URLSearchParams,
  createMaterialSale?: CreateSale,
  options: { admin?: boolean } = {},
) {
  return action({
    request: postRequest(PATH, fields as Record<string, string>),
    params: { id: ID },
    context: adminContext(
      services(createMaterialSale ? { createMaterialSale } : {}),
      options,
    ),
  } as never);
}

const chosen = (...lines: [string, string][]) => {
  const fields = new URLSearchParams();
  for (const [name, value] of lines) fields.append(name, value);
  return fields;
};

describe("admin material sale loader", () => {
  it("shows whose record the sale goes under and the catalog with the units on hand", async () => {
    await expect(load()).resolves.toEqual({
      order: {
        id: ID,
        number: "CI-2026-0007",
        studentName: "Ana Pérez",
        workshopName: "Cerámica",
        month: "noviembre 2026",
      },
      materials: [
        {
          materialId: "m-1",
          variantId: "v-1",
          name: "Arcilla",
          label: "1 kg",
          unitPrice: 4000,
          priceLabel: "$ 4.000",
          onHand: 3,
          keptInStudio: true,
        },
      ],
    });
  });

  it("sends the owner back to the record when it cannot take a sale", async () => {
    for (const unsellable of [
      { ...record, status: "cancelled" },
      { ...record, kind: "material_sale" },
    ] as AdminEnrollmentDetail[]) {
      const response = (await load({
        detail: () => Promise.resolve(ok(unsellable)),
      }).catch((thrown: unknown) => thrown)) as Response;
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe(
        `/admin/inscripciones/${ID}`,
      );
    }
  });

  it.each([
    [
      "an unknown record",
      { detail: () => Promise.resolve(err({ kind: "not-found" })) },
      404,
    ],
    [
      "a service that is down",
      { detail: () => Promise.resolve(err({ kind: "unavailable" })) },
      503,
    ],
  ] as const)(
    "answers %s with its status",
    async (_name, overrides, status) => {
      expect(await thrownStatus(() => load(overrides as never))).toBe(status);
    },
  );

  it("answers 404 to an id that is not a record id and 403 to a non-admin", async () => {
    expect(await thrownStatus(() => load({}, { id: "nope" }))).toBe(404);
    expect(await thrownStatus(() => load({}, { admin: false }))).toBe(403);
  });
});

describe("admin material sale action", () => {
  it("creates the sale from the chosen lines and opens it", async () => {
    const createMaterialSale = vi
      .fn<CreateSale>()
      .mockResolvedValue(ok({ id: SALE_ID, number: "CI-2026-0009" }));

    const response = (await submit(
      chosen(["line:m-1:v-1", "2"], ["line:m-2:v-2", " 1 "]),
      createMaterialSale,
    )) as Response;

    expect(createMaterialSale).toHaveBeenCalledWith(expect.anything(), {
      orderId: ID,
      lines: [
        { materialId: "m-1", variantId: "v-1", quantity: 2 },
        { materialId: "m-2", variantId: "v-2", quantity: 1 },
      ],
    });
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      `/admin/inscripciones/${SALE_ID}?ok=sale-created`,
    );
  });

  it("asks for at least one material, without calling the service", async () => {
    const createMaterialSale = vi.fn<CreateSale>();

    expect(await submit(chosen(), createMaterialSale)).toMatchObject({
      init: { status: 422 },
      data: { errors: { materials: "Elegí al menos un material." } },
    });
    expect(createMaterialSale).not.toHaveBeenCalled();
  });

  it("keeps the chosen lines and explains a refused quantity or material", async () => {
    for (const [failure, message] of [
      [
        { kind: "invalid-quantity", variantId: "v-1" },
        "Cada material lleva entre 1 y 20 unidades enteras.",
      ],
      [
        { kind: "material-unavailable", materialId: "m-1" },
        "Algún material ya no está disponible o no tiene precio. Quitalo y probá de nuevo.",
      ],
    ] as const) {
      const createMaterialSale = vi
        .fn<CreateSale>()
        .mockResolvedValue(err(failure));
      expect(
        await submit(chosen(["line:m-1:v-1", "0"]), createMaterialSale),
      ).toMatchObject({
        init: { status: 422 },
        data: {
          errors: { materials: message },
          lines: [{ materialId: "m-1", variantId: "v-1", quantity: "0" }],
        },
      });
    }
  });

  it("answers 409 when the record can no longer take a sale", async () => {
    const createMaterialSale = vi
      .fn<CreateSale>()
      .mockResolvedValue(err({ kind: "not-sellable" }) as never);

    const result = await submit(
      chosen(["line:m-1:v-1", "1"]),
      createMaterialSale,
    );

    expect(result).toMatchObject({
      init: { status: 409 },
      data: {
        formError:
          "Esta inscripción está cancelada: ya no admite ventas de materiales.",
      },
    });
  });

  it.each([
    ["not-found", 404],
    ["unavailable", 503],
    ["denied", 403],
  ] as const)("fails closed on %s", async (kind, status) => {
    const createMaterialSale = vi
      .fn<CreateSale>()
      .mockResolvedValue(err({ kind }));

    expect(
      await thrownStatus(() =>
        submit(chosen(["line:m-1:v-1", "1"]), createMaterialSale),
      ),
    ).toBe(status);
  });

  it("does not create a sale for a request that is not an admin", async () => {
    const createMaterialSale = vi.fn<CreateSale>();

    expect(
      await thrownStatus(() =>
        submit(chosen(["line:m-1:v-1", "1"]), createMaterialSale, {
          admin: false,
        }),
      ),
    ).toBe(403);
    expect(createMaterialSale).not.toHaveBeenCalled();
  });
});
