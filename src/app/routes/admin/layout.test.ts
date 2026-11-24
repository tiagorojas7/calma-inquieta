import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { servicesContext } from "~/app/context";
import { adminAccessFor, deniedAccess } from "~/testing/fakes/admin-actor";
import { createUnavailableInsightsService } from "~/modules/insights";
import { createTestServices } from "~/testing/fakes/app-services";
import type { AppServices } from "~/composition/request-services";
import { loader, middleware } from "./layout";

function argsFor(
  adminAccess: AppServices["adminAccess"],
  path = "/admin",
  overrides: Partial<AppServices> = {},
) {
  const context = new RouterContextProvider();
  context.set(
    servicesContext,
    createTestServices({ adminAccess, ...overrides }),
  );
  return {
    request: new Request(`https://panel.example.test${path}`),
    params: {},
    context,
  };
}

async function runMiddleware(
  adminAccess: AppServices["adminAccess"],
  path?: string,
) {
  const next = vi.fn(() => Promise.resolve());
  const [first] = middleware;
  if (!first) throw new Error("layout exports no middleware");
  let status: number | null = null;
  try {
    await first(argsFor(adminAccess, path) as never, next as never);
  } catch (thrown) {
    status = (thrown as { init?: { status?: number } }).init?.status ?? -1;
  }
  return { next, status };
}

describe("admin layout middleware", () => {
  it("lets an admin through without throwing", async () => {
    const { status } = await runMiddleware(adminAccessFor());
    expect(status).toBeNull();
  });

  it.each([
    ["not evaluated", { kind: "not-evaluated" } as const],
    ["denied", deniedAccess("x@example.com")],
  ])(
    "stops %s requests with 403 before any loader runs",
    async (_name, access) => {
      const { next, status } = await runMiddleware(access);
      expect(status).toBe(403);
      expect(next).not.toHaveBeenCalled();
    },
  );

  it("applies to data requests too", async () => {
    const { next, status } = await runMiddleware(
      deniedAccess(),
      "/admin/profesores.data",
    );
    expect(status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });
});

const insightsWithCount = (
  unseenCount: AppServices["insights"]["unseenCount"],
) => ({
  insights: { ...createUnavailableInsightsService(), unseenCount },
});

describe("admin layout loader", () => {
  it("returns the signed-in email and the unopened-request count for the top bar", async () => {
    const seen: unknown[] = [];
    const overrides = insightsWithCount((actor) => {
      seen.push(actor);
      return Promise.resolve({ ok: true, value: 3 });
    });

    await expect(
      loader(
        argsFor(
          adminAccessFor("agus@example.com"),
          "/admin",
          overrides,
        ) as never,
      ),
    ).resolves.toEqual({ email: "agus@example.com", unseen: 3 });
    expect(seen).toEqual([
      expect.objectContaining({ email: "agus@example.com" }),
    ]);
  });

  it("hides the badge (null count) when the count is unavailable, never failing the page", async () => {
    await expect(
      loader(argsFor(adminAccessFor("agus@example.com")) as never),
    ).resolves.toEqual({ email: "agus@example.com", unseen: null });

    const rejecting = insightsWithCount(() =>
      Promise.reject(new Error("db down")),
    );
    await expect(
      loader(
        argsFor(
          adminAccessFor("agus@example.com"),
          "/admin",
          rejecting,
        ) as never,
      ),
    ).resolves.toEqual({ email: "agus@example.com", unseen: null });
  });

  it("refuses without an admin actor", () => {
    expect(() => loader(argsFor(deniedAccess()) as never)).toThrow();
  });
});
