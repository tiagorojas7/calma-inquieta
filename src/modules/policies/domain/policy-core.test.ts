import { describe, expect, it } from "vitest";
import { isPolicyKind, validatePolicyBody } from "./policy-core";

describe("isPolicyKind", () => {
  it("accepts only the two documents of the site", () => {
    expect(isPolicyKind("conditions")).toBe(true);
    expect(isPolicyKind("privacy")).toBe(true);
    expect(isPolicyKind("terms")).toBe(false);
    expect(isPolicyKind("")).toBe(false);
  });
});

describe("validatePolicyBody", () => {
  it("returns the trimmed text", () => {
    expect(validatePolicyBody("  Hola.\n\nChau.  \n", null)).toEqual({
      ok: true,
      value: "Hola.\n\nChau.",
    });
  });

  it("requires some text", () => {
    for (const blank of ["", "   ", "\n \t"]) {
      expect(validatePolicyBody(blank, null)).toEqual({
        ok: false,
        error: {
          kind: "invalid",
          issues: [{ field: "body", code: "required" }],
        },
      });
    }
  });

  it("refuses a text identical to the current one once trimmed", () => {
    expect(validatePolicyBody("  Igual.  ", "Igual.")).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "body", code: "duplicate" }],
      },
    });
  });

  it("accepts a text that differs from the current one", () => {
    expect(validatePolicyBody("Distinta.", "Igual.")).toEqual({
      ok: true,
      value: "Distinta.",
    });
  });
});
