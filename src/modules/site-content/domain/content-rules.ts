import type {
  AmbientLoop,
  ContentIssue,
  ImageRef,
  RawSiteContent,
  SeoCopy,
  Testimonial,
  TrustClaim,
} from "./page-content";
import type { StandInAsset } from "./stand-in";
import {
  DEFAULT_SHARE_IMAGE,
  isPublishable,
  mentionsExcludedSource,
  srcSetPaths,
  validateMediaRegistry,
  type ImageAsset,
  type MediaAsset,
  type MediaRegistry,
} from "./media";

/** A testimonial is listed only when written consent and its recording date are on file. */
export function publishableTestimonials(
  testimonials: readonly Testimonial[],
): readonly Testimonial[] {
  return testimonials.filter(
    (testimonial) =>
      testimonial.consent?.written === true &&
      testimonial.consent.recordedOn.trim() !== "",
  );
}

export function approvedTrustClaims(
  claims: readonly TrustClaim[],
): readonly TrustClaim[] {
  return claims.filter((claim) => claim.approved);
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const MATERIALS_CLAIM = /materiales incluidos/i;

interface PageSeo {
  readonly id: string;
  readonly seo: SeoCopy;
}

function pageSeo(content: RawSiteContent): readonly PageSeo[] {
  return [
    { id: "home", seo: content.home.seo },
    { id: "about", seo: content.about.seo },
    { id: "contact", seo: content.contact.seo },
    ...Object.entries(content.comingSoon).map(([slug, page]) => ({
      id: `coming-soon/${slug}`,
      seo: page.seo,
    })),
    { id: "catalog/talleres", seo: content.catalog.talleres.seo },
    { id: "catalog/intensivos", seo: content.catalog.intensivos.seo },
  ];
}

const STAND_IN_FOLDER = "/media/stand-ins/";

type PathRule = Extract<
  ContentIssue["rule"],
  | "excluded-source"
  | "unregistered-stand-in"
  | "unregistered-media"
  | "unpublishable-media"
  | "rights-missing"
>;

function imagePaths(image: ImageRef): readonly string[] {
  return [image.src, ...(image.srcSet ? srcSetPaths(image.srcSet) : [])];
}

function assetPaths(asset: MediaAsset): readonly string[] {
  return asset.kind === "image"
    ? asset.variants.map(({ path }) => path)
    : asset.sources.map(({ path }) => path);
}

/** Why a content path may not be shown; null for a registered stand-in or a publishable media path. */
function pathRule(path: string, content: RawSiteContent): PathRule | null {
  const { media } = content;
  if (mentionsExcludedSource(path, media.excluded)) {
    return "excluded-source";
  }
  if (content.standIns.some((asset) => asset.path === path)) {
    return null;
  }
  const asset = media.assets.find((candidate) =>
    assetPaths(candidate).includes(path),
  );
  if (!asset) {
    return path.startsWith(STAND_IN_FOLDER)
      ? "unregistered-stand-in"
      : "unregistered-media";
  }
  if (isPublishable(asset, media)) {
    return null;
  }
  return media.rights.some(({ sourceId }) => sourceId === asset.sourceId)
    ? "unpublishable-media"
    : "rights-missing";
}

/** True for a registered stand-in or a path of a publishable media asset. */
export function isPublishedPath(
  path: string,
  content: RawSiteContent,
): boolean {
  return pathRule(path, content) === null;
}

/** Keeps the images whose `src` and every `srcSet` path are published; `[]` when none is. */
export function publishedImages<T extends ImageRef>(
  images: readonly T[],
  content: RawSiteContent,
): readonly T[] {
  return images.filter((image) =>
    imagePaths(image).every((path) => isPublishedPath(path, content)),
  );
}

/**
 * True when the registry holds exactly one publishable share image and it is a
 * single 1200 by 630 JPEG at the default path, so the share tags never point
 * at a missing, pending, excluded or mismatched file.
 */
function hasShareImage(media: MediaRegistry): boolean {
  const shared = media.assets.filter(
    (asset): asset is ImageAsset =>
      asset.kind === "image" &&
      asset.area === "share" &&
      isPublishable(asset, media),
  );
  const [asset, ...others] = shared;
  if (!asset || others.length > 0 || asset.format !== "jpeg") {
    return false;
  }
  const [variant, ...moreVariants] = asset.variants;
  return (
    moreVariants.length === 0 &&
    variant.width === DEFAULT_SHARE_IMAGE.width &&
    variant.height === DEFAULT_SHARE_IMAGE.height &&
    variant.path === DEFAULT_SHARE_IMAGE.path
  );
}

/** Every path of a loop: the poster (src and srcSet) and each video source. */
function loopPaths(loop: AmbientLoop): readonly string[] {
  return [...imagePaths(loop.poster), ...loop.sources.map(({ src }) => src)];
}

/** The loop when every one of its paths is published; otherwise nothing. */
export function publishedLoop(
  loop: AmbientLoop | undefined,
  content: RawSiteContent,
): AmbientLoop | undefined {
  return loop && loopPaths(loop).every((path) => isPublishedPath(path, content))
    ? loop
    : undefined;
}

/** Every image the content shows, with the identifier a failure should name. */
function contentImages(content: RawSiteContent): readonly {
  readonly id: string;
  readonly image: ImageRef;
  readonly decorative: boolean;
}[] {
  return [
    ...[
      content.home.hero.backdrop,
      ...content.home.hero.collage,
      content.home.teaser.image,
      content.home.teaser.accentImage,
    ].map((image) => ({ id: image.src, image, decorative: false })),
    ...[content.brand.logo, content.brand.logoLight].map((image) => ({
      id: image.src,
      image,
      decorative: true,
    })),
    ...content.about.introImages.map((image) => ({
      id: image.src,
      image,
      decorative: false,
    })),
    ...content.about.gallery.map((image) => ({
      id: image.id,
      image,
      decorative: image.decorative === true,
    })),
    ...content.about.videos.map((video) => ({
      id: video.id,
      image: video.poster,
      decorative: false,
    })),
    ...(content.contact.photo
      ? [
          {
            id: content.contact.photo.src,
            image: content.contact.photo,
            decorative: false,
          },
        ]
      : []),
    {
      id: content.catalog.fallbackImage.src,
      image: content.catalog.fallbackImage,
      decorative: true,
    },
  ];
}

function contentIds(content: RawSiteContent): readonly string[] {
  return [
    ...content.home.trustClaims.map((claim) => claim.id),
    content.home.teaser.body.id,
    ...content.home.testimonials.items.map((item) => item.id),
    ...content.about.history.map((entry) => entry.id),
    content.about.valueProposition.id,
    content.about.pullQuote.id,
    content.catalog.talleres.intro.id,
    content.catalog.intensivos.intro.id,
    ...content.about.values.map((value) => value.id),
    ...content.about.gallery.map((image) => image.id),
    ...content.about.videos.map((video) => video.id),
    ...content.about.faq.map((entry) => entry.id),
  ];
}

function duplicates(ids: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      repeated.add(id);
    }
    seen.add(id);
  }
  return [...repeated];
}

/** Checks the invariants the types cannot express; an empty result means publishable. */
export function validateSiteContent(
  content: RawSiteContent,
): readonly ContentIssue[] {
  const issues: ContentIssue[] = [];

  for (const { id, image, decorative } of contentImages(content)) {
    if (!decorative && image.alt.trim() === "") {
      issues.push({ id, rule: "alt-missing" });
    }
    for (const path of imagePaths(image)) {
      const rule = pathRule(path, content);
      if (rule) {
        issues.push({ id: path, rule });
      }
    }
  }
  const { loop } = content.home.hero;
  for (const path of loop ? loopPaths(loop) : []) {
    const rule = pathRule(path, content);
    if (rule) {
      issues.push({ id: path, rule });
    }
  }
  for (const claim of content.home.trustClaims) {
    if (MATERIALS_CLAIM.test(claim.label) && claim.appliesTo !== "intensivos") {
      issues.push({ id: claim.id, rule: "claim-scope" });
    }
  }
  for (const video of content.about.videos) {
    if (!YOUTUBE_ID.test(video.youtubeId)) {
      issues.push({ id: video.id, rule: "video-id" });
    }
  }
  for (const { id, seo } of pageSeo(content)) {
    if (seo.title.trim() === "" || seo.description.trim() === "") {
      issues.push({ id, rule: "empty-seo" });
    }
  }
  const repeated = [
    ...duplicates(contentIds(content)),
    ...duplicates(content.standIns.map((asset) => asset.id)),
    ...duplicates(content.media.assets.map((asset) => asset.id)),
  ];
  for (const id of repeated) {
    issues.push({ id, rule: "duplicate-id" });
  }
  issues.push(...validateMediaRegistry(content.media));
  if (!hasShareImage(content.media)) {
    issues.push({ id: "share", rule: "share-image-missing" });
  }
  return issues;
}

export interface LaunchGate {
  /** Image-like stand-ins (images, favicon, share image) still shipped. */
  readonly imageStandIns: readonly StandInAsset[];
  /** Font stand-ins, reported apart: they wait on the client's typefaces. */
  readonly fontStandIns: readonly StandInAsset[];
  /** Ids of registered assets that are not publishable yet. */
  readonly unpublishedMedia: readonly string[];
}

/** Three honest numbers for the launch checklist instead of one undifferentiated count. */
export function summarizeLaunchGate(
  standIns: readonly StandInAsset[],
  media: MediaRegistry,
): LaunchGate {
  return {
    imageStandIns: standIns.filter(({ kind }) => kind !== "font"),
    fontStandIns: standIns.filter(({ kind }) => kind === "font"),
    unpublishedMedia: media.assets
      .filter((asset) => !isPublishable(asset, media))
      .map(({ id }) => id),
  };
}

/** Drafted prose still waiting for the client's approval, for the launch checklist. */
export function listUnapproved(
  content: RawSiteContent,
): readonly { readonly id: string; readonly area: string }[] {
  const groups: readonly {
    readonly area: string;
    readonly items: readonly {
      readonly id: string;
      readonly approved: boolean;
    }[];
  }[] = [
    { area: "home:trust-claims", items: content.home.trustClaims },
    { area: "home:teaser", items: [content.home.teaser.body] },
    { area: "about:history", items: content.about.history },
    {
      area: "about:value-proposition",
      items: [content.about.valueProposition],
    },
    { area: "about:pull-quote", items: [content.about.pullQuote] },
    { area: "about:values", items: content.about.values },
    { area: "about:faq", items: content.about.faq },
    {
      area: "catalog:intros",
      items: [content.catalog.talleres.intro, content.catalog.intensivos.intro],
    },
  ];
  return groups.flatMap(({ area, items }) =>
    items.filter((item) => !item.approved).map(({ id }) => ({ id, area })),
  );
}
