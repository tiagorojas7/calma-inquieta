import type {
  ContentIssue,
  ImageRef,
  RawSiteContent,
  SeoCopy,
  Testimonial,
  TrustClaim,
} from "./page-content";

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

/** Every image the content shows, with the identifier a failure should name. */
function contentImages(content: RawSiteContent): readonly {
  readonly id: string;
  readonly image: ImageRef;
  readonly decorative: boolean;
}[] {
  return [
    ...content.home.hero.images.map((image) => ({
      id: image.src,
      image,
      decorative: false,
    })),
    {
      id: content.home.teaser.image.src,
      image: content.home.teaser.image,
      decorative: false,
    },
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
  const registered = new Set(content.standIns.map((asset) => asset.path));

  for (const { id, image, decorative } of contentImages(content)) {
    if (!decorative && image.alt.trim() === "") {
      issues.push({ id, rule: "alt-missing" });
    }
    if (!registered.has(image.src)) {
      issues.push({ id: image.src, rule: "unregistered-stand-in" });
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
  ];
  for (const id of repeated) {
    issues.push({ id, rule: "duplicate-id" });
  }
  return issues;
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
