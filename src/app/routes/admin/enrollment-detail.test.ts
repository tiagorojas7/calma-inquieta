import { describe, expect, it, vi } from "vitest";
import { err, Money, ok } from "~/modules/_shared";
import {
  createUnavailableAdminEnrollmentService,
  type AdminEnrollmentDetail,
  type AdminEnrollmentUseCases,
} from "~/modules/enrollments";
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
  id: "o1",
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

function services(overrides: Overrides) {
  return {
    enrollments: withOverrides(
      createUnavailableAdminEnrollmentService(),
      overrides,
    ),
  };
}

function load(overrides: Overrides, admin = true) {
  return loader({
    request: getRequest("/admin/inscripciones/o1"),
    params: { id: "o1" },
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
      "/admin/inscripciones/o1",
      fields,
      options.headers ?? { Origin: ORIGIN },
    ),
    params: { id: "o1" },
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

describe("admin enrollment detail loader", () => {
  it("shows every stored field, including contact data, for an admin", async () => {
    const result = await load({ detail: () => Promise.resolve(ok(detail)) });

    expect(result).toMatchObject({
      id: "o1",
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

describe("admin enrollment detail action", () => {
  it("confirms the payment and goes back to the detail", async () => {
    const confirmPayment = vi.fn(() =>
      Promise.resolve(ok({ kind: "confirmed" as const })),
    );
    const result = await submit({ confirmPayment }, confirmFields);

    expect(confirmPayment).toHaveBeenCalledWith(expect.anything(), {
      orderId: "o1",
      amount: "58000",
      paidOn: "2026-10-31",
      note: "Transferencia",
    });
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get("Location")).toBe(
      "/admin/inscripciones/o1",
    );
  });

  it("omits an empty note", async () => {
    const confirmPayment = vi.fn(() =>
      Promise.resolve(ok({ kind: "confirmed" as const })),
    );
    await submit({ confirmPayment }, { ...confirmFields, note: "  " });

    expect(confirmPayment).toHaveBeenCalledWith(expect.anything(), {
      orderId: "o1",
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
      orderId: "o1",
      reason: "Pidió la baja",
    });
    expect((result as Response).headers.get("Location")).toBe(
      "/admin/inscripciones/o1",
    );
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

    expect(mark).toHaveBeenCalledWith(expect.anything(), "o1");
    expect((result as Response).headers.get("Location")).toBe(
      "/admin/inscripciones/o1",
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
