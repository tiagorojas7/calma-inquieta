import { err, ok, type Result } from "~/modules/_shared";
export type AdminAccessConfig = {
  readonly access: {
    readonly teamDomain: string;
    readonly audience: string;
  } | null;
  readonly adminEmails: readonly string[];
  /** Non-null only when the environment reader accepted the dev bypass. */
  readonly devAdminEmail: string | null;
  /** Malformed values were present: a config denial then reads `config-invalid`. */
  readonly hasIssues: boolean;
};
export type DecodedAccessToken = {
  readonly header: { readonly alg: "RS256"; readonly kid: string };
  readonly claims: Readonly<Record<string, unknown>>;
  readonly signingInput: Uint8Array<ArrayBuffer>;
  readonly signature: Uint8Array<ArrayBuffer>;
};
export type SignatureVerdict =
  "valid" | "invalid" | "unknown-key" | "key-source";
/** Port: never throws. */
export type AccessSignatureVerifier = {
  verify(token: DecodedAccessToken): Promise<SignatureVerdict>;
};

export type DenialReason =
  | "config-missing"
  | "config-invalid"
  | "token-missing"
  | "token-malformed"
  | "algorithm"
  | "issuer"
  | "audience"
  | "expired"
  | "not-yet-valid"
  | "no-email"
  | "service-token"
  | "unknown-key"
  | "key-source"
  | "signature"
  | "not-allowlisted"
  | "cross-origin";

type JsonObject = Record<string, unknown>;
const MAX_SEGMENT_CHARS = 8192;

const toBytes = (segment: string): Uint8Array<ArrayBuffer> => {
  if (!/^[A-Za-z0-9_-]+$/.test(segment) || segment.length > MAX_SEGMENT_CHARS)
    throw new Error("invalid segment");
  const padded = segment
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(segment.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
};

const toObject = (segment: string): JsonObject => {
  const parsed: unknown = JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(toBytes(segment)),
  );
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("object expected");
  return parsed as JsonObject;
};

/** Structural decode only: no time, issuer, audience or signature judgement happens here. */
export function decodeAccessToken(
  raw: string,
): Result<DecodedAccessToken, "token-malformed" | "algorithm"> {
  try {
    const parts = raw.split(".");
    if (parts.length !== 3) return err("token-malformed");
    const [headerPart = "", claimsPart = "", signaturePart = ""] = parts;
    const header = toObject(headerPart);
    const claims = toObject(claimsPart);
    const signature = toBytes(signaturePart);
    if (header.alg !== "RS256") return err("algorithm");
    if (typeof header.kid !== "string" || !header.kid)
      return err("token-malformed");
    return ok({
      header: { alg: "RS256", kid: header.kid },
      claims,
      signingInput: new TextEncoder().encode(`${headerPart}.${claimsPart}`),
      signature,
    });
  } catch {
    return err("token-malformed");
  }
}

const SKEW_SECONDS = 60;
const isTime = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** Issuer, audience and time checks. `nowSeconds` comes from the Clock port. */
export function checkAccessClaims(
  claims: Readonly<Record<string, unknown>>,
  expected: {
    readonly teamDomain: string;
    readonly audience: string;
    readonly nowSeconds: number;
  },
): Result<true, DenialReason> {
  if (claims.iss !== `https://${expected.teamDomain}`) return err("issuer");
  const audiences: unknown[] = Array.isArray(claims.aud)
    ? claims.aud
    : [claims.aud];
  if (
    !audiences.every((value) => typeof value === "string") ||
    !audiences.includes(expected.audience)
  )
    return err("audience");
  const { exp, nbf, iat } = claims;
  const now = expected.nowSeconds;
  if (
    !isTime(exp) ||
    (nbf !== undefined && !isTime(nbf)) ||
    (iat !== undefined && !isTime(iat))
  )
    return err("token-malformed");
  if (now >= exp + SKEW_SECONDS) return err("expired");
  if (
    (nbf !== undefined && now < nbf - SKEW_SECONDS) ||
    (iat !== undefined && iat > now + SKEW_SECONDS)
  )
    return err("not-yet-valid");
  return ok(true);
}

/** Printable ASCII only: Unicode case folding (Kelvin sign, dotless i) must not alias an allowlisted email. */
const EMAIL_SHAPE = /^[\x21-\x3F\x41-\x7E]+@[\x21-\x3F\x41-\x7E]+$/;
const normalizeEmail = (value: string) => value.trim().toLowerCase();

/** Service tokens (`common_name`) and tokens without a usable email are never admins. */
export function readAccessIdentity(
  claims: Readonly<Record<string, unknown>>,
): Result<string, "no-email" | "service-token"> {
  if ("common_name" in claims) return err("service-token");
  const { email } = claims;
  if (typeof email !== "string" || !EMAIL_SHAPE.test(email.trim()))
    return err("no-email");
  return ok(normalizeEmail(email));
}

export function normalizeAllowlist(
  entries: readonly string[],
): ReadonlySet<string> {
  return new Set(entries.map(normalizeEmail).filter(Boolean));
}

export function isAllowlisted(
  email: string,
  entries: readonly string[],
): boolean {
  const normalized = normalizeEmail(email);
  return normalized !== "" && normalizeAllowlist(entries).has(normalized);
}

export function isSameOriginMutation(input: {
  readonly method: string;
  readonly url: string;
  readonly origin?: string | null | undefined;
  readonly secFetchSite?: string | null | undefined;
}): boolean {
  if (["GET", "HEAD"].includes(input.method.toUpperCase())) return true;
  try {
    const target = new URL(input.url);
    if (target.protocol !== "https:" && target.protocol !== "http:")
      return false;
    const site = input.secFetchSite ?? "same-origin";
    return site === "same-origin" && input.origin === target.origin;
  } catch {
    return false;
  }
}
