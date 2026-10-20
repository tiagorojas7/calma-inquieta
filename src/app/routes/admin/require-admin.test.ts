import { RouterContextProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { servicesContext } from "~/app/context";
import { adminAccessFor, deniedAccess } from "~/testing/fakes/admin-actor";
import { createTestServices } from "~/testing/fakes/app-services";
import type { AppServices } from "~/composition/request-services";
import { requireAdmin } from "./require-admin";

function contextWith(adminAccess: AppServices["adminAccess"]) {
  const context = new RouterContextProvider();
  context.set(servicesContext, createTestServices({ adminAccess }));
  return context;
}

function statusOf(run: () => unknown): number {
  try {
    run();
  } catch (thrown) {
    const init = (thrown as { init?: { status?: number } }).init;
    return init?.status ?? -1;
  }
  return 0;
}

const get = new Request("https://panel.example.test/admin");
const post = (headers: Record<string, string>) =>
  new Request("https://panel.example.test/admin/profesores", {
    method: "POST",
    headers,
  });

describe("requireAdmin", () => {
  it("returns the actor for an admin GET", () => {
    const actor = requireAdmin(
      get,
      contextWith(adminAccessFor("agus@example.com")),
    );
    expect(actor).toEqual({ kind: "admin-actor", email: "agus@example.com" });
  });

  it("denies with 403 when the request was not evaluated by the gate", () => {
    expect(
      statusOf(() => requireAdmin(get, contextWith({ kind: "not-evaluated" }))),
    ).toBe(403);
  });

  it("denies with 403 when the gate denied the request", () => {
    expect(
      statusOf(() =>
        requireAdmin(get, contextWith(deniedAccess("x@example.com"))),
      ),
    ).toBe(403);
  });

  it("denies with 403 an admin actor with a blank email", () => {
    const blank = {
      kind: "admin",
      actor: { kind: "admin-actor", email: " " },
    } as const;
    expect(statusOf(() => requireAdmin(get, contextWith(blank)))).toBe(403);
  });

  it("denies a cross-site mutation even for an admin", () => {
    const context = contextWith(adminAccessFor());
    expect(
      statusOf(() =>
        requireAdmin(
          post({
            Origin: "https://evil.example.test",
            "Sec-Fetch-Site": "cross-site",
          }),
          context,
        ),
      ),
    ).toBe(403);
  });

  it("allows a same-origin mutation by an admin", () => {
    const context = contextWith(adminAccessFor());
    expect(
      statusOf(() =>
        requireAdmin(
          post({
            Origin: "https://panel.example.test",
            "Sec-Fetch-Site": "same-origin",
          }),
          context,
        ),
      ),
    ).toBe(0);
  });
});
