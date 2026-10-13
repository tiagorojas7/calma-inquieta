import type { AppServices } from "~/composition/request-services";
import { adminAccessFor } from "./admin-actor";
import { createUnavailableService } from "~/composition/unavailable-service";
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
export function createAdminTestServices(
  overrides: Partial<AppServices> = {},
): AppServices {
  return createTestServices({ adminAccess: adminAccessFor(), ...overrides });
}

export function createTestServices(
  overrides: Partial<AppServices> = {},
): AppServices {
  return {
    getSystemStatus: () => Promise.resolve(ok(OK_VIEW)),
    siteContent: createSiteContent(
      createInMemorySiteContentSource(buildRawSiteContent()),
    ),
    site: { baseUrl: "https://example.test", indexingEnabled: false },
    adminAccess: { kind: "not-evaluated" },
    media: createUnavailableService<import("~/modules/media").MediaService>(),
    teachers:
      createUnavailableService<import("~/modules/teachers").TeachersService>(),
    monthlyWorkshops:
      createUnavailableService<
        import("~/modules/workshops").MonthlyWorkshopsService
      >(),
    workshopPeriods:
      createUnavailableService<
        import("~/modules/workshops").WorkshopPeriodsService
      >(),
    ...overrides,
  };
}
