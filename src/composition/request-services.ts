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
  createMaterialsService,
  createSaleCatalogReader,
  createSuppliersService,
  type StockStore,
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
import { createDrizzleIntensiveInsightsReader } from "~/modules/workshops/infrastructure/drizzle-intensive-insights-reader";
import { createDrizzleIntensiveRequestInsightsReader } from "~/modules/intensive-requests/infrastructure/drizzle-intensive-request-insights-reader";
import { createDrizzleWorkshopSupplierLinesReader } from "~/modules/intensive-requests/infrastructure/drizzle-workshop-supplier-lines-reader";
import {
  createInsightsService,
  type InsightsUseCases,
} from "~/modules/insights";
import { createDrizzleOrderHistoryReader } from "~/modules/enrollments/infrastructure/drizzle-order-history-reader";
import { createDrizzleStudentActivityStore } from "~/modules/enrollments/infrastructure/drizzle-student-activity-store";
import { createPoliciesService, type PolicyUseCases } from "~/modules/policies";
import { createDrizzlePolicyRepository } from "~/modules/policies/infrastructure/drizzle-policy-repository";
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
import { createDrizzleIntensiveRepository } from "~/modules/workshops/infrastructure/drizzle-intensive-repository";
import { createDrizzleMonthlyWorkshopRepository } from "~/modules/workshops/infrastructure/drizzle-monthly-workshop-repository";
import { createDrizzleTurnoRepository } from "~/modules/workshops/infrastructure/drizzle-turno-repository";
import { createDrizzleWorkshopPeriodRepository } from "~/modules/workshops/infrastructure/drizzle-workshop-period-repository";
import { createDrizzleMaterialRepository } from "~/modules/materials/infrastructure/drizzle-material-repository";
import { createDrizzleStockStore } from "~/modules/materials/infrastructure/drizzle-stock-store";
import { createDrizzleAdminEnrollmentStore } from "~/modules/enrollments/infrastructure/drizzle-admin-enrollment-store";
import { createDrizzleOrderRepository } from "~/modules/enrollments/infrastructure/drizzle-order-repository";
import { createDrizzleOrderLineUsageLookup } from "~/modules/enrollments/infrastructure/drizzle-order-line-usage-lookup";
import { createDrizzleSeatLedger } from "~/modules/enrollments/infrastructure/drizzle-seat-ledger";
import { createConfirmedSeatsAdapter } from "./confirmed-seats-adapter";
import { createOrderStockAdapter } from "./order-stock-adapter";
import { createRequestStockAdapter } from "./request-stock-adapter";
import { createPolicyVersionAdapter } from "./policy-version-adapter";
import { createSaleCatalogAdapter } from "./sale-catalog-adapter";
import { createEnrollmentOfferAdapter } from "./enrollment-offer-adapter";
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
  withManualEnrollmentEmails,
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
  /** Units on hand per variant, for the hand-made enrollment's material search. */
  readonly variantStock: Pick<StockStore, "onHand">;
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
  /** The site-wide conditions and privacy documents, with their version history. */
  readonly policies: PolicyUseCases;
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
  // Variant stock. The same store is the port the paid-order flows join in
  // their own transaction (take on confirm, put on cancel); bind it there.
  const stockStore = createDrizzleStockStore(openSession);
  const orderStock = createOrderStockAdapter(stockStore);
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
        confirmedSeats: createConfirmedSeatsAdapter(seats),
        clock: systemClock,
      })
    : createUnavailableService<WorkshopPeriodsService>();
  const adminEnrollmentStore = createDrizzleAdminEnrollmentStore(
    openSession,
    {
      async find(periodId, turnoId) {
        const period = await periodRepository.findById(periodId);
        if (!period) return null;
        const turno = period.turnos.find((item) => item.turnoId === turnoId);
        return turno
          ? { status: period.status, capacity: turno.capacity }
          : null;
      },
    },
    orderStock,
  );
  const enrollmentOffers = createEnrollmentOfferAdapter(
    createWorkshopEnrollmentOfferLookup({
      workshops: workshopRepository,
      periods: periodRepository,
      clock: systemClock,
    }),
  );
  // The catalog an owner picks from, for a hand-made enrollment and for a material sale.
  const saleCatalog = createSaleCatalogAdapter(
    createSaleCatalogReader({
      materials: materialRepository,
      stock: stockStore,
    }),
  );
  // One service reads the documents for the public pages and answers both
  // forms' check of the versions a person accepted.
  const policies = createPoliciesService({
    repository: createDrizzlePolicyRepository(openSession),
    clock: systemClock,
  });
  const policyVersions = createPolicyVersionAdapter(policies);
  const publicEnrollments = seats
    ? createPublicEnrollmentService({
        offers: enrollmentOffers,
        // Monthly periods offer no materials, so a public request refuses any line.
        materials: { listForPeriod: () => Promise.resolve([]) },
        // Only an owner enrolling a student by hand may add catalog materials.
        adminMaterials: saleCatalog,
        orders: createDrizzleOrderRepository(openSession, orderStock),
        seats,
        clock: systemClock,
        random: {
          bytes: (length) => crypto.getRandomValues(new Uint8Array(length)),
        },
        policyVersion: "2026-10",
        policies: policyVersions,
      })
    : null;
  const enrollmentServices = publicEnrollments
    ? {
        publicEnrollments,
        enrollments: createAdminEnrollmentService({
          store: adminEnrollmentStore,
          clock: systemClock,
          // A correction picks its new workshop, month and turno here too.
          offers: enrollmentOffers,
          // A later material purchase under a monthly record, from the same catalog.
          sales: {
            store: adminEnrollmentStore,
            catalog: saleCatalog,
            random: {
              bytes: (length) => crypto.getRandomValues(new Uint8Array(length)),
            },
          },
          // Unwrapped on purpose: the manual-order emails are sent by
          // `withManualEnrollmentEmails`, by case (pending or free).
          createPending: (input, actorEmail, options) =>
            publicEnrollments.requestEnrollment(input, {
              createdBy: actorEmail,
              ...(options?.fee === undefined ? {} : { fee: options.fee }),
              ...(options?.paidAtIfFree === undefined
                ? {}
                : { paidAtIfFree: options.paidAtIfFree }),
            }),
        }),
        consolidation: createSupplierConsolidationService({
          store: adminEnrollmentStore,
          // Workshop lines the stock could not cover join the monthly list.
          workshopLines: createDrizzleWorkshopSupplierLinesReader(openSession),
        }),
      }
    : {
        publicEnrollments: createUnavailablePublicEnrollmentService(),
        enrollments: createUnavailableAdminEnrollmentService(),
        consolidation: createUnavailableSupplierConsolidationService(),
      };
  // One adapter serves the private-event use cases and the bell's novelty read.
  const privateEventRepository =
    createDrizzlePrivateEventRepository(openSession);
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
      media,
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
      stock: stockStore,
    }),
    variantStock: stockStore,
    ...enrollmentServices,
    publicEnrollments: withEnrollmentEmails(
      enrollmentServices.publicEnrollments,
      notifications,
      defer,
    ),
    enrollments: withManualEnrollmentEmails(
      withPaymentEmails(enrollmentServices.enrollments, notifications, defer),
      notifications,
      defer,
    ),
    notifications,
    emailEnabled,
    students: createStudentsService({
      orders: createDrizzleOrderHistoryReader(openSession),
      notes: createDrizzleStudentNoteRepository(openSession),
      activity: createDrizzleStudentActivityStore(openSession),
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
            repository: createDrizzleIntensiveRequestRepository(
              openSession,
              createRequestStockAdapter(stockStore),
            ),
            offers: createIntensiveSeatOfferLookup({
              repository: intensiveRepository,
              media,
              clock: systemClock,
            }),
            clock: systemClock,
            random: {
              bytes: (length) => crypto.getRandomValues(new Uint8Array(length)),
            },
            policies: policyVersions,
          }),
          notifications,
          defer,
        )
      : createUnavailableIntensiveRequestService(),
    policies,
    reminders: createRemindersService({
      orders: createDrizzleOrderHistoryReader(openSession),
      clock: systemClock,
    }),
    insights: createInsightsService({
      orders: createDrizzleEnrollmentInsightsReader(openSession),
      workshops: createDrizzleWorkshopInsightsReader(openSession),
      intensives: createDrizzleIntensiveInsightsReader(openSession),
      intensiveRequests:
        createDrizzleIntensiveRequestInsightsReader(openSession),
      privateEvents: privateEventRepository,
      teachers,
      clock: systemClock,
    }),
    privateEvents: withPrivateEventEmails(
      createPrivateEventService({
        repository: privateEventRepository,
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
        media,
        clock: systemClock,
      }),
      intensivos: createPublicIntensivosReader({
        records: createDrizzlePublicIntensivoRecords(openSession),
        teachers,
        media,
        clock: systemClock,
      }),
    },
  };
}
