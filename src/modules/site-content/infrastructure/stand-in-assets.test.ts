import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { jpegSize, pngSize } from "~/testing/media/image-size";
import { aboutContent } from "./content/about";
import { catalogContent } from "./content/catalog";
import { homeContent } from "./content/home";
import { STAND_IN_ASSETS } from "./content/stand-in-assets";

const STAND_IN_DIR = "public/media/stand-ins";
const MEDIA_PREFIX = "/media/stand-ins/";
const PROFILE_PICTURE = "docs/brand/instagram/ig-profile-picture.jpg";

const mediaRows = STAND_IN_ASSETS.filter((asset) => asset.kind !== "font");
const fontRows = STAND_IN_ASSETS.filter((asset) => asset.kind === "font");
const files = readdirSync(STAND_IN_DIR);

describe("the stand-in manifest and the files, both ways", () => {
  it("has a media row for every file in the stand-in folder", () => {
    const registered = new Set(
      mediaRows.map((asset) => asset.path.slice(MEDIA_PREFIX.length)),
    );

    for (const file of files) {
      expect(registered.has(file), `${file} has no manifest row`).toBe(true);
    }
    expect(files.length).toBeGreaterThan(0);
  });

  it("has a file for every media row", () => {
    for (const asset of mediaRows) {
      expect(asset.path.startsWith(MEDIA_PREFIX), asset.id).toBe(true);
      expect(
        files.includes(asset.path.slice(MEDIA_PREFIX.length)),
        `${asset.id} has no file`,
      ).toBe(true);
    }
    expect(mediaRows.map((asset) => asset.id)).toEqual([
      "gallery-01",
      "favicon",
    ]);
  });

  it("shape-checks the seven font rows, whose files arrive with the tokens", () => {
    expect(fontRows.map((asset) => asset.path)).toEqual([
      "/fonts/cormorant-garamond-latin-400-normal.woff2",
      "/fonts/cormorant-garamond-latin-400-italic.woff2",
      "/fonts/montserrat-latin-400-normal.woff2",
      "/fonts/montserrat-latin-600-normal.woff2",
      "/fonts/cormorant-garamond-latin-500-normal.woff2",
      "/fonts/cormorant-garamond-latin-600-normal.woff2",
      "/fonts/caveat-latin-600-normal.woff2",
    ]);
    for (const asset of fontRows) {
      expect(asset.path.startsWith("/fonts/"), asset.id).toBe(true);
      expect(asset.kind).toBe("font");
    }
  });

  it("gives every entry an id of its own", () => {
    const ids = STAND_IN_ASSETS.map((asset) => asset.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("every manifest entry", () => {
  it.each(STAND_IN_ASSETS.map((asset) => [asset.id, asset] as const))(
    "%s records its source, licence and replacement",
    (_id, asset) => {
      expect(asset.source.trim()).not.toBe("");
      expect(asset.licence.trim()).not.toBe("");
      expect(asset.replaceWith.trim()).not.toBe("");
    },
  );

  it("never points at the client mockups", () => {
    for (const asset of STAND_IN_ASSETS) {
      expect(`${asset.path} ${asset.source}`).not.toContain(
        "client-proposal/mockups",
      );
    }
  });
});

describe("the profile-picture derived assets", () => {
  const derived = STAND_IN_ASSETS.filter((asset) => asset.kind === "favicon");

  it("registers one favicon and no share image", () => {
    expect(derived.map((asset) => asset.kind)).toEqual(["favicon"]);
  });

  it("cites the profile picture and notes it is likely the logo mark", () => {
    for (const asset of derived) {
      expect(asset.source).toContain(PROFILE_PICTURE);
      expect(asset.source).toContain("likely the logo mark");
    }
  });

  it("ships a 48 px favicon", () => {
    expect(pngSize(`${STAND_IN_DIR}/favicon.png`)).toEqual({
      width: 48,
      height: 48,
    });
  });
});

describe("the studio photos", () => {
  const photoRows = STAND_IN_ASSETS.filter((asset) =>
    /\/(hero-\d|gallery-\d+)\.jpg$/.test(asset.path),
  );
  const contentImages = [...aboutContent.gallery] as readonly {
    src: string;
    alt: string;
    width: number;
    height: number;
  }[];

  it("registers only the catalog fallback photo as a stand-in", () => {
    expect(photoRows.map((asset) => asset.id)).toEqual(["gallery-01"]);
    for (const asset of photoRows) {
      expect(asset.source, asset.id).toContain("docs/brand/instagram/ig-post-");
    }
  });

  it("the content walk no longer finds the hero among the stand-ins", () => {
    const registered = new Set<string>(
      STAND_IN_ASSETS.map((asset) => asset.path),
    );
    const { mobile, desktop } = homeContent.hero.image;

    expect(registered.has(mobile.src)).toBe(false);
    expect(registered.has(desktop.src)).toBe(false);
    expect(contentImages.map((image) => image.src)).not.toContain(mobile.src);
  });

  it("no gallery image is a stand-in any more", () => {
    const registered = new Set<string>(
      STAND_IN_ASSETS.map((asset) => asset.path),
    );

    expect(contentImages.length).toBeGreaterThan(0);
    for (const image of contentImages) {
      expect(registered.has(image.src), image.src).toBe(false);
      expect(image.alt.trim(), image.src).not.toBe("");
    }
  });

  it("declares the real size of the decorative catalog fallback image", () => {
    const image = catalogContent.fallbackImage;
    expect(
      STAND_IN_ASSETS.some((asset) => asset.path === image.src),
      image.src,
    ).toBe(true);
    expect(jpegSize(`public${image.src}`)).toEqual({
      width: image.width,
      height: image.height,
    });
    expect(image.alt).toBe("");
  });
});

describe("the replaced stand-ins", () => {
  const RETIRED = [
    "hero-1",
    "hero-2",
    "hero-3",
    "gallery-02",
    "share-default",
    "about-teaser",
  ] as const;

  it("have no manifest row and no file", () => {
    const rowText = JSON.stringify(STAND_IN_ASSETS);
    const rowIds: readonly string[] = STAND_IN_ASSETS.map((asset) => asset.id);

    for (const id of RETIRED) {
      expect(rowIds.includes(id), `${id} still has a row`).toBe(false);
      expect(
        files.filter((file) => file.startsWith(id)),
        `${id} still has a file`,
      ).toEqual([]);
      expect(rowText, `${id} is still named in a row`).not.toContain(
        `/media/stand-ins/${id}.`,
      );
    }
    expect(files.sort()).toEqual(["favicon.png", "gallery-01.jpg"]);
  });
});
