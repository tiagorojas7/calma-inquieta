/** Test doubles for Cloudflare Access: real RSA keys, signed tokens and a counting key-set `fetch`. */
export const ACCESS_TEAM_DOMAIN = "team.cloudflareaccess.com";
export const ACCESS_AUDIENCE = "audience";

export const encodeSegment = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

/** Builds `header.claims.signature` without signing, for pure decode and claim tests. */
export const unsignedToken = (
  header: unknown,
  claims: unknown,
  signature = "c2ln",
) => `${encodeSegment(header)}.${encodeSegment(claims)}.${signature}`;

export type AccessKeyPair = {
  readonly kid: string;
  /** Public JWK as Cloudflare publishes it. */
  readonly jwk: JsonWebKey & { kid: string };
  /** The same key including the private members, to prove they are never cached. */
  readonly privateJwk: JsonWebKey & { kid: string };
  readonly privateKey: CryptoKey;
};

export async function createAccessKeyPair(
  input: { kid?: string; modulusLength?: number } = {},
): Promise<AccessKeyPair> {
  const kid = input.kid ?? "test-key";
  const pair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: input.modulusLength ?? 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  return {
    kid,
    jwk: { ...publicJwk, kid, alg: "RS256", use: "sig" },
    privateJwk: {
      ...(await crypto.subtle.exportKey("jwk", pair.privateKey)),
      kid,
      alg: "RS256",
      use: "sig",
    },
    privateKey: pair.privateKey,
  };
}

export const DEFAULT_CLAIMS = (nowSeconds: number) => ({
  iss: `https://${ACCESS_TEAM_DOMAIN}`,
  aud: [ACCESS_AUDIENCE],
  exp: nowSeconds + 300,
  iat: nowSeconds,
  email: "owner@example.com",
});

/** Signs `header.claims` with the pair's private key (RS256). Claims and header can be overridden whole. */
export async function signAccessToken(
  pair: AccessKeyPair,
  input: { nowSeconds?: number; header?: unknown; claims?: unknown } = {},
) {
  const signingInput = `${encodeSegment(input.header ?? { alg: "RS256", kid: pair.kid })}.${encodeSegment(input.claims ?? DEFAULT_CLAIMS(input.nowSeconds ?? 1_700_000_000))}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    pair.privateKey,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${Buffer.from(signature).toString("base64url")}`;
}

export const keySetResponse = (keys: readonly unknown[], init?: ResponseInit) =>
  new Response(JSON.stringify({ keys }), init);

export type KeyFetchCall = {
  readonly url: string;
  readonly init: RequestInit | undefined;
};

/** A `fetch` that counts calls and answers each one with `respond` (default: the current key set). */
export function createKeyFetch(
  respond: (call: KeyFetchCall) => Promise<Response> | Response,
) {
  const calls: KeyFetchCall[] = [];
  const fetchImpl: typeof fetch = (input, init) => {
    const call = {
      url: input instanceof Request ? input.url : input.toString(),
      init,
    };
    calls.push(call);
    // Workers' fetch throws on this mode, so the fake must too.
    if (init?.redirect === "error")
      return Promise.reject(new TypeError("Invalid redirect value"));
    return Promise.resolve(respond(call));
  };
  return { fetch: fetchImpl, calls };
}
