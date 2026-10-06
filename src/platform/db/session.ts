import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";

export interface DbSession {
  readonly db: NodePgDatabase;
  /** Idempotent. With `defer`, returns at once and hands the teardown over. */
  close(): Promise<void>;
}

export type DbSessionFactory = () => Promise<DbSession>;

export interface DbSessionOptions {
  readonly connectionString: string;
  /** Worker: `ctx.waitUntil`. Node: omitted, so `close()` awaits the teardown. */
  readonly defer?: (pending: Promise<unknown>) => void;
  readonly connectTimeoutMs?: number;
}

const DEFAULT_CONNECT_TIMEOUT_MS = 5000;

/**
 * One short-lived client per session (design D4): Hyperdrive already pools in
 * the Worker, and a module-level pool would leak across requests.
 */
export function createDbSessionFactory({
  connectionString,
  defer,
  connectTimeoutMs = DEFAULT_CONNECT_TIMEOUT_MS,
}: DbSessionOptions): DbSessionFactory {
  return async () => {
    const client = new pg.Client({
      connectionString,
      connectionTimeoutMillis: connectTimeoutMs,
    });
    // A connection dropped while idle emits 'error'; unhandled it would crash the process.
    client.on("error", () => undefined);
    try {
      await client.connect();
    } catch (error) {
      await client.end().catch(() => undefined);
      throw error;
    }

    let ending: Promise<void> | undefined;
    return {
      db: drizzle(client),
      close() {
        if (ending === undefined) {
          ending = client.end().catch(() => undefined);
          defer?.(ending);
        }
        return defer === undefined ? ending : Promise.resolve();
      },
    };
  };
}
