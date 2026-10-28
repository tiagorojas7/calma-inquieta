import type {
  AdminFailure,
  Invalid,
  NotFound,
  Result,
} from "~/modules/_shared";
import type { AdminActor } from "~/modules/admin-access";
import type {
  AttendanceStatus,
  AttendanceSummary,
  MakeUpField,
  MakeUpStatus,
} from "../domain/attendance-core";
import type {
  MakeUpExists,
  ScheduledTurno,
  StoredMakeUp,
} from "./attendance-ports";

export interface SessionSummary {
  readonly date: string;
  readonly marked: number;
  readonly present: number;
  readonly absent: number;
}

export interface TurnoSessions {
  readonly turno: ScheduledTurno;
  readonly sessions: readonly SessionSummary[];
}

export interface SessionRow {
  readonly email: string;
  readonly name: string;
  readonly orderNumber: string;
  /** The monthly fee is settled (the order is paid or beyond). */
  readonly feePaid: boolean;
  readonly status: AttendanceStatus | null;
  readonly makeUp: {
    readonly id: string;
    readonly status: MakeUpStatus;
  } | null;
}

export interface SessionSheet {
  readonly turno: ScheduledTurno;
  readonly date: string;
  readonly rows: readonly SessionRow[];
}

export interface MakeUpEntry extends StoredMakeUp {
  readonly workshopName: string;
  readonly turnoLabel: string;
  readonly makeUpWorkshopName: string;
  readonly makeUpTurnoLabel: string;
}

export interface MakeUpInput {
  readonly email: string;
  readonly periodId: string;
  readonly turnoId: string;
  readonly date: string;
  readonly makeUpPeriodId: string;
  readonly makeUpTurnoId: string;
  readonly makeUpDate: string;
}

export type MakeUpPlanField = MakeUpField | "student";

/** The admin contract of attendance and make-up classes. */
export interface AttendanceService {
  listTurnos(
    actor: AdminActor,
  ): Promise<Result<readonly ScheduledTurno[], AdminFailure>>;
  sessions(
    actor: AdminActor,
    periodId: string,
    turnoId: string,
  ): Promise<Result<TurnoSessions, AdminFailure | NotFound>>;
  sheet(
    actor: AdminActor,
    periodId: string,
    turnoId: string,
    date: string,
  ): Promise<Result<SessionSheet, AdminFailure | NotFound>>;
  /** Replaces the whole session: students left out end up unmarked. */
  recordSession(
    actor: AdminActor,
    periodId: string,
    turnoId: string,
    date: string,
    entries: readonly { readonly email: string; readonly status: string }[],
  ): Promise<
    Result<
      { readonly recorded: number },
      AdminFailure | NotFound | Invalid<"marks">
    >
  >;
  scheduleMakeUp(
    actor: AdminActor,
    input: MakeUpInput,
  ): Promise<
    Result<
      StoredMakeUp,
      AdminFailure | NotFound | Invalid<MakeUpPlanField> | MakeUpExists
    >
  >;
  listMakeUps(
    actor: AdminActor,
    status: MakeUpStatus | "all",
  ): Promise<Result<readonly MakeUpEntry[], AdminFailure>>;
  completeMakeUp(
    actor: AdminActor,
    id: string,
  ): Promise<Result<StoredMakeUp, AdminFailure | NotFound>>;
  studentSummary(
    actor: AdminActor,
    email: string,
  ): Promise<Result<AttendanceSummary, AdminFailure>>;
}
