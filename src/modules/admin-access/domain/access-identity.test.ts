import { describe, expect, it } from "vitest";
import {
  isAllowlisted,
  normalizeAllowlist,
  readAccessIdentity,
} from "./access-authorization";

describe("readAccessIdentity", () => {
  it("returns the trimmed, lowercased email", () => {
    expect(readAccessIdentity({ email: " Owner@Example.COM " })).toEqual({
      ok: true,
      value: "owner@example.com",
    });
  });

  it.each([
    ["service token without email", { common_name: "svc.access" }],
    [
      "service token with an empty email",
      { common_name: "svc.access", email: "" },
    ],
    [
      "common_name next to a valid email",
      { common_name: "svc.access", email: "owner@example.com" },
    ],
    ["empty common_name", { common_name: "", email: "owner@example.com" }],
    ["null common_name", { common_name: null, email: "owner@example.com" }],
  ])("denies %s as service-token", (_label, claims) => {
    expect(readAccessIdentity(claims)).toEqual({
      ok: false,
      error: "service-token",
    });
  });

  it.each([
    ["missing", undefined],
    ["null", null],
    ["number", 7],
    ["array", ["a@b.com"]],
    ["empty", ""],
    ["blank", "   "],
    ["not an email", "owner"],
    ["no local part", "@example.com"],
    ["no domain", "owner@"],
    ["inner whitespace", "own er@example.com"],
    ["two at signs", "a@b@example.com"],
    ["non-ASCII (Kelvin sign folds to k)", "Kevin@example.com"],
    ["non-ASCII domain", "owner@exämple.com"],
  ])("denies a %s email as no-email", (_label, email) => {
    expect(readAccessIdentity({ email })).toEqual({
      ok: false,
      error: "no-email",
    });
  });
});

describe("allowlist", () => {
  it("trims, lowercases and drops empty entries", () => {
    expect([
      ...normalizeAllowlist([" Cami@Example.com ", "", "   ", "B@x.com"]),
    ]).toEqual(["cami@example.com", "b@x.com"]);
  });

  it.each([
    ["exact", "cami@example.com", true],
    ["case-insensitive", "CAMI@EXAMPLE.COM", true],
    ["surrounding whitespace", "  cami@example.com\t", true],
    ["unlisted", "viewer@example.com", false],
    ["suffix of a listed email", "cami@example.com.evil", false],
    ["prefix of a listed email", "xcami@example.com", false],
    ["empty", "", false],
  ])("matches %s", (_label, email, expected) => {
    expect(
      isAllowlisted(email, ["Cami@Example.com ", "other@example.com"]),
    ).toBe(expected);
  });

  it("never matches against an empty or blank-only list", () => {
    expect(isAllowlisted("", [])).toBe(false);
    expect(isAllowlisted("", ["", "  "])).toBe(false);
    expect(isAllowlisted("a@b.com", [])).toBe(false);
  });
});
