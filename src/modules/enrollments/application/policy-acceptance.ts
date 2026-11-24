/**
 * The versions of the site-wide conditions and privacy documents a person
 * accepted when she submitted a form. The numbers come from the policies
 * module, which this module never imports: it only asks whether they exist.
 */
export interface PolicyAcceptance {
  readonly conditionsVersion: number;
  readonly privacyVersion: number;
}

/**
 * Port the public forms use to refuse a version nobody published. A failure
 * of the underlying store rejects; the callers map it to `unavailable`.
 */
export interface PolicyVersionCheck {
  isPublished(
    kind: "conditions" | "privacy",
    version: number,
  ): Promise<boolean>;
}
