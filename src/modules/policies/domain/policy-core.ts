import { err, ok, type Invalid, type Result } from "~/modules/_shared";

/** The two site-wide documents, each with its own version history. */
export const POLICY_KINDS = ["conditions", "privacy"] as const;
export type PolicyKind = (typeof POLICY_KINDS)[number];

export function isPolicyKind(value: string): value is PolicyKind {
  return (POLICY_KINDS as readonly string[]).includes(value);
}

/** One published, immutable version of a document; `version` is 1-based per kind. */
export interface PolicyVersion {
  readonly id: string;
  readonly kind: PolicyKind;
  readonly version: number;
  readonly body: string;
  readonly publishedAt: Date;
  readonly publishedBy: string;
}

export type PolicyBodyField = "body";

/**
 * The text of a new version: trimmed, not blank and not the same as the
 * version it would replace (publishing nothing new would only add noise to the
 * history).
 */
export function validatePolicyBody(
  body: string,
  currentBody: string | null,
): Result<string, Invalid<PolicyBodyField>> {
  const text = body.trim();
  if (text === "")
    return err({
      kind: "invalid",
      issues: [{ field: "body", code: "required" }],
    });
  if (currentBody !== null && text === currentBody.trim())
    return err({
      kind: "invalid",
      issues: [{ field: "body", code: "duplicate" }],
    });
  return ok(text);
}
