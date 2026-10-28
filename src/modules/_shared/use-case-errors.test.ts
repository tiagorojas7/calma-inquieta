import { describe, expect, it } from "vitest";
import { parseWholePesos } from "./use-case-errors";

describe("parseWholePesos", () => {
  it("parses whole peso text into Money", () => {
    const result = parseWholePesos("1250");
    expect(result.ok && result.value.toCentavos()).toBe(125000);
  });

  it.each([
    ["12.500", 1250000],
    ["$ 12.500", 1250000],
    ["$12500", 1250000],
    ["  1.250.000  ", 125000000],
    ["12500", 1250000],
  ] as const)("accepts the es-AR written price %s", (text, centavos) => {
    const result = parseWholePesos(text);
    expect(result.ok && result.value.toCentavos()).toBe(centavos);
  });

  it.each([
    ["", "required"],
    ["$", "invalid-format"],
    ["12.5", "invalid-format"],
    ["1.25.000", "invalid-format"],
    ["12.5000", "invalid-format"],
    [".500", "invalid-format"],
    ["12.50", "invalid-format"],
    ["12,50", "invalid-format"],
    ["-1", "invalid-format"],
    ["abc", "invalid-format"],
    ["90071992547410", "out-of-range"],
  ] as const)("rejects %s with %s", (text, error) => {
    expect(parseWholePesos(text)).toEqual({ ok: false, error });
  });

  it("preserves the safe Money centavo boundary", () => {
    const result = parseWholePesos("90071992547409");
    expect(result.ok && result.value.toCentavos()).toBe(9007199254740900);
    expect(parseWholePesos("90071992547410").ok).toBe(false);
  });
});

describe("use-case errors", () => {
  it("exposes generic failure shapes", async () => {
    const errors = await import("./use-case-errors");
    expect(errors.denied).toEqual({ kind: "denied" });
    expect(errors.unavailable).toEqual({ kind: "unavailable" });
  });
});
