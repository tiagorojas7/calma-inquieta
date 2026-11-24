import { describe, expect, it } from "vitest";
import { openableMonth } from "./next-month";

const published = "published";
const period = (
  month: string,
  status: "draft" | "open" | "closed" = "open",
) => ({
  period: month,
  status,
});

describe("openableMonth", () => {
  it("offers the suggested month to a published taller with no months", () => {
    expect(
      openableMonth({
        workshopStatus: published,
        periods: [],
        suggestedNext: "2026-11",
      }),
    ).toEqual({ period: "2026-11", label: "noviembre" });
  });

  it("offers nothing while the latest month is still a draft", () => {
    expect(
      openableMonth({
        workshopStatus: published,
        periods: [period("2026-11"), period("2026-12", "draft")],
        suggestedNext: "2027-01",
      }),
    ).toBeNull();
  });

  it("offers the month after the latest one once it is published", () => {
    expect(
      openableMonth({
        workshopStatus: published,
        periods: [period("2026-11")],
        suggestedNext: "2026-12",
      }),
    ).toEqual({ period: "2026-12", label: "diciembre" });
    expect(
      openableMonth({
        workshopStatus: published,
        periods: [period("2026-11"), period("2026-12")],
        suggestedNext: "2027-01",
      }),
    ).toEqual({ period: "2027-01", label: "enero" });
  });

  it("offers the month after a closed latest month", () => {
    expect(
      openableMonth({
        workshopStatus: published,
        periods: [period("2026-11", "closed")],
        suggestedNext: "2026-12",
      }),
    ).toEqual({ period: "2026-12", label: "diciembre" });
  });

  it("follows the latest month across a gap, never the hole before it", () => {
    expect(
      openableMonth({
        workshopStatus: published,
        periods: [period("2026-11"), period("2027-01")],
        suggestedNext: "2027-02",
      }),
    ).toEqual({ period: "2027-02", label: "febrero" });
  });

  it("offers nothing when the suggested month already exists", () => {
    expect(
      openableMonth({
        workshopStatus: published,
        periods: [period("2026-12")],
        suggestedNext: "2026-12",
      }),
    ).toBeNull();
  });

  it("offers nothing when no month can be suggested", () => {
    expect(
      openableMonth({
        workshopStatus: published,
        periods: [period("2026-11")],
        suggestedNext: null,
      }),
    ).toBeNull();
  });

  it("offers nothing for a taller that is not published", () => {
    for (const status of ["draft", "paused", "archived"])
      expect(
        openableMonth({
          workshopStatus: status,
          periods: [],
          suggestedNext: "2026-11",
        }),
      ).toBeNull();
  });
});
