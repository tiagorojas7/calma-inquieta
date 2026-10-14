import { describe, expect, it } from "vitest";
import { withAdminHeaders } from "./admin-headers";

describe("withAdminHeaders", () => {
  it("preserves the response while applying the admin security boundary", async () => {
    const response = withAdminHeaders(
      new Response("private content", {
        status: 201,
        headers: {
          "Content-Type": "text/plain",
          "X-Frame-Options": "SAMEORIGIN",
        },
      }),
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("Content-Type")).toBe("text/plain");
    expect(Object.fromEntries(response.headers)).toMatchObject({
      "cache-control": "private, no-store",
      "content-security-policy": "frame-ancestors 'none'",
      "referrer-policy": "same-origin",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "x-robots-tag": "noindex, nofollow",
    });
    await expect(response.text()).resolves.toBe("private content");
  });
});
