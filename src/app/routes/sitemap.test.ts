import { describe, expect, it } from "vitest";
import { createTestServices } from "~/testing/fakes/app-services";
import { createLoaderArgs } from "~/testing/react-router";
import { loader } from "./sitemap";

describe("sitemap resource route", () => {
  it("returns the current indexable pages and excludes coming-soon paths", async () => {
    const response = loader(
      createLoaderArgs(createTestServices(), "/sitemap.xml") as never,
    );
    expect(response.headers.get("Content-Type")).toBe(
      "application/xml; charset=utf-8",
    );
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=3600");
    const body = await response.text();
    expect(body).toContain("<urlset");
    expect(body).not.toContain("/talleres");
    expect(body).not.toContain("/intensivos");
    expect(body).not.toContain("/eventos-privados");
  });
});
