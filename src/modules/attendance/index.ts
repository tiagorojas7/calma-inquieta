export * from "./domain/attendance-core";
export * from "./domain/session-calendar";
export type {
  AttendanceRepository,
  MakeUpExists,
  RosterSource,
  RosterStudent,
  ScheduledTurno,
  ScheduleSource,
  SessionKey,
  StoredMakeUp,
  StoredMark,
} from "./application/attendance-ports";
export type {
  AttendanceService,
  MakeUpEntry,
  MakeUpInput,
  MakeUpPlanField,
  SessionRow,
  SessionSheet,
  SessionSummary,
  TurnoSessions,
} from "./application/attendance";
export {
  createAttendanceService,
  createUnavailableAttendanceService,
  type AttendanceServiceDeps,
  type AttendanceUseCases,
} from "./application/attendance-service";
