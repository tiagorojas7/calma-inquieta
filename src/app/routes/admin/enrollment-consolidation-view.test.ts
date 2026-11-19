import { describe, expect, it, vi } from "vitest";
import { err, Money, ok } from "~/modules/_shared";
import {
  createUnavailableAdminEnrollmentService,
  createUnavailableSupplierConsolidationService,
  type AdminEnrollmentUseCases,
  type DeliveryOrder,
  type SupplierConsolidation,
  type SupplierConsolidationUseCases,
} from "~/modules/enrollments";
import {
  adminContext,
  getRequest,
  ORIGIN,
  postRequest,
  thrownStatus,
  withOverrides,
} from "~/testing/admin/route-kit";
import {
  consolidationAction as action,
  loadConsolidation as loader,
} from "./enrollment-consolidation-view";

function pesos(value: number): Money {
  const money = Money.fromCentavos(value * 100);
  if (!money.ok) throw new Error("invalid test money");
  return money.value;
}

const consolidation: SupplierConsolidation = {
  period: "2026-11",
  suppliers: [
    {
      supplierId: "s1",
      supplierName: "Papelería Sur",
      materials: [
        {
          materialName: "Arcilla",
          variantLabel: "Grande",
          quantity: 3,
          total: pesos(3_000),
        },
      ],
      total: pesos(3_000),
      summary:
        "Pedido a Papelería Sur\nMes: noviembre 2026\n- Arcilla Grande x3",
      pendingRequestOrderIds: ["o1", "o2"],
    },
  ],
  grandTotal: pesos(3_000),
  pendingOrders: 2,
};

type Consolidate = SupplierConsolidationUseCases["consolidate"];
type Deliveries = SupplierConsolidationUseCases["deliveries"];
type Bulk = AdminEnrollmentUseCases["markMaterialsRequestedBulk"];
type MarkWorkshop = SupplierConsolidationUseCases["markWorkshopOrdered"];

const deliveryOrder = (overrides: Partial<DeliveryOrder>): DeliveryOrder => ({
  id: "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b",
  number: "CI-2026-0001",
  status: "materials_requested",
  studentName: "Ana Pérez",
  phoneDigits: "5493515550001",
  workshopName: "Cerámica",
  turnoLabel: "Lunes 18:00",
  lines: [
    {
      materialName: "Arcilla",
      variantLabel: "Grande",
      quantity: 2,
      supplierName: "Papelería Sur",
      unitPrice: pesos(1_000),
    },
    {
      materialName: "Esmalte",
      variantLabel: "Azul",
      quantity: 1,
      supplierName: "Papelería Sur",
      unitPrice: pesos(1_000),
    },
  ],
  ...overrides,
});

function services(overrides: {
  consolidate?: Consolidate;
  deliveries?: Deliveries;
  bulk?: Bulk;
  received?: Bulk;
  markWorkshop?: MarkWorkshop;
}) {
  return {
    consolidation: withOverrides(
      createUnavailableSupplierConsolidationService(),
      {
        ...(overrides.consolidate
          ? { consolidate: overrides.consolidate }
          : {}),
        deliveries: overrides.deliveries ?? (() => Promise.resolve(ok([]))),
        ...(overrides.markWorkshop
          ? { markWorkshopOrdered: overrides.markWorkshop }
          : {}),
      },
    ),
    enrollments: withOverrides(createUnavailableAdminEnrollmentService(), {
      ...(overrides.bulk ? { markMaterialsRequestedBulk: overrides.bulk } : {}),
      ...(overrides.received
        ? { markMaterialsReceivedBulk: overrides.received }
        : {}),
    }),
  };
}

function load(
  consolidate: Consolidate,
  path = "/admin/inscripciones/materiales?mes=2026-11",
  admin = true,
  deliveries?: Deliveries,
) {
  return loader({
    request: getRequest(path),
    params: {},
    context: adminContext(
      services({ consolidate, ...(deliveries ? { deliveries } : {}) }),
      { admin },
    ),
  } as never);
}

function submit(
  bulk: Bulk,
  fields: [string, string][],
  options: { admin?: boolean; headers?: Record<string, string> } = {},
  received?: Bulk,
) {
  const request = postRequest(
    "/admin/inscripciones/materiales",
    {},
    options.headers ?? { Origin: ORIGIN },
  );
  const body = new URLSearchParams(fields);
  return action({
    request: new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body,
    }),
    params: {},
    context: adminContext(
      services({ bulk, ...(received ? { received } : {}) }),
      options.admin === undefined ? {} : { admin: options.admin },
    ),
  } as never);
}

describe("admin supplier consolidation loader", () => {
  it("projects suppliers, totals and the pending count for the month", async () => {
    const consolidate = vi
      .fn<Consolidate>()
      .mockResolvedValue(ok(consolidation));
    const result = await load(consolidate);

    expect(consolidate).toHaveBeenCalledWith(expect.anything(), "2026-11");
    expect(result).toMatchObject({
      period: "2026-11",
      periodLabel: "noviembre 2026",
      grandTotal: "$ 3.000",
      pendingOrders: 2,
      suppliers: [
        {
          supplierId: "s1",
          supplierName: "Papelería Sur",
          materials: [{ label: "Arcilla Grande", quantity: 3 }],
          total: "$ 3.000",
          summary: consolidation.suppliers[0]?.summary,
          orderIds: ["o1", "o2"],
        },
      ],
    });
  });

  it("names the workshop on its lines, keeps monthly lines as they were and counts the workshop in Para pedir", async () => {
    const withWorkshop: SupplierConsolidation = {
      ...consolidation,
      suppliers: [
        {
          supplierId: "s1",
          supplierName: "Papelería Sur",
          materials: [
            ...(consolidation.suppliers[0]?.materials ?? []),
            {
              materialName: "Arcilla",
              variantLabel: "Grande",
              quantity: 2,
              total: pesos(600),
              origin: "Torno intensivo",
              originId: "w1",
            },
          ],
          total: pesos(3_600),
          summary: "Pedido a Papelería Sur",
          pendingRequestOrderIds: [],
        },
      ],
      grandTotal: pesos(3_600),
    };
    const result = await load(
      vi.fn<Consolidate>().mockResolvedValue(ok(withWorkshop)),
    );

    expect(result).toMatchObject({
      counts: { pedir: 1, entregar: 0 },
      suppliers: [
        {
          materials: [
            { label: "Arcilla Grande", quantity: 3 },
            {
              label: "Arcilla Grande",
              quantity: 2,
              origin: "Torno intensivo",
              originId: "w1",
            },
          ],
          orderIds: [],
        },
      ],
    });
    const monthly = await load(
      vi.fn<Consolidate>().mockResolvedValue(ok(consolidation)),
    );
    if (!("suppliers" in monthly)) throw new Error("expected data");
    expect(monthly.suppliers[0]?.materials).toStrictEqual([
      { label: "Arcilla Grande", quantity: 3 },
    ]);
    expect(monthly.counts.pedir).toBe(2);
  });

  it("tells each workshop row apart by id and counts two workshops with the same name twice", async () => {
    const materials = ["w1", "w2"].map((originId) => ({
      materialName: "Arcilla",
      variantLabel: "Grande",
      quantity: 1,
      total: pesos(300),
      origin: "Torno intensivo",
      originId,
    }));
    const result = await load(
      vi.fn<Consolidate>().mockResolvedValue(
        ok({
          ...consolidation,
          suppliers: [
            {
              supplierId: "s1",
              supplierName: "Papelería Sur",
              materials,
              total: pesos(600),
              summary: "Pedido a Papelería Sur",
              pendingRequestOrderIds: [],
            },
          ],
        }),
      ),
    );

    expect(result).toMatchObject({
      counts: { pedir: 2, entregar: 0 },
      suppliers: [
        {
          materials: [
            { origin: "Torno intensivo", originId: "w1" },
            { origin: "Torno intensivo", originId: "w2" },
          ],
        },
      ],
    });
  });

  it("defaults to the current Córdoba month when none is given", async () => {
    const consolidate = vi
      .fn<Consolidate>()
      .mockResolvedValue(ok({ ...consolidation, suppliers: [] }));
    await load(consolidate, "/admin/inscripciones/materiales");

    expect(consolidate).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringMatching(/^\d{4}-\d{2}$/),
    );
  });

  it("shows how many orders were just marked, only for known codes", async () => {
    const consolidate = vi
      .fn<Consolidate>()
      .mockResolvedValue(ok(consolidation));
    const path = "/admin/inscripciones/materiales?mes=2026-11";
    const noticeOf = async (query: string) =>
      (await load(consolidate, path + query)).notice;

    expect(await noticeOf("&ok=requested&n=2")).toEqual({
      kind: "requested",
      count: 2,
    });
    expect(await noticeOf("&ok=received&n=3")).toEqual({
      kind: "received",
      count: 3,
    });
    expect(await noticeOf("&ok=workshop-requested&n=2")).toEqual({
      kind: "workshop-requested",
      count: 2,
    });
    expect(await noticeOf("&ok=hacked&n=3")).toBeNull();
    expect(await noticeOf("&ok=received&n=-1")).toBeNull();
    expect(await noticeOf("&ok=received&n=abc")).toBeNull();
  });

  it("lists the workshops each supplier is owed lines for, once each", async () => {
    const result = await load(
      vi.fn<Consolidate>().mockResolvedValue(
        ok({
          ...consolidation,
          suppliers: [
            {
              ...(consolidation
                .suppliers[0] as SupplierConsolidation["suppliers"][number]),
              materials: [
                {
                  materialName: "Arcilla",
                  variantLabel: "Grande",
                  quantity: 2,
                  total: pesos(600),
                  origin: "Torno",
                  originId: "w1",
                },
                {
                  materialName: "Esmalte",
                  variantLabel: "Azul",
                  quantity: 1,
                  total: pesos(300),
                  origin: "Torno",
                  originId: "w1",
                },
              ],
            },
          ],
        }),
      ),
    );
    expect(result.suppliers[0]?.workshops).toStrictEqual([
      { id: "w1", name: "Torno" },
    ]);
  });

  it("projects each student order with her own lines and WhatsApp link", async () => {
    const deliveries = vi.fn<Deliveries>().mockResolvedValue(
      ok([
        deliveryOrder({}),
        deliveryOrder({
          id: "1c9a6d2f-5e4b-4a7c-8b8f-2d3e4f5a6b7c",
          studentName: "Bea Gómez",
          phoneDigits: "",
          lines: [
            {
              materialName: "Pincel",
              variantLabel: "Fino",
              quantity: 3,
              supplierName: "Papelería Sur",
              unitPrice: pesos(1_000),
            },
          ],
        }),
        deliveryOrder({
          id: "2d0b7e30-6f5c-4b8d-9c90-3e4f5a6b7c8d",
          status: "materials_received",
          studentName: "Cata Díaz",
        }),
        // A paid order still to request belongs to the record, not to the cards.
        deliveryOrder({
          id: "3e1c8f41-7a6d-4c9e-8da1-4f5a6b7c8d9e",
          status: "paid",
          studentName: "Dora Paga",
        }),
      ]),
    );
    const result = await load(
      vi.fn<Consolidate>().mockResolvedValue(ok(consolidation)),
      "/admin/inscripciones/materiales?mes=2026-11&seccion=entregar",
      true,
      deliveries,
    );

    expect(deliveries).toHaveBeenCalledWith(expect.anything(), "2026-11");
    expect(result.toDeliver).toEqual([
      {
        id: "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b",
        studentName: "Ana Pérez",
        detail: "Cerámica · Lunes 18:00",
        lines: [
          { label: "Arcilla Grande", quantity: 2 },
          { label: "Esmalte Azul", quantity: 1 },
        ],
        whatsappHref: expect.stringContaining(
          "https://wa.me/5493515550001",
        ) as string,
      },
      {
        id: "1c9a6d2f-5e4b-4a7c-8b8f-2d3e4f5a6b7c",
        studentName: "Bea Gómez",
        detail: "Cerámica · Lunes 18:00",
        lines: [{ label: "Pincel Fino", quantity: 3 }],
        whatsappHref: undefined,
      },
    ]);
    expect(result.delivered.map((card) => card.studentName)).toEqual([
      "Cata Díaz",
    ]);
    expect(result.counts).toEqual({ pedir: 2, entregar: 2 });
  });

  it("hands over a material sale from the same list, named as a sale of its workshop", async () => {
    const deliveries = vi.fn<Deliveries>().mockResolvedValue(
      ok([
        deliveryOrder({
          id: "4f2d9052-8b7e-4dae-9eb2-5a6b7c8d9eaf",
          kind: "material_sale",
          status: "materials_requested",
          studentName: "Ana Pérez",
        }),
      ]),
    );

    const result = await load(
      vi.fn<Consolidate>().mockResolvedValue(ok(consolidation)),
      "/admin/inscripciones/materiales?mes=2026-11&seccion=entregar",
      true,
      deliveries,
    );

    expect(result.toDeliver).toMatchObject([
      { studentName: "Ana Pérez", detail: "Venta de materiales · Cerámica" },
    ]);
  });

  it("hands over a paid order whose lines all come from stock, marked as such, and leaves paid supplier orders out", async () => {
    const stockLine = (source: "stock" | "supplier") => ({
      materialName: "Arcilla",
      variantLabel: "Grande",
      quantity: 2,
      supplierName: "Papelería Sur",
      unitPrice: pesos(1_000),
      source,
    });
    const deliveries = vi.fn<Deliveries>().mockResolvedValue(
      ok([
        deliveryOrder({
          id: "4f2d9052-8b7e-4daf-9eb2-5a6b7c8d9eaf",
          status: "paid",
          studentName: "Eva Stock",
          lines: [stockLine("stock")],
        }),
        deliveryOrder({
          id: "5a3e0163-9c8f-4eb0-8fc3-6b7c8d9eafb0",
          status: "paid",
          studentName: "Fina Mixta",
          lines: [stockLine("stock"), stockLine("supplier")],
        }),
        deliveryOrder({
          id: "6b4f1274-ad90-4fc1-9ad4-7c8d9eafb0c1",
          status: "materials_requested",
          studentName: "Gina Pedida",
          lines: [stockLine("stock"), stockLine("supplier")],
        }),
      ]),
    );

    const result = await load(
      vi.fn<Consolidate>().mockResolvedValue(ok(consolidation)),
      "/admin/inscripciones/materiales?mes=2026-11&seccion=entregar",
      true,
      deliveries,
    );

    expect(
      result.toDeliver.map((card) => [card.studentName, card.fromStock]),
    ).toEqual([
      ["Eva Stock", true],
      ["Gina Pedida", undefined],
    ]);
    expect(result.counts.entregar).toBe(2);
  });

  it.each([
    ["denied", 403],
    ["unavailable", 503],
    ["invalid", 400],
  ] as const)("fails closed when deliveries are %s", async (kind, status) => {
    const deliveries = vi.fn<Deliveries>().mockResolvedValue(err({ kind }));

    expect(
      await thrownStatus(() =>
        load(
          vi.fn<Consolidate>().mockResolvedValue(ok(consolidation)),
          undefined,
          true,
          deliveries,
        ),
      ),
    ).toBe(status);
  });

  it("returns no data to a request that is not an admin", async () => {
    const consolidate = vi.fn<Consolidate>();

    expect(
      await thrownStatus(() =>
        load(consolidate, "/admin/inscripciones/materiales", false),
      ),
    ).toBe(403);
    expect(consolidate).not.toHaveBeenCalled();
  });

  it.each([
    ["denied", 403],
    ["unavailable", 503],
    ["invalid", 400],
  ] as const)("fails closed on %s", async (kind, status) => {
    const consolidate = vi.fn<Consolidate>().mockResolvedValue(err({ kind }));

    expect(await thrownStatus(() => load(consolidate))).toBe(status);
  });
});

describe("admin supplier consolidation action", () => {
  const allOk = (ids: readonly string[]) =>
    ids.map((orderId) => ({ orderId, result: ok(undefined) }));

  it("marks the chosen orders as requested and goes back to the month", async () => {
    const bulk = vi.fn<Bulk>((_, ids) => Promise.resolve(allOk(ids)));
    const result = await submit(bulk, [
      ["intent", "mark-requested"],
      ["mes", "2026-11"],
      ["orderId", "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b"],
      ["orderId", "1c9a6d2f-5e4b-4a7c-8b8f-2d3e4f5a6b7c"],
    ]);

    expect(bulk).toHaveBeenCalledWith(expect.anything(), [
      "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b",
      "1c9a6d2f-5e4b-4a7c-8b8f-2d3e4f5a6b7c",
    ]);
    expect((result as Response).headers.get("Location")).toBe(
      "/admin/materiales?mes=2026-11&ok=requested&n=2#para-pedir",
    );
  });

  it("reports each order that could not move and keeps the rest", async () => {
    const bulk = vi.fn<Bulk>(() =>
      Promise.resolve([
        { orderId: "o1", result: ok(undefined) },
        {
          orderId: "o2",
          result: err({
            kind: "illegal-transition" as const,
            from: "cancelled" as const,
            to: "materials_requested" as const,
          }),
        },
      ]),
    );
    const result = await submit(bulk, [
      ["intent", "mark-requested"],
      ["mes", "2026-11"],
      ["orderId", "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b"],
      ["orderId", "1c9a6d2f-5e4b-4a7c-8b8f-2d3e4f5a6b7c"],
    ]);

    expect(result).toMatchObject({
      init: { status: 409 },
      data: {
        formError:
          "Se marcaron 1 de 2 pedidos. Esa acción no está disponible para el estado actual del pedido.",
      },
    });
  });

  it("drops ids that are not uuids before marking anything", async () => {
    const bulk = vi.fn<Bulk>((_, ids) => Promise.resolve(allOk(ids)));
    await submit(bulk, [
      ["intent", "mark-requested"],
      ["mes", "2026-11"],
      ["orderId", "not-a-uuid"],
      ["orderId", "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b"],
    ]);

    expect(bulk).toHaveBeenCalledWith(expect.anything(), [
      "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b",
    ]);
  });

  it("answers 400 to a post whose body is not a form", async () => {
    const result = await thrownStatus(() =>
      action({
        request: new Request(`${ORIGIN}/admin/inscripciones/materiales`, {
          method: "POST",
          headers: { Origin: ORIGIN, "Content-Type": "application/json" },
          body: "{}",
        }),
        params: {},
        context: adminContext(services({ bulk: vi.fn<Bulk>() })),
      } as never),
    );

    expect(result).toBe(400);
  });

  it("asks for at least one order", async () => {
    const bulk = vi.fn<Bulk>();
    const result = await submit(bulk, [
      ["intent", "mark-requested"],
      ["mes", "2026-11"],
    ]);

    expect(result).toMatchObject({
      init: { status: 422 },
      data: { formError: "No hay pedidos para marcar." },
    });
    expect(bulk).not.toHaveBeenCalled();
  });

  it("refuses a cross-origin post and a non-admin without touching orders", async () => {
    const bulk = vi.fn<Bulk>();
    const fields: [string, string][] = [
      ["intent", "mark-requested"],
      ["mes", "2026-11"],
      ["orderId", "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b"],
    ];

    expect(
      await thrownStatus(() =>
        submit(bulk, fields, { headers: { Origin: "https://evil.test" } }),
      ),
    ).toBe(403);
    expect(
      await thrownStatus(() => submit(bulk, fields, { admin: false })),
    ).toBe(403);
    expect(bulk).not.toHaveBeenCalled();
  });

  describe("mark-received", () => {
    const a = "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b";
    const b = "1c9a6d2f-5e4b-4a7c-8b8f-2d3e4f5a6b7c";

    it("marks the chosen orders as received and goes back to Para entregar", async () => {
      const received = vi.fn<Bulk>((_, ids) => Promise.resolve(allOk(ids)));
      const requested = vi.fn<Bulk>();
      const result = await submit(
        requested,
        [
          ["intent", "mark-received"],
          ["mes", "2026-11"],
          ["seccion", "entregar"],
          ["orderId", a],
          ["orderId", b],
          ["orderId", a],
        ],
        {},
        received,
      );

      expect(received).toHaveBeenCalledWith(expect.anything(), [a, b]);
      expect(requested).not.toHaveBeenCalled();
      expect((result as Response).headers.get("Location")).toBe(
        "/admin/materiales?mes=2026-11&ok=received&n=2#para-entregar",
      );
    });

    it("reports the orders that could not move and keeps the rest", async () => {
      const received = vi.fn<Bulk>(() =>
        Promise.resolve([
          { orderId: a, result: ok(undefined) },
          {
            orderId: b,
            result: err({
              kind: "illegal-transition" as const,
              from: "materials_received" as const,
              to: "materials_received" as const,
            }),
          },
        ]),
      );
      const result = await submit(
        vi.fn<Bulk>(),
        [
          ["intent", "mark-received"],
          ["mes", "2026-11"],
          ["orderId", a],
          ["orderId", b],
        ],
        {},
        received,
      );

      expect(result).toMatchObject({
        init: { status: 409 },
        data: {
          formError:
            "Se marcaron 1 de 2 pedidos. Esa acción no está disponible para el estado actual del pedido.",
        },
      });
    });

    it("asks for at least one order and refuses non-admins", async () => {
      const received = vi.fn<Bulk>();

      expect(
        await submit(
          vi.fn<Bulk>(),
          [
            ["intent", "mark-received"],
            ["mes", "2026-11"],
          ],
          {},
          received,
        ),
      ).toMatchObject({ init: { status: 422 } });
      expect(
        await thrownStatus(() =>
          submit(
            vi.fn<Bulk>(),
            [
              ["intent", "mark-received"],
              ["orderId", a],
            ],
            { admin: false },
            received,
          ),
        ),
      ).toBe(403);
      expect(received).not.toHaveBeenCalled();
    });
  });

  describe("mark-workshop-requested", () => {
    const workshop = "2d0a7e3b-6f5c-4b8d-9c9a-3e4f5a6b7c8d";
    const supplier = "3e1b8f4c-7a6d-4c9e-8dab-4f5a6b7c8d9e";
    const fields: [string, string][] = [
      ["intent", "mark-workshop-requested"],
      ["mes", "2026-11"],
      ["seccion", "pedir"],
      ["workshopId", workshop],
      ["supplierId", supplier],
    ];

    function submitWorkshop(
      markWorkshop: MarkWorkshop,
      body: [string, string][] = fields,
      options: { admin?: boolean; headers?: Record<string, string> } = {},
    ) {
      const request = postRequest(
        "/admin/inscripciones/materiales",
        {},
        options.headers ?? { Origin: ORIGIN },
      );
      return action({
        request: new Request(request.url, {
          method: "POST",
          headers: request.headers,
          body: new URLSearchParams(body),
        }),
        params: {},
        context: adminContext(
          services({ markWorkshop, bulk: vi.fn<Bulk>() }),
          options.admin === undefined ? {} : { admin: options.admin },
        ),
      } as never);
    }

    it("marks that workshop's lines of that supplier and goes back to Para pedir with how many moved", async () => {
      const mark = vi.fn<MarkWorkshop>().mockResolvedValue(ok({ count: 3 }));

      const result = await submitWorkshop(mark);

      expect(mark).toHaveBeenCalledExactlyOnceWith(
        expect.anything(),
        workshop,
        supplier,
      );
      expect((result as Response).headers.get("Location")).toBe(
        "/admin/materiales?mes=2026-11&ok=workshop-requested&n=3#para-pedir",
      );
    });

    it("goes back without a notice when nothing was left to mark", async () => {
      const result = await submitWorkshop(
        vi.fn<MarkWorkshop>().mockResolvedValue(ok({ count: 0 })),
      );

      expect((result as Response).headers.get("Location")).toBe(
        "/admin/materiales?mes=2026-11#para-pedir",
      );
    });

    it("does not touch any order and answers 400 to an id that is not a uuid", async () => {
      const mark = vi.fn<MarkWorkshop>();

      for (const bad of ["workshopId", "supplierId"])
        expect(
          await thrownStatus(() =>
            submitWorkshop(
              mark,
              fields.map(([key, value]): [string, string] =>
                key === bad ? [key, "not-a-uuid"] : [key, value],
              ),
            ),
          ),
        ).toBe(400);
      expect(mark).not.toHaveBeenCalled();
    });

    it("refuses a cross-origin post and a non-admin without marking anything", async () => {
      const mark = vi.fn<MarkWorkshop>();

      expect(
        await thrownStatus(() =>
          submitWorkshop(mark, fields, {
            headers: { Origin: "https://evil.test" },
          }),
        ),
      ).toBe(403);
      expect(
        await thrownStatus(() =>
          submitWorkshop(mark, fields, { admin: false }),
        ),
      ).toBe(403);
      expect(mark).not.toHaveBeenCalled();
    });

    it.each([
      ["denied", 403],
      ["unavailable", 503],
    ] as const)("fails closed on %s", async (kind, status) => {
      const mark = vi.fn<MarkWorkshop>().mockResolvedValue(err({ kind }));

      expect(await thrownStatus(() => submitWorkshop(mark))).toBe(status);
    });
  });

  it("answers 400 to an unknown intent", async () => {
    expect(
      await thrownStatus(() => submit(vi.fn<Bulk>(), [["intent", "delete"]])),
    ).toBe(400);
  });
});

describe("admin supplier consolidation action: one Ya lo pedí per supplier", () => {
  const order1 = "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b";
  const order2 = "1c9a6d2f-5e4b-4a7c-8b8f-2d3e4f5a6b7c";
  const workshop1 = "2d0a7e3b-6f5c-4b8d-9c9a-3e4f5a6b7c8d";
  const workshop2 = "4f2c9a5d-8b7e-4d0f-9ebc-5a6b7c8d9e0f";
  const supplier = "3e1b8f4c-7a6d-4c9e-8dab-4f5a6b7c8d9e";
  const allOk = (ids: readonly string[]) =>
    ids.map((orderId) => ({ orderId, result: ok(undefined) }));

  function submitSupplier(
    fields: [string, string][],
    overrides: { bulk?: Bulk; markWorkshop?: MarkWorkshop },
    admin?: boolean,
  ) {
    const request = postRequest("/admin/materiales", {});
    return action({
      request: new Request(request.url, {
        method: "POST",
        headers: request.headers,
        body: new URLSearchParams([
          ["intent", "mark-supplier-requested"],
          ["mes", "2026-11"],
          ["supplierId", supplier],
          ...fields,
        ]),
      }),
      params: {},
      context: adminContext(
        services(overrides),
        admin === undefined ? {} : { admin },
      ),
    } as never);
  }

  it("marks the monthly orders and every workshop in one press and counts them all", async () => {
    const bulk = vi.fn<Bulk>((_, ids) => Promise.resolve(allOk(ids)));
    const markWorkshop = vi
      .fn<MarkWorkshop>()
      .mockResolvedValueOnce(ok({ count: 2 }))
      .mockResolvedValueOnce(ok({ count: 1 }));

    const result = await submitSupplier(
      [
        ["orderId", order1],
        ["orderId", order2],
        ["workshopId", workshop1],
        ["workshopId", workshop2],
        ["returnTo", "/admin/materiales?mes=2026-11"],
        ["anchor", `pedir-${supplier}`],
      ],
      { bulk, markWorkshop },
    );

    expect(bulk).toHaveBeenCalledExactlyOnceWith(expect.anything(), [
      order1,
      order2,
    ]);
    expect(markWorkshop.mock.calls.map((call) => call.slice(1))).toEqual([
      [workshop1, supplier],
      [workshop2, supplier],
    ]);
    expect((result as Response).headers.get("Location")).toBe(
      `/admin/materiales?mes=2026-11&ok=requested&n=5#pedir-${supplier}`,
    );
  });

  it("marks a supplier that only has workshop lines without touching orders", async () => {
    const bulk = vi.fn<Bulk>();
    const markWorkshop = vi
      .fn<MarkWorkshop>()
      .mockResolvedValue(ok({ count: 4 }));
    const result = await submitSupplier([["workshopId", workshop1]], {
      bulk,
      markWorkshop,
    });
    expect(bulk).not.toHaveBeenCalled();
    expect((result as Response).headers.get("Location")).toBe(
      "/admin/materiales?mes=2026-11&ok=requested&n=4#para-pedir",
    );
  });

  it("marks a supplier that only has monthly orders without touching workshops", async () => {
    const bulk = vi.fn<Bulk>((_, ids) => Promise.resolve(allOk(ids)));
    const markWorkshop = vi.fn<MarkWorkshop>();
    await submitSupplier([["orderId", order1]], { bulk, markWorkshop });
    expect(markWorkshop).not.toHaveBeenCalled();
  });

  it("reports what could not move, keeps the rest and stays on the page", async () => {
    const bulk = vi.fn<Bulk>(() =>
      Promise.resolve([
        { orderId: order1, result: ok(undefined) },
        { orderId: order2, result: err({ kind: "turno-full" }) },
      ] as never),
    );
    const markWorkshop = vi
      .fn<MarkWorkshop>()
      .mockResolvedValue(ok({ count: 2 }));
    const result = (await submitSupplier(
      [
        ["orderId", order1],
        ["orderId", order2],
        ["workshopId", workshop1],
      ],
      { bulk, markWorkshop },
    )) as { data: { formError: string }; init: { status: number } };
    expect(result.init.status).toBe(409);
    expect(result.data.formError).toContain("Se marcaron 3");
    expect(result.data.formError).toContain("El turno está completo");
  });

  it("asks for at least one order or workshop", async () => {
    const bulk = vi.fn<Bulk>();
    const result = (await submitSupplier([], { bulk })) as {
      init: { status: number };
    };
    expect(result.init.status).toBe(422);
    expect(bulk).not.toHaveBeenCalled();
  });

  it("answers 400 to a workshop with a supplier that is not a uuid, and 403 to a non-admin", async () => {
    const markWorkshop = vi.fn<MarkWorkshop>();
    const request = postRequest("/admin/materiales", {});
    const badSupplier = action({
      request: new Request(request.url, {
        method: "POST",
        headers: request.headers,
        body: new URLSearchParams([
          ["intent", "mark-supplier-requested"],
          ["supplierId", "nope"],
          ["workshopId", workshop1],
        ]),
      }),
      params: {},
      context: adminContext(services({ markWorkshop })),
    } as never);
    expect(await thrownStatus(() => badSupplier)).toBe(400);
    expect(
      await thrownStatus(() =>
        submitSupplier([["workshopId", workshop1]], { markWorkshop }, false),
      ),
    ).toBe(403);
    expect(markWorkshop).not.toHaveBeenCalled();
  });
});
