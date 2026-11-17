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

/** What an order is: the monthly record or a later material sale (mirrors the order table). */
export type StudentOrderKind = "enrollment" | "material_sale";

/** The facts about one enrollment order that the registry derives students from. */
export interface StudentSourceOrder {
  readonly id: string;
  readonly number: string;
  readonly status: StudentOrderStatus;
  /** `material_sale` for a later material purchase; absent means the monthly record. */
  readonly kind?: StudentOrderKind;
  readonly requestedAt: Date;
  readonly paidAt: Date | null;
  readonly total: Money;
  readonly workshopId: string;
  readonly workshopName: string;
  readonly period: string;
  readonly turnoLabel: string;
  readonly weekday: number;
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
  /** `material_sale` for a sale; absent means the monthly record. */
  readonly kind?: StudentOrderKind;
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
  /** Workshops of non-cancelled monthly records, one entry per workshop. */
  readonly workshops: readonly { id: string; name: string }[];
  /** Every non-cancelled monthly record, newest first (a material sale is not an activity). */
  readonly activities: readonly StudentActivity[];
  /** Every order, cancelled and material sales included, newest first. */
  readonly orders: readonly StudentOrderEntry[];
  readonly lastRequestedAt: Date;
  /**
   * False only for a profile the owner deactivated. It organizes the list and
   * blocks nothing; a student without a profile row counts as active.
   */
  readonly active: boolean;
}

/** Which students the list shows: the active ones unless asked otherwise. */
export type StudentActivityFilter = "active" | "inactive" | "all";

export interface StudentQuery {
  readonly text?: string;
  readonly activity?: StudentActivityFilter;
  readonly workshopId?: string;
  readonly status?: StudentOrderStatus;
  readonly page?: number;
}

export const STUDENT_PAGE_SIZE = 50;

export type StudentIdentityResolution =
  | { readonly kind: "create" }
  | { readonly kind: "reuse"; readonly studentId: string }
  | { readonly kind: "conflict" };

/** Resolves normalized contact matches without ever merging two profiles. */
export function resolveStudentIdentity(
  emailStudentId: string | null,
  phoneStudentId: string | null,
): StudentIdentityResolution {
  if (emailStudentId === null && phoneStudentId === null)
    return { kind: "create" };
  if (
    emailStudentId !== null &&
    phoneStudentId !== null &&
    emailStudentId !== phoneStudentId
  )
    return { kind: "conflict" };
  return {
    kind: "reuse",
    studentId: emailStudentId ?? (phoneStudentId as string),
  };
}

/** The identity of a student: the email, trimmed and lower-cased. */
export function normalizeStudentEmail(email: string): string {
  return email.trim().toLowerCase();
}

const newestFirst = (a: StudentSourceOrder, b: StudentSourceOrder) =>
  b.requestedAt.getTime() - a.requestedAt.getTime() ||
  b.number.localeCompare(a.number);

/**
 * Groups orders by normalized email into one profile each. The latest
 * enrollment (a material sale only when there is none) supplies the name and
 * phone, so a corrected spelling wins over an old one.
 * Emails in `inactive` mark their profile inactive; every other one is active.
 */
export function deriveStudents(
  orders: readonly StudentSourceOrder[],
  inactive: ReadonlySet<string> = new Set(),
): readonly StudentProfile[] {
  const groups = new Map<string, StudentSourceOrder[]>();
  for (const order of orders) {
    const key = normalizeStudentEmail(order.studentEmail);
    groups.set(key, [...(groups.get(key) ?? []), order]);
  }
  return [...groups.entries()].map(([email, group]) => {
    const sorted = [...group].sort(newestFirst);
    const newest = sorted[0];
    if (!newest) throw new Error("empty student group");
    // A sale copies its record's contact but is stamped when it was made, so
    // it must not outrank a later correction of the enrollment itself.
    const latest =
      sorted.find((order) => order.kind !== "material_sale") ?? newest;
    const active = sorted.filter(
      (order) => order.status !== "cancelled" && order.kind !== "material_sale",
    );
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
        ...(order.kind === undefined ? {} : { kind: order.kind }),
        workshopId: order.workshopId,
        workshopName: order.workshopName,
        period: order.period,
        total: order.total,
        requestedAt: order.requestedAt,
        paidAt: order.paidAt,
      })),
      lastRequestedAt: latest.requestedAt,
      active: !inactive.has(email),
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
 * `status: "cancelled"`); `activity` keeps the active profiles unless it asks
 * for the inactive ones or all.
 */
export function filterStudents(
  profiles: readonly StudentProfile[],
  query: StudentQuery,
): readonly StudentProfile[] {
  const text = fold(query.text ?? "");
  const textDigits = digits(text);
  const activity = query.activity ?? "active";
  return profiles
    .filter((profile) => {
      if (activity === "active" && !profile.active) return false;
      if (activity === "inactive" && profile.active) return false;
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
