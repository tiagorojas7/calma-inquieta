import type { SiteContentSource } from "../application/ports";
import type { RawSiteContent } from "../domain/page-content";
import { aboutContent } from "./content/about";
import { businessProfile } from "./content/business-profile";
import { comingSoonContent } from "./content/coming-soon";
import { contactContent } from "./content/contact";
import { homeContent } from "./content/home";
import { STAND_IN_ASSETS } from "./content/stand-in-assets";

const rawSiteContent = {
  profile: businessProfile,
  home: homeContent,
  about: aboutContent,
  contact: contactContent,
  comingSoon: comingSoonContent,
  standIns: STAND_IN_ASSETS,
} as const satisfies RawSiteContent;

/** Serves the typed content that lives in this repository (static data, no I/O). */
export function createRepositoryContentSource(): SiteContentSource {
  return { load: () => Promise.resolve(rawSiteContent) };
}
