import { describe, expect, it } from "vitest";
import { Money } from "./money";

const MAX = Number.MAX_SAFE_INTEGER;

function money(centavos: number): Money {
  const result = Money.fromCentavos(centavos);
  if (!result.ok) {
    throw new Error(`fixture ${String(centavos)} is not valid money`);
  }
  return result.value;
}

describe("Money construction", () => {
  it("reads back the centavos it was created from", () => {
    expect(money(150).toCentavos()).toBe(150);
    expect(money(150000).toCentavos()).toBe(150000);
  });

  it.each([
    1.5,
    10.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ])("rejects %s as not-an-integer", (value) => {
    const result = Money.fromCentavos(value);

    expect(result).toEqual({ ok: false, error: { kind: "not-an-integer" } });
  });

  it.each([2 ** 53, -(2 ** 53), MAX + 2])(
    "rejects the unsafe integer %s as out-of-range",
    (value) => {
      const result = Money.fromCentavos(value);

      expect(result).toEqual({ ok: false, error: { kind: "out-of-range" } });
    },
  );

  it("accepts the safe-integer bounds", () => {
    expect(money(MAX).toCentavos()).toBe(MAX);
    expect(money(-MAX).toCentavos()).toBe(-MAX);
  });

  it("accepts zero and normalizes negative zero", () => {
    const zero = Money.fromCentavos(0);

    expect(zero.ok && zero.value.isZero()).toBe(true);
    expect(Object.is(money(-0).toCentavos(), 0)).toBe(true);
    expect(Money.zero().toCentavos()).toBe(0);
  });
});

describe("Money arithmetic", () => {
  it("adds without floating point drift", () => {
    expect(money(10).add(money(20)).toCentavos()).toBe(30);
    expect(money(1999).add(money(1)).toCentavos()).toBe(2000);
  });

  it("subtracts, allowing a negative result", () => {
    const difference = money(100).subtract(money(250));

    expect(difference.toCentavos()).toBe(-150);
    expect(difference.isNegative()).toBe(true);
    expect(money(250).subtract(money(100)).toCentavos()).toBe(150);
  });

  it("throws a RangeError when an addition leaves the safe range", () => {
    expect(() => money(MAX).add(money(1))).toThrow(RangeError);
    expect(() => money(-MAX).add(money(-1))).toThrow(RangeError);
    expect(() => money(-MAX).subtract(money(1))).toThrow(RangeError);
  });

  it("multiplies by an integer quantity", () => {
    expect(money(2500).multiply(3).toCentavos()).toBe(7500);
    expect(money(2500).multiply(0).toCentavos()).toBe(0);
    expect(money(2500).multiply(-2).toCentavos()).toBe(-5000);
    expect(Object.is(money(0).multiply(-1).toCentavos(), 0)).toBe(true);
  });

  it.each([0.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53])(
    "throws a RangeError when the quantity is %s",
    (quantity) => {
      expect(() => money(2500).multiply(quantity)).toThrow(RangeError);
    },
  );

  it("throws a RangeError when a multiplication leaves the safe range", () => {
    expect(() => money(MAX).multiply(2)).toThrow(RangeError);
  });

  it("returns new instances and leaves its operands untouched", () => {
    const base = money(100);
    const other = money(50);

    const sum = base.add(other);

    expect(sum).not.toBe(base);
    expect(base.toCentavos()).toBe(100);
    expect(other.toCentavos()).toBe(50);
    expect(base.multiply(2)).not.toBe(base);
    expect(base.toCentavos()).toBe(100);
  });
});

describe("Money comparison", () => {
  it("compares by value", () => {
    expect(money(100).equals(money(100))).toBe(true);
    expect(money(100).equals(money(200))).toBe(false);
    expect(money(100).compare(money(200))).toBe(-1);
    expect(money(200).compare(money(100))).toBe(1);
    expect(money(100).compare(money(100))).toBe(0);
  });

  it("reports zero and negative amounts", () => {
    expect(money(0).isZero()).toBe(true);
    expect(money(1).isZero()).toBe(false);
    expect(money(-1).isNegative()).toBe(true);
    expect(money(0).isNegative()).toBe(false);
    expect(money(1).isNegative()).toBe(false);
  });
});

describe("Money serialization", () => {
  it("serializes to its centavos", () => {
    expect(money(150).toJSON()).toBe(150);
    expect(JSON.stringify({ price: money(2500) })).toBe('{"price":2500}');
  });
});
