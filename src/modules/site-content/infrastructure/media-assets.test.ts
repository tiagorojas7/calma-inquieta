import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { findCopyViolations } from "../domain/copy-rules";
import {
  DEFAULT_SHARE_IMAGE,
  mentionsExcludedSource,
  validateMediaRegistry,
  type ExcludedSource,
  type MediaArea,
  type MediaAsset,
  type MediaRegistry,
} from "../domain/media";
import { imageSize } from "~/testing/media/image-size";
import { MEDIA_ASSETS } from "./content/media-assets";
import { artDirected, imageRef, type ImageAssetId } from "./content/media-refs";
import { EXCLUDED_SOURCES, MEDIA_RIGHTS } from "./content/media-rights";
import { STAND_IN_ASSETS } from "./content/stand-in-assets";

const MEDIA_DIR = "public/media";
const STAND_IN_FOLDER = "/media/stand-ins/";
const RECIPE = "tooling/media/recipes/design-adjustments.json";
const HEADERS = "public/_headers";
const FAVICON = "/favicon.ico";
const IMAGE_BUDGET = 500 * 1024;
const VIDEO_BUDGET = 1_572_864;
const TOTAL_BUDGET = 8 * 1024 * 1024;
const GRANTED_ON = "2026-10-16";
const FILE_NAME = /^(.+)-(\d+)\.([0-9a-f]{8})\.(webp|jpg|png|mp4|webm)$/;

const assets: readonly MediaAsset[] = MEDIA_ASSETS;
const registry: MediaRegistry = {
  assets,
  rights: MEDIA_RIGHTS,
  excluded: EXCLUDED_SOURCES,
};

/** Every file below a directory, as a web path from the `public` root. */
function webPaths(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory()
      ? webPaths(path)
      : [`/${path.replaceAll("\\", "/").replace(/^public\//, "")}`];
  });
}

const allMediaFiles = webPaths(MEDIA_DIR);
const curatedFiles = [
  ...allMediaFiles.filter((path) => !path.startsWith(STAND_IN_FOLDER)),
  ...(existsSync(`public${FAVICON}`) ? [FAVICON] : []),
];
const registryPaths = assets.flatMap((asset) =>
  asset.kind === "image"
    ? asset.variants.map(({ path }) => path)
    : asset.sources.map(({ path }) => path),
);
const imageVariants = assets.flatMap((asset) =>
  asset.kind === "image"
    ? asset.variants.map((variant) => ({ asset, variant }))
    : [],
);
const bytesOf = (webPath: string) => readFileSync(`public${webPath}`);

const recipeSources = (): string[] => {
  const recipe = JSON.parse(readFileSync(RECIPE, "utf8")) as
    { source: string }[] | { jobs: { source: string }[] };
  const jobs = Array.isArray(recipe) ? recipe : recipe.jobs;
  return jobs.map(({ source }) => source);
};

/** The names of a file listing and of the recipe sources that mention an excluded source. */
function excludedMentions(
  listing: {
    readonly files: readonly string[];
    readonly recipeSources: readonly string[];
  },
  excluded: readonly ExcludedSource[],
): string[] {
  return [...listing.files, ...listing.recipeSources].filter((name) =>
    mentionsExcludedSource(name, excluded),
  );
}

interface HeaderRule {
  readonly pattern: string;
  readonly headers: readonly string[];
}

function headerRules(text: string): HeaderRule[] {
  const rules: { pattern: string; headers: string[] }[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === "") {
      continue;
    }
    if (/^\s/.test(line)) {
      rules.at(-1)?.headers.push(line.trim());
    } else {
      rules.push({ pattern: line.trim(), headers: [] });
    }
  }
  return rules;
}

describe("the curated media files and the registry, both ways", () => {
  it("every file under public/media outside stand-ins, plus /favicon.ico, has exactly one registry variant or video source", () => {
    expect(curatedFiles.length).toBeGreaterThan(0);
    for (const file of curatedFiles) {
      expect(
        registryPaths.filter((path) => path === file),
        `${file} must have exactly one registry variant or source`,
      ).toHaveLength(1);
    }
  });

  it("every registry variant and source has its file", () => {
    for (const asset of assets) {
      const paths =
        asset.kind === "image"
          ? asset.variants.map(({ path }) => path)
          : asset.sources.map(({ path }) => path);
      for (const path of paths) {
        expect(
          curatedFiles.includes(path),
          `${asset.id} has no file ${path}`,
        ).toBe(true);
      }
    }
  });

  it("file names follow <id>-<width>.<hash8>.<ext> and hash8 equals the SHA-256 prefix of the bytes", () => {
    for (const file of curatedFiles.filter((path) => path !== FAVICON)) {
      const match = FILE_NAME.exec(file.split("/").at(-1) ?? "");
      expect(
        match,
        `${file} does not follow the naming convention`,
      ).not.toBeNull();
      const hash = createHash("sha256")
        .update(bytesOf(file))
        .digest("hex")
        .slice(0, 8);
      expect(match?.[3], `${file} hash differs from its bytes (${hash})`).toBe(
        hash,
      );
    }
  });

  it("declared width and height equal the decoded size", () => {
    expect(imageVariants.length).toBeGreaterThan(0);
    for (const { asset, variant } of imageVariants) {
      if (asset.format === "ico") {
        continue;
      }
      expect(
        imageSize(`public${variant.path}`),
        `${variant.path} declares a different size than the file`,
      ).toEqual({ width: variant.width, height: variant.height });
    }
  });

  it("each image file is at most 500 KB and all curated files at most 8 MB (each video at most 1.5 MB)", () => {
    let total = 0;
    for (const file of curatedFiles) {
      const size = statSync(`public${file}`).size;
      total += size;
      const budget = /\.(mp4|webm)$/.test(file) ? VIDEO_BUDGET : IMAGE_BUDGET;
      expect(size, `${file} is ${String(size)} bytes`).toBeLessThanOrEqual(
        budget,
      );
    }
    expect(total).toBeLessThanOrEqual(TOTAL_BUDGET);
  });

  it("validateMediaRegistry on the shipped registry is empty", () => {
    expect(validateMediaRegistry(registry)).toEqual([]);
  });

  it("the share-default asset path equals DEFAULT_SHARE_IMAGE.path", () => {
    const share = assets.filter(({ id }) => id === "share-default");

    expect(share).toHaveLength(1);
    expect(share[0]).toMatchObject({
      kind: "image",
      area: "share",
      format: "jpeg",
      variants: [
        {
          width: DEFAULT_SHARE_IMAGE.width,
          height: DEFAULT_SHARE_IMAGE.height,
          path: DEFAULT_SHARE_IMAGE.path,
        },
      ],
    });
  });
});

describe("the exclusions", () => {
  it("no file name under public/media (stand-ins included) and no recipe source mentions an excluded source", () => {
    expect(allMediaFiles.length).toBeGreaterThan(0);
    expect(
      excludedMentions(
        { files: allMediaFiles, recipeSources: recipeSources() },
        EXCLUDED_SOURCES,
      ),
    ).toEqual([]);
  });

  it("the exclusion check fails on a listing that holds an excluded source name", () => {
    const leaked = "img-20260808-130700502-hdr-portrait-480.0a1b2c3d.webp";

    expect(
      excludedMentions(
        {
          files: [...allMediaFiles, `/media/home/${leaked}`],
          recipeSources: ["IMG_20260926_153632786_HDR.jpg"],
        },
        EXCLUDED_SOURCES,
      ),
    ).toEqual([`/media/home/${leaked}`, "IMG_20260926_153632786_HDR.jpg"]);
  });

  it("the three exclusions live only in EXCLUDED_SOURCES, never as ledger rows", () => {
    expect(EXCLUDED_SOURCES).toEqual([
      {
        sourceId: "img-20260808-130700502-hdr-portrait",
        reason: "not-the-owner",
        decidedOn: GRANTED_ON,
      },
      {
        sourceId: "img-20260926-153632786-hdr",
        reason: "minor",
        decidedOn: GRANTED_ON,
      },
      {
        sourceId: "VID_20260717_155248707",
        reason: "minor",
        decidedOn: GRANTED_ON,
      },
    ]);
    for (const { sourceId } of EXCLUDED_SOURCES) {
      expect(
        MEDIA_RIGHTS.some((row) => row.sourceId === sourceId),
        `${sourceId} is a ledger row`,
      ).toBe(false);
      expect(
        assets.some((asset) => asset.sourceId === sourceId),
        `${sourceId} is an asset source`,
      ).toBe(false);
    }
    expect(
      MEDIA_RIGHTS.filter(({ sourceId }) =>
        mentionsExcludedSource(sourceId, EXCLUDED_SOURCES),
      ),
    ).toEqual([]);
  });
});

describe("the rights ledger", () => {
  const row = (sourceId: string) =>
    MEDIA_RIGHTS.find((entry) => entry.sourceId === sourceId);

  it("the ledger records the four OD-6 face sources as granted with a consent source dated 2026-10-16", () => {
    for (const sourceId of [
      "img-20261015-wa0030",
      "img-20261015-wa0018",
      "img-20260926-144641667-hdr",
      "img-20260801-182047855-hdr",
    ]) {
      expect(row(sourceId), sourceId).toEqual({
        sourceId,
        people: "faces",
        consent: "granted",
        consentSource: {
          by: "Studio owner, relayed by the project owner",
          recordedOn: GRANTED_ON,
        },
      });
    }
  });

  it("the hands-only sources are hands and not-required", () => {
    for (const sourceId of [
      "img-20261007-194043183-hdr",
      "img-20260411-wa0106",
      "img-20261015-wa0029",
      "img-20260325-wa0013",
      "img-20260411-wa0110",
      "img-20260306-wa0071",
    ]) {
      expect(row(sourceId), sourceId).toEqual({
        sourceId,
        people: "hands",
        consent: "not-required",
      });
    }
  });

  it("every placed asset source has exactly one ledger row", () => {
    for (const asset of assets) {
      expect(row(asset.sourceId), asset.id).toBeDefined();
    }
    const ids = MEDIA_RIGHTS.map(({ sourceId }) => sourceId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("no registered asset id is in the stand-in manifest", () => {
    const standInIds = new Set<string>(STAND_IN_ASSETS.map(({ id }) => id));

    for (const asset of assets) {
      expect(standInIds.has(asset.id), asset.id).toBe(false);
    }
  });

  it("every alt passes findCopyViolations", () => {
    const alts = assets.flatMap((asset) =>
      asset.kind === "image" ? [asset.alt] : [],
    );

    expect(alts.length).toBeGreaterThan(0);
    expect(findCopyViolations(alts)).toEqual([]);
  });
});

describe("public/_headers", () => {
  const rules = headerRules(readFileSync(HEADERS, "utf8"));
  const cache = (pattern: string) =>
    rules.find((rule) => rule.pattern === pattern)?.headers;
  const AREAS: readonly MediaArea[] = [
    "home",
    "about",
    "contact",
    "share",
    "brand",
    "video",
  ];

  it("has non-overlapping rules, immutable for every curated area folder and one day for fonts and stand-ins", () => {
    const prefixes = rules.map(({ pattern }) => pattern.replace(/\*$/, ""));

    expect(new Set(prefixes).size).toBe(prefixes.length);
    for (const [index, prefix] of prefixes.entries()) {
      for (const other of prefixes.slice(index + 1)) {
        expect(
          prefix.startsWith(other) || other.startsWith(prefix),
          `${prefix} overlaps ${other}`,
        ).toBe(false);
      }
    }
    for (const area of AREAS) {
      expect(cache(`/media/${area}/*`), area).toEqual([
        "Cache-Control: public, max-age=31536000, immutable",
      ]);
    }
    for (const pattern of ["/fonts/*", "/media/stand-ins/*"]) {
      expect(cache(pattern), pattern).toEqual([
        "Cache-Control: public, max-age=86400",
      ]);
    }
  });
});

describe("the media refs", () => {
  it("builds an image reference with its srcSet, preferring the widest variant at or below 960", () => {
    expect(imageRef("home-hero-mobile")).toEqual({
      src: "/media/home/home-hero-mobile-720.58b52aa5.webp",
      alt: MEDIA_ASSETS[0].alt,
      width: 720,
      height: 900,
      srcSet:
        "/media/home/home-hero-mobile-480.13e77fb5.webp 480w, /media/home/home-hero-mobile-720.58b52aa5.webp 720w, /media/home/home-hero-mobile-1080.a90a6d0e.webp 1080w",
    });
  });

  it("honors a preferred width", () => {
    expect(imageRef("home-hero-desktop", 1600).width).toBe(1600);
    expect(imageRef("home-hero-desktop", 480).width).toBe(480);
  });

  it("throws for an id that is not a registered image", () => {
    expect(() => imageRef("nope" as ImageAssetId)).toThrow(
      '"nope" is not a registered image asset',
    );
  });

  it("pairs the phone and desktop crops of one slot", () => {
    expect(artDirected("home-hero-mobile", "home-hero-desktop")).toEqual({
      mobile: imageRef("home-hero-mobile"),
      desktop: imageRef("home-hero-desktop"),
    });
  });
});
