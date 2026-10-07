/** One asset that stands in for a client deliverable until the real one arrives. */
export interface StandInAsset {
  readonly id: string;
  /** Public URL path, for example "/media/stand-ins/hero-1.svg". */
  readonly path: string;
  readonly kind: "image" | "font" | "favicon" | "share-image";
  /** Where the stand-in came from and the tool used to produce it. */
  readonly source: string;
  readonly licence: string;
  /** What the client must supply to retire this stand-in. */
  readonly replaceWith: string;
}
