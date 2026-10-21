import type { BrandContent } from "../../domain/page-content";
import { imageRef } from "./media-refs";

/**
 * Site-wide brand content: the header logo in its two inks. The images are
 * decorative here because the header always shows the wordmark beside them.
 */
export const brandContent = {
  logo: { ...imageRef("brand-logo"), alt: "" },
  logoLight: { ...imageRef("brand-logo-light"), alt: "" },
} as const satisfies BrandContent;
