import { describe, expect, it } from "vitest";
import { MAX_CART_LINES } from "~/modules/enrollments";
import {
  addDraftLine,
  loadEnrollmentDraft,
  saveEnrollmentDraft,
  selectEnrollmentDraft,
  type EnrollmentDraft,
} from "./enrollment-draft";

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

const draft: EnrollmentDraft = {
  student: {
    fullName: "Ana Demo",
    email: "ana@example.test",
    phone: "+54 9 351 555 0000",
    turnoId: "turno-1",
    period: "2026-11",
    policyAccepted: true,
  },
  lines: [{ materialId: "arcilla", variantId: "grande", quantity: 2 }],
};

describe("enrollment draft", () => {
  it("stores a draft per workshop slug and treats missing or corrupt data as empty", () => {
    const session = storage();
    saveEnrollmentDraft(session, "ceramica", draft);

    expect(loadEnrollmentDraft(session, "ceramica")).toEqual(draft);
    expect(loadEnrollmentDraft(session, "otro-taller")).toBeNull();

    session.setItem("enrollment-draft:ceramica", "{not-json");
    expect(loadEnrollmentDraft(session, "ceramica")).toBeNull();
  });

  it("rejects malformed persisted values instead of trusting their cart", () => {
    const session = storage();
    session.setItem(
      "enrollment-draft:ceramica",
      JSON.stringify({
        ...draft,
        lines: [{ materialId: "arcilla", variantId: "grande", quantity: 21 }],
      }),
    );

    expect(loadEnrollmentDraft(session, "ceramica")).toBeNull();
  });

  it("binds an in-memory draft to the current workshop and offer period", () => {
    const stored = { slug: "ceramica", draft };
    expect(selectEnrollmentDraft(stored, "ceramica", "2026-11")).toEqual(draft);
    expect(selectEnrollmentDraft(stored, "ceramica", "2026-12")).toBeNull();
    expect(selectEnrollmentDraft(stored, "otro-taller", "2026-11")).toBeNull();
  });

  it("merges variants and consumes the domain quantity and line limits", () => {
    const merged = addDraftLine(draft, {
      materialId: "arcilla",
      variantId: "grande",
      quantity: 3,
    });
    expect(merged).toMatchObject({
      ok: true,
      value: { lines: [{ variantId: "grande", quantity: 5 }] },
    });

    expect(
      addDraftLine(draft, {
        materialId: "arcilla",
        variantId: "grande",
        quantity: 19,
      }),
    ).toEqual({
      ok: false,
      error: { kind: "invalid-quantity", variantId: "grande" },
    });

    const full: EnrollmentDraft = {
      ...draft,
      lines: Array.from({ length: MAX_CART_LINES }, (_, index) => ({
        materialId: `material-${index}`,
        variantId: `variant-${index}`,
        quantity: 1,
      })),
    };
    expect(
      addDraftLine(full, {
        materialId: "extra",
        variantId: "extra",
        quantity: 1,
      }),
    ).toEqual({
      ok: false,
      error: { kind: "too-many-lines" },
    });
  });
});
