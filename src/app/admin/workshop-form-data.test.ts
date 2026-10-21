import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import {
  formatPercentage,
  formatWholePesos,
  parseWorkshopDraft,
  parseWorkshopFilter,
  parseWorkshopFilterKey,
  parseWorkshopIntent,
} from "./workshop-form-data";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("parseWorkshopDraft", () => {
  it("reads the text fields untouched and leaves validation to the service", () => {
    expect(
      parseWorkshopDraft(
        form({
          name: " Cerámica ",
          slug: "",
          summary: "Resumen",
          description: "Detalle",
          technique: "Torno",
          defaultFee: "12 000",
          teacherId: "t1",
          percentage: "35,5",
        }),
      ),
    ).toEqual({
      name: " Cerámica ",
      slug: "",
      summary: "Resumen",
      description: "Detalle",
      technique: "Torno",
      defaultFee: "12 000",
      teacherId: "t1",
      percentage: "35,5",
      images: [],
      confirmSlugChange: false,
    });
  });

  it("treats missing fields as empty and a ticked confirmation as true", () => {
    const draft = parseWorkshopDraft(form({ confirmSlugChange: "on" }));
    expect(draft.name).toBe("");
    expect(draft.teacherId).toBe("");
    expect(draft.confirmSlugChange).toBe(true);
  });
});

describe("parseWorkshopIntent", () => {
  it("accepts the six intents and nothing else", () => {
    for (const intent of [
      "save",
      "publish",
      "pause",
      "archive",
      "restore",
      "delete",
    ])
      expect(parseWorkshopIntent(form({ intent }))).toBe(intent);
    expect(parseWorkshopIntent(form({ intent: "drop" }))).toBeNull();
    expect(parseWorkshopIntent(form({}))).toBeNull();
  });
});

describe("workshop filter", () => {
  it("defaults to live workshops, which excludes archived", () => {
    expect(parseWorkshopFilterKey(null)).toBe("vigentes");
    expect(parseWorkshopFilterKey("nope")).toBe("vigentes");
    expect(parseWorkshopFilter(null)).toBe("live");
  });

  it("maps each status filter to the service status", () => {
    expect(parseWorkshopFilter("borradores")).toBe("draft");
    expect(parseWorkshopFilter("publicados")).toBe("published");
    expect(parseWorkshopFilter("pausados")).toBe("paused");
    expect(parseWorkshopFilter("archivados")).toBe("archived");
    expect(parseWorkshopFilterKey("archivados")).toBe("archivados");
  });
});

describe("form value formatting", () => {
  it("shows the fee as whole pesos", () => {
    const fee = Money.fromCentavos(1_200_000);
    if (!fee.ok) throw new Error("money");
    expect(formatWholePesos(fee.value)).toBe("12000");
  });

  it("shows basis points with at most two decimals and no float drift", () => {
    expect(formatPercentage(null)).toBe("");
    expect(formatPercentage({ basisPoints: 3550 })).toBe("35,5");
    expect(formatPercentage({ basisPoints: 1015 })).toBe("10,15");
    expect(formatPercentage({ basisPoints: 3000 })).toBe("30");
    expect(formatPercentage({ basisPoints: 0 })).toBe("0");
    expect(formatPercentage({ basisPoints: 10000 })).toBe("100");
  });
});
