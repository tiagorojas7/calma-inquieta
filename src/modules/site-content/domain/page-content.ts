import type { RawBusinessProfile, WhatsAppTopic } from "./business-profile";
import type { MediaRegistry, MediaRule } from "./media";
import type { StandInAsset } from "./stand-in";

export interface SeoCopy {
  readonly title: string;
  readonly description: string;
}

/** Drafted prose is approved by the client before launch; `approved: false` is listed for the checklist. */
export interface Approvable {
  readonly id: string;
  readonly approved: boolean;
}

export interface ApprovableText extends Approvable {
  readonly text: string;
}

export interface ImageRef {
  readonly src: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
  /** Responsive candidates ("path 480w, path 960w"); every path is gated like `src`. */
  readonly srcSet?: string;
}

/** A phone crop and a desktop crop of one slot; both carry the same alt text. */
export interface ArtDirectedImage {
  readonly mobile: ImageRef;
  readonly desktop: ImageRef;
}

/** A short decorative loop: two encodes of one clip and the poster shown before it plays. */
export interface AmbientLoop {
  /** Decorative: its alt is empty. */
  readonly poster: ImageRef;
  /** In order of preference: WebM first, MP4 as the fallback. */
  readonly sources: readonly {
    readonly src: string;
    readonly type: "video/webm" | "video/mp4";
  }[];
  readonly width: number;
  readonly height: number;
}

export interface TrustClaim extends Approvable {
  readonly label: string;
  readonly icon: "hands" | "leaf" | "heart" | "group";
  readonly appliesTo: "all" | "talleres" | "intensivos";
}

export interface Testimonial {
  readonly id: string;
  readonly quote: string;
  readonly author: string;
  readonly consent?: { readonly written: true; readonly recordedOn: string };
}

export interface GalleryImage extends ImageRef {
  readonly id: string;
  readonly decorative?: true;
}

export interface VideoEntry {
  readonly id: string;
  readonly youtubeId: string;
  readonly title: string;
  readonly poster: ImageRef;
}

export interface ValueItem extends Approvable {
  readonly title: string;
  readonly text: string;
}

export interface FaqEntry extends Approvable {
  readonly question: string;
  readonly answer: string;
}

export interface HomePageContent {
  readonly seo: SeoCopy;
  readonly hero: {
    readonly eyebrow: string;
    /** `accent` renders italic. */
    readonly title: {
      readonly lead: string;
      readonly accent: string;
      readonly trail: string;
    };
    readonly subtitle: string;
    readonly primaryCtaLabel: string;
    readonly secondaryCtaLabel: string;
    /** Phones: the full-bleed 9:16 photo behind the text (the LCP below lg). */
    readonly backdrop: ImageRef;
    /**
     * From lg: the collage photos, in slot order. The first is the large
     * lead (the LCP from lg), the second sits in a white frame, the third
     * has a torn-paper edge.
     */
    readonly collage: readonly ImageRef[];
    /** The handwritten kraft note laid over the collage (es-AR voseo). */
    readonly note: string;
    /** The small tracked word list at the foot of the collage. */
    readonly keywords: readonly string[];
    /** Optional: the reader drops it unless every path is published. */
    readonly loop?: AmbientLoop;
  };
  /** The reader returns approved claims only. */
  readonly trustClaims: readonly TrustClaim[];
  readonly monthly: { readonly heading: string; readonly emptyMessage: string };
  readonly intensivos: {
    readonly heading: string;
    readonly emptyMessage: string;
  };
  readonly teaser: {
    readonly heading: string;
    readonly body: ApprovableText;
    readonly image: ImageRef;
    /** The second, overlapping photo of the pair (another ratio). */
    readonly accentImage: ImageRef;
    /** The handwritten pull phrase beside the text. */
    readonly pull: string;
    readonly linkLabel: string;
  };
  /** The reader returns consented testimonials only. */
  readonly testimonials: {
    readonly heading: string;
    readonly items: readonly Testimonial[];
  };
  /** The booking lead above the catalog cards: copy and a layered photo pair. */
  readonly catalogBand: {
    readonly heading: string;
    readonly body: string;
    /** The tall photo of the pair (4:5). */
    readonly primary: ImageRef;
    /** The wide photo laid over the first (3:2). */
    readonly secondary: ImageRef;
  };
  readonly contactBand: {
    readonly heading: string;
    readonly body: string;
    /** The photo beside the WhatsApp call to action. */
    readonly image: ImageRef;
  };
}

export interface AboutPageContent {
  readonly seo: SeoCopy;
  /** "Quiénes somos" */
  readonly heading: string;
  readonly history: readonly ApprovableText[];
  readonly valueProposition: ApprovableText;
  /** A short handwritten line beside the intro; drafted copy awaiting approval. */
  readonly pullQuote: ApprovableText;
  /** Two or three photos of different ratios for the intro collage; unpublished ones are dropped on read. */
  readonly introImages: readonly ImageRef[];
  /**
   * Muted 9:16 loops for the intro collage. When at least one is published
   * the collage shows them; otherwise it falls back to `introImages`.
   */
  readonly introLoops: readonly AmbientLoop[];
  readonly values: readonly ValueItem[];
  readonly gallery: readonly GalleryImage[];
  readonly videos: readonly VideoEntry[];
  readonly faq: readonly FaqEntry[];
  readonly sectionHeadings: {
    readonly values: string;
    readonly gallery: string;
    readonly faq: string;
  };
}

export interface ContactPageContent {
  readonly seo: SeoCopy;
  readonly heading: string;
  readonly intro: string;
  /** A photo of the space; the reader withholds it unless its asset is publishable. */
  readonly photo?: ImageRef;
}

export type ComingSoonSlug = "eventos-privados";

export interface ComingSoonContent {
  readonly seo: SeoCopy;
  readonly title: string;
  readonly message: string;
  readonly whatsappTopic: WhatsAppTopic;
}

/**
 * Copy for the public catalog pages (listings, details, cards, WhatsApp
 * messages). Templates use `{key}` placeholders filled by `fillCopyTemplate`.
 * No schedule, price, teacher or policy fact lives here: those come only from
 * the catalog.
 */
export interface CatalogContent {
  /** A registered stand-in with `alt: ""` (decorative). */
  readonly fallbackImage: ImageRef;
  readonly talleres: {
    readonly seo: SeoCopy;
    readonly heading: string;
    readonly intro: ApprovableText;
    readonly emptyMessage: string;
    readonly cardCtaLabel: string;
    readonly feeSuffix: string;
    readonly feeLabel: string;
    readonly noOffering: string;
    readonly turnosHeading: string;
    readonly teacherHeading: string;
    readonly projectHeading: string;
  };
  readonly intensivos: {
    readonly seo: SeoCopy;
    readonly heading: string;
    readonly intro: ApprovableText;
    /** What a workshop is: a one-day gathering where the finished piece goes home. */
    readonly oneDay: string;
    readonly emptyMessage: string;
    readonly cardCtaLabel: string;
    readonly priceLabel: string;
    readonly depositLabel: string;
    readonly materialsIncluded: string;
    /** Placeholder: `{cantidad}`. */
    readonly minSeats: string;
    readonly conditionsLabel: string;
    readonly teacherHeading: string;
  };
  readonly shared: {
    readonly seatsLimited: string;
    readonly paused: string;
    readonly inquiryCta: string;
    readonly pausedLinkLabel: string;
    /** Placeholder: `{cantidad}`. */
    readonly moreTurnos: string;
    /** Singular form when exactly one more turno is hidden. */
    readonly moreTurnosOne: string;
    readonly breadcrumbLabel: string;
  };
  /** Prefilled `wa.me` messages, voseo. */
  readonly messages: {
    /** Placeholder: `{nombre}`. */
    readonly taller: string;
    /** Placeholders: `{nombre}`, `{dia}`, `{horario}`. */
    readonly turno: string;
    /** Placeholders: `{nombre}`, `{fecha}`. */
    readonly intensivo: string;
    /** Placeholder: `{nombre}`. */
    readonly paused: string;
  };
}

/**
 * The brand mark shown in the header. Both logos are decorative (empty alt):
 * the visible wordmark beside them names the link.
 */
export interface BrandContent {
  /** Dark ink, for the light page. */
  readonly logo: ImageRef;
  /** Cream, for the dark hero photo below lg. */
  readonly logoLight: ImageRef;
}

export interface RawSiteContent {
  readonly profile: RawBusinessProfile;
  readonly brand: BrandContent;
  readonly home: HomePageContent;
  readonly about: AboutPageContent;
  readonly contact: ContactPageContent;
  readonly comingSoon: Readonly<Record<ComingSoonSlug, ComingSoonContent>>;
  readonly catalog: CatalogContent;
  readonly standIns: readonly StandInAsset[];
  readonly media: MediaRegistry;
}

export interface ContentIssue {
  readonly id: string;
  readonly rule:
    | "alt-missing"
    | "claim-scope"
    | "video-id"
    | "empty-seo"
    | "duplicate-id"
    | "unregistered-stand-in"
    | MediaRule;
  /** Registry issues only: the offending variant or source path. */
  readonly path?: string;
  /** Registry issues only: the offending source id. */
  readonly sourceId?: string;
}
