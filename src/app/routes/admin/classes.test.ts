import { describe, expect, it } from "vitest";
import { createUnavailableService } from "~/composition/unavailable-service";
import { ok } from "~/modules/_shared";
import type { InsightsUseCases } from "~/modules/insights";
import type { IntensivesService, IntensiveWorkshop } from "~/modules/workshops";
import routes from "~/app/routes";
import {
  adminContext,
  getRequest,
  postRequest,
  thrownStatus,
  withOverrides,
} from "~/testing/admin/route-kit";
import { seedTeacher, seedWorkshop } from "~/testing/admin/workshop-seed";
import {
  FLOW_MONTH,
  FLOW_NEXT_MONTH,
  workshopFlowFixture,
} from "~/testing/admin/workshop-flow-kit";
import { monthName } from "~/app/admin/workshop-readiness";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import {
  buildIntensiveOffer,
  createInMemoryIntensiveRequests,
  FAKE_INTENSIVE_ID,
  FAKE_INTENSIVE_SLUG,
  FAKE_PROJECT_ID,
} from "~/testing/fakes/intensive-request-builders";
import { action, loader } from "./classes";

function childrenOfAdmin(): { path?: string; file: string }[] {
  const admin = (
    routes as unknown as {
      path?: string;
      children?: { path?: string; file: string }[];
    }[]
  ).find((entry) => entry.path === "admin");
  return admin?.children ?? [];
}

const FUTURE = "2099-01-10";
const OTHER_ID = "7c9d1a52-83f4-4b0e-a7a5-5f0e2c4b9a02";

/** A monthly taller published with one turno and the current month open. */
async function monthlyFixture() {
  const fixture = workshopFlowFixture();
  const teacherId = await seedTeacher(fixture, {
    name: "Ana",
    modality: "own",
  });
  const id = await seedWorkshop(fixture, { name: "Bordado", teacherId });
  const actor = testAdminActor();
  await fixture.service.addTurno(actor, id, {
    label: "Lunes 15:00",
    weekday: "1",
    startsAt: "15:00",
    endsAt: "17:00",
    defaultCapacity: "8",
  });
  await fixture.service.publish(actor, id);
  const opened = await fixture.periods.openMonth(actor, id, FLOW_MONTH);
  if (!opened.ok) throw new Error("open failed");
  await fixture.periods.publish(actor, opened.value.id);
  const found = await fixture.service.get(actor, id);
  if (!found.ok) throw new Error("get failed");
  return { fixture, id, turnoId: found.value.turnos[0]?.id ?? "" };
}

function intensiveRow(overrides: Partial<IntensiveWorkshop> = {}) {
  return {
    id: FAKE_INTENSIVE_ID,
    name: "Intensivo de cerámica",
    assignment: null,
    eventDate: FUTURE,
    startsAt: "10:00",
    status: "published",
    capacity: 2,
    ...overrides,
  } as unknown as IntensiveWorkshop;
}

async function setup(
  options: { intensives?: readonly IntensiveWorkshop[]; free?: number } = {},
) {
  const monthly = await monthlyFixture();
  const requests = createInMemoryIntensiveRequests({
    offer: buildIntensiveOffer({ eventDate: FUTURE, capacity: 2 }),
  });
  for (const [name, email] of [
    ["Ana Pérez", "ana@example.com"],
    ["Bea Gómez", "bea@example.com"],
  ] as const)
    await requests.service.requestSeat({
      slug: FAKE_INTENSIVE_SLUG,
      projectId: FAKE_PROJECT_ID,
      student: {
        fullName: name,
        email,
        phone: "351 555 0101",
        policyAccepted: true,
        honeypot: "",
      },
    });
  const ids = [...requests.repository.requests.values()].map(
    (request) => request.id,
  );
  const intensives = withOverrides(
    createUnavailableService<IntensivesService>(),
    {
      list: (_actor: unknown, filter: { status: string }) =>
        Promise.resolve(
          ok(
            filter.status === "live"
              ? (options.intensives ?? [intensiveRow()])
              : [],
          ),
        ),
    },
  );
  const insights = withOverrides(createUnavailableService<InsightsUseCases>(), {
    statistics: () =>
      Promise.resolve(
        ok({
          occupancy: {
            rows: [
              {
                workshopId: monthly.id,
                turnoId: monthly.turnoId,
                turnoLabel: "Lunes 15:00",
                free: options.free ?? 3,
              },
            ],
          },
        }),
      ),
  } as never);
  const services = {
    monthlyWorkshops: monthly.fixture.service,
    workshopPeriods: monthly.fixture.periods,
    teachers: monthly.fixture.teachers.service,
    intensives,
    insights,
    intensiveRequests: requests.service,
  };
  return { ...monthly, ...requests, ids, services };
}

const load = (
  services: object,
  query = "",
  options: { admin?: boolean } = {},
) =>
  loader({
    request: getRequest(`/admin/clases${query}`),
    params: {},
    context: adminContext(services, options),
  } as never);

const post = (
  services: object,
  fields: Record<string, string>,
  options: { admin?: boolean } = {},
) =>
  action({
    request: postRequest("/admin/clases", fields),
    params: {},
    context: adminContext(services, options),
  } as never);

describe("admin clases route", () => {
  it("is registered under /admin as clases", () => {
    expect(childrenOfAdmin()).toContainEqual(
      expect.objectContaining({
        path: "clases",
        file: "routes/admin/classes.tsx",
      }),
    );
  });

  it("refuses anyone who is not an admin, before reading anything", async () => {
    const { services } = await setup();
    expect(await thrownStatus(() => load(services, "", { admin: false }))).toBe(
      403,
    );
    expect(
      await thrownStatus(() =>
        post(services, { intent: "confirm" }, { admin: false }),
      ),
    ).toBe(403);
  });
});

describe("admin clases loader: monthly workshops", () => {
  it("shows the open month with each turno and its free seats, and offers the next month", async () => {
    const { services, id, turnoId } = await setup();

    const result = await load(services);

    expect(result.monthly).toEqual([
      {
        id,
        name: "Bordado",
        teacherName: "Ana",
        status: "published",
        openMonth: monthName(FLOW_MONTH),
        turnos: [{ id: turnoId, label: "Lunes 15:00", free: 3 }],
        openNext: {
          period: FLOW_NEXT_MONTH,
          label: monthName(FLOW_NEXT_MONTH),
        },
      },
    ]);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it("shows no turnos and offers the current month when none is open", async () => {
    const { services, fixture, id } = await setup();
    const listed = await fixture.periods.list(testAdminActor(), id);
    if (!listed.ok) throw new Error("list failed");
    const period = listed.value.periods[0];
    if (!period) throw new Error("no period");
    await fixture.periods.close(testAdminActor(), period.id);

    const result = await load(services);

    expect(result.monthly[0]).toMatchObject({
      openMonth: null,
      turnos: [],
    });
  });

  it("keeps archived tallers behind Ver anteriores", async () => {
    const { services, fixture, id } = await setup();
    const extra = await seedWorkshop(fixture, { name: "Acuarela" });
    await fixture.service.archive(testAdminActor(), extra);

    expect((await load(services)).monthly.map((card) => card.id)).toEqual([id]);
    expect((await load(services)).pastMonthly).toEqual([]);
    const past = await load(services, "?anteriores=1");
    expect(past.showPast).toBe(true);
    expect(past.pastMonthly.map((card) => card.name)).toEqual(["Acuarela"]);
  });
});

describe("admin clases loader: dated workshops", () => {
  it("shows the seats taken out of capacity and how many wait for the deposit, with no reservations open", async () => {
    const { services } = await setup();

    const result = await load(services);

    expect(result.dated).toEqual([
      expect.objectContaining({
        id: FAKE_INTENSIVE_ID,
        name: "Intensivo de cerámica",
        taken: 0,
        capacity: 2,
        pending: 2,
        reservations: null,
      }),
    ]);
    expect(result.openId).toBeNull();
  });

  it("opens the reservations of one card with ?abrir= and marks them read for both owners", async () => {
    const { services, repository, ids } = await setup();

    const closed = await load(services);
    expect(repository.seenMarks.size).toBe(0);
    expect(closed.dated[0]?.reservations).toBeNull();

    const result = await load(services, `?abrir=${FAKE_INTENSIVE_ID}`);

    expect(result.openId).toBe(FAKE_INTENSIVE_ID);
    expect(
      result.dated[0]?.reservations?.groups.map((group) => group.rows.length),
    ).toEqual([2, 0, 0]);
    expect([...repository.seenMarks.keys()].sort()).toEqual([...ids].sort());
  });

  it("ignores an abrir that is not a listed workshop and marks nothing", async () => {
    const { services, repository } = await setup();

    const unknown = await load(services, `?abrir=${OTHER_ID}`);
    const malformed = await load(services, "?abrir=no-uuid");

    expect(unknown.openId).toBeNull();
    expect(malformed.openId).toBeNull();
    expect(repository.seenMarks.size).toBe(0);
  });

  it("moves past and cancelled workshops behind Ver anteriores", async () => {
    const past = intensiveRow({ eventDate: "2020-01-10" });
    const { services } = await setup({ intensives: [past] });

    expect((await load(services)).dated).toEqual([]);
    const shown = await load(services, "?anteriores=1");
    expect(shown.pastDated.map((card) => card.id)).toEqual([FAKE_INTENSIVE_ID]);
    expect(shown.dated).toEqual([]);
  });

  it("carries the saved code of the address", async () => {
    const { services } = await setup();
    expect((await load(services, "?ok=confirmed")).saved).toBe("confirmed");
    expect((await load(services, "?ok=nope")).saved).toBeNull();
  });
});

describe("admin clases action: reservations stay on the card", () => {
  const CONFIRM = {
    intent: "confirm",
    amount: "15000",
    paidOn: "2026-10-27",
  };

  it("confirms the deposit and returns to the same card and person", async () => {
    const { services, repository, ids } = await setup();
    const id = ids[0] ?? "";

    const response = (await post(services, {
      ...CONFIRM,
      intensiveId: FAKE_INTENSIVE_ID,
      requestId: id,
      returnTo: `/admin/clases?abrir=${FAKE_INTENSIVE_ID}`,
      anchor: `reserva-${id}`,
    })) as Response;

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      `/admin/clases?abrir=${FAKE_INTENSIVE_ID}&ok=confirmed#reserva-${id}`,
    );
    expect(repository.requests.get(id)).toMatchObject({
      status: "confirmed",
      paidOn: "2026-10-27",
    });
  });

  it("falls back to Clases without a returnTo and refuses one outside the panel", async () => {
    const { services, ids } = await setup();
    const fields = {
      ...CONFIRM,
      intensiveId: FAKE_INTENSIVE_ID,
      requestId: ids[0] ?? "",
    };

    const plain = (await post(services, fields)) as Response;
    expect(plain.headers.get("Location")).toBe("/admin/clases?ok=confirmed");

    const foreign = (await post(services, {
      ...fields,
      requestId: ids[1] ?? "",
      returnTo: "https://evil.example/x",
    })) as Response;
    expect(foreign.headers.get("Location")).toBe("/admin/clases?ok=confirmed");
  });

  it("answers 422 with the message for that person and keeps what was typed", async () => {
    const { services, repository, ids } = await setup();
    const id = ids[0] ?? "";

    const result = (await post(services, {
      ...CONFIRM,
      amount: "99",
      intensiveId: FAKE_INTENSIVE_ID,
      requestId: id,
    })) as {
      data: {
        feedback: {
          requestId: string;
          intent: string;
          values: Record<string, string>;
          errors: Record<string, string>;
        };
      };
      init: { status: number };
    };

    expect(result.init.status).toBe(422);
    expect(result.data.feedback).toMatchObject({
      requestId: id,
      intent: "confirm",
      values: { amount: "99" },
    });
    expect(Object.keys(result.data.feedback.errors)).toEqual(["amount"]);
    expect(repository.requests.get(id)?.status).toBe("pending_confirmation");
  });

  it("records the balance of a confirmed request in place", async () => {
    const { services, repository, ids } = await setup();
    const id = ids[0] ?? "";
    await post(services, {
      ...CONFIRM,
      intensiveId: FAKE_INTENSIVE_ID,
      requestId: id,
    });

    const response = (await post(services, {
      intent: "balance",
      amount: "25000",
      paidOn: "2026-10-27",
      intensiveId: FAKE_INTENSIVE_ID,
      requestId: id,
      returnTo: `/admin/clases?abrir=${FAKE_INTENSIVE_ID}`,
      anchor: `reserva-${id}`,
    })) as Response;

    expect(response.headers.get("Location")).toBe(
      `/admin/clases?abrir=${FAKE_INTENSIVE_ID}&ok=balance#reserva-${id}`,
    );
    expect(repository.requests.get(id)?.balance?.by).toBe("a@x.test");
  });

  it("cancels with a reason and, for a confirmed one, the refund", async () => {
    const { services, repository, ids } = await setup();
    const [first = "", second = ""] = ids;
    await post(services, {
      ...CONFIRM,
      intensiveId: FAKE_INTENSIVE_ID,
      requestId: first,
    });

    const pending = (await post(services, {
      intent: "cancel",
      reason: "no puede venir",
      intensiveId: FAKE_INTENSIVE_ID,
      requestId: second,
      anchor: `reserva-${second}`,
    })) as Response;
    expect(pending.headers.get("Location")).toBe(
      `/admin/clases?ok=cancelled#reserva-${second}`,
    );
    expect(repository.requests.get(second)?.status).toBe("cancelled");

    const withoutRefund = (await post(services, {
      intent: "cancel",
      reason: "no puede venir",
      intensiveId: FAKE_INTENSIVE_ID,
      requestId: first,
    })) as { init: { status: number } };
    expect(withoutRefund.init.status).toBe(422);
    expect(repository.requests.get(first)?.status).toBe("confirmed");

    const refunded = (await post(services, {
      intent: "cancel",
      reason: "no puede venir",
      refundAmount: "15000",
      refundedOn: "2026-10-27",
      intensiveId: FAKE_INTENSIVE_ID,
      requestId: first,
    })) as Response;
    expect(refunded.status).toBe(302);
    expect(repository.requests.get(first)?.status).toBe("cancelled");
  });

  it("answers 400 for an unknown intent and 404 for bad ids", async () => {
    const { services, ids } = await setup();
    const base = { intensiveId: FAKE_INTENSIVE_ID, requestId: ids[0] ?? "" };
    expect(await thrownStatus(() => post(services, { intent: "nope" }))).toBe(
      400,
    );
    expect(
      await thrownStatus(() =>
        post(services, { ...base, intent: "confirm", intensiveId: "no-uuid" }),
      ),
    ).toBe(404);
    expect(
      await thrownStatus(() =>
        post(services, { ...base, intent: "confirm", requestId: "no-uuid" }),
      ),
    ).toBe(404);
  });
});

describe("admin clases action: Abrir <mes>", () => {
  it("opens and publishes the next month in one post and stays on the card", async () => {
    const { services, fixture, id } = await setup();

    const response = (await post(services, {
      intent: "open-month",
      workshopId: id,
      period: FLOW_NEXT_MONTH,
      returnTo: "/admin/clases",
      anchor: `taller-${id}`,
    })) as Response;

    expect(response.headers.get("Location")).toBe(
      `/admin/clases?ok=opened#taller-${id}`,
    );
    expect(
      await fixture.periods.get(testAdminActor(), id, FLOW_NEXT_MONTH),
    ).toMatchObject({ ok: true, value: { status: "open" } });
  });

  it("sends the owner to the taller when the month cannot be opened", async () => {
    const { services, id } = await setup();

    const response = (await post(services, {
      intent: "open-month",
      workshopId: id,
      period: FLOW_MONTH,
    })) as Response;

    expect(response.headers.get("Location")).toBe(
      `/admin/talleres/${id}?fallo=month`,
    );
  });

  it("rejects a malformed month", async () => {
    const { services, id } = await setup();
    expect(
      await thrownStatus(() =>
        post(services, { intent: "open-month", workshopId: id, period: "nov" }),
      ),
    ).toBe(400);
  });
});
