import { err, ok, type Result } from "./result";

export type MoneyError =
  { readonly kind: "not-an-integer" } | { readonly kind: "out-of-range" };

/**
 * An amount of Argentine pesos stored as a safe integer count of centavos.
 * Signed: ledger amounts and refunds may be negative. Immutable.
 */
export class Money {
  readonly #centavos: number;

  private constructor(centavos: number) {
    this.#centavos = centavos === 0 ? 0 : centavos;
  }

  /** Untrusted input: failures are values, never exceptions. */
  static fromCentavos(value: number): Result<Money, MoneyError> {
    if (!Number.isInteger(value)) {
      return err({ kind: "not-an-integer" });
    }
    if (!Number.isSafeInteger(value)) {
      return err({ kind: "out-of-range" });
    }
    return ok(new Money(value));
  }

  static zero(): Money {
    return new Money(0);
  }

  /** Arithmetic that leaves the safe-integer range is a defect, not an expected failure. */
  static #fromArithmetic(value: number): Money {
    if (!Number.isSafeInteger(value)) {
      throw new RangeError("Money arithmetic left the safe integer range");
    }
    return new Money(value);
  }

  toCentavos(): number {
    return this.#centavos;
  }

  add(other: Money): Money {
    return Money.#fromArithmetic(this.#centavos + other.#centavos);
  }

  subtract(other: Money): Money {
    return Money.#fromArithmetic(this.#centavos - other.#centavos);
  }

  multiply(quantity: number): Money {
    if (!Number.isSafeInteger(quantity)) {
      throw new RangeError(
        "Money can only be multiplied by a safe integer quantity",
      );
    }
    return Money.#fromArithmetic(this.#centavos * quantity);
  }

  equals(other: Money): boolean {
    return this.#centavos === other.#centavos;
  }

  compare(other: Money): -1 | 0 | 1 {
    if (this.#centavos < other.#centavos) {
      return -1;
    }
    return this.#centavos > other.#centavos ? 1 : 0;
  }

  isZero(): boolean {
    return this.#centavos === 0;
  }

  isNegative(): boolean {
    return this.#centavos < 0;
  }

  /** Centavos on the wire; es-AR formatting stays at the edge. */
  toJSON(): number {
    return this.#centavos;
  }
}
