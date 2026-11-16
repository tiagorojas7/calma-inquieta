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
        fee: " 58000 ",
      }),
    );
    expect(parsed.errors).toEqual({});
    expect(parsed.fee?.toCentavos()).toBe(5_800_000);
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
      fee: "58000",
    });
  });

  it("requires the offer, name, email, phone and fee", () => {
    const parsed = parseEnrollmentNewForm(form({}));
    expect(parsed.target).toBeNull();
    expect(parsed.errors).toEqual({
      offer: "Elegí el taller, el mes y el turno.",
      fullName: "Completá este campo.",
      email: "Completá este campo.",
      phone: "Completá este campo.",
      fee: "Completá este campo.",
    });
    expect(parsed.fee).toBeNull();
  });

  it("accepts any whole-peso fee, $0 included for a scholarship", () => {
    const base = { offer: OFFER, fullName: "A", email: "a@x.test", phone: "1" };
    const free = parseEnrollmentNewForm(form({ ...base, fee: "0" }));
    expect(free.errors).toEqual({});
    expect(free.fee?.isZero()).toBe(true);
    const grouped = parseEnrollmentNewForm(form({ ...base, fee: "$ 12.500" }));
    expect(grouped.errors).toEqual({});
    expect(grouped.fee?.toCentavos()).toBe(1_250_000);
  });

  it.each(["abc", "-100", "58000,50", "58000.5", "1e3"])(
    "flags %j as a fee field error, never a silent fallback",
    (fee) => {
      const parsed = parseEnrollmentNewForm(
        form({
          offer: OFFER,
          fullName: "A",
          email: "a@x.test",
          phone: "1",
          fee,
        }),
      );
      expect(parsed.errors).toEqual({
        fee: "Ingresá la cuota en pesos enteros, sin centavos; los puntos de miles se aceptan. Por ejemplo: 58000 o 58.000.",
      });
      expect(parsed.fee).toBeNull();
    },
  );

  it("rejects a malformed offer value", () => {
    const parsed = parseEnrollmentNewForm(
      form({
        offer: "a|b",
        fullName: "A",
        email: "a@x.test",
        phone: "1",
        fee: "58000",
      }),
    );
    expect(parsed.target).toBeNull();
    expect(parsed.errors.offer).toBe("Elegí el taller, el mes y el turno.");
  });
});
