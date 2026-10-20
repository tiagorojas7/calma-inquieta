import { describe, expect, it } from "vitest";
import { buildRawSiteContent } from "~/testing/fakes/in-memory-site-content-source";
import {
  approvedTrustClaims,
  isPublishedPath,
  listUnapproved,
  publishableTestimonials,
  publishedImages,
  summarizeLaunchGate,
  validateSiteContent,
} from "./content-rules";
import {
  DEFAULT_SHARE_IMAGE,
  type ImageAsset,
  type MediaRegistry,
  type RightsEntry,
  type VideoAsset,
} from "./media";
import type { StandInAsset } from "./stand-in";
import type {
  AmbientLoop,
  GalleryImage,
  ImageRef,
  RawSiteContent,
  Testimonial,
  TrustClaim,
} from "./page-content";

const image = (src: string, alt = "Una imagen"): ImageRef => ({
  src,
  alt,
  width: 100,
  height: 100,
});

/** A minimal content set that satisfies every rule; tests change one thing at a time. */
const validContent = () => buildRawSiteContent();

describe("publishableTestimonials", () => {
  const consented: Testimonial = {
    id: "t-1",
    quote: "Hermosa experiencia",
    author: "Ana",
    consent: { written: true, recordedOn: "2026-10-01" },
  };
  const withoutConsent: Testimonial = {
    id: "t-2",
    quote: "Otra",
    author: "Bea",
  };

  it("keeps only the entries with recorded written consent", () => {
    expect(publishableTestimonials([consented, withoutConsent])).toEqual([
      consented,
    ]);
  });

  it("drops an entry whose consent has no recording date", () => {
    const undated = {
      ...consented,
      id: "t-3",
      consent: { written: true, recordedOn: "" },
    } as Testimonial;

    expect(publishableTestimonials([undated, consented])).toEqual([consented]);
    expect(publishableTestimonials([withoutConsent])).toEqual([]);
  });
});

describe("approvedTrustClaims", () => {
  const claim = (id: string, approved: boolean): TrustClaim => ({
    id,
    approved,
    label: id,
    icon: "leaf",
    appliesTo: "all",
  });

  it("keeps only approved claims", () => {
    const approved = claim("a", true);

    expect(approvedTrustClaims([approved, claim("b", false)])).toEqual([
      approved,
    ]);
    expect(approvedTrustClaims([claim("c", false)])).toEqual([]);
  });
});

describe("validateSiteContent", () => {
  it("returns no issue for valid content", () => {
    expect(validateSiteContent(validContent())).toEqual([]);
  });

  it("flags a gallery image with an empty alt, naming its id", () => {
    const content = validContent();
    const broken: GalleryImage = {
      id: "gallery-1",
      ...image("/media/stand-ins/gallery-01.jpg", "  "),
    };

    const issues = validateSiteContent({
      ...content,
      about: { ...content.about, gallery: [broken] },
    });

    expect(issues).toEqual([{ id: "gallery-1", rule: "alt-missing" }]);
  });

  it("flags an about intro image that is not a registered path", () => {
    const content = validContent();
    const stray = image("/media/about/not-registered-480.0a1b2c3d.webp");

    const issues = validateSiteContent({
      ...content,
      about: { ...content.about, introImages: [stray] },
    });

    expect(issues).toEqual([{ id: stray.src, rule: "unregistered-media" }]);
  });

  it("flags an about intro image with an empty alt, naming its path", () => {
    const content = validContent();
    const blank = image("/media/stand-ins/gallery-01.jpg", " ");

    const issues = validateSiteContent({
      ...content,
      about: { ...content.about, introImages: [blank] },
    });

    expect(issues).toEqual([{ id: blank.src, rule: "alt-missing" }]);
  });

  it("flags a brand logo whose path is not registered", () => {
    const content = validContent();
    const missing = image("/media/brand/missing-56.00000000.webp", "");

    expect(
      validateSiteContent({
        ...content,
        brand: { ...content.brand, logo: missing },
      }),
    ).toEqual([{ id: missing.src, rule: "unregistered-media" }]);
  });

  it("accepts an empty alt on the brand logos, which sit beside the visible wordmark", () => {
    const content = validContent();

    expect(content.brand.logo.alt).toBe("");
    expect(content.brand.logoLight.alt).toBe("");
    expect(validateSiteContent(content)).toEqual([]);
  });

  it("flags a pull-quote id that repeats another content id", () => {
    const content = validContent();

    const issues = validateSiteContent({
      ...content,
      about: {
        ...content.about,
        pullQuote: { ...content.about.pullQuote, id: "history-1" },
      },
    });

    expect(issues).toEqual([{ id: "history-1", rule: "duplicate-id" }]);
  });

  it("accepts an empty alt on a decorative gallery image", () => {
    const content = validContent();
    const decorative: GalleryImage = {
      id: "gallery-1",
      ...image("/media/stand-ins/gallery-01.jpg", ""),
      decorative: true,
    };

    expect(
      validateSiteContent({
        ...content,
        about: { ...content.about, gallery: [decorative] },
      }),
    ).toEqual([]);
  });

  it("flags a hero image without alt, naming its path", () => {
    const content = validContent();

    const issues = validateSiteContent({
      ...content,
      home: {
        ...content.home,
        hero: {
          ...content.home.hero,
          backdrop: image("/media/stand-ins/hero-1.jpg", ""),
        },
      },
    });

    expect(issues).toEqual([
      { id: "/media/stand-ins/hero-1.jpg", rule: "alt-missing" },
    ]);
  });

  it("flags a materials claim that is not scoped to intensivos", () => {
    const content = validContent();
    const claim = (appliesTo: TrustClaim["appliesTo"]): TrustClaim => ({
      id: "materials",
      approved: true,
      label: "Talleres con Materiales Incluidos",
      icon: "hands",
      appliesTo,
    });

    const wrong = validateSiteContent({
      ...content,
      home: { ...content.home, trustClaims: [claim("all")] },
    });
    const right = validateSiteContent({
      ...content,
      home: { ...content.home, trustClaims: [claim("intensivos")] },
    });

    expect(wrong).toEqual([{ id: "materials", rule: "claim-scope" }]);
    expect(right).toEqual([]);
  });

  it("flags a video id that is not an 11 character YouTube id", () => {
    const content = validContent();
    const video = (youtubeId: string) => ({
      id: "video-1",
      youtubeId,
      title: "Video",
      poster: image("/media/stand-ins/gallery-01.jpg"),
    });

    const bad = validateSiteContent({
      ...content,
      about: { ...content.about, videos: [video("short")] },
    });
    const good = validateSiteContent({
      ...content,
      about: { ...content.about, videos: [video("dQw4w9WgXcQ")] },
    });

    expect(bad).toEqual([{ id: "video-1", rule: "video-id" }]);
    expect(good).toEqual([]);
  });

  it("flags an empty SEO title or description, naming the page", () => {
    const content = validContent();

    const issues = validateSiteContent({
      ...content,
      contact: { ...content.contact, seo: { title: "", description: "ok" } },
      about: { ...content.about, seo: { title: "ok", description: " " } },
    });

    expect(issues).toEqual([
      { id: "about", rule: "empty-seo" },
      { id: "contact", rule: "empty-seo" },
    ]);
  });

  it("flags a coming-soon page with empty SEO copy", () => {
    const content = validContent();

    const issues = validateSiteContent({
      ...content,
      comingSoon: {
        ...content.comingSoon,
        intensivos: {
          ...content.comingSoon.intensivos,
          seo: { title: "", description: "" },
        },
      },
    });

    expect(issues).toEqual([
      { id: "coming-soon/intensivos", rule: "empty-seo" },
    ]);
  });

  it("flags an id used twice across the content", () => {
    const content = validContent();

    const issues = validateSiteContent({
      ...content,
      about: {
        ...content.about,
        faq: [{ id: "history-1", approved: true, question: "q", answer: "a" }],
      },
    });

    expect(issues).toEqual([{ id: "history-1", rule: "duplicate-id" }]);
  });

  it("flags an image path missing from the stand-in manifest", () => {
    const content = validContent();

    const issues = validateSiteContent({
      ...content,
      standIns: content.standIns.filter((asset) => asset.id !== "about-teaser"),
    });

    expect(issues).toEqual([
      {
        id: "/media/stand-ins/about-teaser.svg",
        rule: "unregistered-stand-in",
      },
    ]);
  });

  it("flags empty SEO copy on a catalog page, naming the page", () => {
    const content = validContent();

    const issues = validateSiteContent({
      ...content,
      catalog: {
        ...content.catalog,
        talleres: {
          ...content.catalog.talleres,
          seo: { title: "", description: "ok" },
        },
        intensivos: {
          ...content.catalog.intensivos,
          seo: { title: "ok", description: " " },
        },
      },
    });

    expect(issues).toEqual([
      { id: "catalog/talleres", rule: "empty-seo" },
      { id: "catalog/intensivos", rule: "empty-seo" },
    ]);
  });

  it("flags a catalog fallback image missing from the stand-in manifest", () => {
    const content = validContent();

    const issues = validateSiteContent({
      ...content,
      catalog: {
        ...content.catalog,
        fallbackImage: image("/media/stand-ins/missing.svg", ""),
      },
    });

    expect(issues).toEqual([
      { id: "/media/stand-ins/missing.svg", rule: "unregistered-stand-in" },
    ]);
  });

  it("accepts the decorative empty alt on the catalog fallback image", () => {
    expect(validContent().catalog.fallbackImage.alt).toBe("");
    expect(validateSiteContent(validContent())).toEqual([]);
  });

  it("flags a catalog intro id that repeats another content id", () => {
    const content = validContent();

    const issues = validateSiteContent({
      ...content,
      catalog: {
        ...content.catalog,
        talleres: {
          ...content.catalog.talleres,
          intro: { ...content.catalog.talleres.intro, id: "teaser-body" },
        },
      },
    });

    expect(issues).toEqual([{ id: "teaser-body", rule: "duplicate-id" }]);
  });
});

describe("listUnapproved", () => {
  it("lists every unapproved item with its area", () => {
    const content = validContent();
    const unapproved: RawSiteContent = {
      ...content,
      home: {
        ...content.home,
        trustClaims: [
          {
            id: "claim-no-experience",
            approved: false,
            label: "No necesitás experiencia",
            icon: "hands",
            appliesTo: "all",
          },
        ],
        teaser: {
          ...content.home.teaser,
          body: { ...content.home.teaser.body, approved: false },
        },
      },
      about: {
        ...content.about,
        history: [{ id: "history-1", approved: false, text: "h" }],
        valueProposition: {
          id: "value-proposition",
          approved: false,
          text: "v",
        },
        pullQuote: { id: "pull-quote", approved: false, text: "p" },
        values: [{ id: "value-1", approved: false, title: "t", text: "t" }],
        faq: [{ id: "faq-1", approved: false, question: "q", answer: "a" }],
      },
    };

    expect(listUnapproved(unapproved)).toEqual([
      { id: "claim-no-experience", area: "home:trust-claims" },
      { id: "teaser-body", area: "home:teaser" },
      { id: "history-1", area: "about:history" },
      { id: "value-proposition", area: "about:value-proposition" },
      { id: "pull-quote", area: "about:pull-quote" },
      { id: "value-1", area: "about:values" },
      { id: "faq-1", area: "about:faq" },
    ]);
  });

  it("lists the unapproved catalog intros under their own area", () => {
    const content = validContent();
    const draft: RawSiteContent = {
      ...content,
      catalog: {
        ...content.catalog,
        talleres: {
          ...content.catalog.talleres,
          intro: { ...content.catalog.talleres.intro, approved: false },
        },
        intensivos: {
          ...content.catalog.intensivos,
          intro: { ...content.catalog.intensivos.intro, approved: false },
        },
      },
    };

    expect(listUnapproved(draft)).toEqual([
      { id: content.catalog.talleres.intro.id, area: "catalog:intros" },
      { id: content.catalog.intensivos.intro.id, area: "catalog:intros" },
    ]);
  });

  it("lists nothing when everything is approved", () => {
    expect(listUnapproved(validContent())).toEqual([]);
  });
});

const mediaPath = (id: string, width = 480) =>
  `/media/home/${id}-${String(width)}.0a1b2c3d.webp`;

const imageAsset = (id: string): ImageAsset => ({
  kind: "image",
  id,
  sourceId: `${id}-source`,
  area: "home",
  alt: "Manos modelando arcilla",
  format: "webp",
  variants: [
    { width: 480, height: 600, path: mediaPath(id) },
    { width: 960, height: 1200, path: mediaPath(id, 960) },
  ],
});

const noPeople = ({ sourceId }: ImageAsset): RightsEntry => ({
  sourceId,
  people: "none",
  consent: "not-required",
});

const facesPending = ({ sourceId }: ImageAsset): RightsEntry => ({
  sourceId,
  people: "faces",
  consent: "pending",
});

const facesGranted = ({ sourceId }: ImageAsset): RightsEntry => ({
  sourceId,
  people: "faces",
  consent: "granted",
  consentSource: { by: "Studio owner", recordedOn: "2026-10-16" },
});

/** Adds to the registry the content already carries (its valid share image included). */
const withMedia = (
  content: RawSiteContent,
  media: Partial<MediaRegistry>,
): RawSiteContent => ({
  ...content,
  media: {
    assets: [...content.media.assets, ...(media.assets ?? [])],
    rights: [...content.media.rights, ...(media.rights ?? [])],
    excluded: [...content.media.excluded, ...(media.excluded ?? [])],
  },
});

/** Replaces the hero backdrop (phones) and the collage lead; the other collage photos stay valid. */
const withHero = (
  content: RawSiteContent,
  backdrop: ImageRef,
  lead: ImageRef = content.home.hero.collage[0] ?? backdrop,
): RawSiteContent => ({
  ...content,
  home: {
    ...content.home,
    hero: {
      ...content.home.hero,
      backdrop,
      collage: [lead, ...content.home.hero.collage.slice(1)],
    },
  },
});

describe("validateSiteContent media gate", () => {
  it("a content path with an excluded token yields excluded-source before unregistered-media", () => {
    const path =
      "/media/home/img-20260808-130700502-hdr-portrait-480.0a1b2c3d.webp";
    const content = withMedia(withHero(validContent(), image(path)), {
      excluded: [
        {
          sourceId: "IMG_20260808_130700502_HDR_portrait",
          reason: "not-the-owner",
          decidedOn: "2026-10-16",
        },
      ],
    });

    expect(validateSiteContent(content)).toEqual([
      { id: path, rule: "excluded-source" },
    ]);
  });

  it("a pending asset referenced by the hero yields unpublishable-media", () => {
    const asset = imageAsset("hero-pending");
    const content = withMedia(
      withHero(validContent(), image(mediaPath("hero-pending"))),
      { assets: [asset], rights: [facesPending(asset)] },
    );

    expect(validateSiteContent(content)).toEqual([
      { id: mediaPath("hero-pending"), rule: "unpublishable-media" },
    ]);
  });

  it("an asset without a ledger row yields rights-missing", () => {
    const asset = imageAsset("hero-unrecorded");
    const content = withMedia(
      withHero(validContent(), image(mediaPath("hero-unrecorded"))),
      { assets: [asset] },
    );

    expect(validateSiteContent(content)).toEqual([
      { id: mediaPath("hero-unrecorded"), rule: "rights-missing" },
    ]);
  });

  it("an unregistered /media/home path yields unregistered-media", () => {
    const content = withMedia(
      withHero(validContent(), image(mediaPath("hero-unknown"))),
      {},
    );

    expect(validateSiteContent(content)).toEqual([
      { id: mediaPath("hero-unknown"), rule: "unregistered-media" },
    ]);
  });

  it("srcSet paths are checked like src", () => {
    const asset = imageAsset("hero-a");
    const unknown = mediaPath("hero-unknown", 960);
    const content = withMedia(
      withHero(validContent(), {
        ...image(mediaPath("hero-a")),
        srcSet: `${mediaPath("hero-a")} 480w, ${unknown} 960w`,
      }),
      { assets: [asset], rights: [noPeople(asset)] },
    );

    expect(validateSiteContent(content)).toEqual([
      { id: unknown, rule: "unregistered-media" },
    ]);
  });

  it("the collage lead goes through the same path check as the backdrop", () => {
    const pending = imageAsset("hero-pending");
    const unknown = mediaPath("hero-unknown");
    const content = withMedia(
      withHero(
        validContent(),
        image(mediaPath("hero-pending")),
        image(unknown),
      ),
      { assets: [pending], rights: [facesPending(pending)] },
    );

    expect(validateSiteContent(content)).toEqual([
      { id: mediaPath("hero-pending"), rule: "unpublishable-media" },
      { id: unknown, rule: "unregistered-media" },
    ]);
  });

  it("flags a collage lead without alt, naming its path", () => {
    const content = withHero(
      validContent(),
      image("/media/stand-ins/hero-1.jpg"),
      image("/media/stand-ins/hero-1.jpg", " "),
    );

    expect(validateSiteContent(content)).toEqual([
      { id: "/media/stand-ins/hero-1.jpg", rule: "alt-missing" },
    ]);
  });

  it("checks the srcSet paths of the collage lead like src", () => {
    const asset = imageAsset("hero-a");
    const unknown = mediaPath("hero-unknown", 960);
    const content = withMedia(
      withHero(validContent(), image(mediaPath("hero-a")), {
        ...image(mediaPath("hero-a")),
        srcSet: `${mediaPath("hero-a")} 480w, ${unknown} 960w`,
      }),
      { assets: [asset], rights: [noPeople(asset)] },
    );

    expect(validateSiteContent(content)).toEqual([
      { id: unknown, rule: "unregistered-media" },
    ]);
  });

  it.each([1, 2])(
    "every collage photo goes through the path and alt gate (index %i)",
    (index) => {
      const content = validContent();
      const unknown = mediaPath("collage-unknown");
      const collage = content.home.hero.collage.map((photo, at) =>
        at === index ? image(unknown, " ") : photo,
      );

      expect(
        validateSiteContent({
          ...content,
          home: { ...content.home, hero: { ...content.home.hero, collage } },
        }),
      ).toEqual([
        { id: unknown, rule: "alt-missing" },
        { id: unknown, rule: "unregistered-media" },
      ]);
    },
  );

  it("the teaser accent image goes through the path and alt gate", () => {
    const content = validContent();
    const unknown = mediaPath("teaser-unknown");

    expect(
      validateSiteContent({
        ...content,
        home: {
          ...content.home,
          teaser: { ...content.home.teaser, accentImage: image(unknown, "") },
        },
      }),
    ).toEqual([
      { id: unknown, rule: "alt-missing" },
      { id: unknown, rule: "unregistered-media" },
    ]);
  });

  it("registry issues reach validateSiteContent", () => {
    const content = withMedia(validContent(), {
      assets: [
        {
          ...imageAsset("about-blank"),
          area: "about",
          alt: " ",
          variants: [
            { width: 480, height: 600, path: "/media/about/wrong.webp" },
          ],
        },
      ],
      rights: [
        {
          sourceId: "VID_20260717_155248707",
          people: "faces",
          consent: "granted",
          consentSource: { by: "Studio owner", recordedOn: "2026-10-16" },
        },
      ],
      excluded: [
        {
          sourceId: "VID_20260717_155248707",
          reason: "minor",
          decidedOn: "2026-10-16",
        },
      ],
    });

    expect(validateSiteContent(content)).toEqual([
      { id: "about-blank", rule: "alt-missing" },
      {
        id: "about-blank",
        rule: "media-path",
        path: "/media/about/wrong.webp",
      },
      {
        id: "VID_20260717_155248707",
        rule: "excluded-source",
        sourceId: "VID_20260717_155248707",
      },
    ]);
  });

  it("duplicate asset ids yield duplicate-id", () => {
    const content = withMedia(validContent(), {
      assets: [imageAsset("hero-a"), imageAsset("hero-a")],
    });

    expect(validateSiteContent(content)).toEqual([
      { id: "hero-a", rule: "duplicate-id" },
    ]);
  });
});

describe("isPublishedPath", () => {
  it("is true for a registered stand-in and a publishable media path and false otherwise", () => {
    const published = imageAsset("hero-a");
    const pending = imageAsset("hero-pending");
    const content = withMedia(validContent(), {
      assets: [published, pending],
      rights: [noPeople(published), facesPending(pending)],
    });

    expect(isPublishedPath("/media/stand-ins/hero-1.jpg", content)).toBe(true);
    expect(isPublishedPath(mediaPath("hero-a", 960), content)).toBe(true);
    expect(isPublishedPath(mediaPath("hero-pending"), content)).toBe(false);
    expect(isPublishedPath(mediaPath("hero-unknown"), content)).toBe(false);
    expect(isPublishedPath("/media/stand-ins/unknown.jpg", content)).toBe(
      false,
    );
  });
});

describe("publishedImages", () => {
  it("returns [] when nothing is publishable", () => {
    const pending = imageAsset("gallery-pending");
    const content = withMedia(validContent(), {
      assets: [pending],
      rights: [facesPending(pending)],
    });

    expect(
      publishedImages(
        [image(mediaPath("gallery-pending")), image(mediaPath("unknown"))],
        content,
      ),
    ).toEqual([]);
  });

  it("keeps granted face photos and drops pending ones, srcSet included", () => {
    const granted = imageAsset("gallery-granted");
    const pending = imageAsset("gallery-pending");
    const kept: GalleryImage = {
      id: "gallery-1",
      ...image(mediaPath("gallery-granted")),
      srcSet: `${mediaPath("gallery-granted")} 480w, ${mediaPath("gallery-granted", 960)} 960w`,
    };
    const content = withMedia(validContent(), {
      assets: [granted, pending],
      rights: [facesGranted(granted), facesPending(pending)],
    });

    expect(
      publishedImages(
        [
          kept,
          { id: "gallery-2", ...image(mediaPath("gallery-pending")) },
          {
            id: "gallery-3",
            ...image(mediaPath("gallery-granted")),
            srcSet: `${mediaPath("gallery-pending", 960)} 960w`,
          },
        ],
        content,
      ),
    ).toEqual([kept]);
  });
});

describe("validateSiteContent share image", () => {
  const shareAsset = (overrides: Partial<ImageAsset> = {}): ImageAsset => ({
    kind: "image",
    id: "share-default",
    sourceId: "share-source",
    area: "share",
    alt: "Una pieza tejida",
    format: "jpeg",
    variants: [
      {
        width: DEFAULT_SHARE_IMAGE.width,
        height: DEFAULT_SHARE_IMAGE.height,
        path: DEFAULT_SHARE_IMAGE.path,
      },
    ],
    ...overrides,
  });

  /** Content whose registry holds exactly these share assets, each with a none and not-required row. */
  const withShare = (
    assets: readonly ImageAsset[],
    media: Partial<MediaRegistry> = {},
  ): RawSiteContent => {
    const base = validContent();
    // The default hero loop stays registered; only the share assets vary.
    const loopAssets = base.media.assets.filter(({ area }) => area === "video");
    return {
      ...base,
      media: {
        assets: [...assets, ...loopAssets],
        rights: [
          ...assets.map(noPeople),
          ...base.media.rights.filter(
            ({ sourceId }) => sourceId === "test-loop-source",
          ),
        ],
        excluded: [],
        ...media,
      },
    };
  };

  const issue = { id: "share", rule: "share-image-missing" };

  it.each([
    ["no share asset", () => withShare([])],
    [
      "two share assets",
      () =>
        withShare([
          shareAsset(),
          shareAsset({
            id: "share-other",
            sourceId: "share-source-2",
            variants: [
              {
                width: 1200,
                height: 630,
                path: "/media/share/share-other-1200.0a1b2c3d.jpg",
              },
            ],
          }),
        ]),
    ],
    [
      "a pending share asset",
      () => withShare([shareAsset()], { rights: [facesPending(shareAsset())] }),
    ],
    [
      "an excluded source",
      () =>
        withShare([shareAsset()], {
          excluded: [
            {
              sourceId: "share-source",
              reason: "minor",
              decidedOn: "2026-10-16",
            },
          ],
        }),
    ],
    ["a WebP share asset", () => withShare([shareAsset({ format: "webp" })])],
    [
      "a 1200x628 variant",
      () =>
        withShare([
          shareAsset({
            variants: [
              { width: 1200, height: 628, path: DEFAULT_SHARE_IMAGE.path },
            ],
          }),
        ]),
    ],
    [
      "a path different from DEFAULT_SHARE_IMAGE",
      () =>
        withShare([
          shareAsset({
            variants: [
              {
                width: 1200,
                height: 630,
                path: "/media/share/share-default-1200.0a1b2c3d.jpg",
              },
            ],
          }),
        ]),
    ],
    [
      "a second variant",
      () =>
        withShare([
          shareAsset({
            variants: [
              {
                width: 600,
                height: 315,
                path: "/media/share/share-default-600.0a1b2c3d.jpg",
              },
              { width: 1200, height: 630, path: DEFAULT_SHARE_IMAGE.path },
            ],
          }),
        ]),
    ],
  ])("is reported for %s", (_name, build) => {
    expect(validateSiteContent(build())).toContainEqual(issue);
  });

  it("is not reported for exactly one publishable 1200 by 630 JPEG at DEFAULT_SHARE_IMAGE.path", () => {
    const issues = validateSiteContent(withShare([shareAsset()]));

    expect(issues).not.toContainEqual(issue);
    expect(issues).toEqual([]);
  });

  it("is not reported for the default content", () => {
    expect(validateSiteContent(validContent())).not.toContainEqual(issue);
  });
});

describe("summarizeLaunchGate", () => {
  const standIn = (id: string, kind: StandInAsset["kind"]): StandInAsset => ({
    id,
    path: `/stand-ins/${id}`,
    kind,
    source: "test",
    licence: "test",
    replaceWith: "test",
  });

  it("splits image stand-ins from font stand-ins and lists unpublished media ids", () => {
    const published = imageAsset("hero-a");
    const pending = imageAsset("gallery-pending");
    const unrecorded = imageAsset("gallery-unrecorded");
    const standIns = [
      standIn("gallery-01", "image"),
      standIn("favicon", "favicon"),
      standIn("share-stand-in", "share-image"),
      standIn("font-a", "font"),
      standIn("font-b", "font"),
    ];

    const gate = summarizeLaunchGate(standIns, {
      assets: [published, pending, unrecorded],
      rights: [noPeople(published), facesPending(pending)],
      excluded: [],
    });

    expect(gate.imageStandIns.map(({ id }) => id)).toEqual([
      "gallery-01",
      "favicon",
      "share-stand-in",
    ]);
    expect(gate.fontStandIns.map(({ id }) => id)).toEqual(["font-a", "font-b"]);
    expect(gate.unpublishedMedia).toEqual([
      "gallery-pending",
      "gallery-unrecorded",
    ]);
  });

  it("reports nothing when there are no stand-ins and every asset is publishable", () => {
    const published = imageAsset("hero-a");

    expect(
      summarizeLaunchGate([], {
        assets: [published],
        rights: [noPeople(published)],
        excluded: [],
      }),
    ).toEqual({ imageStandIns: [], fontStandIns: [], unpublishedMedia: [] });
  });
});

describe("validateSiteContent ambient loop", () => {
  const posterPath = (width: number) =>
    `/media/video/home-loop-poster-${String(width)}.0a1b2c3d.webp`;
  const webmPath = "/media/video/home-loop-720.0a1b2c3d.webm";
  const mp4Path = "/media/video/home-loop-720.0a1b2c3d.mp4";
  const poster: ImageAsset = {
    kind: "image",
    id: "home-loop-poster",
    sourceId: "loop-source",
    area: "video",
    alt: "",
    decorative: true,
    format: "webp",
    variants: [
      { width: 480, height: 600, path: posterPath(480) },
      { width: 720, height: 900, path: posterPath(720) },
    ],
  };
  const video: VideoAsset = {
    kind: "video",
    id: "home-loop",
    sourceId: "loop-source",
    area: "video",
    width: 720,
    height: 900,
    durationSeconds: 6,
    audio: false,
    sources: [
      { path: webmPath, type: "video/webm" },
      { path: mp4Path, type: "video/mp4" },
    ],
    posterId: "home-loop-poster",
  };
  const loop: AmbientLoop = {
    poster: {
      src: posterPath(720),
      srcSet: `${posterPath(480)} 480w, ${posterPath(720)} 720w`,
      alt: "",
      width: 720,
      height: 900,
    },
    sources: [
      { src: webmPath, type: "video/webm" },
      { src: mp4Path, type: "video/mp4" },
    ],
    width: 720,
    height: 900,
  };
  const withLoop = (
    registry: Partial<MediaRegistry>,
    ambient: AmbientLoop = loop,
  ): RawSiteContent => {
    // Start without the fixture's own loop assets so ids stay unique.
    const fixture = validContent();
    const bare: RawSiteContent = {
      ...fixture,
      media: {
        ...fixture.media,
        assets: fixture.media.assets.filter(({ area }) => area !== "video"),
        rights: fixture.media.rights.filter(
          ({ sourceId }) => sourceId !== "test-loop-source",
        ),
      },
    };
    const base = withMedia(bare, registry);
    return {
      ...base,
      home: { ...base.home, hero: { ...base.home.hero, loop: ambient } },
    };
  };
  const row = (
    people: RightsEntry["people"],
    consent: RightsEntry["consent"],
  ): RightsEntry => ({ sourceId: "loop-source", people, consent });

  it("loop poster and sources are walked like image paths", () => {
    const published = withLoop({
      assets: [poster, video],
      rights: [row("none", "not-required")],
    });
    expect(validateSiteContent(published)).toEqual([]);

    expect(validateSiteContent(withLoop({}))).toEqual([
      { id: posterPath(720), rule: "unregistered-media" },
      { id: posterPath(480), rule: "unregistered-media" },
      { id: posterPath(720), rule: "unregistered-media" },
      { id: webmPath, rule: "unregistered-media" },
      { id: mp4Path, rule: "unregistered-media" },
    ]);

    expect(
      validateSiteContent(
        withLoop({
          assets: [poster, video],
          rights: [row("faces", "pending")],
        }),
      ),
    ).toEqual([
      { id: posterPath(720), rule: "unpublishable-media" },
      { id: posterPath(480), rule: "unpublishable-media" },
      { id: posterPath(720), rule: "unpublishable-media" },
      { id: webmPath, rule: "unpublishable-media" },
      { id: mp4Path, rule: "unpublishable-media" },
    ]);

    expect(
      validateSiteContent(withLoop({ assets: [poster, video], rights: [] })),
    ).toEqual([
      { id: posterPath(720), rule: "rights-missing" },
      { id: posterPath(480), rule: "rights-missing" },
      { id: posterPath(720), rule: "rights-missing" },
      { id: webmPath, rule: "rights-missing" },
      { id: mp4Path, rule: "rights-missing" },
    ]);
  });

  it("a loop whose source mentions an excluded source yields excluded-source", () => {
    const leaked = "/media/video/vid-20260717-155248707-720.0a1b2c3d.mp4";
    const issues = validateSiteContent(
      withLoop(
        {
          assets: [poster, video],
          rights: [row("none", "not-required")],
          excluded: [
            {
              sourceId: "VID_20260717_155248707",
              reason: "minor",
              decidedOn: "2026-10-16",
            },
          ],
        },
        {
          ...loop,
          sources: [...loop.sources, { src: leaked, type: "video/mp4" }],
        },
      ),
    );

    expect(issues).toContainEqual({ id: leaked, rule: "excluded-source" });
  });

  it("content without a loop reports nothing for it", () => {
    expect(validateSiteContent(validContent())).toEqual([]);
  });
});
