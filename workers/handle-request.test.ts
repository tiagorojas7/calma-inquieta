import { describe, expect, it, vi } from "vitest";
import { createIsolateState } from "~/composition/request-services";
import { handleRequest, type RouterHandler } from "./app";

const env = {
  HYPERDRIVE: { connectionString: "postgres://user:pass@localhost:5432/db" },
  BUILD_COMMIT: "test",
  SITE_URL: "http://localhost:5173",
  SITE_INDEXING: "off",
  DEV_ADMIN_EMAIL: "owner@example.test",
  ADMIN_EMAILS: "owner@example.test",
  MEDIA: {
    put: () => Promise.resolve(),
    get: () => Promise.resolve(null),
    delete: () => Promise.resolve(),
  },
};

const runtime = { waitUntil: () => undefined };

function handler(response = new Response("route", { status: 200 })) {
  return vi.fn<RouterHandler>(() => Promise.resolve(response));
}

describe("handleRequest", () => {
  it.each(["/admin", "/ADMIN", "/%61dmin", "//admin", "/admin.data", "/%"])(
    "denies a non-local development request to %s without the dev identity",
    async (pathname) => {
      const route = handler();

      const response = await handleRequest(
        new Request(`https://calma.test${pathname}`),
        env,
        runtime,
        createIsolateState(),
        route,
        "development",
      );

      expect(response.status).toBe(403);
      if (pathname.endsWith(".data")) expect(route).not.toHaveBeenCalled();
      else
        expect(route.mock.calls[0]?.[0].url).toBe(
          "https://calma.test/sin-acceso",
        );
    },
  );

  it.each(["https://calma.test/admin", "http://127.0.0.1/admin"])(
    "does not enable the dev identity for a non-localhost request: %s",
    async (url) => {
      const route = handler();

      const response = await handleRequest(
        new Request(url),
        env,
        runtime,
        createIsolateState(),
        route,
        "development",
      );

      expect(response.status).toBe(403);
      expect(route.mock.calls[0]?.[0].url).toBe(
        `${new URL(url).origin}/sin-acceso`,
      );
    },
  );

  it("admits the allowlisted dev identity only for an http localhost request", async () => {
    const route = handler();

    const response = await handleRequest(
      new Request("http://localhost/admin"),
      env,
      runtime,
      createIsolateState(),
      route,
      "development",
    );

    expect(response.status).toBe(200);
    expect(route).toHaveBeenCalledOnce();
    expect(route.mock.calls[0]?.[0].url).toBe("http://localhost/admin");
  });

  it("reads inherited admin bindings from an otherwise valid Worker environment", async () => {
    class InheritedAdminBindings {
      get DEV_ADMIN_EMAIL() {
        return "owner@example.test";
      }

      get ADMIN_EMAILS() {
        return "owner@example.test";
      }
    }

    const route = handler();
    const inheritedBindings = Object.assign(new InheritedAdminBindings(), {
      HYPERDRIVE: env.HYPERDRIVE,
      BUILD_COMMIT: env.BUILD_COMMIT,
      SITE_URL: env.SITE_URL,
      SITE_INDEXING: env.SITE_INDEXING,
    });

    const response = await handleRequest(
      new Request("http://localhost/admin"),
      inheritedBindings,
      runtime,
      createIsolateState(),
      route,
      "development",
    );

    expect(response.status).toBe(200);
    expect(route).toHaveBeenCalledOnce();
    expect(route.mock.calls[0]?.[0].url).toBe("http://localhost/admin");
  });

  it("denies an https localhost development request without a JWT", async () => {
    const route = handler();

    const response = await handleRequest(
      new Request("https://localhost/admin"),
      env,
      runtime,
      createIsolateState(),
      route,
      "development",
    );

    expect(response.status).toBe(403);
    expect(route.mock.calls[0]?.[0].url).toBe("https://localhost/sin-acceso");
  });

  it.each(["https://calma.test/admin", "http://localhost/admin"])(
    "returns 500 for a production dev configuration anywhere: %s",
    async (url) => {
      const route = handler();

      const response = await handleRequest(
        new Request(url),
        env,
        runtime,
        createIsolateState(),
        route,
        "production",
      );

      expect(response.status).toBe(500);
      expect(route).not.toHaveBeenCalled();
    },
  );

  it.each(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])(
    "denies every unauthenticated admin %s before a handler can run",
    async (method) => {
      const headers =
        method === "GET" || method === "HEAD"
          ? {}
          : { Origin: "https://calma.test" };

      for (const pathname of [
        "/admin",
        "/ADMIN",
        "/%61dmin",
        "//admin",
        "/admin.data",
        "/%",
      ]) {
        const route = handler();
        const response = await handleRequest(
          new Request(`https://calma.test${pathname}`, { method, headers }),
          { ...env, DEV_ADMIN_EMAIL: undefined, ADMIN_EMAILS: "" },
          runtime,
          createIsolateState(),
          route,
          "production",
        );

        expect(response.status).toBe(403);
        if (pathname.endsWith(".data") || !["GET", "HEAD"].includes(method)) {
          expect(route).not.toHaveBeenCalled();
        } else {
          expect(route).toHaveBeenCalledOnce();
          expect(route.mock.calls[0]?.[0].url).toBe(
            "https://calma.test/sin-acceso",
          );
        }
      }
    },
  );

  it.each(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])(
    "denies unauthenticated admin %s before an admin route runs",
    async (method) => {
      const route = handler();
      const headers =
        method === "GET" || method === "HEAD"
          ? {}
          : { Origin: "https://calma.test" };
      const response = await handleRequest(
        new Request("https://calma.test//ADMIN/catalog", { method, headers }),
        { ...env, DEV_ADMIN_EMAIL: undefined, ADMIN_EMAILS: "" },
        runtime,
        createIsolateState(),
        route,
        "production",
      );

      expect(response.status).toBe(403);
      if (method === "GET" || method === "HEAD") {
        expect(route).toHaveBeenCalledOnce();
        expect(route.mock.calls[0]?.[0].url).toBe(
          "https://calma.test/sin-acceso",
        );
      } else {
        expect(route).not.toHaveBeenCalled();
      }
    },
  );

  it("redispatches denied documents to /sin-acceso with 403 and admin headers", async () => {
    const route = handler(new Response("denied page"));

    const response = await handleRequest(
      new Request("https://calma.test/admin"),
      { ...env, DEV_ADMIN_EMAIL: undefined, ADMIN_EMAILS: "" },
      runtime,
      createIsolateState(),
      route,
      "production",
    );

    expect(response.status).toBe(403);
    expect(await response.text()).toBe("denied page");
    expect(route.mock.calls[0]?.[0].url).toBe("https://calma.test/sin-acceso");
    expect(route.mock.calls[0]?.[0].method).toBe("GET");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("returns a bodyless denied document response to HEAD while preserving headers", async () => {
    const route = handler(new Response("denied page"));

    const response = await handleRequest(
      new Request("https://calma.test/admin", { method: "HEAD" }),
      { ...env, DEV_ADMIN_EMAIL: undefined, ADMIN_EMAILS: "" },
      runtime,
      createIsolateState(),
      route,
      "production",
    );

    expect(response.status).toBe(403);
    expect(await response.text()).toBe("");
    expect(route.mock.calls[0]?.[0].method).toBe("GET");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });

  it.each(["/admin.data", "/admin/items.data"])(
    "returns a plain 403 without route dispatch for %s",
    async (pathname) => {
      const route = handler();
      const response = await handleRequest(
        new Request(`https://calma.test${pathname}`),
        { ...env, DEV_ADMIN_EMAIL: undefined, ADMIN_EMAILS: "" },
        runtime,
        createIsolateState(),
        route,
        "production",
      );

      expect(response.status).toBe(403);
      expect(response.headers.get("content-type")).toContain("text/plain");
      expect(await response.text()).toBe("No tenés acceso al panel.");
      expect(route).not.toHaveBeenCalled();
      expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    },
  );

  it("returns a bodyless plain denial to HEAD .data without route dispatch", async () => {
    const route = handler();

    const response = await handleRequest(
      new Request("https://calma.test/admin.data", { method: "HEAD" }),
      { ...env, DEV_ADMIN_EMAIL: undefined, ADMIN_EMAILS: "" },
      runtime,
      createIsolateState(),
      route,
      "production",
    );

    expect(response.status).toBe(403);
    expect(await response.text()).toBe("");
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect(route).not.toHaveBeenCalled();
  });

  it("returns 500 without route dispatch for an invalid SITE_URL", async () => {
    const route = handler();

    const response = await handleRequest(
      new Request("https://calma.test/admin"),
      { ...env, SITE_URL: "not-a-url" },
      runtime,
      createIsolateState(),
      route,
      "production",
    );

    expect(response.status).toBe(500);
    expect(route).not.toHaveBeenCalled();
  });

  it("keeps public/status independent from invalid admin configuration", async () => {
    const route = handler(new Response("status"));

    const response = await handleRequest(
      new Request("https://calma.test/status"),
      { ...env, ACCESS_TEAM_DOMAIN: "not-a-domain", ADMIN_EMAILS: 1 },
      runtime,
      createIsolateState(),
      route,
      "development",
    );

    expect(response.status).toBe(200);
    expect(route).toHaveBeenCalledOnce();
    expect(response.headers.get("Cache-Control")).toBeNull();
  });

  it.each([404, 500])(
    "adds admin headers to an admin %i response",
    async (status) => {
      const response = await handleRequest(
        new Request("http://localhost/admin"),
        env,
        runtime,
        createIsolateState(),
        handler(new Response("failure", { status })),
        "development",
      );

      expect(response.status).toBe(status);
      expect(response.headers.get("Content-Security-Policy")).toBe(
        "frame-ancestors 'none'",
      );
    },
  );
});

describe("handleRequest without a usable MEDIA binding", () => {
  it("warns once and still serves public requests when MEDIA is absent", async () => {
    const envWithoutMedia = { ...env };
    delete envWithoutMedia.MEDIA;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const isolate = createIsolateState();

    expect(Object.hasOwn(envWithoutMedia, "MEDIA")).toBe(false);

    const firstResponse = await handleRequest(
      new Request("https://calma.test/"),
      envWithoutMedia,
      runtime,
      isolate,
      handler(new Response("home", { status: 200 })),
      "development",
    );
    const secondResponse = await handleRequest(
      new Request("https://calma.test/about"),
      envWithoutMedia,
      runtime,
      isolate,
      handler(new Response("about", { status: 200 })),
      "development",
    );

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith("MEDIA binding is unavailable.");
  });

  it("warns once for repeated requests with a malformed binding without exposing its value", async () => {
    const malformedMedia = { credential: "secret" };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const isolate = createIsolateState();
    const malformedEnv = { ...env, MEDIA: malformedMedia };

    const firstResponse = await handleRequest(
      new Request("https://calma.test/"),
      malformedEnv,
      runtime,
      isolate,
      handler(new Response("home", { status: 200 })),
      "development",
    );
    const secondResponse = await handleRequest(
      new Request("https://calma.test/about"),
      malformedEnv,
      runtime,
      isolate,
      handler(new Response("about", { status: 200 })),
      "development",
    );

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith("MEDIA binding is unavailable.");
    expect(warn).not.toHaveBeenCalledWith(
      expect.objectContaining(malformedMedia),
    );
  });

  it("warns once for each isolate with an unavailable binding", async () => {
    const envWithoutMedia = { ...env };
    delete envWithoutMedia.MEDIA;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const firstResponse = await handleRequest(
      new Request("https://calma.test/"),
      envWithoutMedia,
      runtime,
      createIsolateState(),
      handler(new Response("home", { status: 200 })),
      "development",
    );
    const secondResponse = await handleRequest(
      new Request("https://calma.test/about"),
      envWithoutMedia,
      runtime,
      createIsolateState(),
      handler(new Response("about", { status: 200 })),
      "development",
    );

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenNthCalledWith(1, "MEDIA binding is unavailable.");
    expect(warn).toHaveBeenNthCalledWith(2, "MEDIA binding is unavailable.");
  });

  it("does not warn for a structural R2 bucket", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const response = await handleRequest(
      new Request("https://calma.test/"),
      env,
      runtime,
      createIsolateState(),
      handler(new Response("home", { status: 200 })),
      "development",
    );

    expect(response.status).toBe(200);
    expect(warn).not.toHaveBeenCalled();
  });
});
