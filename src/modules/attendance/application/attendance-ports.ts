import type { Result } from "~/modules/_shared";
import type { AttendanceStatus, MakeUpStatus } from "../domain/attendance-core";

/** One turno of a non-draft period: the unit a class schedule hangs from. */
export interface ScheduledTurno {
  readonly periodId: string;
  readonly workshopId: string;
  readonly workshopName: string;
  /** `YYYY-MM`. */
  readonly period: string;
  readonly turnoId: string;
  readonly turnoLabel: string;
  /** ISO weekday, Monday 1 to Sunday 7. */
  readonly weekday: number;
  readonly startsAt: string;
  readonly endsAt: string;
}

/** Consumer-defined port; `workshops` supplies the periods and their turnos. */
export interface ScheduleSource {
  listScheduledTurnos(): Promise<readonly ScheduledTurno[]>;
}

/** A student with an active order for one period and turno. */
export interface RosterStudent {
  /** Normalized (trimmed, lower-cased). */
  readonly email: string;
  readonly name: string;
  readonly orderNumber: string;
  /** The order is paid (or beyond): the monthly fee is settled. */
  readonly feePaid: boolean;
}

/** Consumer-defined port; `enrollments` supplies the orders. */
export interface RosterSource {
  forTurno(
    periodId: string,
    turnoId: string,
  ): Promise<readonly RosterStudent[]>;
}

export interface SessionKey {
  readonly periodId: string;
  readonly turnoId: string;
  /** `YYYY-MM-DD`. */
  readonly date: string;
}

export interface StoredMark extends SessionKey {
  readonly email: string;
  readonly status: AttendanceStatus;
  readonly markedBy: string;
  readonly markedAt: Date;
}

export interface StoredMakeUp {
  readonly id: string;
  readonly email: string;
  /** The student's name when the make-up was planned. */
  readonly studentName: string;
  /** The absent session being made up. */
  readonly periodId: string;
  readonly turnoId: string;
  readonly date: string;
  /** Where and when the student recovers the class. */
  readonly makeUpPeriodId: string;
  readonly makeUpTurnoId: string;
  readonly makeUpDate: string;
  readonly status: MakeUpStatus;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly doneBy: string | null;
  readonly doneAt: Date | null;
}

export interface MakeUpExists {
  readonly kind: "make-up-exists";
}

/** The attendance marks and make-up classes the owner records. */
export interface AttendanceRepository {
  /** Replaces every mark of one session with `marks`, atomically. */
  replaceSession(
    session: SessionKey,
    marks: readonly StoredMark[],
  ): Promise<void>;
  /** Ordered by date, then email. */
  marksForTurno(
    periodId: string,
    turnoId: string,
  ): Promise<readonly StoredMark[]>;
  marksByStudent(email: string): Promise<readonly StoredMark[]>;
  /** One make-up per student and absent session. */
  insertMakeUp(value: StoredMakeUp): Promise<Result<void, MakeUpExists>>;
  /** Ordered by make-up date, then id. */
  listMakeUps(status: MakeUpStatus | "all"): Promise<readonly StoredMakeUp[]>;
  makeUpsByStudent(email: string): Promise<readonly StoredMakeUp[]>;
  /** Make-ups of the absent sessions of one turno. */
  makeUpsForTurno(
    periodId: string,
    turnoId: string,
  ): Promise<readonly StoredMakeUp[]>;
  /**
   * Marks a pending make-up done. A done one is returned unchanged; `null`
   * when the id is unknown.
   */
  completeMakeUp(
    id: string,
    change: { readonly by: string; readonly at: Date },
  ): Promise<StoredMakeUp | null>;
}
