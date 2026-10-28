import type {
  PrivateEventDraft,
  PrivateEventField,
} from "~/modules/private-events";
import type { FieldIssue } from "~/modules/_shared";
import { privateEventIssueMessage } from "./copy";

export type PrivateEventFormValues = Omit<PrivateEventDraft, "honeypot">;
export type PrivateEventFieldErrors = Partial<
  Record<PrivateEventField, string>
>;

export const EMPTY_PRIVATE_EVENT_VALUES: PrivateEventFormValues = {
  fullName: "",
  phone: "",
  email: "",
  desiredDate: "",
  place: "",
  participants: "",
  notes: "",
};

function text(form: FormData, name: string): string {
  const entry = form.get(name);
  return typeof entry === "string" ? entry : "";
}

export function parsePrivateEventForm(form: FormData): {
  values: PrivateEventFormValues;
  draft: PrivateEventDraft;
} {
  const values: PrivateEventFormValues = {
    fullName: text(form, "fullName"),
    phone: text(form, "phone"),
    email: text(form, "email"),
    desiredDate: text(form, "desiredDate"),
    place: text(form, "place"),
    participants: text(form, "participants"),
    notes: text(form, "notes"),
  };
  return { values, draft: { ...values, honeypot: text(form, "honeypot") } };
}

export function privateEventFieldErrors(
  issues: readonly FieldIssue<PrivateEventField>[],
): PrivateEventFieldErrors {
  const errors: PrivateEventFieldErrors = {};
  for (const issue of issues) {
    errors[issue.field] ??= privateEventIssueMessage(issue.field, issue.code);
  }
  return errors;
}
