/**
 * The `active` flag of the durable student profiles. "Inactive" only organizes
 * the admin list: it blocks no enrollment and hides no history. A student with
 * no profile row counts as active.
 */
export interface StudentActivityStore {
  /** Normalized emails (trimmed, lower-cased) of every inactive student. */
  inactiveEmails(): Promise<ReadonlySet<string>>;
  /**
   * Sets the flag of the profile behind `email` (matched after normalization,
   * through the profile or any of her orders). False when no profile matches.
   */
  setActive(email: string, active: boolean, at: Date): Promise<boolean>;
}
