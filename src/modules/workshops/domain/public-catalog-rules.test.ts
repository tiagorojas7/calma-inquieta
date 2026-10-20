import { describe, expect, it } from "vitest";
import {
  compareIntensivos,
  compareTalleres,
  compareTurnos,
  isPublicSlug,
  isUpcoming,
  selectOffering,
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

describe("selectOffering", () => {
  const at = (...periods: string[]) => periods.map((period) => ({ period }));
  const pick = (periods: string[], current: string) =>
    selectOffering(at(...periods), current)?.period ?? null;

  it("picks the current month when it is open", () => {
    expect(pick(["2026-11", "2026-10"], "2026-10")).toBe("2026-10");
  });

  it("picks the next open month when the current one is missing", () => {
    expect(pick(["2026-11"], "2026-10")).toBe("2026-11");
  });

  it("picks the earliest of two later months, whatever the input order", () => {
    expect(pick(["2026-12", "2026-11"], "2026-10")).toBe("2026-11");
    expect(pick(["2027-01", "2026-12"], "2026-10")).toBe("2026-12");
  });

  it("ignores a past month", () => {
    expect(pick(["2026-09"], "2026-10")).toBeNull();
  });

  it("gives null for no periods", () => {
    expect(pick([], "2026-10")).toBeNull();
  });
});

describe("compareTurnos", () => {
  const order = (turnos: { weekday: number; startsAt: string; id: string }[]) =>
    turnos.sort(compareTurnos).map((t) => t.id);

  it("orders by weekday, Monday first and Sunday last, then by start time", () => {
    expect(
      order([
        { id: "mie18", weekday: 3, startsAt: "18:00" },
        { id: "dom9", weekday: 7, startsAt: "09:00" },
        { id: "lun18", weekday: 1, startsAt: "18:00" },
        { id: "lun10", weekday: 1, startsAt: "10:00" },
      ]),
    ).toEqual(["lun10", "lun18", "mie18", "dom9"]);
  });
});

describe("compareTalleres", () => {
  const order = (items: { name: string; slug: string }[]) =>
    items.sort(compareTalleres).map((t) => t.slug);

  it("orders by name ignoring case and accents", () => {
    expect(
      order([
        { slug: "p", name: "Pintura" },
        { slug: "c", name: "Cerámica" },
        { slug: "a", name: "acuarela" },
      ]),
    ).toEqual(["a", "c", "p"]);
  });

  it("breaks a name tie by slug", () => {
    expect(
      order([
        { slug: "b", name: "Torno" },
        { slug: "a", name: "torno" },
      ]),
    ).toEqual(["a", "b"]);
  });
});
