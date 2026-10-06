export type DatabaseProbeResult =
  | { readonly reachable: true; readonly latestMigration: string | null }
  | { readonly reachable: false };

/** Contract: never throws; every failure maps to { reachable: false }. */
export interface DatabaseProbe {
  probe(): Promise<DatabaseProbeResult>;
}
