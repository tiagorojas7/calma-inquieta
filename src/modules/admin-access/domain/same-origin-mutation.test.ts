import { describe, expect, it } from "vitest";
import { isSameOriginMutation } from "./access-authorization";

const URL_ = "https://admin.example.com/admin/talleres";
const same = "https://admin.example.com";

describe("isSameOriginMutation", () => {
  it.each(["GET", "HEAD", "get", "head"])(
    "lets %s through without headers",
    (method) => {
      expect(
        isSameOriginMutation({
          method,
          url: URL_,
          origin: null,
          secFetchSite: null,
        }),
      ).toBe(true);
      expect(isSameOriginMutation({ method, url: URL_ })).toBe(true);
    },
  );

  it.each(["POST", "PUT", "PATCH", "DELETE", "OPTIONS", "patch", "PROPFIND"])(
    "accepts %s with its own origin and no Sec-Fetch-Site",
    (method) => {
      expect(
        isSameOriginMutation({
          method,
          url: URL_,
          origin: same,
          secFetchSite: null,
        }),
      ).toBe(true);
    },
  );

  it("accepts a same-origin Sec-Fetch-Site", () => {
    expect(
      isSameOriginMutation({
        method: "POST",
        url: URL_,
        origin: same,
        secFetchSite: "same-origin",
      }),
    ).toBe(true);
  });

  it.each([
    ["missing Origin", null],
    ["undefined Origin", undefined],
    ["empty Origin", ""],
    ["opaque Origin", "null"],
    ["other host", "https://evil.example"],
    ["subdomain", "https://x.admin.example.com"],
    ["parent domain", "https://example.com"],
    ["other scheme", "http://admin.example.com"],
    ["other port", "https://admin.example.com:8443"],
    ["trailing slash", "https://admin.example.com/"],
    ["with a path", "https://admin.example.com/admin"],
    ["uppercase scheme and host", "HTTPS://ADMIN.EXAMPLE.COM"],
    ["suffix trick", "https://admin.example.com.evil.example"],
  ])("rejects a POST with %s", (_label, origin) => {
    expect(
      isSameOriginMutation({
        method: "POST",
        url: URL_,
        origin,
        secFetchSite: null,
      }),
    ).toBe(false);
  });

  it.each([
    ["cross-site", "cross-site"],
    ["same-site", "same-site"],
    ["none", "none"],
    ["empty", ""],
    ["wrong case", "Same-Origin"],
    ["padded", " same-origin"],
  ])("rejects a present Sec-Fetch-Site that is %s", (_label, secFetchSite) => {
    expect(
      isSameOriginMutation({
        method: "POST",
        url: URL_,
        origin: same,
        secFetchSite,
      }),
    ).toBe(false);
  });

  it.each([
    ["malformed", "not a url", "https://admin.example.com"],
    ["opaque origin", "data:text/plain,x", "null"],
    ["file scheme", "file:///admin", "null"],
  ])("rejects a %s request URL", (_label, url, origin) => {
    expect(
      isSameOriginMutation({ method: "POST", url, origin, secFetchSite: null }),
    ).toBe(false);
  });

  it("follows the request URL's own origin, port included", () => {
    const url = "http://localhost:8787/admin/x";
    expect(
      isSameOriginMutation({
        method: "POST",
        url,
        origin: "http://localhost:8787",
        secFetchSite: null,
      }),
    ).toBe(true);
    expect(
      isSameOriginMutation({
        method: "POST",
        url,
        origin: "http://localhost:5173",
        secFetchSite: null,
      }),
    ).toBe(false);
  });
});
