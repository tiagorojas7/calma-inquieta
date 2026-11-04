import type { Clock } from "~/modules/_shared";
import type { AccessSignatureVerifier } from "../domain/access-authorization";

/**
 * Plain data only, safe to keep per isolate: sanitized public JWK objects, never
 * a CryptoKey, Promise or stream. Keys are imported again on every verification.
 */
export type AccessKeyCacheCell = {
  readonly keys: Map<string, JsonWebKey>;
  fetchedAtMs: number | null;
  lastMissRefetchAtMs: number | null;
};

export const createAccessKeyCacheCell = (): AccessKeyCacheCell => ({
  keys: new Map(),
  fetchedAtMs: null,
  lastMissRefetchAtMs: null,
});

const RSA = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" } as const;
const MAX_AGE_MS = 3_600_000;
const MISS_GUARD_MS = 30_000;
const MAX_BODY_CHARS = 65_536;
const MAX_KEYS = 20;
const MIN_MODULUS_BITS = 2048;

/** A clean public RS256 key of at least 2048 bits, or null. */
async function usableKey(
  candidate: unknown,
): Promise<{ kid: string; jwk: JsonWebKey } | null> {
  if (!candidate || typeof candidate !== "object") return null;
  const { kid, kty, n, e, alg, use } = candidate as Record<string, unknown>;
  if (typeof kid !== "string" || kty !== "RSA") return null;
  if (typeof n !== "string" || typeof e !== "string") return null;
  if (
    (alg !== undefined && alg !== "RS256") ||
    (use !== undefined && use !== "sig")
  )
    return null;
  const jwk: JsonWebKey = { kty, n, e, alg: "RS256", ext: true };
  try {
    const key = await crypto.subtle.importKey("jwk", jwk, RSA, false, [
      "verify",
    ]);
    const bits = (key.algorithm as RsaHashedKeyAlgorithm).modulusLength;
    return bits >= MIN_MODULUS_BITS ? { kid, jwk } : null;
  } catch {
    return null;
  }
}

async function fetchKeySet(
  fetchImpl: typeof fetch,
  teamDomain: string,
  timeoutMs: number,
): Promise<Map<string, JsonWebKey> | null> {
  try {
    const response = await fetchImpl(
      `https://${teamDomain}/cdn-cgi/access/certs`,
      {
        signal: AbortSignal.timeout(timeoutMs),
        redirect: "manual",
      },
    );
    if (
      !response.ok ||
      Number(response.headers.get("content-length") ?? 0) > MAX_BODY_CHARS
    )
      return null;
    const text = await response.text();
    if (text.length > MAX_BODY_CHARS) return null;
    const { keys } = JSON.parse(text) as { keys?: unknown };
    if (!Array.isArray(keys) || keys.length > MAX_KEYS) return null;
    const usable = new Map<string, JsonWebKey>();
    for (const candidate of keys as unknown[]) {
      const key = await usableKey(candidate);
      if (key) usable.set(key.kid, key.jwk);
    }
    return usable.size ? usable : null;
  } catch {
    return null;
  }
}

export function createWebCryptoAccessVerifier(deps: {
  readonly teamDomain: string;
  readonly fetch: typeof fetch;
  readonly clock: Clock;
  readonly cell: AccessKeyCacheCell;
  readonly timeoutMs?: number;
}): AccessSignatureVerifier {
  const { cell } = deps;
  /** At most one fetch per verification. Any fetch starts the 30 s miss guard. */
  async function refetch(nowMs: number): Promise<boolean> {
    cell.lastMissRefetchAtMs = nowMs;
    const keys = await fetchKeySet(
      deps.fetch,
      deps.teamDomain,
      deps.timeoutMs ?? 3000,
    );
    if (!keys) return false;
    cell.keys.clear();
    for (const [kid, jwk] of keys) cell.keys.set(kid, jwk);
    cell.fetchedAtMs = nowMs;
    return true;
  }

  return {
    async verify(token) {
      try {
        const nowMs = deps.clock.now().getTime();
        const fresh =
          cell.fetchedAtMs !== null && nowMs - cell.fetchedAtMs <= MAX_AGE_MS;
        let jwk = fresh ? cell.keys.get(token.header.kid) : undefined;
        if (!jwk) {
          const guarded =
            cell.lastMissRefetchAtMs !== null &&
            nowMs - cell.lastMissRefetchAtMs < MISS_GUARD_MS;
          if (guarded) return fresh ? "unknown-key" : "key-source";
          if (!(await refetch(nowMs))) return "key-source";
          jwk = cell.keys.get(token.header.kid);
          if (!jwk) return "unknown-key";
        }
        const key = await crypto.subtle.importKey("jwk", jwk, RSA, false, [
          "verify",
        ]);
        const valid = await crypto.subtle.verify(
          RSA.name,
          key,
          token.signature,
          token.signingInput,
        );
        return valid ? "valid" : "invalid";
      } catch {
        return "invalid";
      }
    },
  };
}
