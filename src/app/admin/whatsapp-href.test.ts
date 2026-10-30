import { describe, expect, it } from "vitest";
import { whatsappHref } from "./whatsapp-href";

describe("whatsappHref", () => {
  it("builds the wa.me link from stored digits", () => {
    expect(whatsappHref("5493515550001")).toMatch(
      /^https:\/\/wa\.me\/5493515550001/,
    );
  });

  it("returns undefined for an empty or invalid phone", () => {
    expect(whatsappHref("")).toBeUndefined();
    expect(whatsappHref("abc")).toBeUndefined();
  });
});
