import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { findCopyViolations } from "../domain/copy-rules";
import {
  DEFAULT_SHARE_IMAGE,
  largestVariant,
  mentionsExcludedSource,
  publishedPaths,
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

describe("the warm-graded home media", () => {
  const imageAsset = (id: string) => {
    const asset = assets.find((candidate) => candidate.id === id);
    if (asset?.kind !== "image") {
      throw new Error(`${id} is not a registered image`);
    }
    return asset;
  };
  const ratio = ({ width, height }: { width: number; height: number }) =>
    width / height;

  it("the mobile hero backdrop is the 9:16 paper-feather lamp crop of 480 and 720 px, from a source with no people", () => {
    const backdrop = imageAsset("home-hero-backdrop");

    expect(backdrop).toMatchObject({
      area: "home",
      format: "webp",
      sourceId: "img-20260718-wa0044",
    });
    expect(backdrop.variants.map(({ width }) => width)).toEqual([480, 720]);
    for (const variant of backdrop.variants) {
      expect(ratio(variant)).toBeCloseTo(9 / 16, 2);
    }
    expect(
      MEDIA_RIGHTS.find(({ sourceId }) => sourceId === backdrop.sourceId),
    ).toEqual({
      sourceId: "img-20260718-wa0044",
      people: "none",
      consent: "not-required",
    });
    expect(mentionsExcludedSource(backdrop.sourceId, EXCLUDED_SOURCES)).toBe(
      false,
    );
    expect(findCopyViolations([backdrop.alt])).toEqual([]);
    expect(backdrop.alt).toMatch(/lámpara/u);
    for (const variant of backdrop.variants) {
      expect(publishedPaths(registry).has(variant.path), variant.path).toBe(
        true,
      );
    }
  });

  it("the curated photos give the desktop collage tall, square and wide ratios", () => {
    const first = (id: string) => ratio(imageAsset(id).variants[0]);

    expect(first("home-hero-desktop")).toBeCloseTo(3 / 4, 2);
    expect(first("home-collage-square")).toBeCloseTo(1, 2);
    expect(first("home-collage-wide")).toBeCloseTo(4 / 3, 2);
    expect(first("home-teaser")).toBeCloseTo(4 / 5, 2);
    expect(first("about-comunidad")).toBeCloseTo(4 / 3, 2);
  });

  it("the share image is never regraded and keeps its pinned path", () => {
    expect(imageAsset("share-default").variants[0].path).toBe(
      DEFAULT_SHARE_IMAGE.path,
    );
  });
});

describe("the band photos", () => {
  const imageAsset = (id: string) => {
    const asset = assets.find((candidate) => candidate.id === id);
    if (asset?.kind !== "image") {
      throw new Error(`${id} is not a registered image`);
    }
    return asset;
  };
  const ratio = ({ width, height }: { width: number; height: number }) =>
    width / height;
  const ledger = (sourceId: string) =>
    MEDIA_RIGHTS.find((entry) => entry.sourceId === sourceId);

  const BANDS = [
    {
      id: "home-band-hands",
      sourceId: "img-20260425-wa0049",
      people: "hands",
      ratio: 4 / 5,
    },
    {
      id: "home-catalog-weaving",
      sourceId: "img-20260411-wa0110",
      people: "hands",
      ratio: 4 / 5,
    },
    {
      id: "home-catalog-looms",
      sourceId: "img-20260420-wa0049",
      people: "none",
      ratio: 3 / 2,
    },
  ] as const;

  it.each(BANDS)(
    "$id is a warm-graded home WebP of ratio $ratio from $sourceId, at 480 and 960 px or less",
    (band) => {
      const asset = imageAsset(band.id);

      expect(asset).toMatchObject({
        area: "home",
        format: "webp",
        sourceId: band.sourceId,
      });
      expect(asset.variants.length).toBeGreaterThanOrEqual(2);
      expect(asset.variants[0]?.width).toBe(480);
      for (const variant of asset.variants) {
        expect(variant.width).toBeLessThanOrEqual(960);
        expect(ratio(variant), variant.path).toBeCloseTo(band.ratio, 2);
        expect(variant.path).toMatch(
          new RegExp(`^/media/home/${band.id}-${String(variant.width)}[.]`),
        );
        expect(publishedPaths(registry).has(variant.path), variant.path).toBe(
          true,
        );
      }
      expect(asset.decorative).toBeUndefined();
      expect(findCopyViolations([asset.alt])).toEqual([]);
      expect(asset.alt.trim().length).toBeGreaterThan(20);
      expect(ledger(band.sourceId)).toEqual({
        sourceId: band.sourceId,
        people: band.people,
        consent: "not-required",
      });
    },
  );

  it("the weaving band is the only asset placed from the hands-only catalog pick", () => {
    expect(
      assets.filter(({ sourceId }) => sourceId === "img-20260411-wa0110"),
    ).toHaveLength(1);
  });
});

describe("the brand logo", () => {
  const CREAM = [249, 246, 241];
  const logo = (id: string) => {
    const asset = assets.find((candidate) => candidate.id === id);
    if (asset?.kind !== "image") {
      throw new Error(`${id} is not a registered image`);
    }
    return asset;
  };

  async function opaqueMeans(path: string) {
    const { data, info } = await sharp(`public${path}`)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let count = 0;
    const sum: [number, number, number] = [0, 0, 0];
    for (let at = 0; at < data.length; at += info.channels) {
      if ((data[at + 3] ?? 0) < 200) continue;
      count += 1;
      for (const channel of [0, 1, 2] as const) {
        sum[channel] += data[at + channel] ?? 0;
      }
    }
    return { count, mean: sum.map((value) => value / Math.max(count, 1)) };
  }

  it.each(["brand-logo", "brand-logo-light"])(
    "%s is a trimmed WebP with alpha in the brand area, sized for a 40 to 56 px navbar at 1x and 2x",
    async (id) => {
      const asset = logo(id);

      expect(asset).toMatchObject({
        area: "brand",
        format: "webp",
        sourceId: "logo-calma-inquieta",
      });
      const heights = asset.variants.map(({ height }) => height);
      expect(Math.min(...heights)).toBeGreaterThanOrEqual(56);
      expect(Math.max(...heights)).toBeGreaterThanOrEqual(112);
      for (const variant of asset.variants) {
        // The artwork is about 930x973 inside the canvas, so a trimmed logo is near square.
        expect(variant.width / variant.height, variant.path).toBeCloseTo(
          930 / 973,
          1,
        );
        expect(publishedPaths(registry).has(variant.path), variant.path).toBe(
          true,
        );
        const metadata = await sharp(`public${variant.path}`).metadata();
        expect(metadata.hasAlpha, variant.path).toBe(true);
      }
      expect(findCopyViolations([asset.alt])).toEqual([]);
      expect(asset.alt.trim()).not.toBe("");
    },
  );

  it("brand-logo keeps the dark ink and brand-logo-light is the cream canvas colour", async () => {
    const dark = await opaqueMeans(largestVariant(logo("brand-logo")).path);
    const light = await opaqueMeans(
      largestVariant(logo("brand-logo-light")).path,
    );

    expect(dark.count).toBeGreaterThan(100);
    expect(Math.max(...dark.mean)).toBeLessThan(90);
    expect(light.count).toBeGreaterThan(100);
    for (const [channel, value] of CREAM.entries()) {
      expect(light.mean[channel], `channel ${String(channel)}`).toBeCloseTo(
        value,
        -1,
      );
    }
  });

  it("the brand artwork is one ledger row: no people, not required", () => {
    expect(
      MEDIA_RIGHTS.filter(({ sourceId }) => sourceId === "logo-calma-inquieta"),
    ).toEqual([
      {
        sourceId: "logo-calma-inquieta",
        people: "none",
        consent: "not-required",
      },
    ]);
  });
});

describe("the recipe and the registry", () => {
  interface Job {
    readonly id: string;
    readonly area: string;
    readonly format: string;
    readonly widths: readonly number[];
  }
  const jobs = (JSON.parse(readFileSync(RECIPE, "utf8")) as readonly Job[]).map(
    (job) => job,
  );
  const images = assets.filter((asset) => asset.kind === "image");

  it("every recipe job is a registered image of the same area and format, with no variant wider than the job asks", () => {
    expect(new Set(jobs.map(({ id }) => id)).size).toBe(jobs.length);
    for (const job of jobs) {
      const asset = images.find(({ id }) => id === job.id);
      expect(asset, `${job.id} is not registered`).toBeDefined();
      expect(asset?.area, job.id).toBe(job.area);
      expect(asset?.format, job.id).toBe(job.format);
      for (const variant of asset?.variants ?? []) {
        expect(variant.width, variant.path).toBeLessThanOrEqual(
          Math.max(...job.widths),
        );
      }
    }
  });

  it("every registered image has a recipe job", () => {
    const ids = new Set(jobs.map(({ id }) => id));
    for (const asset of images) {
      expect(ids.has(asset.id), `${asset.id} has no recipe job`).toBe(true);
    }
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
    const hero = MEDIA_ASSETS[0];
    const [small, medium, large] = hero.variants;

    expect(hero.id).toBe("home-hero-mobile");
    expect(imageRef("home-hero-mobile")).toEqual({
      src: medium.path,
      alt: hero.alt,
      width: 720,
      height: 900,
      srcSet: `${small.path} 480w, ${medium.path} 720w, ${large.path} 1080w`,
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

describe("the ambient loops", () => {
  const VIDEO_DIR = "/media/video/";
  const videoFiles = allMediaFiles.filter(
    (path) => path.startsWith(VIDEO_DIR) && /\.(mp4|webm)$/.test(path),
  );
  const loops = assets.filter((asset) => asset.kind === "video");
  const loop = loops.find(({ id }) => id === "home-loop");

  const ABOUT_LOOPS = [
    {
      id: "about-loop-weaving",
      sourceId: "vid-20261014-185243141",
      people: "hands",
    },
    {
      id: "about-loop-frame",
      sourceId: "vid-20261014-185337211",
      people: "hands",
    },
    {
      id: "about-loop-basket",
      sourceId: "vid-20260922-200038255",
      people: "none",
    },
  ] as const;

  const videoAsset = (id: string) => {
    const asset = loops.find((candidate) => candidate.id === id);
    if (asset?.kind !== "video") {
      throw new Error(`${id} is not a registered video`);
    }
    return asset;
  };
  const filesOf = (id: string, extension: "mp4" | "webm") =>
    videoFiles.filter((path) =>
      new RegExp(
        `^/media/video/${id}-[0-9]+[.][0-9a-f]{8}[.]${extension}$`,
      ).test(path),
    );

  /** Handler types of every `hdlr` box found in the bytes ("vide", "soun"). */
  function handlerTypes(bytes: Buffer): string[] {
    const types: string[] = [];
    let at = bytes.indexOf("hdlr", 0, "latin1");
    while (at !== -1) {
      // box type, then version and flags (4), pre_defined (4), handler_type (4)
      types.push(bytes.subarray(at + 12, at + 16).toString("latin1"));
      at = bytes.indexOf("hdlr", at + 4, "latin1");
    }
    return types;
  }

  const ids = ["home-loop", ...ABOUT_LOOPS.map(({ id }) => id)];

  it("the registry holds the home loop and the three About loops, each with one WebM and one MP4", () => {
    expect(loops.map(({ id }) => id)).toEqual(ids);
    expect(videoFiles).toHaveLength(ids.length * 2);
    for (const id of ids) {
      expect(filesOf(id, "webm"), id).toHaveLength(1);
      expect(filesOf(id, "mp4"), id).toHaveLength(1);
      expect(videoAsset(id).sources, id).toEqual([
        { path: filesOf(id, "webm")[0], type: "video/webm" },
        { path: filesOf(id, "mp4")[0], type: "video/mp4" },
      ]);
    }
  });

  it.each(ids)("%s has no audio track in its MP4 or WebM", (id) => {
    const mp4 = bytesOf(filesOf(id, "mp4")[0] ?? "");
    const webm = bytesOf(filesOf(id, "webm")[0] ?? "");

    expect(handlerTypes(mp4)).toContain("vide");
    expect(handlerTypes(mp4)).not.toContain("soun");
    expect(webm.indexOf("V_VP9", 0, "latin1")).toBeGreaterThan(-1);
    expect(webm.indexOf("A_OPUS", 0, "latin1")).toBe(-1);
    expect(webm.indexOf("A_VORBIS", 0, "latin1")).toBe(-1);
  });

  it("each video file is at most 1,572,864 bytes", () => {
    for (const file of videoFiles) {
      expect(statSync(`public${file}`).size, file).toBeLessThanOrEqual(
        VIDEO_BUDGET,
      );
    }
  });

  it("the home loop is 720x900, at most 6 seconds, without audio", () => {
    expect(loop).toMatchObject({
      kind: "video",
      area: "video",
      width: 720,
      height: 900,
      audio: false,
    });
    expect(
      loop?.kind === "video" ? loop.durationSeconds : 99,
    ).toBeLessThanOrEqual(6);
  });

  it.each(ABOUT_LOOPS)(
    "$id is a 9:16 tile of at most 6 seconds without audio, sized for a 280 to 420 px frame",
    ({ id, sourceId }) => {
      const asset = videoAsset(id);

      expect(asset).toMatchObject({
        area: "video",
        audio: false,
        sourceId,
        posterId: `${id}-poster`,
      });
      expect(asset.width / asset.height).toBeCloseTo(9 / 16, 2);
      expect(asset.width).toBeGreaterThanOrEqual(360);
      expect(asset.width).toBeLessThanOrEqual(540);
      expect(asset.durationSeconds).toBeGreaterThan(3);
      expect(asset.durationSeconds).toBeLessThanOrEqual(6);
      expect(asset.sources.map(({ type }) => type)).toEqual([
        "video/webm",
        "video/mp4",
      ]);
      for (const { path } of asset.sources) {
        expect(path).toMatch(
          new RegExp(
            `^/media/video/${id}-${String(asset.width)}[.][0-9a-f]{8}[.]`,
          ),
        );
      }
    },
  );

  const posterOf = (id: string) => {
    const video = videoAsset(id);
    const poster = assets.find((asset) => asset.id === video.posterId);
    if (poster?.kind !== "image") {
      throw new Error(`${video.posterId} is not a registered image`);
    }
    return poster;
  };

  it.each(["home-loop", ...ABOUT_LOOPS.map(({ id }) => id)])(
    "the poster of %s resolves to a decorative registered image of the video area",
    (id) => {
      const poster = posterOf(id);
      const ratio = id === "home-loop" ? 4 / 5 : 9 / 16;

      expect(poster).toMatchObject({
        area: "video",
        decorative: true,
        format: "webp",
        sourceId: videoAsset(id).sourceId,
      });
      for (const variant of poster.variants) {
        expect(variant.width / variant.height, variant.path).toBeCloseTo(
          ratio,
          2,
        );
        expect(variant.path.startsWith(VIDEO_DIR)).toBe(true);
      }
    },
  );

  it("the loop sources are in the ledger with their people class, not required, and are not excluded", () => {
    const expected = [
      { id: "home-loop", sourceId: "vid-20261014-185300580", people: "hands" },
      ...ABOUT_LOOPS,
    ];
    for (const { id, sourceId, people } of expected) {
      expect(
        MEDIA_RIGHTS.filter((entry) => entry.sourceId === sourceId),
        id,
      ).toEqual([{ sourceId, people, consent: "not-required" }]);
      expect(videoAsset(id).sourceId).toBe(sourceId);
      expect(mentionsExcludedSource(sourceId, EXCLUDED_SOURCES)).toBe(false);
    }
  });

  it("every loop and poster is publishable", () => {
    const published = publishedPaths(registry);
    for (const asset of loops) {
      for (const { path } of asset.sources) {
        expect(published.has(path), path).toBe(true);
      }
    }
    for (const id of ids) {
      for (const { path } of posterOf(id).variants) {
        expect(published.has(path), path).toBe(true);
      }
    }
  });
});
