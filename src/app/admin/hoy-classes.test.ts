import { describe, expect, it } from "vitest";
import {
  ATT_MONDAY,
  ATT_PERIOD,
  ATT_TURNOS,
  attendanceFixture,
} from "~/testing/admin/attendance-kit";
import { withOverrides } from "~/testing/admin/route-kit";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { loadClassesToday } from "./hoy-classes";

const actor = testAdminActor();

describe("loadClassesToday", () => {
  it("lists the turnos that have a class today, with their students", async () => {
    const { service } = attendanceFixture();

    // 2026-10-05 is a Monday: only the Monday turno has a class.
    expect(
      await loadClassesToday({ attendance: service }, actor, "2026-10-05"),
    ).toEqual([
      {
        periodId: ATT_PERIOD,
        turnoId: ATT_MONDAY,
        workshopName: "Cerámica",
        turnoLabel: "Lunes tarde",
        startsAt: "18:00",
        endsAt: "20:00",
        students: 3,
      },
    ]);
  });

  it("is empty on a day with no class and outside the month of every turno", async () => {
    const { service } = attendanceFixture();

    expect(
      await loadClassesToday({ attendance: service }, actor, "2026-10-04"),
    ).toEqual([]);
    expect(
      await loadClassesToday({ attendance: service }, actor, "2026-11-02"),
    ).toEqual([]);
  });

  it("orders the day's classes by start time", async () => {
    const early = {
      ...ATT_TURNOS[0],
      turnoId: "7c9d1a52-83f4-4b0e-a7a5-5f0e2c4b9a99",
      turnoLabel: "Lunes mañana",
      startsAt: "09:00",
      endsAt: "11:00",
    };
    const { service } = attendanceFixture({
      turnos: [ATT_TURNOS[0], early] as never,
    });

    const classes = await loadClassesToday(
      { attendance: service },
      actor,
      "2026-10-05",
    );

    expect(classes.map((item) => item.turnoLabel)).toEqual([
      "Lunes mañana",
      "Lunes tarde",
    ]);
  });

  it("keeps the class when its students cannot be counted", async () => {
    const { service } = attendanceFixture();
    const broken = withOverrides(service, {
      sheet: () => Promise.reject(new Error("db down")),
    });

    const classes = await loadClassesToday(
      { attendance: broken },
      actor,
      "2026-10-05",
    );

    expect(classes).toMatchObject([
      { turnoLabel: "Lunes tarde", students: null },
    ]);
  });

  it("shows no class when the schedule cannot be read, so the rest of Hoy still loads", async () => {
    const { service } = attendanceFixture();
    const broken = withOverrides(service, {
      listTurnos: () => Promise.reject(new Error("db down")),
    });

    expect(
      await loadClassesToday({ attendance: broken }, actor, "2026-10-05"),
    ).toEqual([]);
  });
});
