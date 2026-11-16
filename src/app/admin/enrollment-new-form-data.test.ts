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

  it("reads no lines when no material was chosen", () => {
    const parsed = parseEnrollmentNewForm(
      form({
        offer: OFFER,
        fullName: "A",
        email: "a@x.test",
        phone: "1",
        fee: "58000",
      }),
    );
    expect(parsed.lines).toEqual([]);
    expect(parsed.cartLines).toEqual([]);
    expect(parsed.errors).toEqual({});
  });

  it("reads the chosen variants and quantities in submitted order", () => {
    const fields = new URLSearchParams({
      offer: OFFER,
      fullName: "A",
      email: "a@x.test",
      phone: "1",
      fee: "58000",
    });
    fields.append("line:m-1:v-1", " 2 ");
    fields.append("line:m-2:v-9", "1");
    const parsed = parseEnrollmentNewForm(fields as unknown as FormData);
    expect(parsed.errors).toEqual({});
    expect(parsed.lines).toEqual([
      { materialId: "m-1", variantId: "v-1", quantity: "2" },
      { materialId: "m-2", variantId: "v-9", quantity: "1" },
    ]);
    expect(parsed.cartLines).toEqual([
      { materialId: "m-1", variantId: "v-1", quantity: 2 },
      { materialId: "m-2", variantId: "v-9", quantity: 1 },
    ]);
  });

  it.each(["", "0", "-1", "1.5", "1e1", "abc"])(
    "keeps the quantity %j as an invalid quantity for the server to refuse",
    (quantity) => {
      const fields = new URLSearchParams({
        offer: OFFER,
        fullName: "A",
        email: "a@x.test",
        phone: "1",
        fee: "58000",
      });
      fields.append("line:m-1:v-1", quantity);
      const parsed = parseEnrollmentNewForm(fields as unknown as FormData);
      expect(parsed.lines).toEqual([
        { materialId: "m-1", variantId: "v-1", quantity },
      ]);
      const [line] = parsed.cartLines;
      expect(
        Number.isInteger(line?.quantity) && (line?.quantity ?? 0) >= 1,
      ).toBe(false);
    },
  );

  it("flags a line field with no material or variant as a materials error", () => {
    const fields = new URLSearchParams({
      offer: OFFER,
      fullName: "A",
      email: "a@x.test",
      phone: "1",
      fee: "58000",
    });
    fields.append("line:m-1", "1");
    const parsed = parseEnrollmentNewForm(fields as unknown as FormData);
    expect(parsed.errors.materials).toBe(
      "Algún material ya no está disponible o no tiene precio. Quitalo y probá de nuevo.",
    );
  });
});
