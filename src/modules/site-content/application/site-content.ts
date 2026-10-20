import {
  publishProfile,
  type BusinessProfile,
} from "../domain/business-profile";
import {
  approvedTrustClaims,
  listUnapproved,
  publishableTestimonials,
  publishedImages,
  publishedLoop,
  publishedLoops,
  summarizeLaunchGate,
  type LaunchGate,
} from "../domain/content-rules";
import type {
  AboutPageContent,
  BrandContent,
  CatalogContent,
  ComingSoonContent,
  ComingSoonSlug,
  ContactPageContent,
  HomePageContent,
} from "../domain/page-content";
import type { StandInAsset } from "../domain/stand-in";
import type { SiteContentSource } from "./ports";

export interface SiteContent {
  getBusinessProfile(): Promise<BusinessProfile>;
  /** Trust claims approved only; testimonials consented only; the hero loop only when published. */
  getHomePage(): Promise<HomePageContent>;
  /** Values, gallery, videos and FAQ are `[]` when empty; the gallery keeps published images only. */
  getAboutPage(): Promise<AboutPageContent>;
  /** The photo is returned only when its asset is publishable. */
  getContactPage(): Promise<ContactPageContent>;
  /** The header logos, each returned only when its asset is publishable. */
  getBrand(): Promise<Partial<BrandContent>>;
  getComingSoonPage(slug: ComingSoonSlug): Promise<ComingSoonContent>;
  /** Labels, listing copy and WhatsApp templates of the public catalog. */
  getCatalogContent(): Promise<CatalogContent>;
  listUnapprovedContent(): Promise<
    readonly { readonly id: string; readonly area: string }[]
  >;
  /** The length is the number of stand-ins remaining (the launch gate). */
  listStandInAssets(): Promise<readonly StandInAsset[]>;
  /** Image stand-ins, font stand-ins and unpublished media, for the launch checklist. */
  getLaunchGate(): Promise<LaunchGate>;
}

/** Applies the domain rules to whatever the source loads; it caches nothing. */
export function createSiteContent(source: SiteContentSource): SiteContent {
  return {
    async getBusinessProfile() {
      return publishProfile((await source.load()).profile);
    },
    async getHomePage() {
      const raw = await source.load();
      const { home } = raw;
      const { loop, ...hero } = home.hero;
      const published = publishedLoop(loop, raw);
      return {
        ...home,
        hero: published ? { ...hero, loop: published } : hero,
        trustClaims: approvedTrustClaims(home.trustClaims),
        testimonials: {
          ...home.testimonials,
          items: publishableTestimonials(home.testimonials.items),
        },
      };
    },
    async getAboutPage() {
      const raw = await source.load();
      return {
        ...raw.about,
        introImages: publishedImages(raw.about.introImages, raw),
        introLoops: publishedLoops(raw.about.introLoops, raw),
        gallery: publishedImages(raw.about.gallery, raw),
      };
    },
    async getContactPage() {
      const raw = await source.load();
      const { photo, ...contact } = raw.contact;
      return photo && publishedImages([photo], raw).length > 0
        ? { ...contact, photo }
        : contact;
    },
    async getBrand() {
      const raw = await source.load();
      const [logo] = publishedImages([raw.brand.logo], raw);
      const [logoLight] = publishedImages([raw.brand.logoLight], raw);
      return {
        ...(logo ? { logo } : {}),
        ...(logoLight ? { logoLight } : {}),
      };
    },
    async getComingSoonPage(slug) {
      return (await source.load()).comingSoon[slug];
    },
    async getCatalogContent() {
      return (await source.load()).catalog;
    },
    async listUnapprovedContent() {
      return listUnapproved(await source.load());
    },
    async listStandInAssets() {
      return (await source.load()).standIns;
    },
    async getLaunchGate() {
      const raw = await source.load();
      return summarizeLaunchGate(raw.standIns, raw.media);
    },
  };
}
