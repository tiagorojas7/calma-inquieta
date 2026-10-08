import type { RawSiteContent } from "../domain/page-content";

/** Where the raw content comes from; a database or panel can replace the repository adapter later. */
export interface SiteContentSource {
  load(): Promise<RawSiteContent>;
}
