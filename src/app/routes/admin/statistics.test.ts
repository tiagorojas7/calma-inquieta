import { describe, expect, it } from "vitest";
import {
  adminContext,
  getRequest,
  thrownStatus,
} from "~/testing/admin/route-kit";
import { insightsFixture } from "~/testing/admin/insights-kit";
import { loader } from "./statistics";

function run(path: string, admin = true) {
  const { orders, workshops, service } = insightsFixture();
  workshops.capacityRows = [
    {
      workshopId: "w1",
      workshopName: "Ceramica",
      periodId: "p1",
      period: "2026-09",
      periodStatus: "open",
      turnoId: "t1",
      turnoLabel: "Martes",
      capacity: 4,
    },
  ];
  orders.seats = [{ periodId: "p1", turnoId: "t1", confirmedSeats: 1 }];
  return loader({
    request: getRequest(path),
    params: {},
    context: adminContext({ insights: service }, { admin }),
  } as never);
}

describe("admin statistics route", () => {
  it("shows the month from the query string", async () => {
    const result = await run("/admin/estadisticas?mes=2026-09");

    expect(result.period).toBe("2026-09");
    expect(result.periodLabel).toBe("septiembre 2026");
    expect(result.occupancy[0]?.cells).toEqual([
      "Ceramica",
      "Martes",
      "4",
      "1",
      "3",
      "25 %",
    ]);
  });

  it("falls back to the current month for a malformed one instead of failing", async () => {
    const result = await run("/admin/estadisticas?mes=nope");

    expect(result.period).toBe("2026-10");
    expect(result.occupancy).toEqual([]);
  });

  it("refuses a request without an admin", async () => {
    expect(await thrownStatus(() => run("/admin/estadisticas", false))).toBe(
      403,
    );
  });
});
