import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { AppServices } from "~/composition/request-services";
import { err, ok } from "~/modules/_shared";
import type { SystemStatusView } from "~/modules/system-status";
import { createTestServices } from "~/testing/fakes/app-services";
import { createLoaderArgs } from "~/testing/react-router";
import Status, { headers, loader, meta } from "./status";

const OK_VIEW: SystemStatusView = {
  status: "ok",
  checks: [
    { name: "database", status: "pass" },
    { name: "migrations", status: "pass" },
  ],
  latestMigration: "0000_baseline",
  buildCommit: "abc123",
  checkedAt: "2026-10-05T12:00:00.000Z",
};

const DEGRADED_VIEW: SystemStatusView = {
  status: "degraded",
  checks: [
    { name: "database", status: "fail" },
    { name: "migrations", status: "fail" },
  ],
  latestMigration: null,
  buildCommit: "abc123",
  checkedAt: "2026-10-05T12:00:00.000Z",
};

const servicesReturning = (view: SystemStatusView): AppServices =>
  createTestServices({ getSystemStatus: () => Promise.resolve(ok(view)) });

// The loader returns `data(view, { status })`: assert on its two parts.
async function runLoader(view: SystemStatusView) {
  const result = (await loader(
    createLoaderArgs(servicesReturning(view)) as never,
  )) as unknown as { data: unknown; init: { status: number } };
  return result;
}

describe("status loader", () => {
  it("answers 200 with the view when the system is ok", async () => {
    const { data, init } = await runLoader(OK_VIEW);

    expect(init.status).toBe(200);
    expect(data).toEqual(OK_VIEW);
  });

  it("answers 503 with the same payload shape when degraded", async () => {
    const { data, init } = await runLoader(DEGRADED_VIEW);

    expect(init.status).toBe(503);
    expect(data).toEqual(DEGRADED_VIEW);
    expect(Object.keys(data as object).sort()).toEqual(
      Object.keys(OK_VIEW).sort(),
    );
  });

  it("exposes only the allowed fields, whatever the use case returns", async () => {
    const leaky = {
      ...DEGRADED_VIEW,
      error: "connect ECONNREFUSED secret-host.internal:5432",
      stack: "Error: boom\n    at secret-host",
      connectionString: "postgres://user:secret-pw@secret-host/db",
    } as SystemStatusView;

    const { data } = await runLoader(leaky);

    const serialized = JSON.stringify(data);
    expect(serialized).not.toContain("secret-host");
    expect(serialized).not.toContain("secret-pw");
    expect(serialized).not.toContain("ECONNREFUSED");
    expect(Object.keys(data as object).sort()).toEqual([
      "buildCommit",
      "checkedAt",
      "checks",
      "latestMigration",
      "status",
    ]);
  });

  it("throws instead of returning the error when the use case breaks its contract", async () => {
    const broken = {
      getSystemStatus: () => Promise.resolve(err("contract breach")),
    } as unknown as AppServices;

    await expect(loader(createLoaderArgs(broken) as never)).rejects.toThrow(
      "getSystemStatus broke its contract",
    );
  });
});

describe("status route exports", () => {
  it("sets no-store caching and blocks indexing in the headers", () => {
    expect(headers()).toEqual({
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    });
  });

  it("declares a noindex robots meta tag and a title", () => {
    const tags = meta();

    expect(tags).toContainEqual({ title: "System status" });
    expect(tags).toContainEqual({
      name: "robots",
      content: "noindex, nofollow",
    });
  });
});

describe("status page", () => {
  const render = (view: SystemStatusView) =>
    renderToStaticMarkup(createElement(Status, { loaderData: view } as never));

  it("renders data-status ok with the build and migration", () => {
    const html = render(OK_VIEW);

    expect(html).toContain('data-status="ok"');
    expect(html).toContain("0000_baseline");
    expect(html).toContain("abc123");
    expect(html).toContain("2026-10-05T12:00:00.000Z");
  });

  it("renders data-status degraded with the failing checks", () => {
    const html = render(DEGRADED_VIEW);

    expect(html).toContain('data-status="degraded"');
    expect(html).not.toContain('data-status="ok"');
    expect(html).toContain("database");
    expect(html).toContain("fail");
  });
});
