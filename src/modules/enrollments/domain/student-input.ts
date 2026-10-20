import {
  err,
  ok,
  type FieldIssue,
  type Invalid,
  type Result,
} from "~/modules/_shared";

export type StudentField = "fullName" | "email" | "phone" | "policy";

export interface StudentDraft {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly policyAccepted: boolean;
  /** Hidden anti-spam field; a human leaves it empty. */
  readonly honeypot: string;
}

export interface StudentContact {
  readonly fullName: string;
  readonly email: string;
  readonly phoneDigits: string;
}

export type Honeypot = { readonly kind: "honeypot" };

/** Returns the normalized digits, or null when the number is unusable. */
export type PhoneNormalizer = (display: string) => string | null;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MIN = 2;
const NAME_MAX = 100;
const EMAIL_MAX = 254;

/**
 * Validates the contact data of an order. Phone normalization is injected: the
 * domain cannot import `site-content`, the application wires its WhatsApp rule.
 */
export function validateStudentInput(
  draft: StudentDraft,
  normalizePhone: PhoneNormalizer,
): Result<StudentContact, Invalid<StudentField> | Honeypot> {
  if (draft.honeypot.trim() !== "") return err({ kind: "honeypot" });

  const issues: FieldIssue<StudentField>[] = [];
  const fullName = draft.fullName.trim();
  const email = draft.email.trim().toLowerCase();
  const phone = draft.phone.trim();

  if (fullName === "") issues.push({ field: "fullName", code: "required" });
  else if (fullName.length < NAME_MIN)
    issues.push({ field: "fullName", code: "invalid-format" });
  else if (fullName.length > NAME_MAX)
    issues.push({ field: "fullName", code: "too-long" });

  if (email === "") issues.push({ field: "email", code: "required" });
  else if (email.length > EMAIL_MAX)
    issues.push({ field: "email", code: "too-long" });
  else if (!EMAIL.test(email))
    issues.push({ field: "email", code: "invalid-format" });

  const phoneDigits = phone === "" ? null : normalizePhone(phone);
  if (phone === "") issues.push({ field: "phone", code: "required" });
  else if (phoneDigits === null)
    issues.push({ field: "phone", code: "invalid-format" });

  if (!draft.policyAccepted) issues.push({ field: "policy", code: "required" });

  if (issues.length > 0 || phoneDigits === null) {
    return err({ kind: "invalid", issues });
  }
  return ok({ fullName, email, phoneDigits });
}
