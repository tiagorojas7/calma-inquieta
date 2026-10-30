import { describe, expect, it } from "vitest";
import {
  adminContext,
  getRequest,
  thrownStatus,
} from "~/testing/admin/route-kit";
import { insightsFixture } from "~/testing/admin/insights-kit";
import { loader } from "./statistics-download";

function run(path: string, admin = true) {
  const { orders, workshops, service } = insightsFixture();
  workshops.capacityRows = [
    {
      workshopId: "w1",
      workshopName: "Cerámica",
      periodId: "p1",
      period: "2026-09",
      periodStatus: "open",
      turnoId: "t1",
      turnoLabel: "Martes",
      capacity: 4,
    },
  ];
  orders.seats = [{ periodId: "p1", turnoId: "t1", confirmedSeats: 1 }];
  orders.incomeRows = [
    {
      workshopId: "w1",
      workshopName: "Cerámica",
      period: "2026-09",
      orders: 1,
      feeCentavos: 40_000_00,
      materialsCentavos: 0,
    },
  ];
  return loader({
    request: getRequest(path),
    params: {},
    context: adminContext({ insights: service }, { admin }),
  } as never);
}

describe("admin statistics download route", () => {
  it("returns the month as an attachment CSV in UTF-8", async () => {
    const response = await run("/admin/estadisticas/planilla?mes=2026-09");

    expect(response.headers.get("Content-Type")).toBe(
      "text/csv; charset=utf-8",
    );
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="calma-inquieta-2026-09.csv"',
    );
    const bytes = new Uint8Array(await response.arrayBuffer());
    // Response.text() drops a byte order mark, so the bytes are checked.
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bytes)).toContain("Cerámica;1;4;40000");
  });

  it("falls back to the current month for a malformed one", async () => {
    const response = await run("/admin/estadisticas/planilla?mes=nope");

    expect(response.headers.get("Content-Disposition")).toContain("2026-10");
  });

  it("refuses a request without an admin", async () => {
    expect(
      await thrownStatus(() =>
        run("/admin/estadisticas/planilla?mes=2026-09", false),
      ),
    ).toBe(403);
  });
});
