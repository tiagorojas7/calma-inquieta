import type { AppServices } from "~/composition/request-services";
import { ok } from "~/modules/_shared";
import { createSiteContent } from "~/modules/site-content";
import type { SystemStatusView } from "~/modules/system-status";
import {
  buildRawSiteContent,
  createInMemorySiteContentSource,
} from "./in-memory-site-content-source";

const OK_VIEW: SystemStatusView = {
  status: "ok",
  checks: [
    { name: "database", status: "pass" },
    { name: "migrations", status: "pass" },
  ],
  latestMigration: "0000_baseline",
  buildCommit: "test",
  checkedAt: "2026-10-05T12:00:00.000Z",
};

/**
 * Request services for route and loader tests: an ok status, content from the
 * in-memory source and a fixed, non-indexable site. An override replaces one field.
 */
export function createTestServices(
  overrides: Partial<AppServices> = {},
): AppServices {
  return {
    getSystemStatus: () => Promise.resolve(ok(OK_VIEW)),
    siteContent: createSiteContent(
      createInMemorySiteContentSource(buildRawSiteContent()),
    ),
    site: { baseUrl: "https://example.test", indexingEnabled: false },
    ...overrides,
  };
}
