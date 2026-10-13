import { describe, expect, it } from "vitest";
import { checkAccessClaims } from "./access-authorization";

const NOW = 1_700_000_000;
const expected = {
  teamDomain: "team.cloudflareaccess.com",
  audience: "aud-1",
  nowSeconds: NOW,
};
const base = {
  iss: "https://team.cloudflareaccess.com",
  aud: "aud-1",
  exp: NOW + 300,
  iat: NOW - 10,
};
const check = (claims: Record<string, unknown>) =>
  checkAccessClaims(claims, expected);
const denied = (error: string) => ({ ok: false, error });

describe("checkAccessClaims", () => {
  it("accepts complete claims", () => {
    expect(check(base).ok).toBe(true);
    expect(check({ ...base, nbf: NOW - 5 }).ok).toBe(true);
  });

  it.each([
    ["wrong issuer", { iss: "https://other.cloudflareaccess.com" }],
    ["missing issuer", { iss: undefined }],
    ["http issuer", { iss: "http://team.cloudflareaccess.com" }],
    ["trailing slash issuer", { iss: "https://team.cloudflareaccess.com/" }],
    ["non-string issuer", { iss: 5 }],
  ])("denies %s with issuer", (_label, patch) => {
    expect(check({ ...base, ...patch })).toEqual(denied("issuer"));
  });

  it.each([
    ["wrong string", "other"],
    ["array without it", ["x", "y"]],
    ["empty array", []],
    ["array with a non-string member", ["aud-1", 5]],
    ["missing", undefined],
    ["number", 5],
    ["null", null],
  ])("denies audience: %s", (_label, aud) => {
    expect(check({ ...base, aud })).toEqual(denied("audience"));
  });

  it("accepts aud as a string or as an array containing the audience", () => {
    expect(check({ ...base, aud: "aud-1" }).ok).toBe(true);
    expect(check({ ...base, aud: ["other", "aud-1"] }).ok).toBe(true);
  });

  it("applies the 60 s skew to exp (valid while now < exp + 60)", () => {
    expect(check({ ...base, exp: NOW - 59 }).ok).toBe(true);
    expect(check({ ...base, exp: NOW - 60 })).toEqual(denied("expired"));
    expect(check({ ...base, exp: NOW - 3600 })).toEqual(denied("expired"));
  });

  it("applies the 60 s skew to nbf (valid while now >= nbf - 60)", () => {
    expect(check({ ...base, nbf: NOW + 60 }).ok).toBe(true);
    expect(check({ ...base, nbf: NOW + 61 })).toEqual(denied("not-yet-valid"));
  });

  it("applies the 60 s skew to iat (valid while iat <= now + 60)", () => {
    expect(check({ ...base, iat: NOW + 60 }).ok).toBe(true);
    expect(check({ ...base, iat: NOW + 61 })).toEqual(denied("not-yet-valid"));
  });

  it.each([
    ["missing exp", { exp: undefined }],
    ["string exp", { exp: "1700000300" }],
    ["null exp", { exp: null }],
    ["string nbf", { nbf: "1" }],
    ["null nbf", { nbf: null }],
    ["string iat", { iat: "1" }],
    ["boolean iat", { iat: true }],
  ])("denies %s as malformed", (_label, patch) => {
    expect(check({ ...base, ...patch })).toEqual(denied("token-malformed"));
  });

  it.each(["exp", "nbf", "iat"])(
    "denies a non-finite %s as malformed",
    (field) => {
      for (const value of [Infinity, -Infinity, NaN])
        expect(check({ ...base, [field]: value })).toEqual(
          denied("token-malformed"),
        );
    },
  );

  it("denies the never-expiring exp 1e999 that JSON parses to Infinity", () => {
    const parsed = JSON.parse('{"exp":1e999}') as Record<string, unknown>;
    expect(check({ ...base, ...parsed })).toEqual(denied("token-malformed"));
  });

  it("judges issuer, then audience, then time", () => {
    const stale = { ...base, exp: NOW - 1000 };
    expect(check({ ...stale, iss: "x", aud: "y" })).toEqual(denied("issuer"));
    expect(check({ ...stale, aud: "y" })).toEqual(denied("audience"));
  });
});
