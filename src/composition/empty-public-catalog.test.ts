import { describe, expect, it } from "vitest";
import {
  EMPTY_MEDIA_LOOKUP,
  EMPTY_PUBLIC_INTENSIVOS,
  EMPTY_PUBLIC_TALLERES,
} from "./empty-public-catalog";

describe.each([
  ["EMPTY_PUBLIC_TALLERES", EMPTY_PUBLIC_TALLERES],
  ["EMPTY_PUBLIC_INTENSIVOS", EMPTY_PUBLIC_INTENSIVOS],
])("%s", (_name, reader) => {
  it("lists nothing, finds nothing and enumerates no slug", async () => {
    expect(await reader.list()).toEqual([]);
    expect(await reader.list({ limit: 3 })).toEqual([]);
    expect(await reader.findBySlug("x")).toBeNull();
    expect(await reader.listSlugs()).toEqual([]);
  });

  it("exposes only the three read methods", () => {
    expect(Object.keys(reader).sort()).toEqual([
      "findBySlug",
      "list",
      "listSlugs",
    ]);
  });
});

describe("EMPTY_MEDIA_LOOKUP", () => {
  it("resolves to an empty map whatever the ids", async () => {
    const found = await EMPTY_MEDIA_LOOKUP.findAssets(["a", "b"]);

    expect(found).toBeInstanceOf(Map);
    expect(found.size).toBe(0);
    expect((await EMPTY_MEDIA_LOOKUP.findAssets([])).size).toBe(0);
  });
});
