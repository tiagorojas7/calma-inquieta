import { describe, expect, it } from "vitest";
import { ADMIN_DENIED_PATH } from "~/composition/admin-gate";
import { deniedAccess } from "~/testing/fakes/admin-actor";
import { createTestServices } from "~/testing/fakes/app-services";
import { createLoaderArgs } from "~/testing/react-router";
import routes from "../routes";
import { headers, loader } from "./admin-denied";

function run(identityEmail: string | null) {
  return loader(
    createLoaderArgs(
      createTestServices({ adminAccess: deniedAccess(identityEmail) }),
      ADMIN_DENIED_PATH,
    ) as never,
  );
}

describe("denial route", () => {
  it("is registered at the path the Worker gate re-dispatches to", () => {
    expect(
      routes.some((entry) => entry.path === ADMIN_DENIED_PATH.slice(1)),
    ).toBe(true);
  });

  it("answers 403 and carries the verified identity email", () => {
    const result = run("typo@example.com");
    expect(result.init?.status).toBe(403);
    expect(result.data).toEqual({ email: "typo@example.com" });
  });

  it("answers 403 without email when there is none", () => {
    const result = run(null);
    expect(result.init?.status).toBe(403);
    expect(result.data).toEqual({ email: null });
  });

  it("is never cached or indexed", () => {
    expect(headers()).toEqual({
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    });
  });
});
