import {
  err,
  ok,
  type FieldIssue,
  type Invalid,
  type Result,
} from "~/modules/_shared";

export const PRIVATE_EVENT_STATUSES = [
  "nueva",
  "contactada",
  "cerrada",
] as const;
export type PrivateEventStatus = (typeof PRIVATE_EVENT_STATUSES)[number];

export function isPrivateEventStatus(
  value: string,
): value is PrivateEventStatus {
  return (PRIVATE_EVENT_STATUSES as readonly string[]).includes(value);
}

export type PrivateEventField =
  | "fullName"
  | "phone"
  | "email"
  | "desiredDate"
  | "place"
  | "participants"
  | "notes";

export interface PrivateEventDraft {
  readonly fullName: string;
  readonly phone: string;
  readonly email: string;
  /** `YYYY-MM-DD`, as a native date input submits it. */
  readonly desiredDate: string;
  /** Where the event would take place, or what kind of event it is. */
  readonly place: string;
  /** Whole number as text, as a form submits it. */
  readonly participants: string;
  readonly notes: string;
  /** Hidden anti-spam field; a human leaves it empty. */
  readonly honeypot: string;
}

export interface PrivateEventRequestData {
  readonly fullName: string;
  readonly phoneDigits: string;
  readonly email: string | null;
  readonly desiredDate: string;
  readonly place: string;
  readonly participants: number;
  readonly notes: string | null;
}

export type Honeypot = { readonly kind: "honeypot" };

/** Returns the normalized digits, or null when the number is unusable. */
export type PhoneNormalizer = (display: string) => string | null;

const CORDOBA_OFFSET_MS = 3 * 60 * 60 * 1000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const NAME_MIN = 2;
const NAME_MAX = 100;
const PLACE_MIN = 2;
const PLACE_MAX = 200;
const EMAIL_MAX = 254;
const NOTES_MAX = 1000;
export const PARTICIPANTS_MIN = 1;
export const PARTICIPANTS_MAX = 200;

/** `YYYY-MM-DD` of the Córdoba calendar day at `instant` (fixed UTC-03:00). */
export function cordobaDateOf(instant: Date): string {
  return new Date(instant.getTime() - CORDOBA_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}

function isRealDate(text: string): boolean {
  const match = ISO_DATE.exec(text);
  if (!match) return false;
  const [year, month, day] = [match[1], match[2], match[3]].map(Number) as [
    number,
    number,
    number,
  ];
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

/**
 * Validates a private-event request. Phone normalization is injected (the
 * domain cannot import `site-content`); `today` is the Córdoba date, so "not in
 * the past" needs no clock here.
 */
export function validatePrivateEventDraft(
  draft: PrivateEventDraft,
  normalizePhone: PhoneNormalizer,
  today: string,
): Result<PrivateEventRequestData, Invalid<PrivateEventField> | Honeypot> {
  if (draft.honeypot.trim() !== "") return err({ kind: "honeypot" });

  const issues: FieldIssue<PrivateEventField>[] = [];
  const fullName = draft.fullName.trim();
  const phone = draft.phone.trim();
  const email = draft.email.trim().toLowerCase();
  const desiredDate = draft.desiredDate.trim();
  const place = draft.place.trim();
  const participantsText = draft.participants.trim();
  const notes = draft.notes.trim();

  if (fullName === "") issues.push({ field: "fullName", code: "required" });
  else if (fullName.length < NAME_MIN)
    issues.push({ field: "fullName", code: "invalid-format" });
  else if (fullName.length > NAME_MAX)
    issues.push({ field: "fullName", code: "too-long" });

  const phoneDigits = phone === "" ? null : normalizePhone(phone);
  if (phone === "") issues.push({ field: "phone", code: "required" });
  else if (phoneDigits === null)
    issues.push({ field: "phone", code: "invalid-format" });

  if (email !== "") {
    if (email.length > EMAIL_MAX)
      issues.push({ field: "email", code: "too-long" });
    else if (!EMAIL.test(email))
      issues.push({ field: "email", code: "invalid-format" });
  }

  if (desiredDate === "")
    issues.push({ field: "desiredDate", code: "required" });
  else if (!isRealDate(desiredDate))
    issues.push({ field: "desiredDate", code: "invalid-format" });
  else if (desiredDate < today)
    issues.push({ field: "desiredDate", code: "in-past" });

  if (place === "") issues.push({ field: "place", code: "required" });
  else if (place.length < PLACE_MIN)
    issues.push({ field: "place", code: "invalid-format" });
  else if (place.length > PLACE_MAX)
    issues.push({ field: "place", code: "too-long" });

  let participants = 0;
  if (participantsText === "")
    issues.push({ field: "participants", code: "required" });
  else if (!/^\d{1,6}$/.test(participantsText))
    issues.push({ field: "participants", code: "invalid-format" });
  else {
    participants = Number(participantsText);
    if (participants < PARTICIPANTS_MIN || participants > PARTICIPANTS_MAX)
      issues.push({ field: "participants", code: "out-of-range" });
  }

  if (notes.length > NOTES_MAX)
    issues.push({ field: "notes", code: "too-long" });

  if (issues.length > 0 || phoneDigits === null)
    return err({ kind: "invalid", issues });
  return ok({
    fullName,
    phoneDigits,
    email: email === "" ? null : email,
    desiredDate,
    place,
    participants,
    notes: notes === "" ? null : notes,
  });
}
