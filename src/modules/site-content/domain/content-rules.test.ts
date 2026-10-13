import { describe, expect, it } from "vitest";
import { buildRawSiteContent } from "~/testing/fakes/in-memory-site-content-source";
import {
  approvedTrustClaims,
  listUnapproved,
  publishableTestimonials,
  validateSiteContent,
} from "./content-rules";
import type {
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
          images: [image("/media/stand-ins/hero-1.jpg", "")],
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
        values: [{ id: "value-1", approved: false, title: "t", text: "t" }],
        faq: [{ id: "faq-1", approved: false, question: "q", answer: "a" }],
      },
    };

    expect(listUnapproved(unapproved)).toEqual([
      { id: "claim-no-experience", area: "home:trust-claims" },
      { id: "teaser-body", area: "home:teaser" },
      { id: "history-1", area: "about:history" },
      { id: "value-proposition", area: "about:value-proposition" },
      { id: "value-1", area: "about:values" },
      { id: "faq-1", area: "about:faq" },
    ]);
  });

  it("lists nothing when everything is approved", () => {
    expect(listUnapproved(validContent())).toEqual([]);
  });
});
