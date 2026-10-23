import { describe, expect, it } from "vitest";
import {
  parseIntensiveDraft,
  parseIntensiveFilter,
  parseIntensiveFilterKey,
} from "./intensive-form-data";

function form(entries: readonly [string, string][]) {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
}

describe("intensive form data", () => {
  it("parses every draft field untouched, including every uploaded gallery entry", () => {
    expect(
      parseIntensiveDraft(
        form([
          ["name", " Cerámica de sábado "],
          ["slug", ""],
          ["summary", "Un resumen"],
          ["description", "Un detalle"],
          ["teacherId", "t1"],
          ["percentage", "35,5"],
          ["eventDate", "2026-10-10"],
          ["startsAt", "10:00"],
          ["endsAt", "13:00"],
          ["price", "30000"],
          ["deposit", "10000"],
          ["capacity", "12"],
          ["minSeats", "4"],
          ["policyText", "Traé delantal."],
          ["materialsIncluded", "on"],
          ["galleryAssetId", "img-1"],
          ["gallerySrc", "/imagenes/img-1.webp"],
          ["galleryAlt", "Una taza"],
          ["galleryAssetId", "img-2"],
          ["gallerySrc", "/imagenes/img-2.webp"],
          ["galleryAlt", "Una mesa"],
        ]),
      ),
    ).toEqual({
      name: " Cerámica de sábado ",
      slug: "",
      summary: "Un resumen",
      description: "Un detalle",
      teacherId: "t1",
      percentage: "35,5",
      eventDate: "2026-10-10",
      startsAt: "10:00",
      endsAt: "13:00",
      price: "30000",
      deposit: "10000",
      capacity: "12",
      minSeats: "4",
      policyText: "Traé delantal.",
      materialsIncluded: true,
      images: [
        {
          assetId: "img-1",
          src: "/imagenes/img-1.webp",
          alt: "Una taza",
        },
        {
          assetId: "img-2",
          src: "/imagenes/img-2.webp",
          alt: "Una mesa",
        },
      ],
    });
  });

  it("defaults missing fields and gallery to empty values", () => {
    expect(parseIntensiveDraft(form([]))).toMatchObject({
      name: "",
      teacherId: "",
      materialsIncluded: false,
      images: [],
    });
  });

  it("defaults to live records and maps each explicit status", () => {
    expect(parseIntensiveFilterKey(null)).toBe("vigentes");
    expect(parseIntensiveFilter("unexpected")).toBe("live");
    expect(parseIntensiveFilter("borradores")).toBe("draft");
    expect(parseIntensiveFilter("publicados")).toBe("published");
    expect(parseIntensiveFilter("pausados")).toBe("paused");
    expect(parseIntensiveFilter("cancelados")).toBe("cancelled");
    expect(parseIntensiveFilter("archivados")).toBe("archived");
  });
});
