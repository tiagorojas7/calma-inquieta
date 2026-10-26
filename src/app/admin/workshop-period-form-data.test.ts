import { describe, expect, it } from "vitest";
import {
  isExactPeriodValue,
  parseOpenMonthIntent,
  parsePeriodValue,
} from "./workshop-period-form-data";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("workshop period form data", () => {
  it("accepts only the native open-month intent", () => {
    expect(parseOpenMonthIntent(form({ intent: "open-month" }))).toBe(
      "open-month",
    );
    expect(parseOpenMonthIntent(form({ intent: "save" }))).toBeNull();
  });

  it("preserves the trimmed submitted period for service validation", () => {
    expect(parsePeriodValue(form({ period: " 2026-11 " }))).toBe("2026-11");
    expect(parsePeriodValue(form({}))).toBe("");
  });

  it("recognizes only an exact YYYY-MM month layout", () => {
    expect(isExactPeriodValue("2026-11")).toBe(true);
    expect(isExactPeriodValue("2026-1")).toBe(false);
    expect(isExactPeriodValue("2026/11")).toBe(false);
  });
});
