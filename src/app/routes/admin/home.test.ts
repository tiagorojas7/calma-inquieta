import { describe, expect, it } from "vitest";
import {
  adminContext,
  getRequest,
  thrownStatus,
} from "~/testing/admin/route-kit";
import { insightsFixture } from "~/testing/admin/insights-kit";
import { loader } from "./home";

function load(admin = true) {
  const { orders, workshops, service } = insightsFixture();
  orders.pending = { total: 4, older: 1 };
  workshops.published = [
    { workshopId: "w2", name: "Acuarela", periodStatus: null },
  ];
  return {
    run: () =>
      loader({
        request: getRequest("/admin"),
        params: {},
        context: adminContext({ insights: service }, { admin }),
      } as never),
  };
}

describe("admin home route", () => {
  it("greets the signed-in admin with the panel summary of the current month", async () => {
    const result = await load().run();

    expect(result.email).toBe("a@x.test");
    expect(result.summary).toMatchObject({
      period: "2026-10",
      monthLabel: "octubre 2026",
      nextMonthLabel: "noviembre 2026",
      pending: { total: 4, older: 1 },
      alerts: { withoutOpenPeriod: [{ workshopId: "w2", name: "Acuarela" }] },
    });
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
