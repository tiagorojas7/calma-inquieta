import type { FieldIssue } from "~/modules/_shared";
import type { StudentDraft, StudentField } from "~/modules/enrollments";
import { studentIssueMessage } from "./copy";

export interface RequestFormValues {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  /** The chosen project; empty until the visitor picks one. */
  readonly projectId: string;
}

export type RequestFieldErrors = Partial<
  Record<StudentField | "project", string>
>;

export const EMPTY_REQUEST_VALUES: RequestFormValues = {
  fullName: "",
  email: "",
  phone: "",
  projectId: "",
};

function text(form: FormData, name: string): string {
  const entry = form.get(name);
  return typeof entry === "string" ? entry : "";
}

/** The visible values to put back in the form, and the draft to submit. */
export function parseRequestForm(form: FormData): {
  values: RequestFormValues;
  student: StudentDraft;
} {
  const values: RequestFormValues = {
    fullName: text(form, "fullName"),
    email: text(form, "email"),
    phone: text(form, "phone"),
    projectId: text(form, "project"),
  };
  return {
    values,
    student: {
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      policyAccepted: form.get("policy") === "on",
      honeypot: text(form, "honeypot"),
    },
  };
}

export function requestFieldErrors(
  issues: readonly FieldIssue<StudentField | "project">[],
): RequestFieldErrors {
  const errors: RequestFieldErrors = {};
  for (const issue of issues) {
    errors[issue.field] ??= studentIssueMessage(issue.field, issue.code);
  }
  return errors;
}
