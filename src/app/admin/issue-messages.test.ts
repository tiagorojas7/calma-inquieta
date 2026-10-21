import { describe, expect, it } from "vitest";
import type { IssueCode } from "~/modules/_shared";
import { findCopyViolations } from "~/modules/site-content";
import { ISSUE_MESSAGES, fieldErrors, issueMessage } from "./issue-messages";

const ALL_CODES: readonly IssueCode[] = [
  "required",
  "too-long",
  "invalid-format",
  "out-of-range",
  "too-many-decimals",
  "not-whole-pesos",
  "duplicate",
  "not-selectable",
  "unknown-reference",
  "too-many",
  "confirmation-required",
  "in-past",
  "end-before-start",
  "exceeds-price",
  "exceeds-capacity",
  "percentage-not-applicable",
];

describe("issueMessage", () => {
  it("has a non-empty Spanish message for every issue code", () => {
    for (const code of ALL_CODES) {
      expect(issueMessage(code).length).toBeGreaterThan(5);
    }
    expect(Object.keys(ISSUE_MESSAGES).sort()).toEqual([...ALL_CODES].sort());
  });

  it("keeps every message in voseo Spanish", () => {
    expect(findCopyViolations(Object.values(ISSUE_MESSAGES))).toEqual([]);
  });

  it("says a required field must be completed", () => {
    expect(issueMessage("required")).toBe("Completá este campo.");
  });

  it("says a duplicate name already exists", () => {
    expect(issueMessage("duplicate")).toBe(
      "Ya existe uno activo con el mismo nombre.",
    );
  });
});

describe("fieldErrors", () => {
  it("maps each field to the message of its first issue", () => {
    expect(
      fieldErrors([
        { field: "name", code: "required" },
        { field: "name", code: "duplicate" },
        { field: "email", code: "invalid-format" },
      ]),
    ).toEqual({
      name: "Completá este campo.",
      email: "El formato no es válido. Revisalo.",
    });
  });

  it("is empty when there are no issues", () => {
    expect(fieldErrors([])).toEqual({});
  });
});
