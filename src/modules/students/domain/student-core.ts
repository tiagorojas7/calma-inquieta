import {
  err,
  ok,
  type FieldIssue,
  type Invalid,
  type Money,
  type Result,
} from "~/modules/_shared";

/** The order statuses a student's history can show (mirrors the order table). */
export type StudentOrderStatus =
  | "pending_confirmation"
  | "paid"
  | "materials_requested"
  | "materials_received"
  | "cancelled";

/** The facts about one enrollment order that the registry derives students from. */
export interface StudentSourceOrder {
  readonly id: string;
  readonly number: string;
  readonly status: StudentOrderStatus;
  readonly requestedAt: Date;
  readonly paidAt: Date | null;
  readonly total: Money;
  readonly workshopId: string;
  readonly workshopName: string;
  readonly period: string;
  readonly turnoLabel: string;
  readonly studentName: string;
  readonly studentEmail: string;
  readonly studentPhoneDigits: string;
}

export interface StudentActivity {
  readonly workshopId: string;
  readonly workshopName: string;
  readonly period: string;
  readonly turnoLabel: string;
  readonly status: StudentOrderStatus;
}

export interface StudentOrderEntry {
  readonly id: string;
  readonly number: string;
  readonly status: StudentOrderStatus;
  readonly workshopId: string;
  readonly workshopName: string;
  readonly period: string;
  readonly total: Money;
  readonly requestedAt: Date;
  readonly paidAt: Date | null;
}

/** One person, whatever the number of workshops she joined. */
export interface StudentProfile {
  readonly email: string;
  readonly fullName: string;
  readonly phoneDigits: string;
  /** Workshops of non-cancelled orders, one entry per workshop. */
  readonly workshops: readonly { id: string; name: string }[];
  /** Every non-cancelled order, newest first. */
  readonly activities: readonly StudentActivity[];
  /** Every order, cancelled included, newest first. */
  readonly orders: readonly StudentOrderEntry[];
  readonly lastRequestedAt: Date;
}

export interface StudentQuery {
  readonly text?: string;
  readonly workshopId?: string;
  readonly status?: StudentOrderStatus;
  readonly page?: number;
}

export const STUDENT_PAGE_SIZE = 50;

/** The identity of a student: the email, trimmed and lower-cased. */
export function normalizeStudentEmail(email: string): string {
  return email.trim().toLowerCase();
}

const newestFirst = (a: StudentSourceOrder, b: StudentSourceOrder) =>
  b.requestedAt.getTime() - a.requestedAt.getTime() ||
  b.number.localeCompare(a.number);

/**
 * Groups orders by normalized email into one profile each. The latest order
 * supplies the name and phone, so a corrected spelling wins over an old one.
 */
export function deriveStudents(
  orders: readonly StudentSourceOrder[],
): readonly StudentProfile[] {
  const groups = new Map<string, StudentSourceOrder[]>();
  for (const order of orders) {
    const key = normalizeStudentEmail(order.studentEmail);
    groups.set(key, [...(groups.get(key) ?? []), order]);
  }
  return [...groups.entries()].map(([email, group]) => {
    const sorted = [...group].sort(newestFirst);
    const latest = sorted[0];
    if (!latest) throw new Error("empty student group");
    const active = sorted.filter((order) => order.status !== "cancelled");
    const workshops = new Map<string, string>();
    for (const order of active)
      if (!workshops.has(order.workshopId))
        workshops.set(order.workshopId, order.workshopName);
    return {
      email,
      fullName: latest.studentName,
      phoneDigits: latest.studentPhoneDigits,
      workshops: [...workshops].map(([id, name]) => ({ id, name })),
      activities: active.map((order) => ({
        workshopId: order.workshopId,
        workshopName: order.workshopName,
        period: order.period,
        turnoLabel: order.turnoLabel,
        status: order.status,
      })),
      orders: sorted.map((order) => ({
        id: order.id,
        number: order.number,
        status: order.status,
        workshopId: order.workshopId,
        workshopName: order.workshopName,
        period: order.period,
        total: order.total,
        requestedAt: order.requestedAt,
        paidAt: order.paidAt,
      })),
      lastRequestedAt: latest.requestedAt,
    };
  });
}

const fold = (value: string) => value.trim().toLowerCase();
const PHONE_LIKE = /^[\d\s()+-]+$/;
/** The digits of a phone-looking search; any other text is not a phone search. */
const digits = (value: string) =>
  PHONE_LIKE.test(value) ? value.replace(/\D/g, "") : "";

/**
 * Search and activity filters over derived profiles, most recent activity
 * first. `text` matches name, email or phone digits; `workshopId` and `status`
 * look at the student's own orders (a cancelled order still counts for
 * `status: "cancelled"`).
 */
export function filterStudents(
  profiles: readonly StudentProfile[],
  query: StudentQuery,
): readonly StudentProfile[] {
  const text = fold(query.text ?? "");
  const textDigits = digits(text);
  return profiles
    .filter((profile) => {
      if (
        (query.workshopId !== undefined || query.status !== undefined) &&
        !profile.orders.some(
          (order) =>
            (query.workshopId === undefined ||
              order.workshopId === query.workshopId) &&
            (query.status === undefined || order.status === query.status),
        )
      )
        return false;
      if (text === "") return true;
      return (
        fold(profile.fullName).includes(text) ||
        profile.email.includes(text) ||
        (textDigits !== "" && profile.phoneDigits.includes(textDigits))
      );
    })
    .sort(
      (x, y) =>
        y.lastRequestedAt.getTime() - x.lastRequestedAt.getTime() ||
        x.email.localeCompare(y.email),
    );
}

export const NOTE_MAX = 2000;
export type NoteField = "note";

/** The note text, trimmed; an empty text is valid and clears the note. */
export function validateNote(text: string): Result<string, Invalid<NoteField>> {
  const note = text.trim();
  if (note.length > NOTE_MAX) {
    const issue: FieldIssue<NoteField> = { field: "note", code: "too-long" };
    return err({ kind: "invalid", issues: [issue] });
  }
  return ok(note);
}
