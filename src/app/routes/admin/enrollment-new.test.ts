import { describe, expect, it, vi } from "vitest";
import { err, Money, ok } from "~/modules/_shared";
import {
  createUnavailableAdminEnrollmentService,
  type AdminEnrollmentUseCases,
  type PublicEnrollmentUseCases,
} from "~/modules/enrollments";
import type { MaterialsService, StockStore } from "~/modules/materials";
import type {
  MonthlyWorkshopsService,
  WorkshopPeriodsService,
} from "~/modules/workshops";
import { createUnavailableService } from "~/composition/unavailable-service";
import {
  adminContext,
  getRequest,
  postRequest,
  thrownStatus,
  withOverrides,
} from "~/testing/admin/route-kit";
import { action, loader } from "./enrollment-new";

type CreatePending = AdminEnrollmentUseCases["createPending"];

const OFFER = "ceramica|2026-11|t1";
const VALID = {
  offer: OFFER,
  fullName: " Ana Pérez ",
  email: "ana@x.test",
  phone: "351 555 0001",
  fee: "40000",
};

function pesos(value: number): Money {
  const money = Money.fromCentavos(value * 100);
  if (!money.ok) throw new Error("invalid test money");
  return money.value;
}

const saleVariants = [
  {
    materialId: "m-1",
    variantId: "v-1",
    materialName: "Arcilla",
    variantLabel: "1 kg",
    unitPrice: pesos(4000),
  },
  {
    materialId: "m-2",
    variantId: "v-2",
    materialName: "Pincel",
    variantLabel: "Chico",
    unitPrice: pesos(12500),
  },
];

/** The studio holds three units of the clay and none of the brush. */
const onHandOf: StockStore["onHand"] = (variantIds) =>
  Promise.resolve(
    new Map(variantIds.map((id) => [id, id === "v-1" ? 3 : 0] as const)),
  );

function services(
  createPending: CreatePending = vi.fn(),
  listSaleVariants: MaterialsService["listSaleVariants"] = () =>
    Promise.resolve(ok(saleVariants)),
  onHand: StockStore["onHand"] = onHandOf,
) {
  return {
    variantStock: { onHand },
    materials: withOverrides(createUnavailableService<MaterialsService>(), {
      listSaleVariants,
    }),
    enrollments: withOverrides(createUnavailableAdminEnrollmentService(), {
      createPending,
    }),
    monthlyWorkshops: withOverrides(
      createUnavailableService<MonthlyWorkshopsService>(),
      {
        list: () =>
          Promise.resolve(
            ok([
              { id: "w1", name: "Cerámica", acceptsNewRequests: true },
              { id: "w2", name: "Pausado", acceptsNewRequests: false },
            ] as never),
          ),
        get: (_actor: unknown, id: string) =>
          Promise.resolve(ok({ id, slug: "ceramica" } as never)),
      },
    ),
    workshopPeriods: withOverrides(
      createUnavailableService<WorkshopPeriodsService>(),
      {
        list: () =>
          Promise.resolve(
            ok({
              periods: [
                { period: "2026-11", status: "open", activeTurnos: 2 },
                { period: "2026-12", status: "draft", activeTurnos: 2 },
                { period: "2026-10", status: "closed", activeTurnos: 2 },
                { period: "2027-01", status: "open", activeTurnos: 0 },
              ],
              suggestedNext: null,
            } as never),
          ),
      },
    ),
    publicEnrollments: withOverrides(
      createUnavailableService<PublicEnrollmentUseCases>(),
      {
        getOffer: ({ period }: { period: string }) =>
          Promise.resolve(
            ok({
              workshopName: "Cerámica",
              period,
              fee: pesos(58000),
              turnos: [
                { id: "t1", label: "Lunes 18:00" },
                { id: "t2", label: "Martes 10:00" },
              ],
            } as never),
          ),
      },
    ),
  };
}

function submit(
  fields: Record<string, string> | URLSearchParams,
  createPending?: CreatePending,
  options: { admin?: boolean; headers?: Record<string, string> } = {},
) {
  return action({
    request: postRequest(
      "/admin/inscripciones/nueva",
      fields as Record<string, string>,
      options.headers,
    ),
    params: {},
    context: adminContext(services(createPending), options),
  } as never);
}

const order = { number: "CI-2026-0007" } as never;

describe("admin enrollment-new loader", () => {
  it("lists one option per live workshop, open month and turno", async () => {
    const result = await loader({
      request: getRequest("/admin/inscripciones/nueva"),
      params: {},
      context: adminContext(services()),
    } as never);
    expect(result).toEqual({
      prefill: { fullName: "", email: "", phone: "" },
      options: [
        {
          value: "ceramica|2026-11|t1",
          label: "Cerámica · noviembre 2026 · Lunes 18:00",
          fee: "58000",
        },
        {
          value: "ceramica|2026-11|t2",
          label: "Cerámica · noviembre 2026 · Martes 10:00",
          fee: "58000",
        },
      ],
      materials: [
        {
          materialId: "m-1",
          variantId: "v-1",
          name: "Arcilla",
          label: "1 kg",
          unitPrice: 4000,
          priceLabel: "$ 4.000",
          onHand: 3,
        },
        {
          materialId: "m-2",
          variantId: "v-2",
          name: "Pincel",
          label: "Chico",
          unitPrice: 12500,
          priceLabel: "$ 12.500",
          onHand: 0,
        },
      ],
    });
  });

  it("fills her data in when the file sends it, and nothing from anywhere else", async () => {
    const query = new URLSearchParams({
      nombre: " Ana Pérez ",
      email: "ana@x.test",
      telefono: "5493515550001",
      fee: "1",
    });
    const result = await loader({
      request: getRequest(`/admin/inscripciones/nueva?${query.toString()}`),
      params: {},
      context: adminContext(services()),
    } as never);
    expect(result).toMatchObject({
      prefill: {
        fullName: "Ana Pérez",
        email: "ana@x.test",
        phone: "5493515550001",
      },
    });
  });

  it("asks the stock once for every variant it lists", async () => {
    const onHand = vi.fn(onHandOf);
    await loader({
      request: getRequest("/admin/inscripciones/nueva"),
      params: {},
      context: adminContext(
        services(vi.fn(), () => Promise.resolve(ok(saleVariants)), onHand),
      ),
    } as never);
    expect(onHand).toHaveBeenCalledTimes(1);
    expect(onHand).toHaveBeenCalledWith(["v-1", "v-2"]);
  });

  it("offers every variant as 'a pedir' when the stock cannot be read, instead of failing", async () => {
    const result = await loader({
      request: getRequest("/admin/inscripciones/nueva"),
      params: {},
      context: adminContext(
        services(
          vi.fn(),
          () => Promise.resolve(ok(saleVariants)),
          () => Promise.reject(new Error("stock unavailable")),
        ),
      ),
    } as never);
    expect(
      (result as { materials: { onHand: number }[] }).materials.map(
        (variant) => variant.onHand,
      ),
    ).toEqual([0, 0]);
  });

  it("offers only what the materials service lists as sellable, and nothing when none is", async () => {
    const result = await loader({
      request: getRequest("/admin/inscripciones/nueva"),
      params: {},
      context: adminContext(services(vi.fn(), () => Promise.resolve(ok([])))),
    } as never);
    expect(result).toMatchObject({ materials: [] });
  });

  it("answers 503 when the catalog cannot be read", async () => {
    expect(
      await thrownStatus(() =>
        loader({
          request: getRequest("/admin/inscripciones/nueva"),
          params: {},
          context: adminContext(
            services(vi.fn(), () =>
              Promise.resolve(err({ kind: "unavailable" }) as never),
            ),
          ),
        } as never),
      ),
    ).toBe(503);
  });

  it("is denied for a non-admin", async () => {
    expect(
      await thrownStatus(() =>
        loader({
          request: getRequest("/admin/inscripciones/nueva"),
          params: {},
          context: adminContext(services(), { admin: false }),
        } as never),
      ),
    ).toBe(403);
  });
});

describe("admin enrollment-new action", () => {
  it("creates the pending enrollment with fixed policy fields and the chosen fee, then goes to her file at the new record", async () => {
    const createPending = vi.fn<CreatePending>().mockResolvedValue(ok(order));
    const response = (await submit(VALID, createPending)) as Response;
    expect(createPending).toHaveBeenCalledWith(
      expect.anything(),
      {
        slug: "ceramica",
        period: "2026-11",
        turnoId: "t1",
        student: {
          fullName: "Ana Pérez",
          email: "ana@x.test",
          phone: "351 555 0001",
          policyAccepted: true,
          honeypot: "",
        },
        lines: [],
      },
      { fee: pesos(40000) },
    );
    expect(response.status).toBe(302);
    // The one allowed jump: it lands on what was just created.
    expect(response.headers.get("Location")).toBe(
      "/admin/alumnas/ana%40x.test?ok=created#r-ci-2026-0007",
    );
  });

  it('asks for the record to be stored paid in the same creation when "Ya pagó" is checked', async () => {
    const createPending = vi.fn<CreatePending>().mockResolvedValue(ok(order));
    const response = (await submit(
      { ...VALID, paid: "on" },
      createPending,
    )) as Response;
    expect(createPending).toHaveBeenCalledTimes(1);
    expect(createPending).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { fee: pesos(40000), paid: true },
    );
    expect(response.headers.get("Location")).toBe(
      "/admin/alumnas/ana%40x.test?ok=created#r-ci-2026-0007",
    );
  });

  it('keeps "Ya pagó" checked and everything typed when the creation is refused', async () => {
    const createPending = vi
      .fn<CreatePending>()
      .mockResolvedValue(err({ kind: "turno-full" }) as never);
    const result = await submit({ ...VALID, paid: "on" }, createPending);
    expect(result).toMatchObject({
      init: { status: 409 },
      data: { paid: true, values: { fullName: "Ana Pérez", fee: "40000" } },
    });
  });

  it("stores the email of her file in lower case, the way her file is found", async () => {
    const createPending = vi.fn<CreatePending>().mockResolvedValue(ok(order));
    const response = (await submit(
      { ...VALID, email: " Ana@X.Test " },
      createPending,
    )) as Response;
    expect(response.headers.get("Location")).toBe(
      "/admin/alumnas/ana%40x.test?ok=created#r-ci-2026-0007",
    );
  });

  it("accepts $0 for a scholarship and hands it to the service", async () => {
    const createPending = vi.fn<CreatePending>().mockResolvedValue(ok(order));
    const response = (await submit(
      { ...VALID, fee: "0" },
      createPending,
    )) as Response;
    expect(response.status).toBe(302);
    expect(createPending).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { fee: pesos(0) },
    );
  });

  it("returns 422 with a fee field error for an empty or invalid fee and calls nothing", async () => {
    const createPending = vi.fn<CreatePending>();
    expect(await submit({ ...VALID, fee: "" }, createPending)).toMatchObject({
      init: { status: 422 },
      data: {
        values: { fee: "" },
        errors: { fee: "Completá este campo." },
      },
    });
    expect(await submit({ ...VALID, fee: "-5" }, createPending)).toMatchObject({
      init: { status: 422 },
      data: {
        errors: {
          fee: "Ingresá la cuota en pesos enteros, sin centavos; los puntos de miles se aceptan. Por ejemplo: 58000 o 58.000.",
        },
      },
    });
    expect(createPending).not.toHaveBeenCalled();
  });

  it("maps a refused fee from the service to the fee field", async () => {
    const createPending = vi
      .fn<CreatePending>()
      .mockResolvedValue(err({ kind: "invalid-fee" }) as never);
    expect(await submit(VALID, createPending)).toMatchObject({
      init: { status: 422 },
      data: {
        errors: {
          fee: "Ingresá la cuota en pesos enteros, sin centavos; los puntos de miles se aceptan. Por ejemplo: 58000 o 58.000.",
        },
      },
    });
  });

  it("returns 422 with Spanish required errors and calls nothing", async () => {
    const createPending = vi.fn<CreatePending>();
    const result = await submit(
      { ...VALID, fullName: "", phone: "" },
      createPending,
    );
    expect(result).toMatchObject({
      init: { status: 422 },
      data: {
        values: { email: "ana@x.test" },
        errors: {
          fullName: "Completá este campo.",
          phone: "Completá este campo.",
        },
        formError: "Revisá los campos marcados e intentá de nuevo.",
      },
    });
    expect(createPending).not.toHaveBeenCalled();
  });

  it("maps service validation issues to the fields", async () => {
    const createPending = vi.fn<CreatePending>().mockResolvedValue(
      err({
        kind: "invalid",
        issues: [{ field: "email", code: "invalid" }],
      }) as never,
    );
    expect(await submit(VALID, createPending)).toMatchObject({
      init: { status: 422 },
      data: { errors: { email: "Ingresá un email válido." } },
    });
  });

  it.each([
    ["duplicate-order", "Esa alumna ya tiene una inscripción este mes."],
    ["turno-full", "El turno está completo."],
    ["period-closed", "El mes ya está cerrado."],
  ])("answers 409 with a clear message for %s", async (kind, message) => {
    const createPending = vi
      .fn<CreatePending>()
      .mockResolvedValue(err({ kind }) as never);
    const result = await submit(VALID, createPending);
    expect(result).toMatchObject({
      init: { status: 409 },
      data: { values: { fullName: "Ana Pérez", offer: OFFER } },
    });
    expect(
      (result as { data: { formError: string } }).data.formError,
    ).toContain(message);
  });

  it("hands the chosen variants and quantities to the service as lines, with the chosen fee", async () => {
    const createPending = vi.fn<CreatePending>().mockResolvedValue(ok(order));
    const fields = new URLSearchParams(VALID);
    fields.append("line:m-1:v-1", "2");
    fields.append("line:m-2:v-2", " 1 ");
    const response = (await submit(fields, createPending)) as Response;
    expect(response.status).toBe(302);
    expect(createPending).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        lines: [
          { materialId: "m-1", variantId: "v-1", quantity: 2 },
          { materialId: "m-2", variantId: "v-2", quantity: 1 },
        ],
      }),
      { fee: pesos(40000) },
    );
  });

  it("sends no lines when no material was chosen, exactly as before", async () => {
    const createPending = vi.fn<CreatePending>().mockResolvedValue(ok(order));
    await submit(VALID, createPending);
    expect(createPending.mock.calls[0]?.[1].lines).toEqual([]);
    expect(createPending.mock.calls[0]?.[2]).toEqual({ fee: pesos(40000) });
  });

  it("refuses an unreadable quantity as a materials field error and stores nothing", async () => {
    const createPending = vi
      .fn<CreatePending>()
      .mockResolvedValue(
        err({ kind: "invalid-quantity", variantId: "v-1" }) as never,
      );
    const fields = new URLSearchParams(VALID);
    fields.append("line:m-1:v-1", "0");
    const result = await submit(fields, createPending);
    expect(result).toMatchObject({
      init: { status: 422 },
      data: {
        errors: {
          materials: "Cada material lleva entre 1 y 20 unidades enteras.",
        },
        lines: [{ materialId: "m-1", variantId: "v-1", quantity: "0" }],
        formError: "Revisá los campos marcados e intentá de nuevo.",
      },
    });
  });

  it.each([
    [
      { kind: "material-not-offered", materialId: "m-1" },
      "Algún material ya no está disponible o no tiene precio. Quitalo y probá de nuevo.",
    ],
    [
      { kind: "material-unavailable", materialId: "m-1" },
      "Algún material ya no está disponible o no tiene precio. Quitalo y probá de nuevo.",
    ],
    [
      { kind: "invalid-price", variantId: "v-1" },
      "Algún material ya no está disponible o no tiene precio. Quitalo y probá de nuevo.",
    ],
    [
      { kind: "invalid-quantity", variantId: "v-1" },
      "Cada material lleva entre 1 y 20 unidades enteras.",
    ],
    [{ kind: "too-many-lines" }, "Elegí hasta 30 materiales distintos."],
    [
      { kind: "invalid-total" },
      "El total es demasiado grande. Revisá la cuota y los materiales.",
    ],
  ])("maps the refusal %j to the materials field", async (error, message) => {
    const createPending = vi
      .fn<CreatePending>()
      .mockResolvedValue(err(error) as never);
    const fields = new URLSearchParams(VALID);
    fields.append("line:m-1:v-1", "1");
    expect(await submit(fields, createPending)).toMatchObject({
      init: { status: 422 },
      data: {
        errors: { materials: message },
        values: { fullName: "Ana Pérez" },
        lines: [{ materialId: "m-1", variantId: "v-1", quantity: "1" }],
      },
    });
  });

  it("calls nothing when a line field is malformed", async () => {
    const createPending = vi.fn<CreatePending>();
    const fields = new URLSearchParams(VALID);
    fields.append("line:m-1", "1");
    expect(await submit(fields, createPending)).toMatchObject({
      init: { status: 422 },
      data: {
        errors: {
          materials:
            "Algún material ya no está disponible o no tiene precio. Quitalo y probá de nuevo.",
        },
      },
    });
    expect(createPending).not.toHaveBeenCalled();
  });

  it("is denied for a non-admin and for a cross-site post", async () => {
    const createPending = vi.fn<CreatePending>();
    expect(
      await thrownStatus(() => submit(VALID, createPending, { admin: false })),
    ).toBe(403);
    expect(
      await thrownStatus(() =>
        submit(VALID, createPending, {
          headers: { Origin: "https://evil.example.test" },
        }),
      ),
    ).toBe(403);
    expect(createPending).not.toHaveBeenCalled();
  });

  it("answers 503 when the service is unavailable", async () => {
    const createPending = vi
      .fn<CreatePending>()
      .mockResolvedValue(err({ kind: "unavailable" }) as never);
    expect(await thrownStatus(() => submit(VALID, createPending))).toBe(503);
  });
});
