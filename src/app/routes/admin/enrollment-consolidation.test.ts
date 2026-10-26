import { describe, expect, it, vi } from "vitest";
import { err, Money, ok } from "~/modules/_shared";
import {
  createUnavailableAdminEnrollmentService,
  createUnavailableSupplierConsolidationService,
  type AdminEnrollmentUseCases,
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
import { action, loader } from "./enrollment-consolidation";

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
type Bulk = AdminEnrollmentUseCases["markMaterialsRequestedBulk"];

function services(overrides: { consolidate?: Consolidate; bulk?: Bulk }) {
  return {
    consolidation: withOverrides(
      createUnavailableSupplierConsolidationService(),
      overrides.consolidate ? { consolidate: overrides.consolidate } : {},
    ),
    enrollments: withOverrides(
      createUnavailableAdminEnrollmentService(),
      overrides.bulk ? { markMaterialsRequestedBulk: overrides.bulk } : {},
    ),
  };
}

function load(
  consolidate: Consolidate,
  path = "/admin/inscripciones/materiales?mes=2026-11",
  admin = true,
) {
  return loader({
    request: getRequest(path),
    params: {},
    context: adminContext(services({ consolidate }), { admin }),
  } as never);
}

function submit(
  bulk: Bulk,
  fields: [string, string][],
  options: { admin?: boolean; headers?: Record<string, string> } = {},
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
      services({ bulk }),
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
          materials: [
            { label: "Arcilla Grande", quantity: 3, total: "$ 3.000" },
          ],
          total: "$ 3.000",
          summary: consolidation.suppliers[0]?.summary,
          orderIds: ["o1", "o2"],
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

  it("shows how many orders were just marked as requested", async () => {
    const result = await load(
      vi.fn<Consolidate>().mockResolvedValue(ok(consolidation)),
      "/admin/inscripciones/materiales?mes=2026-11&solicitados=2",
    );

    expect(result.requestedCount).toBe(2);
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
      "/admin/inscripciones/materiales?mes=2026-11&solicitados=2",
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

  it("answers 400 to an unknown intent", async () => {
    expect(
      await thrownStatus(() => submit(vi.fn<Bulk>(), [["intent", "delete"]])),
    ).toBe(400);
  });
});
