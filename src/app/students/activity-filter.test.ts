import { describe, expect, it } from "vitest";
import { parseActivityFilter } from "./activity-filter";

describe("parseActivityFilter", () => {
  it("shows the active students unless asked otherwise", () => {
    expect(parseActivityFilter(new URLSearchParams())).toEqual({
      activity: "active",
      param: "activas",
    });
  });

  it("reads the inactive and all views", () => {
    expect(
      parseActivityFilter(new URLSearchParams("mostrar=inactivas")),
    ).toEqual({ activity: "inactive", param: "inactivas" });
    expect(parseActivityFilter(new URLSearchParams("mostrar=todas"))).toEqual({
      activity: "all",
      param: "todas",
    });
  });

  it("drops an unknown value instead of failing", () => {
    expect(parseActivityFilter(new URLSearchParams("mostrar=x"))).toEqual({
      activity: "active",
      param: "activas",
    });
  });
});
