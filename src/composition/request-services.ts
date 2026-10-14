import { createSiteContent, type SiteContent } from "~/modules/site-content";
import { createRepositoryContentSource } from "~/modules/site-content/infrastructure/repository-content-source";
import {
  createGetSystemStatus,
  createMemoizedDatabaseProbe,
  createProbeMemoCell,
  type GetSystemStatus,
  type ProbeMemoCell,
} from "~/modules/system-status";
import { createDrizzleDatabaseProbe } from "~/modules/system-status/infrastructure/drizzle-database-probe";
import { createDbSessionFactory } from "~/platform/db/session";
import { systemClock } from "~/platform/system-clock";
import type { AdminAccessState } from "~/modules/admin-access";
import type { MediaService } from "~/modules/media";
import type { TeachersService } from "~/modules/teachers";
import type {
  MonthlyWorkshopsService,
  WorkshopPeriodsService,
  IntensivesService,
  PublicCatalogService,
} from "~/modules/workshops";
import type { SuppliersService, MaterialsService } from "~/modules/materials";
import {
  EMPTY_PUBLIC_INTENSIVOS,
  EMPTY_PUBLIC_TALLERES,
} from "./empty-public-catalog";
import { createUnavailableService } from "./unavailable-service";

/** How long `/status` reuses the last database probe (design D12). */
const STATUS_PROBE_TTL_MS = 60_000;

/** What the pages need to know about the deployment they run in. */
export interface SiteConfig {
  readonly baseUrl: string;
  readonly indexingEnabled: boolean;
}

export interface AppServices {
  readonly getSystemStatus: GetSystemStatus;
  readonly siteContent: SiteContent;
  readonly site: SiteConfig;
  readonly adminAccess: AdminAccessState;
  readonly media: MediaService;
  readonly teachers: TeachersService;
  readonly monthlyWorkshops: MonthlyWorkshopsService;
  readonly workshopPeriods: WorkshopPeriodsService;
  readonly intensives: IntensivesService;
  readonly suppliers: SuppliersService;
  readonly materials: MaterialsService;
  readonly publicCatalog: PublicCatalogService;
}

export interface RuntimeConfig {
  readonly databaseUrl: string;
  readonly buildCommit: string;
  readonly siteUrl: string;
  readonly indexingEnabled: boolean;
}

// Static data with no connection to open: one reader serves every request (DS4).
const siteContent = createSiteContent(createRepositoryContentSource());

/** State that lives as long as the isolate and is shared by its requests. */
export interface IsolateState {
  readonly statusProbeMemo: ProbeMemoCell;
}

export function createIsolateState(): IsolateState {
  return { statusProbeMemo: createProbeMemoCell() };
}

/**
 * The only place adapters are instantiated (design 5.2). Built per request,
 * so connections stay request-scoped; only `isolate` outlives the request.
 */
export function createRequestServices(
  config: RuntimeConfig,
  runtime: { defer?: (pending: Promise<unknown>) => void },
  isolate: IsolateState,
): AppServices {
  const openSession = createDbSessionFactory({
    connectionString: config.databaseUrl,
    ...(runtime.defer ? { defer: runtime.defer } : {}),
  });
  const probe = createMemoizedDatabaseProbe(
    createDrizzleDatabaseProbe(openSession),
    {
      clock: systemClock,
      ttlMs: STATUS_PROBE_TTL_MS,
      cell: isolate.statusProbeMemo,
    },
  );
  return {
    getSystemStatus: createGetSystemStatus({
      probe,
      clock: systemClock,
      buildCommit: config.buildCommit,
    }),
    siteContent,
    site: {
      baseUrl: config.siteUrl,
      indexingEnabled: config.indexingEnabled,
    },
    adminAccess: { kind: "not-evaluated" },
    media: createUnavailableService<MediaService>(),
    teachers: createUnavailableService<TeachersService>(),
    monthlyWorkshops: createUnavailableService<MonthlyWorkshopsService>(),
    workshopPeriods: createUnavailableService<WorkshopPeriodsService>(),
    intensives: createUnavailableService<IntensivesService>(),
    suppliers: createUnavailableService<SuppliersService>(),
    materials: createUnavailableService<MaterialsService>(),
    // Fail-soft until each reader lands (design PC3): empty, never a 5xx.
    publicCatalog: {
      talleres: EMPTY_PUBLIC_TALLERES,
      intensivos: EMPTY_PUBLIC_INTENSIVOS,
    },
  };
}
