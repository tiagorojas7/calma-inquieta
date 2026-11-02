import { describe, expect, it } from "vitest";
import { parsePercent } from "./material-percent";

describe("parsePercent", () => {
  it.each([
    ["10", 10],
    [" 7,5 ", 7.5],
    ["12.25%", 12.25],
    ["200", 200],
  ])("reads %j as %s", (text, value) => {
    expect(parsePercent(text)).toBe(value);
  });

  it.each(["", "0", "0,0", "-5", "abc", "1,2,3", "200,01", "10.123", "1e3"])(
    "rejects %j",
    (text) => {
      expect(parsePercent(text)).toBeNull();
    },
  );
});
