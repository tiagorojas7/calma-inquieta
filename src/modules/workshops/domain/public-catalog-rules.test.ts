import { describe, expect, it } from "vitest";
import {
  compareIntensivos,
  isPublicSlug,
  isUpcoming,
} from "./public-catalog-rules";

describe("isPublicSlug", () => {
  it.each(["ceramica", "ceramica-inicial", "a1-b2"])("accepts %s", (slug) => {
    expect(isPublicSlug(slug, 80)).toBe(true);
  });

  it.each(["Ceramica", "..", "a%20b", "", "a--b", "-a", "a-", "a/b"])(
    "rejects %j",
    (slug) => {
      expect(isPublicSlug(slug, 80)).toBe(false);
    },
  );

  it("accepts exactly the maximum length and rejects one more", () => {
    expect(isPublicSlug("a".repeat(80), 80)).toBe(true);
    expect(isPublicSlug("a".repeat(81), 80)).toBe(false);
  });
});

describe("isUpcoming", () => {
  it("hides yesterday and keeps today and tomorrow (DA5)", () => {
    expect(isUpcoming("2026-11-13", "2026-11-14")).toBe(false);
    expect(isUpcoming("2026-11-14", "2026-11-14")).toBe(true);
    expect(isUpcoming("2026-11-15", "2026-11-14")).toBe(true);
  });
});

describe("compareIntensivos", () => {
  const base = {
    eventDate: "2026-11-14",
    startsAt: "10:00",
    name: "Torno",
    slug: "torno",
  };
  const sorted = (items: (typeof base)[]) =>
    [...items].sort(compareIntensivos).map((item) => item.slug);

  it("orders by date first", () => {
    expect(
      sorted([
        { ...base, slug: "c", eventDate: "2026-11-20" },
        { ...base, slug: "a", eventDate: "2026-11-05" },
        { ...base, slug: "b", eventDate: "2026-11-12" },
      ]),
    ).toEqual(["a", "b", "c"]);
  });

  it("breaks a date tie by start time", () => {
    expect(
      sorted([
        { ...base, slug: "late", startsAt: "15:00" },
        { ...base, slug: "early", startsAt: "10:00" },
      ]),
    ).toEqual(["early", "late"]);
  });

  it("breaks a time tie by name, ignoring case and accents", () => {
    expect(
      sorted([
        { ...base, slug: "z", name: "Óleo" },
        { ...base, slug: "y", name: "acuarela" },
        { ...base, slug: "x", name: "Barro" },
      ]),
    ).toEqual(["y", "x", "z"]);
  });

  it("breaks a name tie by slug so the order is total (DA7)", () => {
    expect(
      sorted([
        { ...base, slug: "b", name: "Torno" },
        { ...base, slug: "a", name: "torno" },
      ]),
    ).toEqual(["a", "b"]);
  });
});
