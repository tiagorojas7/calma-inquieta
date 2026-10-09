import { describe, expect, it } from "vitest";
import { canonicalUrl } from "./canonical";
describe("canonicalUrl", () => {
  it("normalizes paths and full URLs", () => {
    expect(canonicalUrl("https://example.test/", "/quienes-somos?x=1#y")).toBe(
      "https://example.test/quienes-somos",
    );
    expect(canonicalUrl("https://example.test/", "/")).toBe(
      "https://example.test/",
    );
    expect(
      canonicalUrl("https://example.test/", "https://other.test/foo/"),
    ).toBe("https://other.test/foo");
  });
});
