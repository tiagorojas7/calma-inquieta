import { err, ok, type Invalid, type Result } from "~/modules/_shared";
import { isIsoDate, isSessionDate } from "./session-calendar";

export const ATTENDANCE_STATUSES = ["present", "absent"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export function isAttendanceStatus(value: string): value is AttendanceStatus {
  return (ATTENDANCE_STATUSES as readonly string[]).includes(value);
}

/**
 * `done` and `missed` close a make-up for good: the student recovered the
 * class, or did not come and gets no replacement.
 */
export const MAKE_UP_STATUSES = ["pending", "done", "missed"] as const;
export type MakeUpStatus = (typeof MAKE_UP_STATUSES)[number];

export function isMakeUpStatus(value: string): value is MakeUpStatus {
  return (MAKE_UP_STATUSES as readonly string[]).includes(value);
}

export interface AttendanceSummary {
  readonly present: number;
  readonly absent: number;
  readonly makeUpsPending: number;
  readonly makeUpsDone: number;
  readonly makeUpsMissed: number;
}

/** What the student file shows: marks and make-up classes by status. */
export function summarizeAttendance(
  marks: readonly { readonly status: AttendanceStatus }[],
  makeUps: readonly { readonly status: MakeUpStatus }[],
): AttendanceSummary {
  const count = (
    items: readonly { readonly status: string }[],
    status: string,
  ) => items.filter((item) => item.status === status).length;
  return {
    present: count(marks, "present"),
    absent: count(marks, "absent"),
    makeUpsPending: count(makeUps, "pending"),
    makeUpsDone: count(makeUps, "done"),
    makeUpsMissed: count(makeUps, "missed"),
  };
}

export type MakeUpField = "makeUpDate" | "makeUpTurno";

/**
 * The make-up must be a real date inside the chosen turno's period and on its
 * weekday.
 */
export function validateMakeUpPlan(
  date: string,
  turno: { readonly period: string; readonly weekday: number },
): Result<string, Invalid<MakeUpField>> {
  const issue = (code: "invalid-format" | "not-selectable") =>
    err({
      kind: "invalid" as const,
      issues: [{ field: "makeUpDate" as const, code }],
    });
  if (!isIsoDate(date)) return issue("invalid-format");
  if (!isSessionDate(turno.period, turno.weekday, date))
    return issue("not-selectable");
  return ok(date);
}
