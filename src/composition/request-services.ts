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
import {
  createAccessKeyCacheCell,
  type AccessKeyCacheCell,
} from "~/modules/admin-access/infrastructure/access-verifier";
import { createMediaService, type MediaService } from "~/modules/media";
import { createDrizzleMediaAssetRepository } from "~/modules/media/infrastructure/drizzle-media-asset-repository";
import { createR2ImageStorage } from "~/modules/media/infrastructure/r2-image-storage";
import { createUnavailableImageStorage } from "~/modules/media/infrastructure/unavailable-image-storage";
import type { R2BucketLike } from "~/platform/r2";
import {
  createTeacherLookup,
  createTeachersService,
  type TeachersService,
} from "~/modules/teachers";
import { createDrizzleTeacherRepository } from "~/modules/teachers/infrastructure/drizzle-teacher-repository";
import {
  createIntensivesService,
  createMonthlyWorkshopsService,
  createPeriodTurnoUsageLookup,
  createWorkshopPeriodsService,
  createWorkshopEnrollmentOfferLookup,
  createWorkshopOfferedMaterialIdsLookup,
  createIntensiveSeatOfferLookup,
  createPublicIntensivosReader,
  createPublicTalleresReader,
  createWorkshopPeriodLookup,
  createWorkshopScheduleLookup,
  type MonthlyWorkshopsService,
  type WorkshopPeriodsService,
  type IntensivesService,
  type PublicCatalogService,
} from "~/modules/workshops";
import {
  createOfferedMaterialSnapshotsLookup,
  createMaterialsService,
  createSuppliersService,
  type SuppliersService,
  type MaterialsService,
} from "~/modules/materials";
import { createDrizzleSupplierRepository } from "~/modules/materials/infrastructure/drizzle-supplier-repository";
import {
  createAdminEnrollmentService,
  createPublicEnrollmentService,
  createSupplierConsolidationService,
  createUnavailableAdminEnrollmentService,
  createUnavailableSupplierConsolidationService,
  type AdminEnrollmentUseCases,
  type PublicEnrollmentUseCases,
  type SupplierConsolidationUseCases,
} from "~/modules/enrollments";
import {
  createStudentsService,
  type StudentUseCases,
} from "~/modules/students";
import {
  createAttendanceService,
  type AttendanceUseCases,
} from "~/modules/attendance";
import { createDrizzleAttendanceRepository } from "~/modules/attendance/infrastructure/drizzle-attendance-repository";
import { createDrizzleTurnoRosterReader } from "~/modules/enrollments/infrastructure/drizzle-turno-roster-reader";
import { createDrizzleStudentNoteRepository } from "~/modules/students/infrastructure/drizzle-student-note-repository";
import {
  createRemindersService,
  type ReminderUseCases,
} from "~/modules/reminders";
import { createDrizzleEnrollmentInsightsReader } from "~/modules/enrollments/infrastructure/drizzle-insights-reader";
import { createDrizzleWorkshopInsightsReader } from "~/modules/workshops/infrastructure/drizzle-insights-reader";
import {
  createInsightsService,
  type InsightsUseCases,
} from "~/modules/insights";
import { createDrizzleOrderHistoryReader } from "~/modules/enrollments/infrastructure/drizzle-order-history-reader";
import {
  createPrivateEventService,
  type PrivateEventUseCases,
} from "~/modules/private-events";
import { createDrizzlePrivateEventRepository } from "~/modules/private-events/infrastructure/drizzle-private-event-repository";
import {
  createIntensiveRequestService,
  createUnavailableIntensiveRequestService,
  type IntensiveRequestUseCases,
} from "~/modules/intensive-requests";
import { createDrizzleIntensiveRequestRepository } from "~/modules/intensive-requests/infrastructure/drizzle-intensive-request-repository";
import { EMPTY_MEDIA_LOOKUP } from "./empty-public-catalog";
import { createDrizzleIntensiveRepository } from "~/modules/workshops/infrastructure/drizzle-intensive-repository";
import { createDrizzleMonthlyWorkshopRepository } from "~/modules/workshops/infrastructure/drizzle-monthly-workshop-repository";
import { createDrizzleTurnoRepository } from "~/modules/workshops/infrastructure/drizzle-turno-repository";
import { createDrizzleWorkshopPeriodRepository } from "~/modules/workshops/infrastructure/drizzle-workshop-period-repository";
import { createDrizzleMaterialRepository } from "~/modules/materials/infrastructure/drizzle-material-repository";
import { createDrizzleAdminEnrollmentStore } from "~/modules/enrollments/infrastructure/drizzle-admin-enrollment-store";
import { createDrizzleOrderRepository } from "~/modules/enrollments/infrastructure/drizzle-order-repository";
import { createDrizzleOrderLineUsageLookup } from "~/modules/enrollments/infrastructure/drizzle-order-line-usage-lookup";
import { createDrizzleSeatLedger } from "~/modules/enrollments/infrastructure/drizzle-seat-ledger";
import { createConfirmedSeatsAdapter } from "./confirmed-seats-adapter";
import { createEnrollmentOfferAdapter } from "./enrollment-offer-adapter";
import { createOfferedMaterialsAdapter } from "./offered-materials-adapter";
import { createDrizzlePublicIntensivoRecords } from "~/modules/workshops/infrastructure/drizzle-public-intensivo-records";
import { createDrizzlePublicTallerRecords } from "~/modules/workshops/infrastructure/drizzle-public-taller-records";
import {
  createDisabledEmailSender,
  createNotificationService,
  type NotificationService,
} from "~/modules/notifications";
import { createDrizzleOrderAudienceReader } from "~/modules/enrollments/infrastructure/drizzle-order-audience-reader";
import { createResendSender } from "~/platform/resend-email";
import {
  withEnrollmentEmails,
  withIntensiveRequestEmails,
  withPaymentEmails,
  withPrivateEventEmails,
} from "./notifying-services";
import { createUnavailableService } from "./unavailable-service";
import { err } from "~/modules/_shared";

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
  readonly enrollments: AdminEnrollmentUseCases;
  readonly consolidation: SupplierConsolidationUseCases;
  readonly publicEnrollments: PublicEnrollmentUseCases;
  readonly students: StudentUseCases;
  readonly attendance: AttendanceUseCases;
  readonly insights: InsightsUseCases;
  readonly reminders: ReminderUseCases;
  readonly publicCatalog: PublicCatalogService;
  readonly privateEvents: PrivateEventUseCases;
  readonly notifications: NotificationService;
  /** True only when both the Resend key and the sender address are configured. */
  readonly emailEnabled: boolean;
  readonly intensiveRequests: IntensiveRequestUseCases;
}

export interface RuntimeConfig {
  readonly databaseUrl: string;
  readonly buildCommit: string;
  readonly siteUrl: string;
  readonly indexingEnabled: boolean;
  /** `null` when the `MEDIA` binding is absent: images degrade, pages do not. */
  readonly mediaBucket: R2BucketLike | null;
  /** Absent or null keeps automatic email off (no key or no verified sender). */
  readonly email?: EmailConfig | null;
}

export interface EmailConfig {
  readonly apiKey: string;
  /** `Name <address>` of a domain verified in Resend. */
  readonly from: string;
}

// Static data with no connection to open: one reader serves every request (DS4).
const siteContent = createSiteContent(createRepositoryContentSource());

/** State that lives as long as the isolate and is shared by its requests. */
export interface IsolateState {
  readonly statusProbeMemo: ProbeMemoCell;
  readonly accessKeys: AccessKeyCacheCell;
}

export function createIsolateState(): IsolateState {
  return {
    statusProbeMemo: createProbeMemoCell(),
    accessKeys: createAccessKeyCacheCell(),
  };
}

function createUnavailablePublicEnrollmentService(): PublicEnrollmentUseCases {
  const unavailable = () =>
    Promise.resolve(err({ kind: "unavailable" as const }));
  return {
    getOffer: unavailable,
    requestEnrollment: unavailable,
    getOrderByPublicId: unavailable,
  };
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
  const teacherRepository = createDrizzleTeacherRepository(openSession);
  const teachers = createTeacherLookup(teacherRepository);
  const mediaAssets = createDrizzleMediaAssetRepository(openSession);
  const media = {
    findAssets: (ids: readonly string[]) => mediaAssets.findByIds(ids),
  };
  const periodRepository = createDrizzleWorkshopPeriodRepository(openSession);
  const workshopRepository =
    createDrizzleMonthlyWorkshopRepository(openSession);
  const materialRepository = createDrizzleMaterialRepository(
    openSession,
    createDrizzleOrderLineUsageLookup(openSession),
  );
  const turnoRepository = createDrizzleTurnoRepository(openSession);
  const intensiveRepository = createDrizzleIntensiveRepository(openSession);
  const seats = config.databaseUrl
    ? createDrizzleSeatLedger(openSession)
    : null;
  const workshopPeriods = seats
    ? createWorkshopPeriodsService({
        repository: periodRepository,
        workshops: workshopRepository,
        turnos: turnoRepository,
        teachers,
        materials: materialRepository,
        confirmedSeats: createConfirmedSeatsAdapter(seats),
        clock: systemClock,
      })
    : createUnavailableService<WorkshopPeriodsService>();
  const adminEnrollmentStore = createDrizzleAdminEnrollmentStore(openSession, {
    async find(periodId, turnoId) {
      const period = await periodRepository.findById(periodId);
      if (!period) return null;
      const turno = period.turnos.find((item) => item.turnoId === turnoId);
      return turno ? { status: period.status, capacity: turno.capacity } : null;
    },
  });
  const enrollmentServices = seats
    ? {
        publicEnrollments: createPublicEnrollmentService({
          offers: createEnrollmentOfferAdapter(
            createWorkshopEnrollmentOfferLookup({
              workshops: workshopRepository,
              periods: periodRepository,
              clock: systemClock,
            }),
          ),
          materials: createOfferedMaterialsAdapter(
            createWorkshopOfferedMaterialIdsLookup({
              periods: periodRepository,
            }),
            createOfferedMaterialSnapshotsLookup({
              materials: materialRepository,
              media,
            }),
          ),
          orders: createDrizzleOrderRepository(openSession),
          seats,
          clock: systemClock,
          random: {
            bytes: (length) => crypto.getRandomValues(new Uint8Array(length)),
          },
          policyVersion: "2026-10",
        }),
        enrollments: createAdminEnrollmentService({
          store: adminEnrollmentStore,
          clock: systemClock,
        }),
        consolidation: createSupplierConsolidationService({
          store: adminEnrollmentStore,
        }),
      }
    : {
        publicEnrollments: createUnavailablePublicEnrollmentService(),
        enrollments: createUnavailableAdminEnrollmentService(),
        consolidation: createUnavailableSupplierConsolidationService(),
      };
  const defer = (pending: Promise<unknown>) => {
    if (runtime.defer) runtime.defer(pending);
    else void pending;
  };
  const emailEnabled = Boolean(config.email);
  const notifications = createNotificationService({
    enabled: emailEnabled,
    sender: config.email
      ? createResendSender({
          apiKey: config.email.apiKey,
          from: config.email.from,
        })
      : createDisabledEmailSender(),
    audience: createDrizzleOrderAudienceReader(openSession),
    clock: systemClock,
    siteUrl: config.siteUrl,
    studioEmail: async () =>
      (await siteContent.getBusinessProfile()).email ?? null,
    // Names only: never a key, an address or a body.
    onFailure: (name) => {
      console.warn(`Email notification failed: ${name}`);
    },
  });
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
    media: createMediaService({
      storage: config.mediaBucket
        ? createR2ImageStorage(config.mediaBucket)
        : createUnavailableImageStorage(),
      repository: mediaAssets,
      clock: systemClock,
    }),
    teachers: createTeachersService({
      repository: teacherRepository,
      clock: systemClock,
    }),
    monthlyWorkshops: createMonthlyWorkshopsService({
      repository: workshopRepository,
      teachers,
      media: EMPTY_MEDIA_LOOKUP, // the gallery is not persisted yet (C4-B5)
      turnos: turnoRepository,
      turnoUsage: createPeriodTurnoUsageLookup(periodRepository),
      periods: createWorkshopPeriodLookup(periodRepository),
      clock: systemClock,
    }),
    workshopPeriods,
    intensives: createIntensivesService({
      repository: intensiveRepository,
      teachers,
      media,
      clock: systemClock,
    }),
    suppliers: createSuppliersService({
      repository: createDrizzleSupplierRepository(openSession),
      clock: systemClock,
    }),
    materials: createMaterialsService({
      repository: materialRepository,
      suppliers: createDrizzleSupplierRepository(openSession),
      media,
      clock: systemClock,
    }),
    ...enrollmentServices,
    publicEnrollments: withEnrollmentEmails(
      enrollmentServices.publicEnrollments,
      notifications,
      defer,
    ),
    enrollments: withPaymentEmails(
      enrollmentServices.enrollments,
      notifications,
      defer,
    ),
    notifications,
    emailEnabled,
    students: createStudentsService({
      orders: createDrizzleOrderHistoryReader(openSession),
      notes: createDrizzleStudentNoteRepository(openSession),
      clock: systemClock,
    }),
    attendance: createAttendanceService({
      schedule: createWorkshopScheduleLookup({
        workshops: workshopRepository,
        periods: periodRepository,
      }),
      roster: createDrizzleTurnoRosterReader(openSession),
      repository: createDrizzleAttendanceRepository(openSession),
      clock: systemClock,
    }),
    intensiveRequests: config.databaseUrl
      ? withIntensiveRequestEmails(
          createIntensiveRequestService({
            repository: createDrizzleIntensiveRequestRepository(openSession),
            offers: createIntensiveSeatOfferLookup({
              repository: intensiveRepository,
              clock: systemClock,
            }),
            clock: systemClock,
            random: {
              bytes: (length) => crypto.getRandomValues(new Uint8Array(length)),
            },
          }),
          notifications,
          defer,
        )
      : createUnavailableIntensiveRequestService(),
    reminders: createRemindersService({
      orders: createDrizzleOrderHistoryReader(openSession),
    }),
    insights: createInsightsService({
      orders: createDrizzleEnrollmentInsightsReader(openSession),
      workshops: createDrizzleWorkshopInsightsReader(openSession),
      clock: systemClock,
    }),
    privateEvents: withPrivateEventEmails(
      createPrivateEventService({
        repository: createDrizzlePrivateEventRepository(openSession),
        clock: systemClock,
      }),
      notifications,
      defer,
    ),
    // A real reader failure is not caught: it reaches the error boundary.
    publicCatalog: {
      talleres: createPublicTalleresReader({
        records: createDrizzlePublicTallerRecords(openSession),
        teachers,
        media: EMPTY_MEDIA_LOOKUP, // the real lookup lands in C4-B5
        clock: systemClock,
      }),
      intensivos: createPublicIntensivosReader({
        records: createDrizzlePublicIntensivoRecords(openSession),
        teachers,
        media: EMPTY_MEDIA_LOOKUP, // the real lookup lands in C4-B5
        clock: systemClock,
      }),
    },
  };
}
