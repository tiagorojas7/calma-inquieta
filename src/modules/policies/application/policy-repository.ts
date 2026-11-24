import type { Result } from "~/modules/_shared";
import type { PolicyKind, PolicyVersion } from "../domain/policy-core";

/** Another version already took this number of this kind (a lost publishing race). */
export type VersionTaken = { readonly kind: "version-taken" };

/**
 * Port over the stored versions. Versions are only ever added: nothing here
 * updates or deletes one.
 */
export interface PolicyRepository {
  /** The highest version of `kind`, or null while none exists. */
  latest(kind: PolicyKind): Promise<PolicyVersion | null>;
  /** Every version of `kind`, newest first. */
  list(kind: PolicyKind): Promise<readonly PolicyVersion[]>;
  exists(kind: PolicyKind, version: number): Promise<boolean>;
  /**
   * Stores a new version. A (kind, version) pair that already exists is
   * refused with `version-taken` and leaves the stored one untouched.
   */
  insert(version: PolicyVersion): Promise<Result<PolicyVersion, VersionTaken>>;
}
