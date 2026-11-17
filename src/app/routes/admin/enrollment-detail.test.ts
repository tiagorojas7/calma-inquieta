import { describe, expect, it, vi } from "vitest";
import { err, Money, ok } from "~/modules/_shared";
import {
  createUnavailableAdminEnrollmentService,
  type AdminEnrollmentDetail,
  type AdminEnrollmentUseCases,
  type Corrected,
  type PublicEnrollmentUseCases,
} from "~/modules/enrollments";
import type {
  MonthlyWorkshopsService,
  WorkshopPeriodsService,
} from "~/modules/workshops";
import { createUnavailableService } from "~/composition/unavailable-service";
import {
  adminContext,
  getRequest,
  ORIGIN,
  postRequest,
  thrownStatus,
  withOverrides,
} from "~/testing/admin/route-kit";
import { action, loader } from "./enrollment-detail";

function pesos(value: number): Money {
  const money = Money.fromCentavos(value * 100);
  if (!money.ok) throw new Error("invalid test money");
  return money.value;
}

const detail: AdminEnrollmentDetail = {
  id: "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b",
  publicId: "public-123",
  number: "CI-2026-0007",
  status: "pending_confirmation",
  requestedAt: new Date("2026-10-31T15:30:00Z"),
  workshopId: "w1",
  workshopName: "Cerámica",
  periodId: "p1",
  period: "2026-11",
  turnoId: "t1",
  turnoLabel: "Lunes",
  weekday: 1,
  startsAt: "10:00",
  endsAt: "12:00",
  student: {
    fullName: "Ana Pérez",
    email: "ana@example.com",
    phoneDigits: "5493515550000",
  },
  email: "ana@example.com",
  phoneDigits: "5493515550000",
  fee: pesos(48_000),
  materialsTotal: pesos(10_000),
  total: pesos(58_000),
  policyVersion: "2026-10",
  lines: [
    {
      materialId: "m1",
      variantId: "v1",
      materialName: "Arcilla",
      variantLabel: "1 kg",
      unitPrice: pesos(5_000),
      quantity: 2,
      supplierId: "s1",
      supplierName: "Proveedor Sur",
    },
  ],
  seat: { confirmed: 3, capacity: 8 },
  corrections: [],
  audit: [
    {
      at: new Date("2026-10-31T15:30:00Z"),
      actor: "public",
      from: null,
      to: "pending_confirmation",
      note: null,
    },
  ],
};

type Overrides = Partial<AdminEnrollmentUseCases>;

/** The open workshops, months and turnos the correction form can offer. */
function services(overrides: Overrides) {
  return {
    enrollments: withOverrides(
      createUnavailableAdminEnrollmentService(),
      overrides,
    ),
    monthlyWorkshops: withOverrides(
      createUnavailableService<MonthlyWorkshopsService>(),
      {
        list: () =>
          Promise.resolve(
            ok([
              { id: "w1", name: "Cerámica", acceptsNewRequests: true },
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
              periods: [{ period: "2026-11", status: "open", activeTurnos: 2 }],
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
              fee: pesos(58_000),
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

function load(overrides: Overrides, admin = true) {
  return loader({
    request: getRequest(
      "/admin/inscripciones/0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b",
    ),
    params: { id: "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b" },
    context: adminContext(services(overrides), { admin }),
  } as never);
}

function submit(
  overrides: Overrides,
  fields: Record<string, string>,
  options: { admin?: boolean; headers?: Record<string, string> } = {},
) {
  return action({
    request: postRequest(
      "/admin/inscripciones/0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b",
      fields,
      options.headers ?? { Origin: ORIGIN },
    ),
    params: { id: "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b" },
    context: adminContext(services(overrides), {
      ...(options.admin === undefined ? {} : { admin: options.admin }),
    }),
  } as never);
}

const confirmFields = {
  intent: "confirm",
  amount: "58000",
  paidOn: "2026-10-31",
  note: "Transferencia",
};

describe("admin enrollment detail acceptance", () => {
  it("shows the versions of the conditions and privacy the student accepted", async () => {
    const result = await load({
      detail: () =>
        Promise.resolve(
          ok({
            ...detail,
            acceptance: { conditionsVersion: 2, privacyVersion: 3 },
          }),
        ),
    });
    expect(result).toMatchObject({
      acceptance: "Condiciones v2 · Privacidad v3",
      policyVersion: null,
    });
  });

  it("says there is no record when the order has no versions", async () => {
    const result = await load({ detail: () => Promise.resolve(ok(detail)) });
    expect(result).toMatchObject({ acceptance: "Sin registro de aceptación" });
  });

  it("keeps the legacy policy version only for a public order with no recorded versions", async () => {
    const result = await load({ detail: () => Promise.resolve(ok(detail)) });
    expect(result).toMatchObject({ policyVersion: "2026-10" });
  });

  it("hides the legacy policy version on an order an owner created by hand", async () => {
    const result = await load({
      detail: () =>
        Promise.resolve(
          ok({
            ...detail,
            audit: [
              {
                at: new Date("2026-10-31T15:30:00Z"),
                actor: "owner@example.com",
                from: null,
                to: "pending_confirmation",
                note: null,
              },
            ],
          }),
        ),
    });
    expect(result).toMatchObject({
      acceptance: "Sin registro de aceptación",
      policyVersion: null,
    });
  });
});

describe("admin enrollment detail loader", () => {
  it("shows every stored field, including contact data, for an admin", async () => {
    const result = await load({ detail: () => Promise.resolve(ok(detail)) });

    expect(result).toMatchObject({
      id: "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b",
      number: "CI-2026-0007",
      status: "pending_confirmation",
      statusLabel: "Pendiente de confirmación",
      studentName: "Ana Pérez",
      email: "ana@example.com",
      phone: "5493515550000",
      workshopName: "Cerámica",
      month: "noviembre 2026",
      turno: "Lunes · 10:00 a 12:00 h",
      requestedAt: "31/10/2026 12:30",
      fee: "$ 48.000",
      materialsTotal: "$ 10.000",
      total: "$ 58.000",
      totalPesos: "58000",
      lines: [
        {
          label: "Arcilla 1 kg",
          supplier: "Proveedor Sur",
          quantity: 2,
          unitPrice: "$ 5.000",
          lineTotal: "$ 10.000",
        },
      ],
      payment: null,
      seat: { confirmed: 3, capacity: 8 },
      audit: [
        {
          at: "31/10/2026 12:30",
          actor: "public",
          from: null,
          to: "Pendiente de confirmación",
          note: null,
        },
      ],
      actions: {
        confirm: true,
        cancel: true,
        materialsRequested: false,
        materialsReceived: false,
      },
    });
    expect(result.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("shows the payment fields and the next materials step for a paid order", async () => {
    const paid: AdminEnrollmentDetail = {
      ...detail,
      status: "paid",
      paidAt: new Date("2026-11-02T03:00:00Z"),
      paidAmount: pesos(58_000),
      confirmedBy: "admin@x.test",
      paymentNote: "Transferencia",
    };
    const result = await load({ detail: () => Promise.resolve(ok(paid)) });

    expect(result.payment).toEqual({
      paidOn: "02/11/2026",
      amount: "$ 58.000",
      confirmedBy: "admin@x.test",
      note: "Transferencia",
    });
    expect(result.actions).toEqual({
      confirm: false,
      cancel: true,
      materialsRequested: true,
      materialsReceived: false,
    });
  });

  it.each(["paid", "materials_requested", "materials_received"] as const)(
    "offers cancelling a %s order with the refund prefilled from what was paid",
    async (status) => {
      const paid: AdminEnrollmentDetail = {
        ...detail,
        status,
        paidAt: new Date("2026-11-02T03:00:00Z"),
        paidAmount: pesos(58_000),
        confirmedBy: "admin@x.test",
      };
      const result = await load({ detail: () => Promise.resolve(ok(paid)) });

      expect(result.actions.cancel).toBe(true);
      expect(result.cancelRefund).toEqual({
        paid: "$ 58.000",
        paidPesos: "58000",
      });
      expect(result.refund).toBeNull();
    },
  );

  it("asks for no refund when cancelling a pending order", async () => {
    const result = await load({ detail: () => Promise.resolve(ok(detail)) });

    expect(result.actions.cancel).toBe(true);
    expect(result.cancelRefund).toBeNull();
  });

  it.each([
    [pesos(25_000), "$ 25.000"],
    [pesos(0), "$ 0"],
  ])(
    "shows the recorded refund of a cancelled order",
    async (amount, label) => {
      const cancelled: AdminEnrollmentDetail = {
        ...detail,
        status: "cancelled",
        paidAt: new Date("2026-11-02T03:00:00Z"),
        paidAmount: pesos(58_000),
        confirmedBy: "admin@x.test",
        refund: {
          amount,
          refundedAt: new Date("2026-11-05T03:00:00Z"),
          note: "Transferencia",
          refundedBy: "owner@x.test",
        },
      };
      const result = await load({
        detail: () => Promise.resolve(ok(cancelled)),
      });

      expect(result.refund).toEqual({
        amount: label,
        refundedOn: "05/11/2026",
        note: "Transferencia",
        refundedBy: "owner@x.test",
      });
      expect(result.payment?.amount).toBe("$ 58.000");
      expect(result.cancelRefund).toBeNull();
      expect(result.actions.cancel).toBe(false);
    },
  );

  it("offers no actions on a cancelled order", async () => {
    const result = await load({
      detail: () => Promise.resolve(ok({ ...detail, status: "cancelled" })),
    });

    expect(result.actions).toEqual({
      confirm: false,
      cancel: false,
      materialsRequested: false,
      materialsReceived: false,
    });
  });

  it("returns no order data to a request that is not an admin", async () => {
    const read = vi.fn(() => Promise.resolve(ok(detail)));

    expect(await thrownStatus(() => load({ detail: read }, false))).toBe(403);
    expect(read).not.toHaveBeenCalled();
  });

  it.each([
    ["not-found", 404],
    ["unavailable", 503],
    ["denied", 403],
  ] as const)("fails closed on %s", async (kind, status) => {
    const result = await thrownStatus(() =>
      load({ detail: () => Promise.resolve(err({ kind })) }),
    );

    expect(result).toBe(status);
  });
});

describe("admin enrollment ids and bodies", () => {
  it("answers 404 to an id that is not a uuid, without reading the order", async () => {
    const read = vi.fn(() => Promise.resolve(ok(detail)));
    const result = await thrownStatus(() =>
      loader({
        request: getRequest("/admin/inscripciones/not-a-uuid"),
        params: { id: "not-a-uuid" },
        context: adminContext(services({ detail: read })),
      } as never),
    );

    expect(result).toBe(404);
    expect(read).not.toHaveBeenCalled();
  });

  it("answers 404 to a post on an id that is not a uuid, without mutating", async () => {
    const confirmPayment = vi.fn();
    const result = await thrownStatus(() =>
      action({
        request: postRequest("/admin/inscripciones/x", confirmFields),
        params: { id: "x" },
        context: adminContext(services({ confirmPayment })),
      } as never),
    );

    expect(result).toBe(404);
    expect(confirmPayment).not.toHaveBeenCalled();
  });

  it("answers 400 to a post whose body is not a form", async () => {
    const result = await thrownStatus(() =>
      action({
        request: new Request(
          `${ORIGIN}/admin/inscripciones/0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b`,
          {
            method: "POST",
            headers: { Origin: ORIGIN, "Content-Type": "application/json" },
            body: "{}",
          },
        ),
        params: { id: "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b" },
        context: adminContext(services({})),
      } as never),
    );

    expect(result).toBe(400);
  });
});

describe("admin enrollment detail action", () => {
  it("confirms the payment and goes back to the detail", async () => {
    const confirmPayment = vi.fn(() =>
      Promise.resolve(ok({ kind: "confirmed" as const })),
    );
    const result = await submit({ confirmPayment }, confirmFields);

    expect(confirmPayment).toHaveBeenCalledWith(expect.anything(), {
      orderId: "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b",
      amount: "58000",
      paidOn: "2026-10-31",
      note: "Transferencia",
    });
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get("Location")).toBe(
      "/admin/inscripciones/0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b?ok=confirmed",
    );
  });

  it("omits an empty note", async () => {
    const confirmPayment = vi.fn(() =>
      Promise.resolve(ok({ kind: "confirmed" as const })),
    );
    await submit({ confirmPayment }, { ...confirmFields, note: "  " });

    expect(confirmPayment).toHaveBeenCalledWith(expect.anything(), {
      orderId: "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b",
      amount: "58000",
      paidOn: "2026-10-31",
    });
  });

  it.each([
    [
      { field: "amount", code: "not-whole-pesos" },
      "amount",
      "Ingresá un monto en pesos enteros, sin puntos ni centavos.",
    ],
    [
      { field: "paidOn", code: "future-date" },
      "paidOn",
      "La fecha de pago no puede ser futura.",
    ],
    [
      { field: "paidOn", code: "invalid-calendar-date" },
      "paidOn",
      "Ingresá una fecha válida.",
    ],
  ] as const)("names the invalid field %o", async (issue, field, message) => {
    const confirmPayment = vi.fn(() =>
      Promise.resolve(err({ kind: "invalid" as const, issues: [issue] })),
    );
    const result = await submit(
      { confirmPayment },
      { ...confirmFields, amount: "58000,50" },
    );

    expect(result).toMatchObject({
      init: { status: 422 },
      data: {
        errors: { [field]: message },
        values: { amount: "58000,50", paidOn: "2026-10-31" },
      },
    });
  });

  it.each([
    [
      { kind: "turno-full" },
      "El turno está completo. El pedido sigue pendiente.",
    ],
    [
      { kind: "period-closed" },
      "El mes ya está cerrado. No se puede confirmar este pedido.",
    ],
    [
      { kind: "amount-mismatch" },
      "El monto no coincide con el total del pedido.",
    ],
    [
      { kind: "illegal-transition", from: "cancelled", to: "paid" },
      "Esa acción no está disponible para el estado actual del pedido.",
    ],
  ] as const)("shows %o as its own message", async (failure, message) => {
    const confirmPayment = vi.fn(() => Promise.resolve(err(failure)));
    const result = await submit({ confirmPayment }, confirmFields);

    expect(result).toMatchObject({
      init: { status: 409 },
      data: { formError: message },
    });
  });

  it("says when the order was already confirmed", async () => {
    const confirmPayment = vi.fn(() =>
      Promise.resolve(ok({ kind: "already-confirmed" as const })),
    );
    const result = await submit({ confirmPayment }, confirmFields);

    expect(result).toMatchObject({
      init: { status: 409 },
      data: { formError: "El pedido ya estaba cobrado." },
    });
  });

  it("cancels with a reason", async () => {
    const cancel = vi.fn(() =>
      Promise.resolve(ok({ kind: "cancelled" as const })),
    );
    const result = await submit(
      { cancel },
      { intent: "cancel", reason: "Pidió la baja" },
    );

    expect(cancel).toHaveBeenCalledWith(expect.anything(), {
      orderId: "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b",
      reason: "Pidió la baja",
    });
    expect((result as Response).headers.get("Location")).toBe(
      "/admin/inscripciones/0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b?ok=cancelled",
    );
  });

  it("cancels a paid order with the typed refund", async () => {
    const cancel = vi.fn(() =>
      Promise.resolve(ok({ kind: "cancelled" as const })),
    );
    const result = await submit(
      { cancel },
      {
        intent: "cancel",
        reason: "Pidió la baja",
        refundAmount: " 25.000 ",
        refundedOn: "2026-11-05",
        refundNote: " Transferencia ",
      },
    );

    expect(cancel).toHaveBeenCalledWith(expect.anything(), {
      orderId: "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b",
      reason: "Pidió la baja",
      refund: {
        amount: "25.000",
        refundedOn: "2026-11-05",
        note: "Transferencia",
      },
    });
    expect((result as Response).headers.get("Location")).toBe(
      "/admin/inscripciones/0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b?ok=cancelled",
    );
  });

  it("names a refused refund on its field and keeps what was typed", async () => {
    const cancel = vi.fn(() =>
      Promise.resolve(
        err({
          kind: "invalid-refund" as const,
          field: "amount" as const,
          code: "above-paid" as const,
        }),
      ),
    );
    const result = await submit(
      { cancel },
      {
        intent: "cancel",
        reason: "Pidió la baja",
        refundAmount: "70000",
        refundedOn: "2026-11-05",
        refundNote: "",
      },
    );

    expect(result).toMatchObject({
      init: { status: 422 },
      data: {
        errors: {
          refundAmount: "La devolución no puede ser mayor que lo cobrado.",
        },
        values: {
          reason: "Pidió la baja",
          refundAmount: "70000",
          refundedOn: "2026-11-05",
          refundNote: "",
        },
      },
    });
  });

  it("names a missing cancel reason and keeps what was typed", async () => {
    const cancel = vi.fn(() =>
      Promise.resolve(
        err({
          kind: "invalid" as const,
          issues: [{ field: "reason" as const, code: "required" }],
        }),
      ),
    );
    const result = await submit({ cancel }, { intent: "cancel", reason: "" });

    expect(result).toMatchObject({
      init: { status: 422 },
      data: {
        errors: { reason: "Contanos el motivo (al menos 3 caracteres)." },
      },
    });
  });

  it.each([
    ["materials-requested", "markMaterialsRequested"],
    ["materials-received", "markMaterialsReceived"],
  ] as const)("runs %s for this order only", async (intent, method) => {
    const mark = vi.fn(() => Promise.resolve(ok(undefined)));
    const result = await submit({ [method]: mark }, { intent });

    expect(mark).toHaveBeenCalledWith(
      expect.anything(),
      "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b",
    );
    expect((result as Response).headers.get("Location")).toBe(
      `/admin/inscripciones/0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b?ok=${intent}`,
    );
  });

  it("refuses a cross-origin post without touching the order", async () => {
    const confirmPayment = vi.fn();

    expect(
      await thrownStatus(() =>
        submit({ confirmPayment }, confirmFields, {
          headers: { Origin: "https://evil.example.test" },
        }),
      ),
    ).toBe(403);
    expect(confirmPayment).not.toHaveBeenCalled();
  });

  it("refuses a request that is not an admin on every intent", async () => {
    const spy = vi.fn();
    const overrides = {
      confirmPayment: spy,
      cancel: spy,
      markMaterialsRequested: spy,
      markMaterialsReceived: spy,
    };

    for (const fields of [
      confirmFields,
      { intent: "cancel", reason: "Pidió la baja" },
      { intent: "materials-requested" },
      { intent: "materials-received" },
    ])
      expect(
        await thrownStatus(() => submit(overrides, fields, { admin: false })),
      ).toBe(403);
    expect(spy).not.toHaveBeenCalled();
  });

  it("answers 400 to an unknown intent", async () => {
    expect(await thrownStatus(() => submit({}, { intent: "delete" }))).toBe(
      400,
    );
  });

  it.each([
    ["not-found", 404],
    ["unavailable", 503],
    ["denied", 403],
  ] as const)("fails closed on %s", async (kind, status) => {
    const confirmPayment = vi.fn(() => Promise.resolve(err({ kind })));

    expect(
      await thrownStatus(() => submit({ confirmPayment }, confirmFields)),
    ).toBe(status);
  });
});

describe("admin enrollment detail feedback", () => {
  it.each([
    ["confirmed", "confirmed"],
    ["cancelled", "cancelled"],
    ["materials-requested", "materials-requested"],
    ["materials-received", "materials-received"],
  ] as const)("returns the %s code from the query", async (code, expected) => {
    const result = await loader({
      request: getRequest(
        `/admin/inscripciones/0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b?ok=${code}`,
      ),
      params: { id: "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b" },
      context: adminContext(
        services({ detail: () => Promise.resolve(ok(detail)) }),
        { admin: true },
      ),
    } as never);

    expect(result.feedback).toBe(expected);
  });

  it("ignores a code it does not declare", async () => {
    const result = await loader({
      request: getRequest(
        "/admin/inscripciones/0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b?ok=<script>",
      ),
      params: { id: "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b" },
      context: adminContext(
        services({ detail: () => Promise.resolve(ok(detail)) }),
        { admin: true },
      ),
    } as never);

    expect(result.feedback).toBeNull();
  });
});

describe("admin enrollment detail corrections", () => {
  const paid: AdminEnrollmentDetail = {
    ...detail,
    status: "paid",
    paidAt: new Date("2026-11-02T03:00:00Z"),
    paidAmount: pesos(58_000),
    confirmedBy: "admin@x.test",
  };
  const place = {
    workshopId: "w1",
    workshopName: "Cerámica",
    periodId: "p1",
    period: "2026-11",
    turnoId: "t1",
    turnoLabel: "Lunes",
    weekday: 1,
    startsAt: "10:00",
    endsAt: "12:00",
  };
  const snapshot = (
    status: AdminEnrollmentDetail["status"],
    fee: number,
    turnoLabel = "Lunes",
  ) => ({
    ...place,
    turnoLabel,
    fee: pesos(fee),
    total: pesos(fee + 10_000),
    status,
  });
  const correctFields = {
    intent: "correct",
    correctOffer: "",
    correctFee: "50000",
    correctNote: "",
    correctRefundAmount: "",
    correctRefundedOn: "2026-11-05",
    correctRefundNote: "",
  };
  const done = (outcome: Corrected["outcome"]) =>
    vi.fn(() => Promise.resolve(ok({ kind: "corrected" as const, outcome })));

  it("offers the correction with the current fee and every open turno", async () => {
    const result = await load({ detail: () => Promise.resolve(ok(detail)) });

    expect(result.correction).toEqual({
      options: [
        {
          value: "ceramica|2026-11|t1",
          label: "Cerámica · noviembre 2026 · Lunes 18:00",
        },
        {
          value: "ceramica|2026-11|t2",
          label: "Cerámica · noviembre 2026 · Martes 10:00",
        },
      ],
      feePesos: "48000",
      paid: null,
    });
    expect(result.corrections).toEqual([]);
  });

  it("asks for the refunded difference only once something was paid", async () => {
    const result = await load({ detail: () => Promise.resolve(ok(paid)) });

    expect(result.correction?.paid).toBe("$ 58.000");
  });

  it("offers no correction, and reads no offers, for a cancelled order", async () => {
    const list = vi.fn();
    const result = await loader({
      request: getRequest(
        "/admin/inscripciones/0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b",
      ),
      params: { id: "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b" },
      context: adminContext({
        ...services({
          detail: () =>
            Promise.resolve(ok({ ...detail, status: "cancelled" as const })),
        }),
        monthlyWorkshops: withOverrides(
          createUnavailableService<MonthlyWorkshopsService>(),
          { list },
        ),
      }),
    } as never);

    expect(result.correction).toBeNull();
    expect(list).not.toHaveBeenCalled();
  });

  it("still shows the order when the offers cannot be read", async () => {
    const result = await loader({
      request: getRequest(
        "/admin/inscripciones/0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b",
      ),
      params: { id: "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b" },
      context: adminContext({
        ...services({ detail: () => Promise.resolve(ok(detail)) }),
        monthlyWorkshops: withOverrides(
          createUnavailableService<MonthlyWorkshopsService>(),
          { list: () => Promise.resolve(err({ kind: "unavailable" })) },
        ),
      }),
    } as never);

    expect(result.correction).toEqual({
      options: [],
      feePesos: "48000",
      paid: null,
    });
  });

  it("lists the corrections as readable history, with the money that moved", async () => {
    const corrected: AdminEnrollmentDetail = {
      ...detail,
      corrections: [
        {
          id: "c1",
          at: new Date("2026-11-03T15:00:00Z"),
          actor: "admin@x.test",
          note: "Cuota equivocada",
          before: snapshot("paid", 48_000),
          after: snapshot("pending_confirmation", 60_000, "Martes"),
          previousPayment: {
            amount: pesos(58_000),
            paidAt: new Date("2026-11-02T03:00:00Z"),
            confirmedBy: "admin@x.test",
          },
          refund: null,
        },
        {
          id: "c2",
          at: new Date("2026-11-04T15:00:00Z"),
          actor: "owner@x.test",
          note: null,
          before: snapshot("paid", 60_000),
          after: snapshot("paid", 50_000),
          previousPayment: null,
          refund: {
            amount: pesos(8_000),
            refundedAt: new Date("2026-11-04T03:00:00Z"),
            note: "Efectivo",
          },
        },
        {
          id: "c3",
          at: new Date("2026-11-05T15:00:00Z"),
          actor: "owner@x.test",
          note: null,
          before: snapshot("pending_confirmation", 50_000),
          after: snapshot("pending_confirmation", 52_000),
          previousPayment: null,
          refund: null,
        },
        {
          id: "c4",
          at: new Date("2026-11-06T15:00:00Z"),
          actor: "owner@x.test",
          note: null,
          before: snapshot("materials_requested", 52_000),
          after: snapshot("materials_requested", 52_000),
          previousPayment: null,
          refund: null,
        },
      ],
    };
    const result = await load({ detail: () => Promise.resolve(ok(corrected)) });

    expect(result.corrections.map((entry) => entry.outcome)).toEqual([
      "returned-to-pending",
      "lowered",
      "kept-pending",
      "kept-paid",
    ]);
    expect(result.corrections[0]).toEqual({
      at: "03/11/2026 12:00",
      actor: "admin@x.test",
      note: "Cuota equivocada",
      outcome: "returned-to-pending",
      before: {
        workshop: "Cerámica",
        month: "noviembre 2026",
        turno: "Lunes · 10:00 a 12:00 h",
        fee: "$ 48.000",
        total: "$ 58.000",
      },
      after: {
        workshop: "Cerámica",
        month: "noviembre 2026",
        turno: "Martes · 10:00 a 12:00 h",
        fee: "$ 60.000",
        total: "$ 70.000",
      },
      previousPayment: {
        amount: "$ 58.000",
        paidOn: "02/11/2026",
        confirmedBy: "admin@x.test",
      },
      refund: null,
    });
    expect(result.corrections[1]?.refund).toEqual({
      amount: "$ 8.000",
      refundedOn: "04/11/2026",
      note: "Efectivo",
    });
  });

  it("corrects the order and goes back to the detail", async () => {
    const correct = done("kept-pending");
    const result = await submit({ correct }, correctFields);

    expect(correct).toHaveBeenCalledWith(expect.anything(), {
      orderId: "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b",
      fee: "50000",
    });
    expect((result as Response).headers.get("Location")).toBe(
      "/admin/inscripciones/0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b?ok=corrected",
    );
  });

  it("sends the chosen offer, the note and the refunded difference", async () => {
    const correct = done("lowered");
    await submit(
      { correct },
      {
        ...correctFields,
        correctOffer: "ceramica|2026-11|t2",
        correctNote: " Beca ",
        correctRefundAmount: "8000",
        correctRefundNote: " Efectivo ",
      },
    );

    expect(correct).toHaveBeenCalledWith(expect.anything(), {
      orderId: "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b",
      target: { slug: "ceramica", period: "2026-11", turnoId: "t2" },
      fee: "50000",
      refund: {
        amount: "8000",
        refundedOn: "2026-11-05",
        note: "Efectivo",
      },
      note: "Beca",
    });
  });

  it("says when the total went up and the order is pending again", async () => {
    const result = await submit(
      { correct: done("returned-to-pending") },
      correctFields,
    );

    expect((result as Response).headers.get("Location")).toBe(
      "/admin/inscripciones/0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b?ok=returned-to-pending",
    );
  });

  it("refuses an unreadable offer without calling the use case", async () => {
    const correct = done("kept-pending");
    const result = await submit(
      { correct },
      { ...correctFields, correctOffer: "ceramica" },
    );

    expect(correct).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      init: { status: 422 },
      data: {
        errors: { correctOffer: "Elegí una opción válida." },
        values: { correctOffer: "ceramica", correctFee: "50000" },
      },
    });
  });

  it.each([
    [
      { kind: "invalid-fee" },
      { correctFee: expect.stringContaining("pesos enteros") as unknown },
    ],
    [
      { kind: "invalid-refund", field: "amount", code: "above-difference" },
      {
        correctRefundAmount: expect.stringContaining("diferencia") as unknown,
      },
    ],
    [
      { kind: "invalid-refund", field: "amount", code: "required" },
      {
        correctRefundAmount: expect.stringContaining(
          "cuánto devolviste",
        ) as unknown,
      },
    ],
  ])(
    "names the field of %o and keeps what was typed",
    async (failure, errors) => {
      const correct = vi.fn(() => Promise.resolve(err(failure as never)));
      const result = await submit({ correct }, correctFields);

      expect(result).toMatchObject({
        init: { status: 422 },
        data: { errors, values: { correctFee: "50000" } },
      });
    },
  );

  it.each([
    [
      { kind: "turno-full" },
      "El turno elegido está completo. No se cambió nada.",
    ],
    [
      { kind: "duplicate-order" },
      "Esa alumna ya tiene una inscripción en el mes elegido. No se cambió nada.",
    ],
    [
      { kind: "period-closed" },
      "El mes elegido ya está cerrado. Elegí otro mes.",
    ],
    [
      { kind: "turno-not-offered" },
      "Esa opción ya no está disponible. Elegí otra.",
    ],
    [
      { kind: "enrollments-paused" },
      "Esa opción ya no está disponible. Elegí otra.",
    ],
    [
      { kind: "not-correctable" },
      "Un pedido cancelado ya no se puede corregir.",
    ],
  ] as const)("shows %o as its own message", async (failure, message) => {
    const correct = vi.fn(() => Promise.resolve(err(failure)));
    const result = await submit({ correct }, correctFields);

    expect(result).toMatchObject({
      init: { status: 409 },
      data: { formError: message, values: { correctFee: "50000" } },
    });
  });

  it.each([
    ["not-found", 404],
    ["unavailable", 503],
    ["denied", 403],
  ] as const)("fails closed on %s", async (kind, status) => {
    const result = await thrownStatus(() =>
      submit({ correct: () => Promise.resolve(err({ kind })) }, correctFields),
    );

    expect(result).toBe(status);
  });

  it("does not correct for a request that is not an admin", async () => {
    const correct = done("kept-pending");

    expect(
      await thrownStatus(() =>
        submit({ correct }, correctFields, { admin: false }),
      ),
    ).toBe(403);
    expect(correct).not.toHaveBeenCalled();
  });
});

describe("admin enrollment detail loader: material sales", () => {
  const monthlyId = "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b";
  const sale: AdminEnrollmentDetail = {
    ...detail,
    id: "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f",
    number: "CI-2026-0009",
    kind: "material_sale",
    parent: { id: monthlyId, number: "CI-2026-0007" },
    fee: pesos(0),
    materialsTotal: pesos(10_000),
    total: pesos(10_000),
  };

  it("lists the sales of a monthly record with their state, and offers a new one", async () => {
    const record: AdminEnrollmentDetail = {
      ...detail,
      status: "paid",
      paidAt: new Date("2026-11-02T03:00:00Z"),
      paidAmount: pesos(58_000),
      kind: "enrollment",
      sales: [
        {
          id: sale.id,
          number: sale.number,
          status: "pending_confirmation",
          total: pesos(10_000),
          requestedAt: new Date("2026-11-20T15:00:00Z"),
        },
        {
          id: "aaaaaaaa-4a5b-4c6d-8e7f-0a1b2c3d4e5f",
          number: "CI-2026-0010",
          status: "paid",
          total: pesos(4_000),
          requestedAt: new Date("2026-11-21T15:00:00Z"),
        },
      ],
    };

    const result = await load({ detail: () => Promise.resolve(ok(record)) });

    expect(result).toMatchObject({
      kind: "enrollment",
      parent: null,
      newSaleHref: `/admin/inscripciones/${monthlyId}/venta-nueva`,
      sales: [
        {
          id: sale.id,
          number: "CI-2026-0009",
          href: `/admin/inscripciones/${sale.id}`,
          status: "pending_confirmation",
          statusLabel: "Pendiente de confirmación",
          total: "$ 10.000",
          requestedOn: "20/11/2026",
        },
        {
          number: "CI-2026-0010",
          statusLabel: "Cobrado",
          total: "$ 4.000",
        },
      ],
      // The monthly total is the monthly record's own: sales never rewrite it.
      total: "$ 58.000",
    });
  });

  it("offers no new sale under a cancelled record, but still lists the ones it has", async () => {
    const result = await load({
      detail: () =>
        Promise.resolve(
          ok({
            ...detail,
            status: "cancelled",
            kind: "enrollment",
            sales: [
              {
                id: sale.id,
                number: sale.number,
                status: "paid",
                total: pesos(10_000),
                requestedAt: new Date("2026-11-20T15:00:00Z"),
              },
            ],
          } satisfies AdminEnrollmentDetail),
        ),
    });

    expect(result).toMatchObject({
      newSaleHref: null,
      sales: [{ number: "CI-2026-0009" }],
    });
  });

  it("shows a sale with a link to its record, no correction, no new sale and the usual cancel and refund", async () => {
    const paidSale: AdminEnrollmentDetail = {
      ...sale,
      status: "paid",
      paidAt: new Date("2026-11-22T03:00:00Z"),
      paidAmount: pesos(10_000),
      confirmedBy: "admin@x.test",
    };

    const result = await load({ detail: () => Promise.resolve(ok(paidSale)) });

    expect(result).toMatchObject({
      kind: "material_sale",
      number: "CI-2026-0009",
      parent: {
        number: "CI-2026-0007",
        href: `/admin/inscripciones/${monthlyId}`,
      },
      correction: null,
      newSaleHref: null,
      sales: [],
      total: "$ 10.000",
      cancelRefund: { paid: "$ 10.000", paidPesos: "10000" },
      actions: { cancel: true, confirm: false },
    });
    await expect(
      load({ detail: () => Promise.resolve(ok(sale)) }),
    ).resolves.toMatchObject({
      actions: { confirm: true, cancel: true },
      cancelRefund: null,
    });
  });

  it("keeps a monthly record without the new fields as a monthly record", async () => {
    const result = await load({ detail: () => Promise.resolve(ok(detail)) });

    expect(result).toMatchObject({
      kind: "enrollment",
      parent: null,
      sales: [],
      newSaleHref: `/admin/inscripciones/${monthlyId}/venta-nueva`,
    });
    expect(result.correction).not.toBeNull();
  });

  it("accepts the sale-created feedback code", async () => {
    const result = await loader({
      request: getRequest(`/admin/inscripciones/${sale.id}?ok=sale-created`),
      params: { id: sale.id },
      context: adminContext(
        services({ detail: () => Promise.resolve(ok(sale)) }),
      ),
    } as never);

    expect(result.feedback).toBe("sale-created");
  });
});

describe("opening an enrollment marks it read for both owners", () => {
  it("marks the opened order once the page data loaded, with the opening admin", async () => {
    const markSeen = vi.fn(() =>
      Promise.resolve(ok({ kind: "seen" as const })),
    );

    await load({ detail: () => Promise.resolve(ok(detail)), markSeen });

    expect(markSeen).toHaveBeenCalledTimes(1);
    expect(markSeen).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.test" }),
      "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b",
    );
  });

  it("returns exactly the same page data whether or not the mark worked", async () => {
    const detailOnly = { detail: () => Promise.resolve(ok(detail)) };
    const plain = await load(detailOnly);

    const marked = await load({
      ...detailOnly,
      markSeen: () => Promise.resolve(ok({ kind: "already-seen" as const })),
    });
    const refused = await load({
      ...detailOnly,
      markSeen: () => Promise.resolve(err({ kind: "unavailable" as const })),
    });
    const failing = await load({
      ...detailOnly,
      markSeen: () => Promise.reject(new Error("db down")),
    });

    expect(marked).toEqual(plain);
    expect(refused).toEqual(plain);
    expect(failing).toEqual(plain);
  });

  it("marks nothing for an unknown order, a bad id or a non-admin", async () => {
    const markSeen = vi.fn(() =>
      Promise.resolve(ok({ kind: "seen" as const })),
    );

    expect(
      await thrownStatus(() =>
        load({
          detail: () => Promise.resolve(err({ kind: "not-found" as const })),
          markSeen,
        }),
      ),
    ).toBe(404);
    expect(
      await thrownStatus(() =>
        load({ detail: () => Promise.resolve(ok(detail)), markSeen }, false),
      ),
    ).toBe(403);
    expect(markSeen).not.toHaveBeenCalled();
  });
});
