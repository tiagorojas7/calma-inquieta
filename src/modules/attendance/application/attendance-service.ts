import { err, ok, type Clock } from "~/modules/_shared";
import { requireAdminActor, type AdminActor } from "~/modules/admin-access";
import {
  isAttendanceStatus,
  summarizeAttendance,
  validateMakeUpPlan,
} from "../domain/attendance-core";
import { isSessionDate, sessionDates } from "../domain/session-calendar";
import type {
  AttendanceRepository,
  RosterSource,
  ScheduleSource,
  ScheduledTurno,
  StoredMark,
} from "./attendance-ports";
import type { AttendanceService } from "./attendance";

type MaybeActor = AdminActor | null | undefined;

/** The service contract, accepting an absent actor so it can be denied. */
export type AttendanceUseCases = {
  [K in keyof AttendanceService]: AttendanceService[K] extends (
    actor: AdminActor,
    ...rest: infer Rest
  ) => infer Return
    ? (actor: MaybeActor, ...rest: Rest) => Return
    : never;
};

export interface AttendanceServiceDeps {
  readonly schedule: ScheduleSource;
  readonly roster: RosterSource;
  readonly repository: AttendanceRepository;
  readonly clock: Clock;
  readonly newId?: () => string;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/**
 * Attendance and make-up classes. Class sessions are never stored: they are
 * generated from the turno's weekday and the period's month. Only the owner's
 * marks and make-up classes are persisted.
 */
export function createAttendanceService(
  deps: AttendanceServiceDeps,
): AttendanceUseCases {
  const { schedule, roster, repository, clock } = deps;
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const notFound = err({ kind: "not-found" as const });

  async function findTurno(
    periodId: string,
    turnoId: string,
  ): Promise<ScheduledTurno | null> {
    const turnos = await schedule.listScheduledTurnos();
    return (
      turnos.find((t) => t.periodId === periodId && t.turnoId === turnoId) ??
      null
    );
  }

  return {
    async listTurnos(actor) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      return ok(await schedule.listScheduledTurnos());
    },

    async sessions(actor, periodId, turnoId) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const turno = await findTurno(periodId, turnoId);
      if (!turno) return notFound;
      const marks = await repository.marksForTurno(periodId, turnoId);
      return ok({
        turno,
        sessions: sessionDates(turno.period, turno.weekday).map((date) => {
          const ofDate = marks.filter((m) => m.date === date);
          return {
            date,
            marked: ofDate.length,
            present: ofDate.filter((m) => m.status === "present").length,
            absent: ofDate.filter((m) => m.status === "absent").length,
          };
        }),
      });
    },

    async sheet(actor, periodId, turnoId, date) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const turno = await findTurno(periodId, turnoId);
      if (!turno || !isSessionDate(turno.period, turno.weekday, date))
        return notFound;
      const [students, marks, makeUps] = await Promise.all([
        roster.forTurno(periodId, turnoId),
        repository.marksForTurno(periodId, turnoId),
        repository.makeUpsForTurno(periodId, turnoId),
      ]);
      return ok({
        turno,
        date,
        rows: students.map((student) => {
          const makeUp = makeUps.find(
            (m) => m.email === student.email && m.date === date,
          );
          return {
            email: student.email,
            name: student.name,
            orderNumber: student.orderNumber,
            feePaid: student.feePaid,
            status:
              marks.find((m) => m.email === student.email && m.date === date)
                ?.status ?? null,
            makeUp: makeUp ? { id: makeUp.id, status: makeUp.status } : null,
          };
        }),
      });
    },

    async recordSession(actor, periodId, turnoId, date, entries) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const turno = await findTurno(periodId, turnoId);
      if (!turno || !isSessionDate(turno.period, turno.weekday, date))
        return notFound;
      const paid = new Set(
        (await roster.forTurno(periodId, turnoId))
          .filter((student) => student.feePaid)
          .map((student) => student.email),
      );
      const marks: StoredMark[] = [];
      const at = clock.now();
      for (const entry of entries) {
        const email = normalizeEmail(entry.email);
        if (
          !paid.has(email) ||
          !isAttendanceStatus(entry.status) ||
          marks.some((m) => m.email === email)
        )
          return err({
            kind: "invalid" as const,
            issues: [
              { field: "marks" as const, code: "unknown-reference" as const },
            ],
          });
        marks.push({
          periodId,
          turnoId,
          date,
          email,
          status: entry.status,
          markedBy: authorized.value.email,
          markedAt: at,
        });
      }
      await repository.replaceSession({ periodId, turnoId, date }, marks);
      return ok({ recorded: marks.length });
    },

    async scheduleMakeUp(actor, input) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const email = normalizeEmail(input.email);
      const turno = await findTurno(input.periodId, input.turnoId);
      if (!turno || !isSessionDate(turno.period, turno.weekday, input.date))
        return notFound;
      const marks = await repository.marksForTurno(
        input.periodId,
        input.turnoId,
      );
      const absent = marks.some(
        (m) =>
          m.email === email && m.date === input.date && m.status === "absent",
      );
      const student = (
        await roster.forTurno(input.periodId, input.turnoId)
      ).find((s) => s.email === email);
      if (!absent || !student)
        return err({
          kind: "invalid" as const,
          issues: [
            { field: "student" as const, code: "not-selectable" as const },
          ],
        });
      const target = await findTurno(input.makeUpPeriodId, input.makeUpTurnoId);
      if (!target)
        return err({
          kind: "invalid" as const,
          issues: [
            {
              field: "makeUpTurno" as const,
              code: "unknown-reference" as const,
            },
          ],
        });
      const date = validateMakeUpPlan(input.makeUpDate, target);
      if (!date.ok) return date;
      const makeUp = {
        id: newId(),
        email,
        studentName: student.name,
        periodId: input.periodId,
        turnoId: input.turnoId,
        date: input.date,
        makeUpPeriodId: input.makeUpPeriodId,
        makeUpTurnoId: input.makeUpTurnoId,
        makeUpDate: date.value,
        status: "pending" as const,
        createdBy: authorized.value.email,
        createdAt: clock.now(),
        doneBy: null,
        doneAt: null,
      };
      const inserted = await repository.insertMakeUp(makeUp);
      return inserted.ok ? ok(makeUp) : inserted;
    },

    async listMakeUps(actor, status) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const [makeUps, turnos] = await Promise.all([
        repository.listMakeUps(status),
        schedule.listScheduledTurnos(),
      ]);
      const label = (periodId: string, turnoId: string) => {
        const turno = turnos.find(
          (t) => t.periodId === periodId && t.turnoId === turnoId,
        );
        return {
          workshop: turno?.workshopName ?? "",
          turno: turno?.turnoLabel ?? "",
        };
      };
      return ok(
        makeUps.map((makeUp) => {
          const original = label(makeUp.periodId, makeUp.turnoId);
          const target = label(makeUp.makeUpPeriodId, makeUp.makeUpTurnoId);
          return {
            ...makeUp,
            workshopName: original.workshop,
            turnoLabel: original.turno,
            makeUpWorkshopName: target.workshop,
            makeUpTurnoLabel: target.turno,
          };
        }),
      );
    },

    async completeMakeUp(actor, id) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const done = await repository.completeMakeUp(id, {
        by: authorized.value.email,
        at: clock.now(),
      });
      return done ? ok(done) : notFound;
    },

    async studentSummary(actor, email) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const key = normalizeEmail(email);
      const [marks, makeUps] = await Promise.all([
        repository.marksByStudent(key),
        repository.makeUpsByStudent(key),
      ]);
      return ok(summarizeAttendance(marks, makeUps));
    },
  };
}

/** Every call fails closed as unavailable once the actor is authorized. */
export function createUnavailableAttendanceService(): AttendanceUseCases {
  const fail = (actor: MaybeActor) => {
    const authorized = requireAdminActor(actor);
    return Promise.resolve(
      authorized.ok ? err({ kind: "unavailable" as const }) : authorized,
    );
  };
  return {
    listTurnos: fail,
    sessions: fail,
    sheet: fail,
    recordSession: fail,
    scheduleMakeUp: fail,
    listMakeUps: fail,
    completeMakeUp: fail,
    studentSummary: fail,
  };
}
