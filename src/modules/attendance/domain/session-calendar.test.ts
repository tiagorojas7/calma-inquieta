import { describe, expect, it } from "vitest";
import {
  isIsoDate,
  isSessionDate,
  sessionDates,
  weekdayOf,
} from "./session-calendar";

describe("weekdayOf", () => {
  it("numbers days ISO style, Monday 1 to Sunday 7", () => {
    expect(weekdayOf("2026-10-05")).toBe(1);
    expect(weekdayOf("2026-10-11")).toBe(7);
  });
});

describe("isIsoDate", () => {
  it("accepts real calendar dates only", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-2-3")).toBe(false);
    expect(isIsoDate("hoy")).toBe(false);
  });
});

describe("sessionDates", () => {
  it("lists every date of that weekday inside the month", () => {
    expect(sessionDates("2026-10", 1)).toEqual([
      "2026-10-05",
      "2026-10-12",
      "2026-10-19",
      "2026-10-26",
    ]);
  });

  it("finds a fifth occurrence when the month has one", () => {
    expect(sessionDates("2026-10", 4)).toEqual([
      "2026-10-01",
      "2026-10-08",
      "2026-10-15",
      "2026-10-22",
      "2026-10-29",
    ]);
  });

  it("handles a leap February and the year boundary", () => {
    expect(sessionDates("2028-02", 2)).toEqual([
      "2028-02-01",
      "2028-02-08",
      "2028-02-15",
      "2028-02-22",
      "2028-02-29",
    ]);
    expect(sessionDates("2026-12", 4).at(-1)).toBe("2026-12-31");
  });

  it("returns nothing for a malformed period", () => {
    expect(sessionDates("2026-13", 1)).toEqual([]);
  });
});

describe("isSessionDate", () => {
  it("is true only for a date of that weekday in that month", () => {
    expect(isSessionDate("2026-10", 1, "2026-10-12")).toBe(true);
    expect(isSessionDate("2026-10", 1, "2026-10-13")).toBe(false);
    expect(isSessionDate("2026-10", 1, "2026-11-02")).toBe(false);
  });
});
