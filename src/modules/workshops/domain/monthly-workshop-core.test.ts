import { describe, expect, it } from "vitest";
import {
  assignmentPercentage,
  checkMonthlyTransition,
  unmetMonthlyPublishRules,
  validateMonthlyCore,
} from "./monthly-workshop-core";
import { Money } from "~/modules/_shared";

describe("monthly workshop core", () => {
  it("trims all text fields and requires a positive whole-peso fee", () => {
    const result = validateMonthlyCore({
      name: "  Cerámica Ñandú  ",
      slug: "ceramica-nandu",
      summary: " resumen ",
      description: " descripción ",
      technique: " torno ",
      defaultFee: "1200",
    });
    if (!result.ok) throw new Error("fixture");
    expect(result.value).toMatchObject({
      name: "Cerámica Ñandú",
      summary: "resumen",
      description: "descripción",
      technique: "torno",
    });
    expect(
      validateMonthlyCore({
        name: "",
        slug: "bad slug",
        summary: "",
        description: "",
        technique: "",
        defaultFee: "0",
      }).ok,
    ).toBe(false);
  });

  it("keeps percentage exact and enforces assignment modality", () => {
    expect(
      assignmentPercentage("third_party", { kind: "value", basisPoints: 3550 }),
    ).toEqual({ ok: true, value: 3550 });
    expect(assignmentPercentage("third_party", { kind: "blank" })).toEqual({
      ok: false,
      error: { field: "percentage", code: "required" },
    });
    expect(
      assignmentPercentage("own", { kind: "value", basisPoints: 0 }),
    ).toEqual({
      ok: false,
      error: { field: "percentage", code: "percentage-not-applicable" },
    });
  });

  it("rejects explicit invalid slugs and every whole-peso fee boundary", () => {
    const invalid = validateMonthlyCore({
      name: "Name",
      slug: "Cerámica Creativa!",
      summary: "Summary",
      description: "Description",
      technique: "Technique",
      defaultFee: "1.50",
    });
    expect(invalid).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [
          { field: "slug", code: "invalid-format" },
          { field: "defaultFee", code: "invalid-format" },
        ],
      },
    });
    for (const defaultFee of ["0", "-1", " "])
      expect(
        validateMonthlyCore({
          name: "Name",
          slug: "name",
          summary: "Summary",
          description: "Description",
          technique: "Technique",
          defaultFee,
        }).ok,
      ).toBe(false);
  });

  it("aggregates publish failures and implements the complete lifecycle table", () => {
    const fee = Money.fromCentavos(100);
    if (!fee.ok) throw new Error("fixture");
    expect(
      unmetMonthlyPublishRules({
        name: "",
        slug: "bad slug",
        defaultFee: fee.value,
        assignment: null,
        activeTurnos: 0,
      }),
    ).toEqual(["name", "slug", "teacher", "active-turno"]);
    const allowed = new Set([
      "draft:published",
      "draft:archived",
      "published:paused",
      "published:archived",
      "paused:published",
      "paused:archived",
      "archived:draft",
    ]);
    for (const from of ["draft", "published", "paused", "archived"] as const)
      for (const to of ["draft", "published", "paused", "archived"] as const) {
        const result = checkMonthlyTransition(from, to);
        expect(result.ok).toBe(allowed.has(`${from}:${to}`));
      }
  });
});
