import { describe, expect, it } from "vitest";
import {
  encodeOffer,
  parseEnrollmentNewForm,
} from "./enrollment-new-form-data";

function form(fields: Record<string, string>) {
  return new URLSearchParams(fields) as unknown as FormData;
}

const OFFER = encodeOffer({
  slug: "ceramica",
  period: "2026-11",
  turnoId: "t1",
});

describe("parseEnrollmentNewForm", () => {
  it("round-trips the chosen offer and trims the student fields", () => {
    const parsed = parseEnrollmentNewForm(
      form({
        offer: OFFER,
        fullName: "  Ana Pérez ",
        email: " ana@x.test ",
        phone: " 351 555 0001 ",
      }),
    );
    expect(parsed.errors).toEqual({});
    expect(parsed.target).toEqual({
      slug: "ceramica",
      period: "2026-11",
      turnoId: "t1",
    });
    expect(parsed.values).toEqual({
      offer: OFFER,
      fullName: "Ana Pérez",
      email: "ana@x.test",
      phone: "351 555 0001",
    });
  });

  it("requires the offer, name, email and phone", () => {
    const parsed = parseEnrollmentNewForm(form({}));
    expect(parsed.target).toBeNull();
    expect(parsed.errors).toEqual({
      offer: "Elegí el taller, el mes y el turno.",
      fullName: "Completá este campo.",
      email: "Completá este campo.",
      phone: "Completá este campo.",
    });
  });

  it("rejects a malformed offer value", () => {
    const parsed = parseEnrollmentNewForm(
      form({ offer: "a|b", fullName: "A", email: "a@x.test", phone: "1" }),
    );
    expect(parsed.target).toBeNull();
    expect(parsed.errors.offer).toBe("Elegí el taller, el mes y el turno.");
  });
});
