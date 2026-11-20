import { describe, expect, it, vi } from "vitest";
import { err, Money, ok } from "~/modules/_shared";
import { servicesContext } from "~/app/context";
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
import {
  ATT_MONDAY,
  ATT_PERIOD,
  ATT_WEDNESDAY,
  attendanceFixture,
} from "~/testing/admin/attendance-kit";
import { studentsFixture } from "~/testing/admin/student-kit";
import { studentOrder } from "~/testing/fakes/student-builders";
import { createInMemoryIntensiveRequests } from "~/testing/fakes/intensive-request-builders";
import { buildStoredRequest } from "~/testing/contracts/intensive-request-repository.contract";
import { action, loader } from "./student-detail";

const pesos = (value: number) => {
  const money = Money.fromCentavos(value * 100);
  if (!money.ok) throw new Error("fixture money");
  return money.value;
};

const PAID = studentOrder(1, {
  studentEmail: "ana@example.com",
  studentName: "Ana Pérez",
  status: "paid",
  paidAt: new Date("2026-10-05T15:00:00Z"),
});
const CANCELLED = studentOrder(2, {
  studentEmail: "ana@example.com",
  studentName: "Ana Pérez",
  workshopName: "Acuarela",
  status: "cancelled",
});
const OWED = studentOrder(4, {
  studentEmail: "ana@example.com",
  studentName: "Ana Pérez",
  workshopName: "Dibujo",
  period: "2026-11",
});
const SALE = studentOrder(3, {
  studentEmail: "ana@example.com",
  studentName: "Ana Pérez",
  status: "pending_confirmation",
  kind: "material_sale",
});

/** The detail the enrollments service gives for each order of the file. */
function detailOf(
  source: ReturnType<typeof studentOrder>,
  overrides: Record<string, unknown> = {},
): AdminEnrollmentDetail {
  return {
    id: source.id,
    number: source.number,
    status: source.status,
    workshopName: source.workshopName,
    period: source.period,
    turnoLabel: source.turnoLabel,
    total: source.total,
    ...(source.status === "paid" ? { paidAmount: source.total } : {}),
    ...(source.kind === undefined ? {} : { kind: source.kind }),
    lines: [],
    sales: [],
    ...overrides,
  } as unknown as AdminEnrollmentDetail;
}

const saleLine = {
  materialName: "Arcilla",
  variantLabel: "1 kg",
  unitPrice: pesos(4000),
  quantity: 2,
  supplierName: "Proveedor",
};

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

type Calls = {
  confirmPayment: ReturnType<typeof vi.fn>;
  createMaterialSale: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
};

function setup(
  orders = [PAID, CANCELLED],
  seats = createInMemoryIntensiveRequests(),
) {
  const fixture = studentsFixture();
  fixture.orders.orders.push(...orders);
  fixture.activity.enrolled("ana@example.com");
  const details = new Map(
    orders.map((order) => [
      order.id,
      detailOf(
        order,
        order.id === OWED.id
          ? {
              sales: [
                {
                  id: SALE.id,
                  number: SALE.number,
                  status: "pending_confirmation",
                  total: pesos(8000),
                  requestedAt: new Date("2026-11-05T15:00:00Z"),
                },
              ],
            }
          : {},
      ),
    ]),
  );
  details.set(
    SALE.id,
    detailOf(SALE, {
      total: pesos(8000),
      lines: [saleLine],
      parent: { id: OWED.id, number: OWED.number },
    }),
  );
  const calls: Calls = {
    confirmPayment: vi.fn(() => Promise.resolve(ok({ kind: "confirmed" }))),
    createMaterialSale: vi.fn(() =>
      Promise.resolve(ok({ id: SALE.id, number: SALE.number })),
    ),
    cancel: vi.fn(() => Promise.resolve(ok({ kind: "cancelled" }))),
  };
  const enrollments = withOverrides(createUnavailableAdminEnrollmentService(), {
    detail: (_actor: unknown, id: string) => {
      const found = details.get(id);
      return Promise.resolve(
        found === undefined ? err({ kind: "not-found" }) : ok(found),
      );
    },
    ...(calls as unknown as Partial<AdminEnrollmentUseCases>),
  });
  const onHand: StockStore["onHand"] = (ids) =>
    Promise.resolve(new Map(ids.map((id) => [id, 3] as const)));
  const context = adminContext({
    students: fixture.service,
    intensiveRequests: seats.service,
    enrollments,
    materials: withOverrides(createUnavailableService<MaterialsService>(), {
      listSaleVariants: () => Promise.resolve(ok(saleVariants)),
    }),
    variantStock: { onHand },
  });
  return { ...fixture, context, calls };
}

const path = (email: string) => `/admin/alumnas/${encodeURIComponent(email)}`;
const loadArgs = (context: unknown, email: string, query = "") =>
  ({
    request: getRequest(`${path(email)}${query}`),
    params: { email },
    context,
  }) as never;
const actionArgs = (context: unknown, email: string, note: string) =>
  ({
    request: postRequest(path(email), { intent: "note", note }),
    params: { email },
    context,
  }) as never;
/** A post from the file page, as its native forms send it. */
const post = (
  context: unknown,
  fields: Record<string, string>,
  email = "ana@example.com",
) =>
  action({
    request: postRequest(path(email), {
      returnTo: path(email),
      ...fields,
    }),
    params: { email },
    context,
  } as never) as Promise<Response>;

describe("admin student file loader", () => {
  it("says what was just saved, only for a known code, with her name", async () => {
    const { context } = setup();
    const known = await loader(
      loadArgs(context, "ana@example.com", "?ok=paid"),
    );
    const created = await loader(
      loadArgs(context, "ana@example.com", "?ok=created"),
    );
    const unknown = await loader(
      loadArgs(context, "ana@example.com", "?ok=<b>hi</b>"),
    );

    expect(known.saved).toBe("cobro de Ana Pérez");
    expect(created.saved).toBe("inscripción de Ana Pérez");
    expect(unknown.saved).toBeNull();
  });

  it("shows her data and one card per monthly record, newest first, each with its state in words", async () => {
    const { context, notes } = setup([PAID, CANCELLED, OWED, SALE]);
    notes.notes.set("ana@example.com", {
      email: "ana@example.com",
      text: "Zurda.",
      updatedBy: "owner@example.com",
      updatedAt: new Date("2026-10-31T15:30:00Z"),
    });

    const result = await loader(loadArgs(context, "Ana@Example.com"));

    expect(result).toMatchObject({
      name: "Ana Pérez",
      email: "ana@example.com",
      active: true,
      path: "/admin/alumnas/ana%40example.com",
      note: {
        text: "Zurda.",
        meta: "Actualizadas por owner@example.com el 31/10/2026 12:30.",
      },
    });
    expect(
      result.records.map((record) => [
        record.number,
        record.workshop,
        record.state,
      ]),
    ).toEqual([
      ["CI-2026-0004", "Dibujo", "owes"],
      ["CI-2026-0002", "Acuarela", "cancelled"],
      ["CI-2026-0001", "Cerámica inicial", "paid"],
    ]);
    expect(result.records[0]).toMatchObject({
      month: "noviembre 2026",
      total: "$ 58.000",
      canPay: true,
      canSell: true,
    });
  });

  // The owner's report: "al cargar una venta de materiales, se esta cargando
  // como un nuevo turno, se tiene que cargar en la misma ficha del cliente".
  it("nests a material sale in its monthly record and never lists it as a record of its own", async () => {
    const { context } = setup([PAID, OWED, SALE]);

    const result = await loader(loadArgs(context, "ana@example.com"));

    expect(result.records.map((record) => record.number)).toEqual([
      "CI-2026-0004",
      "CI-2026-0001",
    ]);
    const [dibujo, ceramica] = result.records;
    expect(ceramica?.sales).toEqual([]);
    expect(dibujo?.sales).toHaveLength(1);
    expect(dibujo?.sales[0]).toMatchObject({
      number: "CI-2026-0003",
      anchor: "v-ci-2026-0003",
      state: "owes",
      total: "$ 8.000",
      lines: [{ label: "Arcilla 1 kg", quantity: 2 }],
      canPay: true,
    });
  });

  it("offers the catalog for a sale only when a record can take one", async () => {
    const withRecord = setup([PAID]);
    const onlyCancelled = setup([CANCELLED]);

    const open = await loader(loadArgs(withRecord.context, "ana@example.com"));
    const closed = await loader(
      loadArgs(onlyCancelled.context, "ana@example.com"),
    );

    expect(open.materials.map((material) => material.variantId)).toEqual([
      "v-1",
    ]);
    expect(closed.materials).toEqual([]);
  });

  it('points "Inscribir en otro mes" at the enrollment form filled with her data', async () => {
    const { context } = setup();

    const result = await loader(loadArgs(context, "ana@example.com"));

    const url = new URL(result.enrollHref, "https://panel.test");
    expect(url.pathname).toBe("/admin/inscripciones/nueva");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      nombre: "Ana Pérez",
      email: "ana@example.com",
      telefono: "5493515550002",
    });
  });

  it("answers 404 for an unknown student and for a path that is not an email", async () => {
    const { context } = setup();
    expect(
      await thrownStatus(() => loader(loadArgs(context, "no@example.com"))),
    ).toBe(404);
    expect(
      await thrownStatus(() => loader(loadArgs(context, "not-an-email"))),
    ).toBe(404);
  });

  it("returns nothing to a request that is not an admin", async () => {
    const { service } = studentsFixture();
    const context = adminContext({ students: service }, { admin: false });
    expect(
      await thrownStatus(() => loader(loadArgs(context, "ana@example.com"))),
    ).toBe(403);
  });
});

describe("admin student file: collecting, selling and cancelling in place", () => {
  it("collects the full amount of a record and returns to its card with the saved code", async () => {
    const { context, calls } = setup([OWED]);

    const response = await post(context, {
      intent: "confirm",
      orderId: OWED.id,
      anchor: "r-ci-2026-0004",
      amount: "58000",
      paidOn: "2026-11-05",
    });

    expect(calls.confirmPayment).toHaveBeenCalledWith(expect.anything(), {
      orderId: OWED.id,
      amount: "58000",
      paidOn: "2026-11-05",
    });
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "/admin/alumnas/ana%40example.com?ok=paid#r-ci-2026-0004",
    );
  });

  it("shows a refused payment on its own card and stores nothing more", async () => {
    const { context, calls } = setup([OWED]);
    calls.confirmPayment.mockResolvedValueOnce(
      err({ kind: "amount-mismatch" }),
    );

    const result = await post(context, {
      intent: "confirm",
      orderId: OWED.id,
      anchor: "r-ci-2026-0004",
      amount: "100",
      paidOn: "2026-11-05",
    });

    expect(result).toMatchObject({
      init: { status: 409 },
      data: {
        orderId: OWED.id,
        intent: "confirm",
        message: "El monto no coincide con el total del pedido.",
      },
    });
  });

  it("sells materials under the record and returns to the record's card", async () => {
    const { context, calls } = setup([OWED]);

    const response = await post(context, {
      intent: "sale",
      orderId: OWED.id,
      anchor: "r-ci-2026-0004",
      "line:m-1:v-1": "2",
    });

    expect(calls.createMaterialSale).toHaveBeenCalledWith(expect.anything(), {
      orderId: OWED.id,
      lines: [{ materialId: "m-1", variantId: "v-1", quantity: 2 }],
      paid: false,
    });
    expect(response.headers.get("Location")).toBe(
      "/admin/alumnas/ana%40example.com?ok=sold#r-ci-2026-0004",
    );
  });

  it('asks for the sale to be stored paid in the same save when "Ya pagó" is checked', async () => {
    const { context, calls } = setup([OWED]);

    await post(context, {
      intent: "sale",
      orderId: OWED.id,
      anchor: "r-ci-2026-0004",
      "line:m-1:v-1": "1",
      paid: "on",
    });

    expect(calls.createMaterialSale).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ paid: true }),
    );
    // One submit: the sale is not paid by a second call.
    expect(calls.confirmPayment).not.toHaveBeenCalled();
  });

  it("keeps what was typed when a sale is refused: no material, and a record that cannot take it", async () => {
    const { context, calls } = setup([OWED]);

    const none = await post(context, {
      intent: "sale",
      orderId: OWED.id,
      anchor: "r-ci-2026-0004",
      paid: "on",
    });
    calls.createMaterialSale.mockResolvedValueOnce(
      err({ kind: "not-sellable" }),
    );
    const closed = await post(context, {
      intent: "sale",
      orderId: OWED.id,
      anchor: "r-ci-2026-0004",
      "line:m-1:v-1": "3",
    });

    expect(none).toMatchObject({
      init: { status: 422 },
      data: {
        orderId: OWED.id,
        intent: "sale",
        message: "Elegí al menos un material.",
        paid: true,
      },
    });
    expect(calls.createMaterialSale).toHaveBeenCalledTimes(1);
    expect(closed).toMatchObject({
      init: { status: 409 },
      data: {
        intent: "sale",
        lines: [{ materialId: "m-1", variantId: "v-1", quantity: "3" }],
      },
    });
  });

  it("cancels a pending record with its reason and returns to its card", async () => {
    const { context, calls } = setup([OWED]);

    const response = await post(context, {
      intent: "cancel",
      orderId: OWED.id,
      anchor: "r-ci-2026-0004",
      reason: "No viene más",
    });

    expect(calls.cancel).toHaveBeenCalledWith(expect.anything(), {
      orderId: OWED.id,
      reason: "No viene más",
    });
    expect(response.headers.get("Location")).toBe(
      "/admin/alumnas/ana%40example.com?ok=cancelled#r-ci-2026-0004",
    );
  });

  it("cancels a paid record with the refund it was given back", async () => {
    const { context, calls } = setup([PAID]);

    await post(context, {
      intent: "cancel",
      orderId: PAID.id,
      anchor: "r-ci-2026-0001",
      reason: "Se mudó",
      refundAmount: "58000",
      refundedOn: "2026-11-05",
      refundNote: "Transferencia",
    });

    expect(calls.cancel).toHaveBeenCalledWith(expect.anything(), {
      orderId: PAID.id,
      reason: "Se mudó",
      refund: {
        amount: "58000",
        refundedOn: "2026-11-05",
        note: "Transferencia",
      },
    });
  });

  it("explains a refused cancellation on its card", async () => {
    const { context, calls } = setup([PAID]);
    calls.cancel.mockResolvedValueOnce(
      err({ kind: "invalid-refund", field: "amount", code: "above-paid" }),
    );

    const result = await post(context, {
      intent: "cancel",
      orderId: PAID.id,
      anchor: "r-ci-2026-0001",
      reason: "Se mudó",
      refundAmount: "99999",
      refundedOn: "2026-11-05",
    });

    expect(result).toMatchObject({
      init: { status: 422 },
      data: {
        orderId: PAID.id,
        intent: "cancel",
        message: "La devolución no puede ser mayor que lo cobrado.",
      },
    });
  });

  it("acts only on an order of this student, and never from a visitor", async () => {
    const { context, calls } = setup([OWED]);
    const stranger = "00000000-0000-4000-8000-000100000099";

    expect(
      await thrownStatus(() =>
        post(context, { intent: "confirm", orderId: stranger }),
      ),
    ).toBe(404);
    expect(
      await thrownStatus(() =>
        post(context, { intent: "confirm", orderId: "not-an-id" }),
      ),
    ).toBe(400);
    const denied = adminContext({}, { admin: false });
    expect(
      await thrownStatus(() =>
        post(denied, { intent: "confirm", orderId: OWED.id }),
      ),
    ).toBe(403);
    expect(calls.confirmPayment).not.toHaveBeenCalled();
  });
});

describe("admin student file: note and state", () => {
  it("saves the note and returns to the note, not to a different page", async () => {
    const { context, notes } = setup();

    const response = (await action({
      request: postRequest(path("ana@example.com"), {
        intent: "note",
        note: " Viene con su hermana ",
        returnTo: path("ana@example.com"),
        anchor: "nota",
      }),
      params: { email: "ana@example.com" },
      context,
    } as never)) as Response;

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "/admin/alumnas/ana%40example.com?ok=note-saved#nota",
    );
    expect(notes.notes.get("ana@example.com")).toMatchObject({
      text: "Viene con su hermana",
      updatedBy: "a@x.test",
    });
  });

  it("answers 422 with the typed text when the note is too long", async () => {
    const { context, notes } = setup();
    const long = "x".repeat(2001);

    const result = await action(actionArgs(context, "ana@example.com", long));

    expect(result).toMatchObject({
      init: { status: 422 },
      data: {
        intent: "note",
        message: "La nota es demasiado larga (máximo 2000 caracteres).",
        noteValue: long,
      },
    });
    expect(notes.notes.size).toBe(0);
  });

  it("answers 404 for an unknown student and 400 without a note", async () => {
    const { context } = setup();
    expect(
      await thrownStatus(() =>
        action(actionArgs(context, "no@example.com", "x")),
      ),
    ).toBe(404);
    expect(
      await thrownStatus(() =>
        action({
          request: postRequest(path("ana@example.com"), { intent: "note" }),
          params: { email: "ana@example.com" },
          context,
        } as never),
      ),
    ).toBe(400);
  });
});

describe("admin student detail activity", () => {
  const intentArgs = (context: unknown, email: string, intent: string) =>
    ({
      request: postRequest(path(email), { intent }),
      params: { email },
      context,
    }) as never;

  it("reports whether she is active", async () => {
    const { context } = setup();
    const result = await loader(loadArgs(context, "ana@example.com"));
    expect(result.active).toBe(true);
  });

  it("deactivates and reactivates her, keeping her history and note", async () => {
    const { context, notes } = setup();
    await action(actionArgs(context, "ana@example.com", "Zurda."));

    const off = (await action(
      intentArgs(context, "ana@example.com", "deactivate"),
    )) as Response;
    const inactive = await loader(loadArgs(context, "ana@example.com"));
    const on = (await action(
      intentArgs(context, "ana@example.com", "reactivate"),
    )) as Response;
    const active = await loader(loadArgs(context, "ana@example.com"));

    expect(off.status).toBe(302);
    expect(off.headers.get("Location")).toBe(
      "/admin/alumnas/ana%40example.com?ok=deactivated",
    );
    expect(on.headers.get("Location")).toBe(
      "/admin/alumnas/ana%40example.com?ok=reactivated",
    );
    expect(inactive.active).toBe(false);
    expect(active.active).toBe(true);
    expect(inactive.records).toEqual(active.records);
    expect(inactive.records).toHaveLength(2);
    expect(inactive.note.text).toBe("Zurda.");
    expect(notes.notes.get("ana@example.com")?.text).toBe("Zurda.");
  });

  it("refuses a request that is not an admin and changes nothing", async () => {
    const { service, orders, activity } = studentsFixture();
    orders.orders.push(studentOrder(1, { studentEmail: "ana@example.com" }));
    activity.enrolled("ana@example.com");
    const context = adminContext({ students: service }, { admin: false });

    expect(
      await thrownStatus(() =>
        action(intentArgs(context, "ana@example.com", "deactivate")),
      ),
    ).toBe(403);
    expect([...(await activity.inactiveEmails())]).toEqual([]);
  });

  it("answers 404 for an unknown student and 400 for an unknown intent", async () => {
    const { context } = setup();
    expect(
      await thrownStatus(() =>
        action(intentArgs(context, "no@example.com", "deactivate")),
      ),
    ).toBe(404);
    expect(
      await thrownStatus(() =>
        action(intentArgs(context, "ana@example.com", "delete")),
      ),
    ).toBe(400);
  });
});

describe("admin student detail attendance summary", () => {
  const actor = { kind: "admin-actor" as const, email: "a@x.test" };

  it("counts presences, absences and make-ups across her classes", async () => {
    const base = studentsFixture();
    base.orders.orders.push(
      studentOrder(1, {
        studentEmail: "ana@example.com",
        studentName: "Ana Pérez",
      }),
    );
    const attendance = attendanceFixture();
    const sessions = [
      ["2026-10-05", "absent"],
      ["2026-10-12", "present"],
      ["2026-10-19", "present"],
    ] as const;
    for (const [date, status] of sessions)
      await attendance.service.recordSession(
        actor,
        ATT_PERIOD,
        ATT_MONDAY,
        date,
        [{ email: "ana@example.com", status }],
      );
    await attendance.service.scheduleMakeUp(actor, {
      email: "ana@example.com",
      periodId: ATT_PERIOD,
      turnoId: ATT_MONDAY,
      date: "2026-10-05",
      makeUpPeriodId: ATT_PERIOD,
      makeUpTurnoId: ATT_WEDNESDAY,
      makeUpDate: "2026-10-14",
    });
    const context = adminContext({
      students: base.service,
      intensiveRequests: createInMemoryIntensiveRequests().service,
      attendance: attendance.service,
      enrollments: withOverrides(createUnavailableAdminEnrollmentService(), {
        detail: () => Promise.resolve(ok(detailOf(studentOrder(1)))),
      }),
      materials: withOverrides(createUnavailableService<MaterialsService>(), {
        listSaleVariants: () => Promise.resolve(ok([])),
      }),
      variantStock: { onHand: () => Promise.resolve(new Map()) },
    });

    const result = await loader(loadArgs(context, "ana@example.com"));

    expect(result.attendance).toBe("Vino 2 · Faltó 1 · Recuperos pendientes 1");
  });

  // The owner's report: "las alumnas cuando se vende un nuevo material,
  // sigue apareciendo como al adia, cuando en realidad esta debiendo".
  it("says in one line that she owes a pending sale although her fee is paid, and Al día when she owes nothing", async () => {
    const owing = setup([PAID, SALE]);
    const settled = setup([PAID]);

    const debt = await loader(loadArgs(owing.context, "ana@example.com"));
    const clear = await loader(loadArgs(settled.context, "ana@example.com"));

    expect(debt.owes).toBe("$ 58.000");
    expect(debt.seatDebts).toEqual([]);
    expect(clear.owes).toBeNull();
  });

  it("adds a workshop balance or deposit to what she owes and names it", async () => {
    const seats = createInMemoryIntensiveRequests();
    seats.repository.requests.set(
      "r1",
      buildStoredRequest({
        id: "r1",
        status: "confirmed",
        email: "ana@example.com",
        price: pesos(40000),
        deposit: pesos(15000),
        paidAmount: pesos(15000),
      }),
    );
    const { context } = setup([PAID, OWED], seats);

    const result = await loader(loadArgs(context, "ana@example.com"));

    expect(result.owes).toBe("$ 83.000");
    expect(result.seatDebts).toEqual([
      { label: "Saldo de Intensivo de cerámica", amount: "$ 25.000" },
    ]);
  });

  it("fails closed instead of showing Al día when the workshop payments cannot be read", async () => {
    const { context } = setup();
    const services = context.get(servicesContext);
    const broken = adminContext({
      students: services.students,
      enrollments: services.enrollments,
    });

    expect(
      await thrownStatus(() => loader(loadArgs(broken, "ana@example.com"))),
    ).toBe(503);
  });

  it("shows her phone the way people say it, with links to call and to write", async () => {
    const { context } = setup([PAID]);

    const result = await loader(loadArgs(context, "ana@example.com"));

    expect(result).toMatchObject({
      phone: "5493515550001",
      phoneShown: "351 555-0001",
      phoneLink: "tel:+5493515550001",
      whatsappLink: "https://wa.me/5493515550001?text=",
    });
  });

  it("leaves the summary out when attendance is unavailable", async () => {
    const { context } = setup();
    const result = await loader(loadArgs(context, "ana@example.com"));
    expect(result.attendance).toBeNull();
  });
});
