import {
  createAttendanceService,
  type RosterStudent,
  type ScheduledTurno,
} from "~/modules/attendance";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import { InMemoryAttendanceRepository } from "~/testing/fakes/in-memory-attendance-repository";

export const ATT_PERIOD = "0b6f7a3e-1c1e-4a39-9d57-0d1d7c1f0a01";
export const ATT_MONDAY = "7c9d1a52-83f4-4b0e-a7a5-5f0e2c4b9a02";
export const ATT_WEDNESDAY = "2f8e5b6a-4d0c-4c3b-8e8f-6a1b3c5d7e03";
export const ATT_UNKNOWN = "9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c04";

export const ATT_TURNOS: readonly ScheduledTurno[] = [
  {
    periodId: ATT_PERIOD,
    workshopId: "w1",
    workshopName: "Cerámica",
    period: "2026-10",
    turnoId: ATT_MONDAY,
    turnoLabel: "Lunes tarde",
    weekday: 1,
    startsAt: "18:00",
    endsAt: "20:00",
  },
  {
    periodId: ATT_PERIOD,
    workshopId: "w1",
    workshopName: "Cerámica",
    period: "2026-10",
    turnoId: ATT_WEDNESDAY,
    turnoLabel: "Miércoles mañana",
    weekday: 3,
    startsAt: "10:00",
    endsAt: "12:00",
  },
];

export const ATT_ROSTER: readonly RosterStudent[] = [
  {
    email: "ana@example.com",
    name: "Ana Pérez",
    orderNumber: "CI-2026-0001",
    feePaid: true,
  },
  {
    email: "bea@example.com",
    name: "Bea Gómez",
    orderNumber: "CI-2026-0002",
    feePaid: true,
  },
  {
    email: "caro@example.com",
    name: "Caro Díaz",
    orderNumber: "CI-2026-0003",
    feePaid: false,
  },
];

/** Real attendance service over an in-memory repository, fixed schedule and roster. */
export function attendanceFixture() {
  const repository = new InMemoryAttendanceRepository();
  let next = 0;
  const service = createAttendanceService({
    schedule: { listScheduledTurnos: () => Promise.resolve(ATT_TURNOS) },
    roster: { forTurno: () => Promise.resolve(ATT_ROSTER) },
    repository,
    clock: fixedClock(new Date("2026-10-06T15:00:00.000Z")),
    newId: () => `makeup-${String(++next)}`,
  });
  return { repository, service };
}
