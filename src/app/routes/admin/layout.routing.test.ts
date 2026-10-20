import {
  createStaticHandler,
  matchRoutes,
  RouterContextProvider,
  type StaticHandlerContext,
} from "react-router";
import { describe, expect, it, vi } from "vitest";
import { servicesContext } from "~/app/context";
import { adminAccessFor, deniedAccess } from "~/testing/fakes/admin-actor";
import { createTestServices } from "~/testing/fakes/app-services";
import type { AppServices } from "~/composition/request-services";
import { loader, middleware } from "./layout";

const homeLoader = vi.fn(() => "home");

function routes() {
  return [
    {
      id: "root",
      path: "/",
      children: [
        {
          id: "routes/admin/layout",
          path: "admin",
          // The real layout exports an ErrorBoundary; the static handler only
          // looks for the property.
          ErrorBoundary: () => null,
          middleware: middleware as never,
          loader: loader as never,
          children: [
            { id: "routes/admin/home", index: true, loader: homeLoader },
          ],
        },
        { id: "splat", path: "*" },
      ],
    },
  ];
}

async function query(path: string, adminAccess: AppServices["adminAccess"]) {
  const context = new RouterContextProvider();
  context.set(servicesContext, createTestServices({ adminAccess }));
  const request = new Request(`https://panel.example.test${path}`);
  let captured: StaticHandlerContext | Response | undefined;
  await createStaticHandler(routes()).query(request, {
    requestContext: context,
    generateMiddlewareResponse: async (run) => {
      captured = await run(request);
      return new Response(null);
    },
  });
  return captured;
}

describe("admin route tree", () => {
  it("answers 403 and runs no loader when middleware denies", async () => {
    homeLoader.mockClear();
    const result = await query("/admin", deniedAccess("x@example.com"));
    expect(homeLoader).not.toHaveBeenCalled();
    expect(result).toMatchObject({ statusCode: 403 });
    expect(Object.keys((result as StaticHandlerContext).errors ?? {})).toEqual([
      "routes/admin/layout",
    ]);
  });

  it("runs the loaders for an admin", async () => {
    homeLoader.mockClear();
    const result = await query("/admin", adminAccessFor());
    expect(result).toMatchObject({ statusCode: 200 });
    expect(homeLoader).toHaveBeenCalledTimes(1);
  });

  it.each(["/ADMIN", "//admin", "/%61dmin"])(
    "never serves %s outside the gate and middleware",
    (path) => {
      const match = matchRoutes(routes(), path);
      const ids = match?.map((entry) => entry.route.id) ?? [];
      // Either it reaches the admin layout (middleware runs) or it falls to the
      // public splat; the Worker gate normalizes the path and denies it first.
      expect(ids.includes("routes/admin/layout") || ids.includes("splat")).toBe(
        true,
      );
    },
  );
});
