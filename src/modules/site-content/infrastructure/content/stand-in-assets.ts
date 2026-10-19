import type { StandInAsset } from "../../domain/stand-in";

/**
 * Every stand-in the site ships until the client delivers the real asset. The
 * launch gate reads the length of this list; retiring a stand-in means deleting
 * its row and its file in one change.
 */

const SVG_SOURCE =
  "Abstract composition authored for this project in the brand palette (generated with a Python script)";
const SVG_LICENCE = "Original work for this project; no third-party material";

const PHOTO_LICENCE =
  "Client brand asset (a photograph from the studio's own published Instagram account); image permission still to be confirmed";
const photo = (file: string) =>
  `docs/brand/instagram/${file}, a photograph from the studio's own Instagram account, copied as is (low resolution)`;

const PROFILE_PICTURE_SOURCE =
  "docs/brand/instagram/ig-profile-picture.jpg, the studio's own Instagram profile picture (likely the logo mark)";
const PROFILE_PICTURE_LICENCE =
  "Client brand asset (the studio's own published profile picture)";

const FONT_SOURCE = "@fontsource 5.3.0 (latin subset, WOFF2)";
const FONT_LICENCE =
  "SIL Open Font License 1.1 (licence text ships next to the font files)";
const FONT_REPLACE_WITH =
  "The brand typefaces and their licences, once the client confirms them";

export const STAND_IN_ASSETS = [
  {
    id: "hero-1",
    path: "/media/stand-ins/hero-1.jpg",
    kind: "image",
    source: photo("ig-post-05-2026-09-29.jpg"),
    licence: PHOTO_LICENCE,
    replaceWith:
      "A client photograph of a workshop or of finished pieces, at least 2000 px, with image permission",
  },
  {
    id: "hero-2",
    path: "/media/stand-ins/hero-2.jpg",
    kind: "image",
    source: photo("ig-post-07-2026-09-26.jpg"),
    licence: PHOTO_LICENCE,
    replaceWith:
      "A client photograph of the space or of a class, at least 2000 px, with image permission",
  },
  {
    id: "hero-3",
    path: "/media/stand-ins/hero-3.jpg",
    kind: "image",
    source: photo("ig-post-01-2026-10-04.jpg"),
    licence: PHOTO_LICENCE,
    replaceWith:
      "A client photograph of the team or of the space, at least 2000 px, with image permission",
  },
  {
    id: "about-teaser",
    path: "/media/stand-ins/about-teaser.svg",
    kind: "image",
    source: SVG_SOURCE,
    licence: SVG_LICENCE,
    replaceWith:
      "A client photograph of the team or the studio for the Quiénes somos teaser",
  },
  {
    id: "gallery-01",
    path: "/media/stand-ins/gallery-01.jpg",
    kind: "image",
    source: photo("ig-post-11-2026-09-21.jpg"),
    licence: PHOTO_LICENCE,
    replaceWith: "A client gallery photograph with image permission",
  },
  {
    id: "gallery-02",
    path: "/media/stand-ins/gallery-02.jpg",
    kind: "image",
    source: photo("ig-post-12-2026-09-18-collab.jpg"),
    licence: PHOTO_LICENCE,
    replaceWith: "A client gallery photograph with image permission",
  },
  {
    id: "favicon",
    path: "/media/stand-ins/favicon.png",
    kind: "favicon",
    source: `${PROFILE_PICTURE_SOURCE}; resized to 48 px with Python Pillow 11.3.0`,
    licence: PROFILE_PICTURE_LICENCE,
    replaceWith:
      "The client's logo files (vector or transparent PNG) to produce a proper favicon set",
  },
  {
    id: "share-stand-in",
    path: "/media/stand-ins/share-default.jpg",
    kind: "share-image",
    source: `${PROFILE_PICTURE_SOURCE}; centered at native size on a #E6D7C4 canvas of 1200x630 with Python Pillow 11.3.0`,
    licence: PROFILE_PICTURE_LICENCE,
    replaceWith:
      "A designed 1200x630 share image from the client's logo files or a brand photograph",
  },
  {
    id: "font-cormorant-garamond-400-normal",
    path: "/fonts/cormorant-garamond-latin-400-normal.woff2",
    kind: "font",
    source: FONT_SOURCE,
    licence: FONT_LICENCE,
    replaceWith: FONT_REPLACE_WITH,
  },
  {
    id: "font-cormorant-garamond-400-italic",
    path: "/fonts/cormorant-garamond-latin-400-italic.woff2",
    kind: "font",
    source: FONT_SOURCE,
    licence: FONT_LICENCE,
    replaceWith: FONT_REPLACE_WITH,
  },
  {
    id: "font-montserrat-400-normal",
    path: "/fonts/montserrat-latin-400-normal.woff2",
    kind: "font",
    source: FONT_SOURCE,
    licence: FONT_LICENCE,
    replaceWith: FONT_REPLACE_WITH,
  },
  {
    id: "font-montserrat-600-normal",
    path: "/fonts/montserrat-latin-600-normal.woff2",
    kind: "font",
    source: FONT_SOURCE,
    licence: FONT_LICENCE,
    replaceWith: FONT_REPLACE_WITH,
  },
] as const satisfies readonly StandInAsset[];
