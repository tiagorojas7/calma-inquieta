import { describe, expect, it } from "vitest";
import type {
  ScheduledTurno,
  SessionSheet,
  TurnoSessions,
} from "~/modules/attendance";
import {
  attendanceIndexView,
  parseAttendanceFilter,
  parseStatusEntries,
  parseTurnoRef,
  sessionsView,
  sheetView,
  turnoOptions,
} from "./admin-view";

const P1 = "0b6f7a3e-1c1e-4a39-9d57-0d1d7c1f0a01";
const P2 = "0b6f7a3e-1c1e-4a39-9d57-0d1d7c1f0a02";
const T1 = "7c9d1a52-83f4-4b0e-a7a5-5f0e2c4b9a02";
const T2 = "2f8e5b6a-4d0c-4c3b-8e8f-6a1b3c5d7e03";

const turno = (overrides: Partial<ScheduledTurno> = {}): ScheduledTurno => ({
  periodId: P1,
  workshopId: "w1",
  workshopName: "Cerámica",
  period: "2026-10",
  turnoId: T1,
  turnoLabel: "Lunes tarde",
  weekday: 1,
  startsAt: "18:00",
  endsAt: "20:00",
  ...overrides,
});

const turnos = [
  turno(),
  turno({
    turnoId: T2,
    turnoLabel: "Miércoles",
    weekday: 3,
    startsAt: "10:00",
  }),
  turno({
    periodId: P2,
    workshopId: "w2",
    workshopName: "Acuarela",
    period: "2026-09",
  }),
];

describe("parseAttendanceFilter", () => {
  it("defaults to the newest month and every workshop", () => {
    expect(parseAttendanceFilter(new URLSearchParams(), turnos)).toEqual({
      mes: "2026-10",
      taller: "",
    });
  });

  it("keeps a month and workshop that exist and drops unknown ones", () => {
    expect(
      parseAttendanceFilter(
        new URLSearchParams("mes=2026-09&taller=w2"),
        turnos,
      ),
    ).toEqual({ mes: "2026-09", taller: "w2" });
    expect(
      parseAttendanceFilter(
        new URLSearchParams("mes=1999-01&taller=nope"),
        turnos,
      ),
    ).toEqual({ mes: "2026-10", taller: "" });
  });

  it("has no month when nothing is scheduled", () => {
    expect(parseAttendanceFilter(new URLSearchParams(), [])).toEqual({
      mes: "",
      taller: "",
    });
  });
});

describe("attendanceIndexView", () => {
  it("lists the month's turnos with links and the filter options", () => {
    const view = attendanceIndexView(turnos, { mes: "2026-10", taller: "" });

    expect(view.months).toEqual([
      { value: "2026-10", label: "octubre 2026" },
      { value: "2026-09", label: "septiembre 2026" },
    ]);
    expect(view.workshops).toEqual([
      { value: "w2", label: "Acuarela" },
      { value: "w1", label: "Cerámica" },
    ]);
    expect(view.rows).toEqual([
      {
        key: `${P1}:${T1}`,
        href: `/admin/asistencia/${P1}/${T1}`,
        workshop: "Cerámica",
        turno: "Lunes tarde",
        schedule: "Lunes 18:00 a 20:00 h",
        sessions: 4,
      },
      {
        key: `${P1}:${T2}`,
        href: `/admin/asistencia/${P1}/${T2}`,
        workshop: "Cerámica",
        turno: "Miércoles",
        schedule: "Miércoles 10:00 a 20:00 h",
        sessions: 4,
      },
    ]);
  });

  it("narrows by workshop", () => {
    const view = attendanceIndexView(turnos, { mes: "2026-09", taller: "w1" });
    expect(view.rows).toEqual([]);
  });
});

describe("sessionsView", () => {
  const data: TurnoSessions = {
    turno: turno(),
    sessions: [
      { date: "2026-10-05", marked: 2, present: 1, absent: 1 },
      { date: "2026-10-12", marked: 0, present: 0, absent: 0 },
    ],
  };

  it("titles the turno and links each class to its sheet", () => {
    expect(sessionsView(data)).toEqual({
      heading: "Cerámica, Lunes tarde",
      subtitle: "octubre 2026 · Lunes 18:00 a 20:00 h",
      rows: [
        {
          key: "2026-10-05",
          href: `/admin/asistencia/${P1}/${T1}/2026-10-05`,
          date: "Lunes 05/10/2026",
          marked: "2",
          present: "1",
          absent: "1",
        },
        {
          key: "2026-10-12",
          href: `/admin/asistencia/${P1}/${T1}/2026-10-12`,
          date: "Lunes 12/10/2026",
          marked: "0",
          present: "0",
          absent: "0",
        },
      ],
    });
  });
});

describe("sheetView", () => {
  const sheet: SessionSheet = {
    turno: turno(),
    date: "2026-10-05",
    rows: [
      {
        email: "ana@example.com",
        name: "Ana Pérez",
        orderNumber: "CI-1",
        feePaid: true,
        status: "absent",
        makeUp: null,
      },
      {
        email: "caro@example.com",
        name: "Caro Díaz",
        orderNumber: "CI-2",
        feePaid: false,
        status: null,
        makeUp: { id: "m1", status: "pending" },
      },
    ],
  };

  it("builds student rows with fee state, marks and make-up state", () => {
    const view = sheetView(sheet);

    expect(view.heading).toBe("Lunes 05/10/2026");
    expect(view.subtitle).toBe("Cerámica, Lunes tarde · octubre 2026");
    expect(view.backHref).toBe(`/admin/asistencia/${P1}/${T1}`);
    expect(view.rows).toEqual([
      {
        email: "ana@example.com",
        name: "Ana Pérez",
        orderNumber: "CI-1",
        feePaid: true,
        status: "absent",
        makeUp: null,
      },
      {
        email: "caro@example.com",
        name: "Caro Díaz",
        orderNumber: "CI-2",
        feePaid: false,
        status: null,
        makeUp: { status: "pending", label: "Recuperación pendiente" },
      },
    ]);
  });
});

describe("turnoOptions", () => {
  it("offers each turno as period:turno with the workshop and month", () => {
    expect(turnoOptions(turnos)[0]).toEqual({
      value: `${P1}:${T1}`,
      label: "Cerámica, Lunes tarde (octubre 2026)",
    });
    expect(turnoOptions(turnos)).toHaveLength(3);
  });
});

describe("parseTurnoRef", () => {
  it("reads period:turno uuids and refuses anything else", () => {
    expect(parseTurnoRef(`${P1}:${T1}`)).toEqual({ periodId: P1, turnoId: T1 });
    expect(parseTurnoRef("x:y")).toBeNull();
    expect(parseTurnoRef(P1)).toBeNull();
    expect(parseTurnoRef("")).toBeNull();
  });
});

describe("parseStatusEntries", () => {
  it("reads one status:<email> field per student and skips the rest", () => {
    const form = new FormData();
    form.set("intent", "save");
    form.set("status:ana@example.com", "present");
    form.set("status:bea@example.com", "absent");
    form.set("status:cris@example.com", "");
    form.set("other", "present");

    expect(parseStatusEntries(form)).toEqual([
      { email: "ana@example.com", status: "present" },
      { email: "bea@example.com", status: "absent" },
    ]);
  });
});
