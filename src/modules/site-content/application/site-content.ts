import {
  publishProfile,
  type BusinessProfile,
} from "../domain/business-profile";
import {
  approvedTrustClaims,
  listUnapproved,
  publishableTestimonials,
} from "../domain/content-rules";
import type {
  AboutPageContent,
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
  /** Trust claims approved only; testimonials consented only. */
  getHomePage(): Promise<HomePageContent>;
  /** Values, gallery, videos and FAQ are `[]` when empty. */
  getAboutPage(): Promise<AboutPageContent>;
  getContactPage(): Promise<ContactPageContent>;
  getComingSoonPage(slug: ComingSoonSlug): Promise<ComingSoonContent>;
  /** Labels, listing copy and WhatsApp templates of the public catalog. */
  getCatalogContent(): Promise<CatalogContent>;
  listUnapprovedContent(): Promise<
    readonly { readonly id: string; readonly area: string }[]
  >;
  /** The length is the number of stand-ins remaining (the launch gate). */
  listStandInAssets(): Promise<readonly StandInAsset[]>;
}

/** Applies the domain rules to whatever the source loads; it caches nothing. */
export function createSiteContent(source: SiteContentSource): SiteContent {
  return {
    async getBusinessProfile() {
      return publishProfile((await source.load()).profile);
    },
    async getHomePage() {
      const { home } = await source.load();
      return {
        ...home,
        trustClaims: approvedTrustClaims(home.trustClaims),
        testimonials: {
          ...home.testimonials,
          items: publishableTestimonials(home.testimonials.items),
        },
      };
    },
    async getAboutPage() {
      return (await source.load()).about;
    },
    async getContactPage() {
      return (await source.load()).contact;
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
  };
}
