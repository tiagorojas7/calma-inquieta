import { beforeAll, describe, expect, it } from "vitest";
import {
  ACCESS_TEAM_DOMAIN,
  createAccessKeyPair,
  createKeyFetch,
  keySetResponse,
  signAccessToken,
  type AccessKeyPair,
} from "~/testing/access/access-tokens";
import { advancingClock } from "~/testing/fakes/fixed-clock";
import { decodeAccessToken } from "../domain/access-authorization";
import {
  createAccessKeyCacheCell,
  createWebCryptoAccessVerifier,
} from "./access-verifier";

const START = new Date("2023-11-14T22:13:20Z");
const KEYS_URL = `https://${ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`;
const HOUR = 3_600_000;
let main: AccessKeyPair;
let rotated: AccessKeyPair;
let other: AccessKeyPair;

beforeAll(async () => {
  [main, rotated, other] = await Promise.all([
    createAccessKeyPair({ kid: "k1" }),
    createAccessKeyPair({ kid: "k2" }),
    createAccessKeyPair({ kid: "k1" }),
  ]);
});

function setup(
  published: () => readonly unknown[] = () => [main.jwk],
  timeoutMs?: number,
) {
  const clock = advancingClock(START);
  const cell = createAccessKeyCacheCell();
  const keyFetch = createKeyFetch(() => keySetResponse(published()));
  const make = (fetchImpl: typeof fetch = keyFetch.fetch) =>
    createWebCryptoAccessVerifier({
      teamDomain: ACCESS_TEAM_DOMAIN,
      fetch: fetchImpl,
      clock,
      cell,
      ...(timeoutMs ? { timeoutMs } : {}),
    });
  return { clock, cell, keyFetch, verifier: make(), make };
}
const decoded = (token: string) => {
  const result = decodeAccessToken(token);
  if (!result.ok) throw new Error(`fixture token undecodable: ${result.error}`);
  return result.value;
};
const sign = async (pair: AccessKeyPair) =>
  decoded(await signAccessToken(pair));

describe("WebCrypto access verifier", () => {
  it("verifies a real RS256 signature and fetches the team keys once", async () => {
    const { verifier, keyFetch } = setup();
    expect(await verifier.verify(await sign(main))).toBe("valid");
    expect(keyFetch.calls).toHaveLength(1);
    expect(keyFetch.calls[0]?.url).toBe(KEYS_URL);
    expect(keyFetch.calls[0]?.init?.signal).toBeInstanceOf(AbortSignal);
    expect(keyFetch.calls[0]?.init?.redirect).toBe("error");
  });

  it("denies a tampered payload, a tampered signature and a signature from another key", async () => {
    const { verifier } = setup();
    const good = await signAccessToken(main);
    const [header, payload, signature] = good.split(".") as [
      string,
      string,
      string,
    ];
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as object;
    const forged = Buffer.from(
      JSON.stringify({ ...claims, email: "evil@example.com" }),
    ).toString("base64url");
    const flipped = Buffer.from(signature, "base64url");
    flipped[0] = (flipped[0] ?? 0) ^ 0xff;
    expect(
      await verifier.verify(decoded(`${header}.${forged}.${signature}`)),
    ).toBe("invalid");
    expect(
      await verifier.verify(
        decoded(`${header}.${payload}.${flipped.toString("base64url")}`),
      ),
    ).toBe("invalid");
    expect(await verifier.verify(decoded(`${header}.${payload}.c2ln`))).toBe(
      "invalid",
    );
    expect(await verifier.verify(await sign(other))).toBe("invalid");
  });

  it("serves hits from the cell without fetching, across verifier instances (requests)", async () => {
    const { make, keyFetch } = setup();
    expect(await make().verify(await sign(main))).toBe("valid");
    expect(await make().verify(await sign(main))).toBe("valid");
    expect(keyFetch.calls).toHaveLength(1);
  });

  it("does not fetch a rotated kid again inside the 30 s miss guard", async () => {
    let published: AccessKeyPair[] = [main];
    const { verifier, keyFetch } = setup(() => published.map((p) => p.jwk));
    expect(await verifier.verify(await sign(main))).toBe("valid");
    published = [main, rotated];
    expect(await verifier.verify(await sign(rotated))).toBe("unknown-key");
    expect(keyFetch.calls).toHaveLength(1);
  });

  it("refetches a rotated kid once the miss guard has elapsed", async () => {
    let published: AccessKeyPair[] = [main];
    const { verifier, keyFetch, clock } = setup(() =>
      published.map((p) => p.jwk),
    );
    expect(await verifier.verify(await sign(main))).toBe("valid");
    published = [main, rotated];
    clock.advance(30_000);
    expect(await verifier.verify(await sign(rotated))).toBe("valid");
    expect(keyFetch.calls).toHaveLength(2);
    expect(await verifier.verify(await sign(main))).toBe("valid");
    expect(keyFetch.calls).toHaveLength(2);
  });

  it("fetches once for sequential unknown kids inside 30 s, and again at exactly 30 s", async () => {
    const { verifier, keyFetch, clock } = setup();
    for (let i = 0; i < 3; i += 1)
      expect(await verifier.verify(await sign(rotated))).toBe("unknown-key");
    expect(keyFetch.calls).toHaveLength(1);
    clock.advance(29_999);
    expect(await verifier.verify(await sign(rotated))).toBe("unknown-key");
    expect(keyFetch.calls).toHaveLength(1);
    clock.advance(1);
    expect(await verifier.verify(await sign(rotated))).toBe("unknown-key");
    expect(keyFetch.calls).toHaveLength(2);
  });

  it("keeps a set that is exactly one hour old and refetches it after that", async () => {
    const { verifier, keyFetch, clock } = setup();
    await verifier.verify(await sign(main));
    clock.advance(HOUR);
    expect(await verifier.verify(await sign(main))).toBe("valid");
    expect(keyFetch.calls).toHaveLength(1);
    clock.advance(1);
    expect(await verifier.verify(await sign(main))).toBe("valid");
    expect(keyFetch.calls).toHaveLength(2);
  });

  it("does not use a stale set when the refetch fails", async () => {
    const { make, clock, cell } = setup();
    await make().verify(await sign(main));
    clock.advance(HOUR + 1);
    const failing = createKeyFetch(() => new Response("down", { status: 503 }));
    expect(await make(failing.fetch).verify(await sign(main))).toBe(
      "key-source",
    );
    expect(failing.calls).toHaveLength(1);
    expect(cell.fetchedAtMs).toBe(START.getTime());
  });

  it("throttles after a failed miss refetch like after a successful one", async () => {
    const { make, clock, cell } = setup();
    await make().verify(await sign(main));
    clock.advance(30_000);
    const failing = createKeyFetch(() => new Response("down", { status: 500 }));
    expect(await make(failing.fetch).verify(await sign(rotated))).toBe(
      "key-source",
    );
    expect(await make(failing.fetch).verify(await sign(rotated))).toBe(
      "unknown-key",
    );
    expect(failing.calls).toHaveLength(1);
    expect(cell.keys.has("k1")).toBe(true);
  });

  it.each([
    ["HTTP 500", () => new Response("down", { status: 500 })],
    ["network error", () => Promise.reject(new Error("offline"))],
    ["only unusable keys", () => keySetResponse([{ kty: "EC", kid: "k1" }])],
  ])(
    "fetches once per 30 s from a cold cell while the source fails (%s)",
    async (_label, respond) => {
      const { make, clock, cell } = setup();
      const failing = createKeyFetch(respond);
      const verifier = make(failing.fetch);
      for (let i = 0; i < 5; i += 1)
        expect(await verifier.verify(await sign(main))).toBe("key-source");
      expect(failing.calls).toHaveLength(1);
      clock.advance(29_999);
      expect(await verifier.verify(await sign(rotated))).toBe("key-source");
      expect(failing.calls).toHaveLength(1);
      clock.advance(1);
      expect(await verifier.verify(await sign(main))).toBe("key-source");
      expect(failing.calls).toHaveLength(2);
      expect(cell.keys.size).toBe(0);
      expect(cell.fetchedAtMs).toBeNull();
    },
  );

  it("recovers on the first request after the guard once the source is back", async () => {
    let up = false;
    const { make, clock } = setup();
    const flaky = createKeyFetch(() =>
      up ? keySetResponse([main.jwk]) : new Response("down", { status: 503 }),
    );
    const verifier = make(flaky.fetch);
    expect(await verifier.verify(await sign(main))).toBe("key-source");
    up = true;
    expect(await verifier.verify(await sign(main))).toBe("key-source");
    clock.advance(30_000);
    expect(await verifier.verify(await sign(main))).toBe("valid");
    expect(flaky.calls).toHaveLength(2);
  });

  const tooBig = JSON.stringify({ keys: [], pad: "x".repeat(70_000) });
  it.each([
    ["HTTP 500", () => new Response("no", { status: 500 })],
    ["HTTP 403", () => new Response("no", { status: 403 })],
    ["network error", () => Promise.reject(new Error("offline"))],
    ["bad JSON", () => new Response("{nope")],
    ["JSON null", () => new Response("null")],
    ["keys not an array", () => new Response(JSON.stringify({ keys: "k" }))],
    ["empty key set", () => keySetResponse([])],
    [
      "more than 20 keys",
      () => keySetResponse(Array.from({ length: 21 }, () => main.jwk)),
    ],
    ["body over 64 KiB", () => new Response(tooBig)],
    [
      "declared length over 64 KiB",
      () => new Response("{}", { headers: { "content-length": "70000" } }),
    ],
    [
      "only unusable keys",
      () =>
        keySetResponse([
          null,
          "x",
          { kty: "EC", kid: "k1" },
          { ...main.jwk, kid: undefined },
          { ...main.jwk, alg: "RS512" },
          { ...main.jwk, use: "enc" },
          { ...main.jwk, n: "!!" },
        ]),
    ],
  ])("denies key-source on %s and caches nothing", async (_label, respond) => {
    const { make, cell } = setup();
    const keyFetch = createKeyFetch(respond);
    expect(await make(keyFetch.fetch).verify(await sign(main))).toBe(
      "key-source",
    );
    expect(cell.keys.size).toBe(0);
    expect(cell.fetchedAtMs).toBeNull();
  });

  it("times out a hanging key source", async () => {
    const { make } = setup(undefined, 20);
    const hanging = createKeyFetch(
      (call) =>
        new Promise<Response>((_resolve, reject) => {
          call.init?.signal?.addEventListener("abort", () => {
            reject(new Error("aborted"));
          });
        }),
    );
    expect(await make(hanging.fetch).verify(await sign(main))).toBe(
      "key-source",
    );
  });

  it("rejects keys under 2048 bits but keeps the usable ones", async () => {
    const weak = await createAccessKeyPair({
      kid: "weak",
      modulusLength: 1024,
    });
    const { verifier, cell } = setup(() => [weak.jwk, main.jwk]);
    expect(await verifier.verify(await sign(weak))).toBe("unknown-key");
    expect([...cell.keys.keys()]).toEqual(["k1"]);
    const onlyWeak = setup(() => [weak.jwk]);
    expect(await onlyWeak.verifier.verify(await sign(weak))).toBe("key-source");
  });

  it("caches plain public JWK data only, never private members, Promises or CryptoKeys", async () => {
    const { verifier, cell } = setup(() => [main.privateJwk]);
    expect(await verifier.verify(await sign(main))).toBe("valid");
    const cached = cell.keys.get("k1");
    expect(cached).toBeDefined();
    expect(Object.keys(cached ?? {}).sort()).toEqual([
      "alg",
      "e",
      "ext",
      "kty",
      "n",
    ]);
    expect(cell.fetchedAtMs).toBe(START.getTime());
    expect(() => structuredClone(cell)).not.toThrow();
    expect(JSON.parse(JSON.stringify([...cell.keys.values()]))).toEqual([
      cached,
    ]);
    for (const value of [
      cell.keys,
      cell.fetchedAtMs,
      cell.lastMissRefetchAtMs,
      ...cell.keys.values(),
    ])
      expect(value).not.toBeInstanceOf(Promise);
  });

  it("keeps the cell plain after failures too", async () => {
    const { make, cell } = setup();
    await make(
      createKeyFetch(() => Promise.reject(new Error("offline"))).fetch,
    ).verify(await sign(main));
    expect(() => structuredClone(cell)).not.toThrow();
    expect(cell.lastMissRefetchAtMs).toBe(START.getTime());
  });
});
