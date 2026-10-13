import { describe, expect, it } from "vitest";
import { encodeSegment, unsignedToken } from "~/testing/access/access-tokens";
import { decodeAccessToken } from "./access-authorization";

const HEADER = { alg: "RS256", kid: "k1" };
const CLAIMS = { iss: "https://team.cloudflareaccess.com", email: "a@b.com" };
const raw = (value: string) => Buffer.from(value).toString("base64url");
/** A JSON object whose base64url form is exactly `chars` characters long (`chars` is a multiple of 4). */
const objectEncodedAs = (chars: number) => {
  const bytes = (chars / 4) * 3;
  const pad = bytes - JSON.stringify({ ...HEADER, p: "" }).length;
  return encodeSegment({ ...HEADER, p: "x".repeat(pad) });
};

describe("decodeAccessToken", () => {
  it("decodes a well-formed RS256 token into header, claims and signing bytes", () => {
    const token = unsignedToken(HEADER, CLAIMS, "c2ln");
    const result = decodeAccessToken(token);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.header).toEqual({ alg: "RS256", kid: "k1" });
    expect(result.value.claims).toEqual(CLAIMS);
    expect(new TextDecoder().decode(result.value.signingInput)).toBe(
      token.slice(0, token.lastIndexOf(".")),
    );
    expect([...result.value.signature]).toEqual([...Buffer.from("sig")]);
  });

  const good = encodeSegment(HEADER);
  const claims = encodeSegment(CLAIMS);
  it.each([
    ["empty string", ""],
    ["one segment", good],
    ["two segments", `${good}.${claims}`],
    ["four segments", `${good}.${claims}.c2ln.c2ln`],
    ["empty header", `.${claims}.c2ln`],
    ["empty payload", `${good}..c2ln`],
    ["empty signature", `${good}.${claims}.`],
    ["padding in a segment", `${good}=.${claims}.c2ln`],
    ["standard base64 alphabet", `${good}.${claims}+/.c2ln`],
    ["whitespace in a segment", `${good}.${claims} .c2ln`],
    ["header not base64url JSON", `${raw("not json")}.${claims}.c2ln`],
    ["payload not base64url JSON", `${good}.${raw("{broken")}.c2ln`],
    ["header is a string", `${encodeSegment("RS256")}.${claims}.c2ln`],
    ["header is an array", `${encodeSegment([HEADER])}.${claims}.c2ln`],
    ["header is null", `${encodeSegment(null)}.${claims}.c2ln`],
    ["payload is an array", `${good}.${encodeSegment([1])}.c2ln`],
    ["payload is a number", `${good}.${encodeSegment(7)}.c2ln`],
    [
      "invalid UTF-8 payload",
      `${good}.${Buffer.from([0xff, 0xfe]).toString("base64url")}.c2ln`,
    ],
    ["undecodable signature length", `${good}.${claims}.A`],
    ["header over 8 KiB", `${objectEncodedAs(8196)}.${claims}.c2ln`],
    ["payload over 8 KiB", `${good}.${objectEncodedAs(8196)}.c2ln`],
    [
      "signature over 8 KiB",
      `${good}.${claims}.${Buffer.alloc(6147).toString("base64url")}`,
    ],
  ])("rejects %s as malformed", (_label, token) => {
    expect(decodeAccessToken(token)).toEqual({
      ok: false,
      error: "token-malformed",
    });
  });

  it("accepts segments of exactly 8 KiB", () => {
    const token = `${objectEncodedAs(8192)}.${objectEncodedAs(8192)}.${Buffer.alloc(6144).toString("base64url")}`;
    expect(decodeAccessToken(token).ok).toBe(true);
  });

  it.each([
    ["none", "none"],
    ["HS256", "HS256"],
    ["RS512", "RS512"],
    ["PS256", "PS256"],
    ["ES256", "ES256"],
    ["lowercase rs256", "rs256"],
    ["trailing space", "RS256 "],
    ["empty string", ""],
    ["null", null],
    ["number", 256],
    ["array", ["RS256"]],
  ])("rejects alg %s", (_label, alg) => {
    expect(
      decodeAccessToken(unsignedToken({ alg, kid: "k1" }, CLAIMS)),
    ).toEqual({ ok: false, error: "algorithm" });
  });

  it("rejects a missing alg, and judges alg before kid", () => {
    expect(decodeAccessToken(unsignedToken({ kid: "k1" }, CLAIMS))).toEqual({
      ok: false,
      error: "algorithm",
    });
    expect(decodeAccessToken(unsignedToken({ alg: "none" }, CLAIMS))).toEqual({
      ok: false,
      error: "algorithm",
    });
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["null", null],
    ["number", 5],
    ["object", {}],
  ])("rejects a %s kid", (_label, kid) => {
    expect(
      decodeAccessToken(unsignedToken({ alg: "RS256", kid }, CLAIMS)),
    ).toEqual({ ok: false, error: "token-malformed" });
  });
});
