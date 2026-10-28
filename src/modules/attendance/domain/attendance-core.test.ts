import { describe, expect, it } from "vitest";
import {
  isAttendanceStatus,
  summarizeAttendance,
  validateMakeUpPlan,
} from "./attendance-core";

describe("isAttendanceStatus", () => {
  it("knows present and absent only", () => {
    expect(isAttendanceStatus("present")).toBe(true);
    expect(isAttendanceStatus("absent")).toBe(true);
    expect(isAttendanceStatus("late")).toBe(false);
  });
});

describe("summarizeAttendance", () => {
  it("counts marks and make-ups by status", () => {
    expect(
      summarizeAttendance(
        [{ status: "present" }, { status: "absent" }, { status: "present" }],
        [{ status: "pending" }, { status: "done" }, { status: "done" }],
      ),
    ).toEqual({ present: 2, absent: 1, makeUpsPending: 1, makeUpsDone: 2 });
  });

  it("is all zeros without history", () => {
    expect(summarizeAttendance([], [])).toEqual({
      present: 0,
      absent: 0,
      makeUpsPending: 0,
      makeUpsDone: 0,
    });
  });
});

describe("validateMakeUpPlan", () => {
  const monday = { weekday: 1 };

  it("accepts a real date on the weekday of the chosen turno", () => {
    expect(validateMakeUpPlan("2026-10-19", monday)).toEqual({
      ok: true,
      value: "2026-10-19",
    });
  });

  it("rejects text that is not a calendar date", () => {
    expect(validateMakeUpPlan("2026-02-30", monday)).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "makeUpDate", code: "invalid-format" }],
      },
    });
  });

  it("rejects a date that is not the weekday of the turno", () => {
    expect(validateMakeUpPlan("2026-10-20", monday)).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "makeUpDate", code: "not-selectable" }],
      },
    });
  });
});
