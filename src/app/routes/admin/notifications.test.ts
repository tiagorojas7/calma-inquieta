import { describe, expect, it } from "vitest";
import { createUnavailableInsightsService } from "~/modules/insights";
import {
  adminContext,
  getRequest,
  thrownStatus,
  withOverrides,
} from "~/testing/admin/route-kit";
import { insightsFixture } from "~/testing/admin/insights-kit";
import { buildStoredPrivateEvent } from "~/testing/contracts/private-event-repository.contract";
import { createPrivateEventService } from "~/modules/private-events";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import { loader as homeLoader } from "./home";
import { loader as inboxLoader } from "./private-events";
import { loader } from "./notifications";

async function seeded() {
  const fixture = insightsFixture();
  fixture.orders.unseenRows = [
    {
      id: "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b",
      studentName: "Ana Pérez",
      workshopName: "Cerámica",
      period: "2026-11",
      requestedAt: new Date("2026-10-30T15:00:00.000Z"),
    },
  ];
  fixture.orders.pendingPaymentRows = [
    {
      id: "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b",
      kind: "enrollment",
      studentName: "Ana Pérez",
      workshopName: "Cerámica",
      period: "2026-11",
      totalCentavos: 58_000_00,
      requestedAt: new Date("2026-10-30T15:00:00.000Z"),
    },
  ];
  fixture.intensiveRequests.unseenRows = [
    {
      id: "5c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f",
      intensiveId: "7c9d1a52-83f4-4b0e-a7a5-5f0e2c4b9a02",
      workshopName: "Taller de torno",
      fullName: "Bea Gómez",
      createdAt: new Date("2026-10-31T10:00:00.000Z"),
    },
  ];
  await fixture.privateEvents.insert(
    buildStoredPrivateEvent({ fullName: "Dora Ruiz" }),
  );
  return fixture;
}

const load = (services: object, admin = true) =>
  loader({
    request: getRequest("/admin/novedades"),
    params: {},
    context: adminContext(services, { admin }),
  } as never);

describe("admin notifications route", () => {
  it("lists the unopened requests newest first and the pending payments, each with its admin link", async () => {
    const { service } = await seeded();

    const result = await load({ insights: service });

    expect(result.unseen).toBe(3);
    expect(result.novelties.map((card) => [card.href, card.name])).toEqual([
      [
        "/admin/intensivos/7c9d1a52-83f4-4b0e-a7a5-5f0e2c4b9a02/reservas",
        "Bea Gómez",
      ],
      [
        "/admin/inscripciones/0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b",
        "Ana Pérez",
      ],
      ["/admin/eventos/0b6f7a3e-1c1e-4a39-9d57-0d1d7c1f0a01", "Dora Ruiz"],
    ]);
    expect(result.payments).toEqual([
      expect.objectContaining({
        href: "/admin/inscripciones/0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b",
        owedLabel: "Cuota del mes",
        amount: "$ 58.000",
      }),
    ]);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it("marks nothing read: opening the page leaves every request unopened", async () => {
    const { service, privateEvents } = await seeded();

    await load({ insights: service });
    await load({ insights: service });

    expect(privateEvents.seenMarks.size).toBe(0);
    expect(await privateEvents.unseen()).toHaveLength(1);
    expect((await load({ insights: service })).unseen).toBe(3);
  });

  it("shows empty lists when nothing is new or owed", async () => {
    const { service } = insightsFixture();

    expect(await load({ insights: service })).toEqual({
      unseen: 0,
      novelties: [],
      payments: [],
    });
  });

  it("answers 403 to a non-admin and 503 when the bell cannot be read", async () => {
    const { service } = await seeded();

    expect(await thrownStatus(() => load({ insights: service }, false))).toBe(
      403,
    );
    expect(
      await thrownStatus(() =>
        load({ insights: createUnavailableInsightsService() }),
      ),
    ).toBe(503);
    expect(
      await thrownStatus(() =>
        load({
          insights: withOverrides(service, {
            notifications: () =>
              Promise.resolve({
                ok: false,
                error: { kind: "unavailable" },
              }),
          } as never),
        }),
      ),
    ).toBe(503);
  });
});

describe("the bell leaves the home tasks and the private-event inbox as they were", () => {
  it("shows the same home counters and the same inbox before and after every request is read", async () => {
    const fixture = await seeded();
    fixture.orders.pending = { total: 4, older: 1 };
    fixture.intensiveRequests.pending = 2;
    const events = createPrivateEventService({
      repository: fixture.privateEvents,
      clock: fixedClock(new Date("2026-10-31T15:30:00.000Z")),
    });
    const services = { insights: fixture.service, privateEvents: events };
    const home = () =>
      homeLoader({
        request: getRequest("/admin"),
        params: {},
        context: adminContext(services),
      } as never);
    const inbox = () =>
      inboxLoader({
        request: getRequest("/admin/eventos?estado=nueva"),
        params: {},
        context: adminContext(services),
      } as never);
    const before = { home: await home(), inbox: await inbox() };

    const actor = testAdminActor("a@x.test");
    await events.markSeen(actor, "0b6f7a3e-1c1e-4a39-9d57-0d1d7c1f0a01");
    const after = { home: await home(), inbox: await inbox() };

    expect(after).toEqual(before);
    expect(before.home.summary.tasks.map((task) => task.text)).toContain(
      "1 consulta de evento privado sin responder",
    );
    expect(before.inbox.rows).toHaveLength(1);
    expect(fixture.privateEvents.seenMarks.size).toBe(1);
  });
});
