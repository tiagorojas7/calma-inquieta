import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { err, ok } from "~/modules/_shared";
import {
  createUnavailableAdminEnrollmentService,
  type AdminEnrollmentUseCases,
} from "~/modules/enrollments";
import { createUnavailableIntensiveRequestService } from "~/modules/intensive-requests";
import { attendanceFixture } from "~/testing/admin/attendance-kit";
import {
  adminContext,
  getRequest,
  postRequest,
  thrownStatus,
  withOverrides,
} from "~/testing/admin/route-kit";
import { insightsFixture } from "~/testing/admin/insights-kit";
import {
  FLOW_MONTH,
  FLOW_NEXT_MONTH,
  workshopFlowFixture,
} from "~/testing/admin/workshop-flow-kit";
import { seedTeacher, seedWorkshop } from "~/testing/admin/workshop-seed";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { buildStoredPrivateEvent } from "~/testing/contracts/private-event-repository.contract";
import {
  buildIntensiveOffer,
  createInMemoryIntensiveRequests,
  FAKE_INTENSIVE_ID,
  FAKE_INTENSIVE_SLUG,
  FAKE_PROJECT_ID,
} from "~/testing/fakes/intensive-request-builders";
import { createTestServices } from "~/testing/fakes/app-services";
import { action, loader } from "./home";

const ORDER_ID = "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  // A Monday, so the attendance fixture has a class today.
  vi.setSystemTime(new Date("2026-10-05T15:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

function load(
  options: {
    admin?: boolean;
    unansweredEvents?: number;
    path?: string;
    overrides?: Parameters<typeof adminContext>[0];
  } = {},
) {
  const { orders, workshops, intensiveRequests, service } = insightsFixture();
  orders.pending = { total: 4, older: 1 };
  orders.pendingPaymentRows = [
    {
      id: ORDER_ID,
      kind: "enrollment",
      studentName: "Ana Pérez",
      workshopName: "Cerámica",
      period: "2026-10",
      totalCentavos: 45_000_00,
      requestedAt: new Date("2026-10-30T12:00:00.000Z"),
    },
  ];
  intensiveRequests.pending = 2;
  workshops.published = [
    { workshopId: "w2", name: "Acuarela", periodStatus: null },
  ];
  const events = withOverrides(createTestServices().privateEvents, {
    list: () =>
      Promise.resolve(
        ok(
          Array.from({ length: options.unansweredEvents ?? 0 }, (_, index) =>
            buildStoredPrivateEvent({
              id: `00000000-0000-4000-8000-00000000000${String(index)}`,
              fullName: `Dora ${String(index)}`,
            }),
          ),
        ),
      ),
  });
  return loader({
    request: getRequest(options.path ?? "/admin"),
    params: {},
    context: adminContext(
      {
        insights: service,
        privateEvents: events,
        attendance: attendanceFixture().service,
        ...options.overrides,
      },
      { admin: options.admin ?? true },
    ),
  } as never);
}

describe("admin home loader", () => {
  it("shows the month's numbers and one card per thing to do", async () => {
    const result = await load({ unansweredEvents: 1 });

    expect(result.screen.monthLabel).toBe("octubre 2026");
    expect(result.screen.figures).toMatchObject({
      collected: "$ 0",
      toCollect: "$ 45.000",
    });
    expect(
      result.screen.todo.cards.map((card) => [card.id, card.title]),
    ).toEqual([
      // The event (20/10) is older than the fee (30/10).
      ["evento-00000000-0000-4000-8000-000000000000", "Dora 0"],
      [`cobrar-${ORDER_ID}`, "Ana Pérez"],
      ["abrir-w2", "Acuarela"],
    ]);
  });

  it("lists today's classes, in Córdoba time, with their attendance sheet", async () => {
    const result = await load();

    expect(result.screen.classes).toMatchObject([
      {
        title: "Cerámica",
        facts: "18:00 a 20:00 h · 3 alumnas",
        href: "/admin/asistencia/0b6f7a3e-1c1e-4a39-9d57-0d1d7c1f0a01/7c9d1a52-83f4-4b0e-a7a5-5f0e2c4b9a02/2026-10-05",
      },
    ]);
  });

  it("counts a late-evening class on the Córdoba day, not the UTC one", async () => {
    // 01:00 UTC on Tuesday the 6th is still Monday evening in Córdoba.
    vi.setSystemTime(new Date("2026-10-06T01:00:00.000Z"));

    const result = await load();

    expect(result.screen.classes).toHaveLength(1);
  });

  it("adds a card for each open month with no active turno", async () => {
    const workshops = withOverrides(createTestServices().monthlyWorkshops, {
      list: () =>
        Promise.resolve({ ok: true, value: [{ id: "w1", name: "Cerámica" }] }),
    } as never);
    const periods = withOverrides(createTestServices().workshopPeriods, {
      list: () =>
        Promise.resolve({
          ok: true,
          value: {
            periods: [
              {
                id: "p-oct",
                period: "2026-10",
                status: "open",
                activeTurnos: 0,
              },
            ],
            suggestedNext: null,
          },
        }),
    } as never);

    const result = await load({
      overrides: { monthlyWorkshops: workshops, workshopPeriods: periods },
    });

    expect(
      result.screen.todo.cards.find((card) => card.id === "turnos-p-oct"),
    ).toMatchObject({
      kind: "link",
      title: "Cerámica",
      href: "/admin/talleres/w1",
    });
  });

  it("shows every card when asked, and posts come back to that view", async () => {
    const short = await load({ path: "/admin" });
    const all = await load({ path: "/admin?ver=todo&ok=charged" });

    expect(short.returnTo).toBe("/admin");
    expect(all.returnTo).toBe("/admin?ver=todo");
  });

  it("names what was saved from a known code and ignores any other", async () => {
    expect((await load({ path: "/admin?ok=charged" })).saved).toBe("cobro");
    expect((await load({ path: "/admin?ok=deposit" })).saved).toBe("seña");
    expect((await load({ path: "/admin?ok=balance" })).saved).toBe("saldo");
    expect((await load({ path: "/admin?ok=opened" })).saved).toBe(
      "mes abierto",
    );
    expect((await load({ path: "/admin?ok=<b>x</b>" })).saved).toBeNull();
    expect((await load()).saved).toBeNull();
  });

  it("still shows the day when the private events cannot be read", async () => {
    const result = await load({
      overrides: {
        privateEvents: withOverrides(createTestServices().privateEvents, {
          list: () => Promise.resolve(err({ kind: "denied" })),
        } as never),
      },
    });

    expect(result.screen.todo.cards.some((card) => card.kind === "event")).toBe(
      false,
    );
  });

  it("still shows the day when the schedule cannot be read", async () => {
    const result = await load({
      overrides: {
        attendance: withOverrides(attendanceFixture().service, {
          listTurnos: () => Promise.reject(new Error("db down")),
        }),
      },
    });

    expect(result.screen.classes).toEqual([]);
  });

  it("refuses a request without an admin before reading any figure", async () => {
    expect(await thrownStatus(() => load({ admin: false }))).toBe(403);
  });

  it("fails closed as unavailable when the figures cannot be read", async () => {
    const status = await thrownStatus(() =>
      loader({
        request: getRequest("/admin"),
        params: {},
        context: adminContext(),
      } as never),
    );

    expect(status).toBe(503);
  });
});

type Rejected = {
  data: { failure: { card: string; message: string } };
  init: { status: number };
};

function enrollmentsWith(confirmPayment: unknown) {
  return withOverrides(createUnavailableAdminEnrollmentService(), {
    confirmPayment,
  } as Partial<AdminEnrollmentUseCases>);
}

function post(
  fields: Record<string, string>,
  overrides: Parameters<typeof adminContext>[0],
  options: { admin?: boolean; headers?: Record<string, string> } = {},
) {
  return action({
    request: postRequest("/admin", fields, options.headers),
    params: {},
    context: adminContext(overrides, { admin: options.admin ?? true }),
  } as never);
}

const location = (response: unknown) =>
  (response as Response).headers.get("Location");

describe("admin home action: charge a fee or a material sale", () => {
  const fields = {
    intent: "confirm-order",
    orderId: ORDER_ID,
    amount: "45000",
    returnTo: "/admin",
    anchor: `cobrar-${ORDER_ID}`,
  };

  it("confirms the payment with today's date and stays on Hoy at the same card", async () => {
    const confirmPayment = vi.fn(() =>
      Promise.resolve(ok({ kind: "confirmed" as const })),
    );

    const response = await post(fields, {
      enrollments: enrollmentsWith(confirmPayment),
    });

    expect(confirmPayment).toHaveBeenCalledWith(expect.anything(), {
      orderId: ORDER_ID,
      amount: "45000",
      paidOn: "2026-10-05",
    });
    expect(location(response)).toBe(`/admin?ok=charged#cobrar-${ORDER_ID}`);
  });

  it("uses the Córdoba day, even when it is already tomorrow in UTC", async () => {
    vi.setSystemTime(new Date("2026-10-06T01:00:00.000Z"));
    const confirmPayment = vi.fn(() =>
      Promise.resolve(ok({ kind: "confirmed" as const })),
    );

    await post(fields, { enrollments: enrollmentsWith(confirmPayment) });

    expect(confirmPayment).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ paidOn: "2026-10-05" }),
    );
  });

  it("comes back to the expanded list when the page was opened with every card", async () => {
    const confirmPayment = vi.fn(() =>
      Promise.resolve(ok({ kind: "confirmed" as const })),
    );

    const response = await post(
      { ...fields, returnTo: "/admin?ver=todo" },
      { enrollments: enrollmentsWith(confirmPayment) },
    );

    expect(location(response)).toBe(
      `/admin?ver=todo&ok=charged#cobrar-${ORDER_ID}`,
    );
  });

  it.each([
    ["already-confirmed", "Ya estaba cobrado."],
    ["already-cancelled", "Ya estaba cancelado."],
    ["illegal-transition", "Ya no se puede cobrar."],
    ["amount-mismatch", "El monto no coincide con el pedido."],
    ["period-closed", "El mes ya está cerrado."],
    ["turno-full", "El turno está completo."],
  ])(
    "shows the refusal '%s' on its card with a 422 and no redirect",
    async (kind, message) => {
      const confirmPayment = vi.fn(() => Promise.resolve(err({ kind })));

      const result = (await post(fields, {
        enrollments: enrollmentsWith(confirmPayment),
      })) as Rejected;

      expect(result.init.status).toBe(422);
      expect(result.data.failure).toEqual({
        card: `cobrar-${ORDER_ID}`,
        message,
      });
    },
  );

  it("shows an already-paid order, which the service answers as a kind, the same way", async () => {
    const confirmPayment = vi.fn(() =>
      Promise.resolve(ok({ kind: "already-confirmed" as const })),
    );

    const result = (await post(fields, {
      enrollments: enrollmentsWith(confirmPayment),
    })) as Rejected;

    expect(result.init.status).toBe(422);
    expect(result.data.failure.message).toBe("Ya estaba cobrado.");
  });

  it("rejects an amount that is not whole pesos", async () => {
    const confirmPayment = vi.fn(() =>
      Promise.resolve(
        err({ kind: "invalid", issues: [{ field: "amount", code: "x" }] }),
      ),
    );

    const result = (await post(
      { ...fields, amount: "450,5" },
      { enrollments: enrollmentsWith(confirmPayment) },
    )) as Rejected;

    expect(result.init.status).toBe(422);
    expect(result.data.failure.message).toBe("El monto no es válido.");
  });

  it("fails closed for an unexpected failure, a bad id, a non-admin and a bad body", async () => {
    const confirmPayment = vi.fn(() =>
      Promise.resolve(err({ kind: "denied" })),
    );
    const services = { enrollments: enrollmentsWith(confirmPayment) };

    expect(await thrownStatus(() => post(fields, services))).toBe(403);
    expect(
      await thrownStatus(() => post({ ...fields, orderId: "x" }, services)),
    ).toBe(404);
    expect(
      await thrownStatus(() => post(fields, services, { admin: false })),
    ).toBe(403);
    expect(await thrownStatus(() => post({ intent: "other" }, services))).toBe(
      400,
    );
  });
});

describe("admin home action: deposits and balances of a workshop", () => {
  async function seeded(capacity = 2) {
    const { service, repository } = createInMemoryIntensiveRequests({
      offer: buildIntensiveOffer({ capacity }),
    });
    for (const email of ["ana@example.com", "bea@example.com"])
      await service.requestSeat({
        slug: FAKE_INTENSIVE_SLUG,
        projectId: FAKE_PROJECT_ID,
        student: {
          fullName: email,
          email,
          phone: "351 555 0101",
          policyAccepted: true,
          honeypot: "",
        },
      });
    const ids = [...repository.requests.values()].map((request) => request.id);
    return { repository, services: { intensiveRequests: service }, ids };
  }

  beforeEach(() => {
    // The fake clock of the intensive requests is 2026-10-28.
    vi.setSystemTime(new Date("2026-10-28T15:00:00.000Z"));
  });

  const deposit = (requestId: string) => ({
    intent: "confirm-deposit",
    intensiveId: FAKE_INTENSIVE_ID,
    requestId,
    amount: "15000",
    returnTo: "/admin",
    anchor: `sena-${requestId}`,
  });

  it("confirms the deposit, counts the seat and stays on Hoy", async () => {
    const { repository, services, ids } = await seeded();
    const id = ids[0] ?? "";

    const response = await post(deposit(id), services);

    expect(location(response)).toBe(`/admin?ok=deposit#sena-${id}`);
    expect(repository.requests.get(id)).toMatchObject({
      status: "confirmed",
      paidOn: "2026-10-28",
      confirmedBy: "a@x.test",
    });
  });

  it("refuses a deposit twice, and a full workshop, on the card", async () => {
    const { repository, services, ids } = await seeded(1);
    const [first = "", second = ""] = ids;
    await post(deposit(first), services);

    const again = (await post(deposit(first), services)) as Rejected;
    const full = (await post(deposit(second), services)) as Rejected;

    expect(again.init.status).toBe(422);
    expect(again.data.failure).toEqual({
      card: `sena-${first}`,
      message: "Ya no se puede cobrar.",
    });
    expect(full.init.status).toBe(422);
    expect(full.data.failure.message).toBe("El workshop está completo.");
    expect(repository.requests.get(second)?.status).toBe(
      "pending_confirmation",
    );
  });

  it("rejects an amount that differs from the deposit", async () => {
    const { repository, services, ids } = await seeded();
    const id = ids[0] ?? "";

    const result = (await post(
      { ...deposit(id), amount: "10000" },
      services,
    )) as Rejected;

    expect(result.init.status).toBe(422);
    expect(result.data.failure.message).toBe("El monto no es válido.");
    expect(repository.requests.get(id)?.status).toBe("pending_confirmation");
  });

  it("records the balance of a confirmed request, once", async () => {
    const { repository, services, ids } = await seeded();
    const id = ids[0] ?? "";
    await post(deposit(id), services);
    const balance = {
      intent: "record-balance",
      intensiveId: FAKE_INTENSIVE_ID,
      requestId: id,
      amount: "25000",
      returnTo: "/admin",
      anchor: `saldo-${id}`,
    };

    const response = await post(balance, services);
    const again = (await post(balance, services)) as Rejected;

    expect(location(response)).toBe(`/admin?ok=balance#saldo-${id}`);
    expect(repository.requests.get(id)).toMatchObject({
      balance: { paidOn: "2026-10-28", by: "a@x.test" },
    });
    expect(again.init.status).toBe(422);
    expect(again.data.failure.message).toBe("El saldo ya estaba cobrado.");
  });

  it("asks to confirm the deposit before a balance", async () => {
    const { services, ids } = await seeded();

    const result = (await post(
      {
        intent: "record-balance",
        intensiveId: FAKE_INTENSIVE_ID,
        requestId: ids[0] ?? "",
        amount: "25000",
      },
      services,
    )) as Rejected;

    expect(result.init.status).toBe(422);
    expect(result.data.failure.message).toBe("Primero confirmá la seña.");
  });

  it("fails closed for a bad id and an unavailable service", async () => {
    const { services, ids } = await seeded();

    expect(
      await thrownStatus(() =>
        post({ ...deposit(ids[0] ?? ""), requestId: "x" }, services),
      ),
    ).toBe(404);
    expect(
      await thrownStatus(() =>
        post({ ...deposit(ids[0] ?? ""), intensiveId: "x" }, services),
      ),
    ).toBe(404);
    expect(
      await thrownStatus(() =>
        post(deposit(ids[0] ?? ""), {
          intensiveRequests: createUnavailableIntensiveRequestService(),
        }),
      ),
    ).toBe(503);
  });
});

describe("admin home action: open the next month", () => {
  async function published() {
    const fixture = workshopFlowFixture();
    const teacherId = await seedTeacher(fixture, {
      name: "Ana",
      modality: "own",
    });
    const id = await seedWorkshop(fixture, { teacherId });
    await fixture.service.addTurno(testAdminActor(), id, {
      label: "Martes 10:00",
      weekday: "2",
      startsAt: "10:00",
      endsAt: "12:00",
      defaultCapacity: "8",
    });
    await fixture.service.publish(testAdminActor(), id);
    const opened = await fixture.periods.openMonth(
      testAdminActor(),
      id,
      FLOW_MONTH,
    );
    if (!opened.ok) throw new Error("open failed");
    await fixture.periods.publish(testAdminActor(), opened.value.id);
    return {
      id,
      services: {
        monthlyWorkshops: fixture.service,
        workshopPeriods: fixture.periods,
      },
      fixture,
    };
  }

  it("opens and publishes the month copying the previous one, and stays on Hoy", async () => {
    const { id, services, fixture } = await published();

    const response = await post(
      {
        intent: "open-month",
        workshopId: id,
        period: FLOW_NEXT_MONTH,
        returnTo: "/admin",
        anchor: `abrir-${id}`,
      },
      services,
    );

    expect(location(response)).toBe(`/admin?ok=opened#abrir-${id}`);
    expect(
      await fixture.periods.get(testAdminActor(), id, FLOW_NEXT_MONTH),
    ).toMatchObject({
      ok: true,
      value: { status: "open", turnos: [{ capacity: 8 }] },
    });
  });

  it("shows the refusal on the card when the month cannot be opened", async () => {
    const { id, services } = await published();

    const result = (await post(
      {
        intent: "open-month",
        workshopId: id,
        period: FLOW_MONTH,
        anchor: `abrir-${id}`,
      },
      services,
    )) as Rejected;

    expect(result.init.status).toBe(422);
    expect(result.data.failure).toEqual({
      card: `abrir-${id}`,
      message: "No se pudo abrir el mes.",
    });
  });

  it("rejects a malformed post, a non-admin and a cross-site post", async () => {
    const { id, services } = await published();
    const valid = {
      intent: "open-month",
      workshopId: id,
      period: FLOW_NEXT_MONTH,
    };

    expect(
      await thrownStatus(() => post({ ...valid, period: "nov" }, services)),
    ).toBe(400);
    expect(
      await thrownStatus(() => post({ ...valid, workshopId: "" }, services)),
    ).toBe(400);
    expect(
      await thrownStatus(() => post(valid, services, { admin: false })),
    ).toBe(403);
    expect(
      await thrownStatus(() =>
        post(valid, services, {
          headers: { Origin: "https://evil.example.test" },
        }),
      ),
    ).toBe(403);
  });
});

describe("admin home action: the way back", () => {
  it("never sends the owner outside the panel", async () => {
    const confirmPayment = vi.fn(() =>
      Promise.resolve(ok({ kind: "confirmed" as const })),
    );

    const response = await post(
      {
        intent: "confirm-order",
        orderId: ORDER_ID,
        amount: "45000",
        returnTo: "https://evil.example.test/admin",
        anchor: "<b>x</b>",
      },
      { enrollments: enrollmentsWith(confirmPayment) },
    );

    expect(location(response)).toBe("/admin?ok=charged");
  });
});
