import { describe, expect, it, vi } from "vitest";
import { err, Money, ok } from "~/modules/_shared";
import {
  createUnavailableAdminEnrollmentService,
  type AdminEnrollmentUseCases,
} from "~/modules/enrollments";
import type { MonthlyWorkshopsService } from "~/modules/workshops";
import { createUnavailableService } from "~/composition/unavailable-service";
import {
  adminContext,
  getRequest,
  postRequest,
  thrownStatus,
  withOverrides,
} from "~/testing/admin/route-kit";
import { action, loader } from "./enrollments";

type List = AdminEnrollmentUseCases["list"];

const total = Money.fromCentavos(5_800_000);
if (!total.ok) throw new Error("invalid test money");

const item = {
  id: "o1",
  number: "CI-2026-0007",
  studentName: "Ana Pérez",
  workshopName: "Cerámica",
  period: "2026-11",
  turnoLabel: "Lunes",
  status: "pending_confirmation" as const,
  total: total.value,
  requestedOn: "2026-10-31",
};

function services(list: List, detail?: AdminEnrollmentUseCases["detail"]) {
  return {
    enrollments: withOverrides(createUnavailableAdminEnrollmentService(), {
      list,
      ...(detail === undefined ? {} : { detail }),
    }),
    monthlyWorkshops: withOverrides(
      createUnavailableService<MonthlyWorkshopsService>(),
      {
        list: () =>
          Promise.resolve(ok([{ id: "w1", name: "Cerámica" }] as never)),
      },
    ),
  };
}

function load(
  list: List,
  path = "/admin/inscripciones",
  admin = true,
  detail?: AdminEnrollmentUseCases["detail"],
) {
  return loader({
    request: getRequest(path),
    params: {},
    context: adminContext(services(list, detail), { admin }),
  } as never);
}

const ORDER_ID = "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b";

type Detail = AdminEnrollmentUseCases["detail"];

/** A `list` double that answers each status with its own orders. */
function listBy(byStatus: Partial<Record<string, readonly (typeof item)[]>>) {
  return vi.fn<List>().mockImplementation((_actor, query) =>
    Promise.resolve(
      ok({
        items: (byStatus[query?.status ?? ""] ?? []).map((order) => ({
          ...order,
          status: query?.status ?? order.status,
        })),
        page: query?.page ?? 1,
        pageSize: 50 as const,
      }),
    ),
  );
}

describe("admin enrollments list route", () => {
  it("opens on the Por cobrar tab and projects display rows", async () => {
    const list = listBy({ pending_confirmation: [item] });
    const result = await load(list);

    expect(list).toHaveBeenCalledWith(expect.anything(), {
      status: "pending_confirmation",
      page: 1,
    });
    expect(result.tab).toBe("por-cobrar");
    expect(result.rows).toEqual([
      {
        id: "o1",
        number: "CI-2026-0007",
        studentName: "Ana Pérez",
        workshopName: "Cerámica",
        month: "noviembre 2026",
        turno: "Lunes",
        status: "pending_confirmation",
        statusLabel: "Pendiente de confirmación",
        total: "$ 58.000",
        totalPesos: "58000",
        requestedOn: "31/10/2026",
      },
    ]);
    expect(result.workshops).toEqual([{ id: "w1", name: "Cerámica" }]);
    expect(result.hasNext).toBe(false);
    expect(result.feedback).toBeNull();
  });

  it("counts every tab under the same filters", async () => {
    const list = listBy({
      pending_confirmation: [item, { ...item, id: "o2" }],
      paid: [{ ...item, id: "o3" }],
      materials_received: [{ ...item, id: "o4" }],
      cancelled: [{ ...item, id: "o5" }],
    });
    const result = await load(list, "/admin/inscripciones?q=ana");

    expect(result.counts).toEqual({
      "por-cobrar": "2",
      pagadas: "2",
      canceladas: "1",
    });
    for (const status of [
      "pending_confirmation",
      "paid",
      "materials_requested",
      "materials_received",
      "cancelled",
    ])
      expect(list).toHaveBeenCalledWith(expect.anything(), {
        status,
        text: "ana",
        page: 1,
      });
  });

  it("shows 50+ when a status fills its page", async () => {
    const full = Array.from({ length: 50 }, (_, index) => ({
      ...item,
      id: `o${String(index)}`,
    }));
    const result = await load(listBy({ pending_confirmation: full }));

    expect(result.counts["por-cobrar"]).toBe("50+");
    expect(result.hasNext).toBe(true);
  });

  it("merges the paid, requested and received orders on Pagadas, newest first", async () => {
    const list = listBy({
      paid: [{ ...item, id: "a", requestedOn: "2026-10-20" }],
      materials_requested: [{ ...item, id: "b", requestedOn: "2026-10-30" }],
      materials_received: [{ ...item, id: "c", requestedOn: "2026-10-25" }],
    });
    const result = await load(list, "/admin/inscripciones?estado=paid");

    expect(result.tab).toBe("pagadas");
    expect(result.rows.map((row) => [row.id, row.status])).toEqual([
      ["b", "materials_requested"],
      ["c", "materials_received"],
      ["a", "paid"],
    ]);
  });

  it("asks the requested page of the active tab only", async () => {
    const list = listBy({});
    await load(
      list,
      "/admin/inscripciones?estado=cancelled&mes=2026-11&taller=7a1d2e3f-5b4c-4d6e-8f9a-0b1c2d3e4f50&q=ana%40&page=2",
    );

    expect(list).toHaveBeenCalledWith(expect.anything(), {
      status: "cancelled",
      period: "2026-11",
      workshopId: "7a1d2e3f-5b4c-4d6e-8f9a-0b1c2d3e4f50",
      text: "ana@",
      page: 2,
    });
    expect(list).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: "paid", page: 2 }),
    );
  });

  it("names the student in the success banner from the stored order", async () => {
    const detail = vi
      .fn<Detail>()
      .mockResolvedValue(ok({ student: { fullName: "Ana Pérez" } } as never));
    const result = await load(
      listBy({}),
      `/admin/inscripciones?ok=paid&pedido=${ORDER_ID}`,
      true,
      detail,
    );

    expect(detail).toHaveBeenCalledWith(expect.anything(), ORDER_ID);
    expect(result.feedback).toEqual({ kind: "paid", name: "Ana Pérez" });
  });

  it("never prints text taken from the URL in the banner", async () => {
    const detail = vi.fn<Detail>();
    const result = await load(
      listBy({}),
      "/admin/inscripciones?ok=cancelled&pedido=Mensaje%20falso",
      true,
      detail,
    );

    expect(detail).not.toHaveBeenCalled();
    expect(result.feedback).toEqual({ kind: "cancelled", name: null });
  });

  it("still shows the banner, unnamed, when the order cannot be read", async () => {
    const detail = vi
      .fn<Detail>()
      .mockResolvedValue(err({ kind: "not-found" }));
    const result = await load(
      listBy({}),
      `/admin/inscripciones?ok=paid&pedido=${ORDER_ID}`,
      true,
      detail,
    );

    expect(result.feedback).toEqual({ kind: "paid", name: null });
  });

  it("ignores an unknown banner code", async () => {
    const result = await load(
      listBy({}),
      `/admin/inscripciones?ok=hack&pedido=${ORDER_ID}`,
    );

    expect(result.feedback).toBeNull();
  });

  it("returns no order data to a request that is not an admin", async () => {
    const list = vi.fn<List>();

    expect(
      await thrownStatus(() => load(list, "/admin/inscripciones", false)),
    ).toBe(403);
    expect(list).not.toHaveBeenCalled();
  });

  it.each([
    ["denied", 403],
    ["unavailable", 503],
  ] as const)("fails closed on %s", async (kind, status) => {
    const list = vi.fn<List>().mockResolvedValue(err({ kind }));

    expect(await thrownStatus(() => load(list))).toBe(status);
  });
});

type Confirm = AdminEnrollmentUseCases["confirmPayment"];
type Cancel = AdminEnrollmentUseCases["cancel"];

function submit(
  overrides: Partial<AdminEnrollmentUseCases>,
  fields: Record<string, string>,
  admin = true,
) {
  return action({
    request: postRequest("/admin/inscripciones", fields),
    params: {},
    context: adminContext(
      {
        enrollments: withOverrides(
          createUnavailableAdminEnrollmentService(),
          overrides,
        ),
      },
      { admin },
    ),
  } as never);
}

const returnTo =
  "/admin/inscripciones?estado=pending_confirmation&q=ana&page=2";
const payFields = {
  intent: "confirm",
  orderId: ORDER_ID,
  amount: "58000",
  paidOn: "2026-10-31",
  note: "",
  returnTo,
};

describe("admin enrollments list action", () => {
  it("marks the order paid and returns to the same list with a banner", async () => {
    const confirmPayment = vi
      .fn<Confirm>()
      .mockResolvedValue(ok({ kind: "confirmed" as const }));
    const result = (await submit({ confirmPayment }, payFields)) as Response;

    expect(confirmPayment).toHaveBeenCalledWith(expect.anything(), {
      orderId: ORDER_ID,
      amount: "58000",
      paidOn: "2026-10-31",
    });
    expect(result.headers.get("Location")).toBe(
      `/admin/inscripciones?estado=pending_confirmation&q=ana&page=2&ok=paid&pedido=${ORDER_ID}`,
    );
  });

  it("passes the note from the other-amount form", async () => {
    const confirmPayment = vi
      .fn<Confirm>()
      .mockResolvedValue(ok({ kind: "confirmed" as const }));
    await submit({ confirmPayment }, { ...payFields, note: "Seña" });

    expect(confirmPayment).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ note: "Seña" }),
    );
  });

  it("cancels the order with its reason and returns to the list", async () => {
    const cancel = vi
      .fn<Cancel>()
      .mockResolvedValue(ok({ kind: "cancelled" as const }));
    const result = (await submit(
      { cancel },
      {
        intent: "cancel",
        orderId: ORDER_ID,
        reason: "No puede venir",
        returnTo,
      },
    )) as Response;

    expect(cancel).toHaveBeenCalledWith(expect.anything(), {
      orderId: ORDER_ID,
      reason: "No puede venir",
    });
    expect(result.headers.get("Location")).toBe(
      `/admin/inscripciones?estado=pending_confirmation&q=ana&page=2&ok=cancelled&pedido=${ORDER_ID}`,
    );
  });

  it("never redirects outside the list", async () => {
    const confirmPayment = vi
      .fn<Confirm>()
      .mockResolvedValue(ok({ kind: "confirmed" as const }));
    const result = (await submit(
      { confirmPayment },
      { ...payFields, returnTo: "https://evil.example/admin/inscripciones" },
    )) as Response;

    expect(result.headers.get("Location")).toBe(
      `/admin/inscripciones?ok=paid&pedido=${ORDER_ID}`,
    );
  });

  it("explains an invalid reason without leaving the list", async () => {
    const cancel = vi.fn<Cancel>().mockResolvedValue(
      err({
        kind: "invalid" as const,
        issues: [{ field: "reason" as const, code: "required" }],
      }),
    );
    const result = (await submit(
      { cancel },
      { intent: "cancel", orderId: ORDER_ID, reason: "x", returnTo },
    )) as unknown as {
      data: { error: string; orderId: string };
      init: { status: number };
    };

    expect(result.init.status).toBe(422);
    expect(result.data).toEqual({
      error: "Contanos el motivo (al menos 3 caracteres).",
      orderId: ORDER_ID,
    });
  });

  it("words a refusal such as a full turno", async () => {
    const confirmPayment = vi
      .fn<Confirm>()
      .mockResolvedValue(err({ kind: "turno-full" } as never));
    const result = (await submit({ confirmPayment }, payFields)) as unknown as {
      data: { error: string };
      init: { status: number };
    };

    expect(result.init.status).toBe(409);
    expect(result.data.error).toBe(
      "El turno está completo. El pedido sigue pendiente.",
    );
  });

  it("treats an already-paid order as a refusal, not a success", async () => {
    const confirmPayment = vi
      .fn<Confirm>()
      .mockResolvedValue(ok({ kind: "already-confirmed" as const }));
    const result = (await submit({ confirmPayment }, payFields)) as unknown as {
      data: { error: string };
    };

    expect(result.data.error).toBe("El pedido ya estaba cobrado.");
  });

  it.each([
    [{ ...payFields, orderId: "nope" }],
    [{ ...payFields, intent: "materials-received" }],
    [{ ...payFields, intent: "zzz" }],
  ])("answers 400 to a malformed post %#", async (fields) => {
    const confirmPayment = vi.fn<Confirm>();

    expect(await thrownStatus(() => submit({ confirmPayment }, fields))).toBe(
      400,
    );
    expect(confirmPayment).not.toHaveBeenCalled();
  });

  it("refuses a post that is not from an admin before touching anything", async () => {
    const confirmPayment = vi.fn<Confirm>();

    expect(
      await thrownStatus(() => submit({ confirmPayment }, payFields, false)),
    ).toBe(403);
    expect(confirmPayment).not.toHaveBeenCalled();
  });
});
