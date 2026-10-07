import { describe, expect, it } from "vitest";
import { ok } from "~/modules/_shared";
import type { SystemStatusView } from "~/modules/system-status";
import { createTestServices } from "./app-services";
import {
  buildRawSiteContent,
  createInMemorySiteContentSource,
} from "./in-memory-site-content-source";
import { createSiteContent } from "~/modules/site-content";

const VIEW: SystemStatusView = {
  status: "ok",
  checks: [
    { name: "database", status: "pass" },
    { name: "migrations", status: "pass" },
  ],
  latestMigration: "0000_baseline",
  buildCommit: "test",
  checkedAt: "2026-10-05T12:00:00.000Z",
};

describe("createTestServices", () => {
  it("resolves an ok status, serves in-memory content and a fixed site config", async () => {
    const services = createTestServices();

    const status = await services.getSystemStatus();
    const profile = await services.siteContent.getBusinessProfile();

    expect(status.ok).toBe(true);
    expect(status.ok && status.value.status).toBe("ok");
    expect(profile.whatsapp.display).toBe("351 000 0000");
    expect(services.site).toEqual({
      baseUrl: "https://example.test",
      indexingEnabled: false,
    });
  });

  it("replaces one field and keeps the other defaults", async () => {
    const services = createTestServices({
      getSystemStatus: () => Promise.resolve(ok(VIEW)),
    });
    const other = createTestServices({
      site: { baseUrl: "https://otro.test", indexingEnabled: true },
    });

    const status = await services.getSystemStatus();

    expect(status.ok && status.value.buildCommit).toBe("test");
    expect(services.site.baseUrl).toBe("https://example.test");
    expect(other.site).toEqual({
      baseUrl: "https://otro.test",
      indexingEnabled: true,
    });
    expect((await other.getSystemStatus()).ok).toBe(true);
  });

  it("accepts a site content reader of its own", async () => {
    const base = buildRawSiteContent();
    const siteContent = createSiteContent(
      createInMemorySiteContentSource({
        ...base,
        contact: { ...base.contact, heading: "Otro" },
      }),
    );

    const services = createTestServices({ siteContent });

    expect((await services.siteContent.getContactPage()).heading).toBe("Otro");
  });
});
