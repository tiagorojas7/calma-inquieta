import { beforeAll, describe, expect, it } from "vitest";
import {
  ACCESS_AUDIENCE,
  ACCESS_TEAM_DOMAIN,
  createAccessKeyPair,
  createKeyFetch,
  DEFAULT_CLAIMS,
  keySetResponse,
  signAccessToken,
  type AccessKeyPair,
} from "~/testing/access/access-tokens";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import * as api from "./index";
import {
  createAccessKeyCacheCell,
  createWebCryptoAccessVerifier,
} from "./infrastructure/access-verifier";

const NOW_SECONDS = 1_700_000_000;
const clock = fixedClock(new Date(NOW_SECONDS * 1000));
let pair: AccessKeyPair;
let stranger: AccessKeyPair;

beforeAll(async () => {
  [pair, stranger] = await Promise.all([
    createAccessKeyPair({ kid: "live" }),
    createAccessKeyPair({ kid: "live" }),
  ]);
});

function wire(adminEmails: string[], respond?: () => Response) {
  const keyFetch = createKeyFetch(
    respond ?? (() => keySetResponse([pair.jwk])),
  );
  const cell = createAccessKeyCacheCell();
  const authorize = api.createAuthorizeAdminRequest({
    config: {
      access: { teamDomain: ACCESS_TEAM_DOMAIN, audience: ACCESS_AUDIENCE },
      adminEmails,
      devAdminEmail: null,
      hasIssues: false,
    },
    signatures: createWebCryptoAccessVerifier({
      teamDomain: ACCESS_TEAM_DOMAIN,
      fetch: keyFetch.fetch,
      clock,
      cell,
    }),
    clock,
  });
  return { authorize, keyFetch, cell };
}
const claims = (patch: Record<string, unknown> = {}) => ({
  ...DEFAULT_CLAIMS(NOW_SECONDS),
  ...patch,
});

describe("admin-access public surface", () => {
  it("exposes only the pure authorization contract, not the WebCrypto adapter", () => {
    expect(Object.keys(api).sort()).toEqual([
      "createAuthorizeAdminRequest",
      "decodeAccessToken",
      "isAllowlisted",
      "isSameOriginMutation",
      "normalizeAllowlist",
      "requireAdminActor",
    ]);
  });
});

describe("authorization with the real WebCrypto verifier", () => {
  it("creates an actor from a really signed, allowlisted token", async () => {
    const { authorize } = wire([" Owner@Example.com "]);
    const assertion = await signAccessToken(pair, { nowSeconds: NOW_SECONDS });
    expect(await authorize({ assertion })).toEqual({
      kind: "admin",
      actor: { kind: "admin-actor", email: "owner@example.com" },
    });
  });

  it("denies a token signed by another key under the same kid", async () => {
    const { authorize } = wire(["owner@example.com"]);
    const assertion = await signAccessToken(stranger, {
      nowSeconds: NOW_SECONDS,
    });
    expect(await authorize({ assertion })).toEqual({
      kind: "denied",
      reason: "signature",
      identityEmail: null,
    });
  });

  it("shows only the verified email when the identity is not allowlisted", async () => {
    const { authorize } = wire(["someone@example.com"]);
    const assertion = await signAccessToken(pair, { nowSeconds: NOW_SECONDS });
    expect(await authorize({ assertion })).toEqual({
      kind: "denied",
      reason: "not-allowlisted",
      identityEmail: "owner@example.com",
    });
  });

  it("denies a validly signed service token without asking for keys", async () => {
    const { authorize, keyFetch } = wire(["owner@example.com"]);
    const assertion = await signAccessToken(pair, {
      claims: claims({ email: undefined, common_name: "svc" }),
    });
    expect(await authorize({ assertion })).toMatchObject({
      reason: "service-token",
    });
    expect(keyFetch.calls).toHaveLength(0);
  });

  it("denies when the key source is down", async () => {
    const { authorize } = wire(
      ["owner@example.com"],
      () => new Response("down", { status: 502 }),
    );
    const assertion = await signAccessToken(pair, { nowSeconds: NOW_SECONDS });
    expect(await authorize({ assertion })).toMatchObject({
      reason: "key-source",
    });
  });
});
