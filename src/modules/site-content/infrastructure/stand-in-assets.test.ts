import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { STAND_IN_ASSETS } from "./content/stand-in-assets";

const STAND_IN_DIR = "public/media/stand-ins";
const MEDIA_PREFIX = "/media/stand-ins/";
const PROFILE_PICTURE = "docs/brand/instagram/ig-profile-picture.jpg";

const mediaRows = STAND_IN_ASSETS.filter((asset) => asset.kind !== "font");
const fontRows = STAND_IN_ASSETS.filter((asset) => asset.kind === "font");
const files = readdirSync(STAND_IN_DIR);

/** Width and height of a PNG, read from its IHDR chunk. */
function pngSize(path: string) {
  const bytes = readFileSync(path);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

/** Width and height of a baseline or progressive JPEG, read from its SOF marker. */
function jpegSize(path: string) {
  const bytes = readFileSync(path);
  let offset = 2;
  while (offset < bytes.length) {
    const marker = bytes.readUInt8(offset + 1);
    const length = bytes.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      return {
        height: bytes.readUInt16BE(offset + 5),
        width: bytes.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  return expect.unreachable("no SOF marker in the JPEG");
}

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
    expect(mediaRows).toHaveLength(12);
  });

  it("shape-checks the four font rows, whose files arrive with the tokens", () => {
    expect(fontRows.map((asset) => asset.path)).toEqual([
      "/fonts/cormorant-garamond-latin-400-normal.woff2",
      "/fonts/cormorant-garamond-latin-400-italic.woff2",
      "/fonts/montserrat-latin-400-normal.woff2",
      "/fonts/montserrat-latin-600-normal.woff2",
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
  const derived = STAND_IN_ASSETS.filter(
    (asset) => asset.kind === "favicon" || asset.kind === "share-image",
  );

  it("registers one favicon and one share image", () => {
    expect(derived.map((asset) => asset.kind).sort()).toEqual([
      "favicon",
      "share-image",
    ]);
  });

  it("cites the profile picture and notes it is likely the logo mark", () => {
    for (const asset of derived) {
      expect(asset.source).toContain(PROFILE_PICTURE);
      expect(asset.source).toContain("likely the logo mark");
    }
  });

  it("ships a 48 px favicon and a 1200 by 630 share image", () => {
    expect(pngSize(`${STAND_IN_DIR}/favicon.png`)).toEqual({
      width: 48,
      height: 48,
    });
    expect(jpegSize(`${STAND_IN_DIR}/share-default.jpg`)).toEqual({
      width: 1200,
      height: 630,
    });
  });
});

describe("the SVG compositions", () => {
  const svgs = files.filter((file) => file.endsWith(".svg"));

  it("are the ten expected files", () => {
    expect(svgs.sort()).toEqual([
      "about-teaser.svg",
      "gallery-01.svg",
      "gallery-02.svg",
      "gallery-03.svg",
      "gallery-04.svg",
      "gallery-05.svg",
      "gallery-06.svg",
      "hero-1.svg",
      "hero-2.svg",
      "hero-3.svg",
    ]);
  });

  it.each(svgs.map((file) => [file] as const))(
    "%s has no text and no external reference",
    (file) => {
      const svg = readFileSync(`${STAND_IN_DIR}/${file}`, "utf8");

      expect(svg).toContain("<svg");
      expect(svg).not.toMatch(/<text|<image|<script|<foreignObject/i);
      expect(svg).not.toMatch(/href\s*=|@import|url\(\s*["']?https?:/i);
      // The only absolute URL an SVG may carry is its namespace.
      expect(svg.replace("http://www.w3.org/2000/svg", "")).not.toContain(
        "http",
      );
    },
  );
});
