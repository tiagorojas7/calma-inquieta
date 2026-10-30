import { describe, expect, it } from "vitest";
import {
  adminContext,
  getRequest,
  thrownStatus,
  withOverrides,
} from "~/testing/admin/route-kit";
import { insightsFixture } from "~/testing/admin/insights-kit";
import { createTestServices } from "~/testing/fakes/app-services";
import { loader } from "./home";

function load(admin = true, unansweredEvents = 0) {
  const { orders, workshops, intensiveRequests, service } = insightsFixture();
  orders.pending = { total: 4, older: 1 };
  intensiveRequests.pending = 2;
  workshops.published = [
    { workshopId: "w2", name: "Acuarela", periodStatus: null },
  ];
  const events = withOverrides(createTestServices().privateEvents, {
    list: () =>
      Promise.resolve({
        ok: true,
        value: Array.from({ length: unansweredEvents }, () => ({})),
      }),
  } as never);
  return {
    run: () =>
      loader({
        request: getRequest("/admin"),
        params: {},
        context: adminContext(
          { insights: service, privateEvents: events },
          { admin },
        ),
      } as never),
  };
}

describe("admin home route", () => {
  it("greets the signed-in admin with what is due today and the month figures", async () => {
    const result = await load(true, 3).run();

    expect(result.email).toBe("a@x.test");
    expect(result.summary.monthLabel).toBe("octubre 2026");
    expect(result.summary.tasks.map((task) => task.text)).toEqual([
      "4 inscripciones por cobrar",
      "Abrir inscripciones de noviembre 2026 en Acuarela",
      "2 reservas de intensivo esperando seña",
      "3 consultas de evento privado sin responder",
    ]);
    expect(result.summary.figures.collected).toBe("$ 0");
  });

  it("still shows the day when the private events cannot be read", async () => {
    const { service } = insightsFixture();

    const result = await loader({
      request: getRequest("/admin"),
      params: {},
      context: adminContext({ insights: service }),
    } as never);

    expect(result.summary.tasks.map((task) => task.key)).not.toContain("event");
  });

  it("refuses a request without an admin before reading any figure", async () => {
    expect(await thrownStatus(() => load(false).run())).toBe(403);
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
