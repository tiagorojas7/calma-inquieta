import type { AppServices } from "~/composition/request-services";
import { adminAccessFor } from "./admin-actor";
import { createFakePublicCatalog } from "./fake-public-catalog";
import { createUnavailableService } from "~/composition/unavailable-service";
import { err, ok } from "~/modules/_shared";
import { createSuppliersService } from "~/modules/materials";
import { createUnavailableAdminEnrollmentService } from "~/modules/enrollments";
import { createSiteContent } from "~/modules/site-content";
import type { SystemStatusView } from "~/modules/system-status";
import {
  buildRawSiteContent,
  createInMemorySiteContentSource,
} from "./in-memory-site-content-source";
import { fixedClock } from "./fixed-clock";
import { InMemorySupplierRepository } from "./in-memory-supplier-repository";

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
    intensives:
      createUnavailableService<
        import("~/modules/workshops").IntensivesService
      >(),
    suppliers: createSuppliersService({
      repository: new InMemorySupplierRepository(),
      clock: fixedClock(new Date("2026-10-05T12:00:00.000Z")),
      newId: () => "supplier-test",
    }),
    materials:
      createUnavailableService<
        import("~/modules/materials").MaterialsService
      >(),
    enrollments: createUnavailableAdminEnrollmentService(),
    publicEnrollments: {
      getOffer: () => Promise.resolve(err({ kind: "unavailable" as const })),
      requestEnrollment: () =>
        Promise.resolve(err({ kind: "unavailable" as const })),
      getOrderByPublicId: () =>
        Promise.resolve(err({ kind: "unavailable" as const })),
    },
    publicCatalog: createFakePublicCatalog(),
    ...overrides,
  };
}
