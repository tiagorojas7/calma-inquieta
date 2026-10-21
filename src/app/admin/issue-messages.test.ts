import { describe, expect, it } from "vitest";
import type { IssueCode } from "~/modules/_shared";
import { findCopyViolations } from "~/modules/site-content";
import {
  ISSUE_MESSAGES,
  WORKSHOP_FIELD_MESSAGES,
  fieldErrors,
  issueMessage,
  publishRulesMessage,
  transitionRefusedMessage,
  workshopRuleMessage,
} from "./issue-messages";

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

describe("workshop messages", () => {
  it("words every publish rule, the refused transition and the delete rule in voseo", () => {
    const rules = [
      "name",
      "slug",
      "teacher",
      "percentage",
      "default-fee",
      "active-turno",
    ] as const;
    for (const rule of rules)
      expect(workshopRuleMessage(rule).length).toBeGreaterThan(5);
    expect(workshopRuleMessage("active-turno")).toBe(
      "al menos un turno activo",
    );
    expect(workshopRuleMessage("draft-without-periods")).toContain("período");
    expect(
      findCopyViolations(
        [...rules, "draft-without-periods" as const].map(workshopRuleMessage),
      ),
    ).toEqual([]);
  });

  it("lists every unmet publish rule in one sentence", () => {
    expect(publishRulesMessage(["teacher", "active-turno"])).toBe(
      "Para publicar falta: un profesor asignado, al menos un turno activo.",
    );
  });

  it("words a refused transition with Spanish state names", () => {
    expect(transitionRefusedMessage("draft", "paused")).toBe(
      "No se puede pasar de Borrador a Pausado.",
    );
  });

  it("uses a slug-specific text for the codes that name a name or a choice", () => {
    expect(
      fieldErrors(
        [
          { field: "slug", code: "duplicate" },
          { field: "name", code: "duplicate" },
        ],
        WORKSHOP_FIELD_MESSAGES,
      ),
    ).toEqual({
      slug: "Ese enlace ya lo usa otro taller.",
      name: "Ya existe uno activo con el mismo nombre.",
    });
    expect(
      fieldErrors(
        [{ field: "slug", code: "confirmation-required" }],
        WORKSHOP_FIELD_MESSAGES,
      ).slug,
    ).toContain("Marcá la confirmación");
    expect(
      findCopyViolations(
        Object.values(WORKSHOP_FIELD_MESSAGES).flatMap((byCode) =>
          Object.values(byCode),
        ),
      ),
    ).toEqual([]);
  });
});
