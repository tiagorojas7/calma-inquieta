import { describe, expect, it } from "vitest";
import { err, ok, type Result } from "./result";

describe("Result", () => {
  it("narrows a success to its value", () => {
    const result: Result<number, string> = ok(5);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(5);
    } else {
      expect.unreachable("a success must not narrow to the failure branch");
    }
  });

  it("narrows a failure to its error", () => {
    const result: Result<number, string> = err("boom");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("boom");
    } else {
      expect.unreachable("a failure must not narrow to the success branch");
    }
  });

  it("keeps the value and the error out of the opposite branch", () => {
    const success = ok("kept");
    const failure = err({ kind: "nope" });

    expect(success).toEqual({ ok: true, value: "kept" });
    expect(failure).toEqual({ ok: false, error: { kind: "nope" } });
    expect("error" in success).toBe(false);
    expect("value" in failure).toBe(false);
  });
});
