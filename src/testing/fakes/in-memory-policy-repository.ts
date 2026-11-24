import { err, ok, type Result } from "~/modules/_shared";
import type {
  PolicyKind,
  PolicyRepository,
  PolicyVersion,
  VersionTaken,
} from "~/modules/policies";

/** Policy versions in memory, keyed by kind and number like the unique index. */
export class InMemoryPolicyRepository implements PolicyRepository {
  readonly versions: PolicyVersion[] = [];

  private of(kind: PolicyKind): PolicyVersion[] {
    return this.versions
      .filter((item) => item.kind === kind)
      .sort((a, b) => b.version - a.version);
  }

  latest(kind: PolicyKind): Promise<PolicyVersion | null> {
    return Promise.resolve(this.of(kind)[0] ?? null);
  }

  list(kind: PolicyKind): Promise<readonly PolicyVersion[]> {
    return Promise.resolve(this.of(kind));
  }

  exists(kind: PolicyKind, version: number): Promise<boolean> {
    return Promise.resolve(
      this.versions.some(
        (item) => item.kind === kind && item.version === version,
      ),
    );
  }

  insert(version: PolicyVersion): Promise<Result<PolicyVersion, VersionTaken>> {
    const taken = this.versions.some(
      (item) => item.kind === version.kind && item.version === version.version,
    );
    if (taken) return Promise.resolve(err({ kind: "version-taken" }));
    this.versions.push(version);
    return Promise.resolve(ok(version));
  }
}
