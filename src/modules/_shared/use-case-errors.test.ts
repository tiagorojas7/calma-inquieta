import { describe, expect, it } from "vitest";
import { parseWholePesos } from "./use-case-errors";

describe("parseWholePesos", () => {
  it("parses whole peso text into Money", () => {
    const result = parseWholePesos("1250");
    expect(result.ok && result.value.toCentavos()).toBe(125000);
  });

  it.each([
    ["", "required"],
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
