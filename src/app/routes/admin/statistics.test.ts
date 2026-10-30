import { describe, expect, it } from "vitest";
import {
  adminContext,
  getRequest,
  thrownStatus,
} from "~/testing/admin/route-kit";
import { insightsFixture } from "~/testing/admin/insights-kit";
import { loader } from "./statistics";

function run(path: string, admin = true) {
  const { orders, workshops, teachers, service } = insightsFixture();
  teachers.add("t1", "Ana Gomez", "third_party");
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
  orders.incomeRows = [
    {
      workshopId: "w1",
      workshopName: "Ceramica",
      period: "2026-09",
      orders: 1,
      feeCentavos: 40_000_00,
      materialsCentavos: 0,
    },
  ];
  workshops.teacherRows = [
    {
      period: "2026-09",
      periodId: "p1",
      workshopId: "w1",
      workshopName: "Ceramica",
      teacherId: "t1",
      teacherName: "Ana Gomez",
      modality: "third_party",
      percentageBp: 2_500,
    },
  ];
  orders.registrationRows = [
    {
      period: "2026-09",
      periodId: "p1",
      orders: 1,
      feeCentavos: 40_000_00,
      studentEmails: ["a@x.test"],
    },
  ];
  return loader({
    request: getRequest(path),
    params: {},
    context: adminContext({ insights: service }, { admin }),
  } as never);
}

describe("admin statistics route", () => {
  it("shows the month from the query string with the main table row", async () => {
    const result = await run("/admin/estadisticas?mes=2026-09");

    expect(result.period).toBe("2026-09");
    expect(result.periodLabel).toBe("septiembre 2026");
    expect(result.activities[0]?.cells).toEqual([
      "Ceramica",
      "1",
      "4",
      "$ 40.000",
      "Ana Gomez · de terceros",
      "$ 10.000",
      "$ 0",
      "$ 30.000",
    ]);
  });

  it("keeps the totals row equal to the summary figures", async () => {
    const result = await run("/admin/estadisticas?mes=2026-09");

    const totals = result.activities.at(-1)?.cells ?? [];
    const figure = (key: string) =>
      result.figures.find((item) => item.key === key)?.value;
    expect(totals[3]).toBe(figure("collected"));
    expect(totals[5]).toBe(figure("teachers"));
    expect(totals[6]).toBe(figure("materials"));
    expect(totals[7]).toBe(figure("profit"));
  });

  it("falls back to the current month for a malformed one instead of failing", async () => {
    const result = await run("/admin/estadisticas?mes=nope");

    expect(result.period).toBe("2026-10");
    expect(result.activities).toEqual([]);
  });

  it("refuses a request without an admin", async () => {
    expect(await thrownStatus(() => run("/admin/estadisticas", false))).toBe(
      403,
    );
  });
});
