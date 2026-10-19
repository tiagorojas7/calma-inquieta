import type { SiteContentSource } from "../application/ports";
import type { RawSiteContent } from "../domain/page-content";
import { aboutContent } from "./content/about";
import { businessProfile } from "./content/business-profile";
import { catalogContent } from "./content/catalog";
import { comingSoonContent } from "./content/coming-soon";
import { contactContent } from "./content/contact";
import { homeContent } from "./content/home";
import { MEDIA_ASSETS } from "./content/media-assets";
import { EXCLUDED_SOURCES, MEDIA_RIGHTS } from "./content/media-rights";
import { STAND_IN_ASSETS } from "./content/stand-in-assets";

const rawSiteContent = {
  profile: businessProfile,
  home: homeContent,
  about: aboutContent,
  contact: contactContent,
  comingSoon: comingSoonContent,
  catalog: catalogContent,
  standIns: STAND_IN_ASSETS,
  media: {
    assets: MEDIA_ASSETS,
    rights: MEDIA_RIGHTS,
    excluded: EXCLUDED_SOURCES,
  },
} as const satisfies RawSiteContent;

/** Serves the typed content that lives in this repository (static data, no I/O). */
export function createRepositoryContentSource(): SiteContentSource {
  return { load: () => Promise.resolve(rawSiteContent) };
}
