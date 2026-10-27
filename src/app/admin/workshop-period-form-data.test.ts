import { describe, expect, it } from "vitest";
import { buildWorkshopPeriod } from "~/testing/fakes/admin-builders";
import {
  isExactPeriodValue,
  parseOpenMonthIntent,
  parsePeriodDraft,
  parsePeriodDetailIntent,
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

  it("accepts only detail lifecycle intents and sends submitted material selections", () => {
    const period = buildWorkshopPeriod({
      turnos: [{ turnoId: "t1", capacity: 8 } as never],
      materials: [{ id: "m1", name: "Clay", active: false, available: false }],
    });
    const submitted = form({
      intent: "save",
      fee: " 42000 ",
      materialsRequired: "on",
      projectTitle: " Cups ",
      projectDescription: " Glaze ",
      "capacity-t1": " 9 ",
      snapshotPercentage: " 35 ",
      materialIds: "m2",
    });
    submitted.append("materialIds", "m3");
    expect(parsePeriodDetailIntent(submitted)).toBe("save");
    expect(parsePeriodDraft(submitted, period)).toEqual({
      fee: "42000",
      materialsRequired: true,
      projectTitle: "Cups",
      projectDescription: "Glaze",
      projectImages: [],
      capacities: [{ turnoId: "t1", capacity: "9" }],
      snapshotPercentage: "35",
      materialIds: ["m2", "m3"],
    });
    expect(parsePeriodDetailIntent(form({ intent: "publish" }))).toBe(
      "publish",
    );
    expect(parsePeriodDetailIntent(form({ intent: "close" }))).toBe("close");
    expect(parsePeriodDetailIntent(form({ intent: "delete" }))).toBe("delete");
    expect(parsePeriodDetailIntent(form({}))).toBeNull();
    expect(parsePeriodDetailIntent(form({ intent: "open-month" }))).toBeNull();
  });
});
