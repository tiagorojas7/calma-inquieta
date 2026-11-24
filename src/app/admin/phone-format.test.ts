import { describe, expect, it } from "vitest";
import { formatPhone, telHref } from "./phone-format";

describe("formatPhone", () => {
  it.each([
    ["5493516785675", "351 678-5675"],
    ["5491123456789", "11 2345-6789"],
    ["5493515550101", "351 555-0101"],
  ])("reads the mobile number %s as %s", (digits, shown) => {
    expect(formatPhone(digits)).toBe(shown);
  });

  it("reads a number without the mobile 9 the same way", () => {
    expect(formatPhone("543516785675")).toBe("351 678-5675");
  });

  it.each([
    ["", ""],
    ["12345", "12345"],
    ["5493516785", "5493516785"],
    ["34911223344", "34911223344"],
    ["54935167856751", "54935167856751"],
  ])("falls back to the raw digits for %s", (digits, shown) => {
    expect(formatPhone(digits)).toBe(shown);
  });
});

describe("telHref", () => {
  it("dials the digits with the plus sign", () => {
    expect(telHref("5493516785675")).toBe("tel:+5493516785675");
  });

  it("gives no link for an empty or too short number", () => {
    expect(telHref("")).toBeUndefined();
    expect(telHref("123")).toBeUndefined();
  });
});
