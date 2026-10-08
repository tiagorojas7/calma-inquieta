import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { STAND_IN_ASSETS } from "~/modules/site-content/infrastructure/content/stand-in-assets";

const fontsDirectory = join(process.cwd(), "public/fonts");

describe("font stand-in registry", () => {
  it("keeps registered font files and filesystem fonts in sync", async () => {
    const manifest = STAND_IN_ASSETS.filter(
      (asset) => asset.kind === "font",
    );
    const files = (await readdir(fontsDirectory)).filter((file) =>
      file.endsWith(".woff2"),
    );
    expect(files.toSorted()).toEqual(
      manifest.map((asset) => asset.path.replace(/^\//, "")).map((path) => path.split("/").pop()).toSorted(),
    );
    expect(manifest.map((asset) => asset.path).toSorted()).toEqual(
      files.map((file) => `/fonts/${file}`).toSorted(),
    );
  });
});
