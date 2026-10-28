import { describe, expect, it } from "vitest";
import {
  cordobaDateOf,
  isPrivateEventStatus,
  validatePrivateEventDraft,
  type PrivateEventDraft,
} from "./private-event-core";

const digits = (display: string) => {
  const only = display.replace(/\D/g, "");
  return only.length === 10 ? `549${only}` : null;
};

function draft(overrides: Partial<PrivateEventDraft> = {}): PrivateEventDraft {
  return {
    fullName: "  Ana Pérez ",
    phone: "351 555 0101",
    email: " ANA@Example.com ",
    desiredDate: "2026-12-05",
    place: " Mi casa en Nueva Córdoba ",
    participants: "12",
    notes: " Cumpleaños ",
    honeypot: "",
    ...overrides,
  };
}

const TODAY = "2026-10-28";

function issues(overrides: Partial<PrivateEventDraft>) {
  const result = validatePrivateEventDraft(draft(overrides), digits, TODAY);
  if (result.ok) return [];
  if (result.error.kind !== "invalid") return ["honeypot"];
  return result.error.issues.map((i) => `${i.field}:${i.code}`);
}

describe("cordobaDateOf", () => {
  it("uses the Córdoba calendar day (UTC-03:00)", () => {
    expect(cordobaDateOf(new Date("2026-10-29T02:59:00.000Z"))).toBe(
      "2026-10-28",
    );
    expect(cordobaDateOf(new Date("2026-10-29T03:00:00.000Z"))).toBe(
      "2026-10-29",
    );
  });
});

describe("isPrivateEventStatus", () => {
  it("accepts only the three statuses", () => {
    expect(["nueva", "contactada", "cerrada"].every(isPrivateEventStatus)).toBe(
      true,
    );
    expect(isPrivateEventStatus("otra")).toBe(false);
  });
});

describe("validatePrivateEventDraft", () => {
  it("normalizes a valid request", () => {
    const result = validatePrivateEventDraft(draft(), digits, TODAY);
    expect(result).toEqual({
      ok: true,
      value: {
        fullName: "Ana Pérez",
        phoneDigits: "5493515550101",
        email: "ana@example.com",
        desiredDate: "2026-12-05",
        place: "Mi casa en Nueva Córdoba",
        participants: 12,
        notes: "Cumpleaños",
      },
    });
  });

  it("treats email and notes as optional", () => {
    const result = validatePrivateEventDraft(
      draft({ email: "", notes: "  " }),
      digits,
      TODAY,
    );
    expect(result.ok && result.value.email).toBeNull();
    expect(result.ok && result.value.notes).toBeNull();
  });

  it("accepts today and rejects yesterday in Córdoba time", () => {
    expect(issues({ desiredDate: TODAY })).toEqual([]);
    expect(issues({ desiredDate: "2026-10-27" })).toEqual([
      "desiredDate:in-past",
    ]);
  });

  it("rejects a missing, malformed or impossible date", () => {
    expect(issues({ desiredDate: "" })).toEqual(["desiredDate:required"]);
    expect(issues({ desiredDate: "05/12/2026" })).toEqual([
      "desiredDate:invalid-format",
    ]);
    expect(issues({ desiredDate: "2026-02-30" })).toEqual([
      "desiredDate:invalid-format",
    ]);
  });

  it("requires name, phone and place", () => {
    expect(issues({ fullName: " ", phone: "", place: "" })).toEqual([
      "fullName:required",
      "phone:required",
      "place:required",
    ]);
  });

  it("flags short or long text and unusable phone or email", () => {
    expect(issues({ fullName: "A" })).toEqual(["fullName:invalid-format"]);
    expect(issues({ fullName: "x".repeat(101) })).toEqual([
      "fullName:too-long",
    ]);
    expect(issues({ phone: "123" })).toEqual(["phone:invalid-format"]);
    expect(issues({ email: "nope" })).toEqual(["email:invalid-format"]);
    expect(issues({ place: "x".repeat(201) })).toEqual(["place:too-long"]);
  });

  it("bounds participants to 1-200 whole numbers", () => {
    expect(issues({ participants: "" })).toEqual(["participants:required"]);
    expect(issues({ participants: "1" })).toEqual([]);
    expect(issues({ participants: "200" })).toEqual([]);
    expect(issues({ participants: "0" })).toEqual([
      "participants:out-of-range",
    ]);
    expect(issues({ participants: "201" })).toEqual([
      "participants:out-of-range",
    ]);
    expect(issues({ participants: "2.5" })).toEqual([
      "participants:invalid-format",
    ]);
  });

  it("limits notes to 1000 characters", () => {
    expect(issues({ notes: "x".repeat(1000) })).toEqual([]);
    expect(issues({ notes: "x".repeat(1001) })).toEqual(["notes:too-long"]);
  });

  it("answers a filled honeypot with a honeypot error", () => {
    expect(
      validatePrivateEventDraft(draft({ honeypot: "bot" }), digits, TODAY),
    ).toEqual({ ok: false, error: { kind: "honeypot" } });
  });
});
