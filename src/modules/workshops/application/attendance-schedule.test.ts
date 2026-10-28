import { describe, expect, it } from "vitest";
import { createWorkshopScheduleLookup } from "./attendance-schedule";
import type { StoredMonthlyWorkshop } from "./monthly-workshop-repository";
import type { WorkshopPeriod } from "./contracts";

const workshop = (id: string, name: string) =>
  ({ id, name }) as StoredMonthlyWorkshop;

const turno = (
  turnoId: string,
  label: string,
  weekday: number,
  start: string,
) => ({
  turnoId,
  label,
  weekday,
  startsAt: start,
  endsAt: "20:00",
  turnoActive: true,
  capacity: 10,
});

const period = (
  id: string,
  workshopId: string,
  key: string,
  status: string,
  turnos: ReturnType<typeof turno>[],
) =>
  ({
    id,
    workshopId,
    period: key,
    status,
    turnos,
  }) as unknown as WorkshopPeriod;

describe("workshop schedule lookup", () => {
  it("lists the turnos of open and closed periods, newest month first", async () => {
    const workshops = [workshop("w1", "Cerámica"), workshop("w2", "Acuarela")];
    const periods: Record<string, WorkshopPeriod[]> = {
      w1: [
        period("p1", "w1", "2026-09", "closed", [
          turno("t1", "Lunes", 1, "18:00"),
        ]),
        period("p2", "w1", "2026-10", "open", [
          turno("t2", "Miércoles", 3, "10:00"),
          turno("t1", "Lunes", 1, "18:00"),
        ]),
        period("p3", "w1", "2026-11", "draft", [
          turno("t1", "Lunes", 1, "18:00"),
        ]),
      ],
      w2: [
        period("p4", "w2", "2026-10", "open", [
          turno("t3", "Martes", 2, "09:00"),
        ]),
      ],
    };
    const lookup = createWorkshopScheduleLookup({
      workshops: { list: () => Promise.resolve(workshops) },
      periods: {
        listForWorkshop: (id) => Promise.resolve(periods[id] ?? []),
      },
    });

    const listed = await lookup.listScheduledTurnos();

    expect(
      listed.map((t) => [t.period, t.workshopName, t.turnoLabel, t.weekday]),
    ).toEqual([
      ["2026-10", "Acuarela", "Martes", 2],
      ["2026-10", "Cerámica", "Lunes", 1],
      ["2026-10", "Cerámica", "Miércoles", 3],
      ["2026-09", "Cerámica", "Lunes", 1],
    ]);
    expect(listed[1]).toEqual({
      periodId: "p2",
      workshopId: "w1",
      workshopName: "Cerámica",
      period: "2026-10",
      turnoId: "t1",
      turnoLabel: "Lunes",
      weekday: 1,
      startsAt: "18:00",
      endsAt: "20:00",
    });
  });
});
