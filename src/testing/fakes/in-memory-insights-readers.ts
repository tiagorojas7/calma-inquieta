import type {
  ConfirmedSeatsRow,
  EnrollmentInsightsReader,
  IncomeFilter,
  IncomeRow,
  InsightsPeriodFilter,
  MaterialRow,
  OrderCountRow,
  ParticipationRow,
  PendingSummary,
  PeriodRegistrationRow,
} from "~/modules/enrollments";
import type {
  IntensiveRegistrationRow,
  IntensiveRequestInsightsReader,
} from "~/modules/intensive-requests";
import type { Teacher, TeacherLookup } from "~/modules/teachers";
import type {
  IntensiveActivityRow,
  IntensiveInsightsReader,
  PeriodCapacityRow,
  PeriodTeacherRow,
  PublishedWorkshopRow,
  WorkshopInsightsReader,
} from "~/modules/workshops";

/**
 * Pre-aggregated rows served as they are, filtered by period like the SQL
 * readers; the calls are recorded so a test can assert what was asked for.
 */
export class InMemoryEnrollmentInsightsReader implements EnrollmentInsightsReader {
  orderCounts: OrderCountRow[] = [];
  seats: ConfirmedSeatsRow[] = [];
  incomeRows: IncomeRow[] = [];
  pending: PendingSummary = { total: 0, older: 0 };
  materialRows: MaterialRow[] = [];
  participationRow: ParticipationRow = { students: 0, recurring: 0 };
  registrationRows: (PeriodRegistrationRow & { period: string })[] = [];
  readonly incomeCalls: IncomeFilter[] = [];
  readonly pendingCalls: Date[] = [];
  readonly participationCalls: string[] = [];

  ordersByStatus({ period }: InsightsPeriodFilter) {
    return Promise.resolve(
      this.orderCounts.filter((row) => !period || row.period === period),
    );
  }

  confirmedSeats(periodIds: readonly string[]) {
    return Promise.resolve(
      this.seats.filter((row) => periodIds.includes(row.periodId)),
    );
  }

  income(filter: IncomeFilter) {
    this.incomeCalls.push(filter);
    return Promise.resolve(
      this.incomeRows.filter(
        (row) => !filter.period || row.period === filter.period,
      ),
    );
  }

  periodRegistrations(period: string) {
    return Promise.resolve(
      this.registrationRows.filter((row) => row.period === period),
    );
  }

  pendingSummary(olderThan: Date) {
    this.pendingCalls.push(olderThan);
    return Promise.resolve(this.pending);
  }

  materials({ period }: InsightsPeriodFilter) {
    return Promise.resolve(
      this.materialRows.filter((row) => !period || row.period === period),
    );
  }

  participation(period: string) {
    this.participationCalls.push(period);
    return Promise.resolve(this.participationRow);
  }
}

export class InMemoryWorkshopInsightsReader implements WorkshopInsightsReader {
  capacityRows: PeriodCapacityRow[] = [];
  published: PublishedWorkshopRow[] = [];
  teacherRows: (PeriodTeacherRow & { period: string })[] = [];
  readonly publishedCalls: string[] = [];

  capacity(period: string) {
    return Promise.resolve(
      this.capacityRows.filter((row) => row.period === period),
    );
  }

  publishedWorkshops(period: string) {
    this.publishedCalls.push(period);
    return Promise.resolve(this.published);
  }

  periodTeachers(period: string) {
    return Promise.resolve(
      this.teacherRows.filter((row) => row.period === period),
    );
  }
}

export class InMemoryIntensiveInsightsReader implements IntensiveInsightsReader {
  rows: IntensiveActivityRow[] = [];

  intensives(period: string) {
    return Promise.resolve(
      this.rows.filter((row) => row.eventDate.startsWith(`${period}-`)),
    );
  }
}

export class InMemoryIntensiveRequestInsightsReader implements IntensiveRequestInsightsReader {
  registrationRows: IntensiveRegistrationRow[] = [];
  pending = 0;

  registrations(intensiveIds: readonly string[]) {
    return Promise.resolve(
      this.registrationRows.filter((row) =>
        intensiveIds.includes(row.intensiveId),
      ),
    );
  }

  pendingRequests() {
    return Promise.resolve(this.pending);
  }
}

/** Teachers by id: only the name and modality the statistics read. */
export class InMemoryTeacherDirectory implements TeacherLookup {
  readonly teachers = new Map<string, Teacher>();

  add(id: string, name: string, modality: Teacher["modality"]) {
    this.teachers.set(id, {
      id,
      name,
      bioLine: "",
      phone: null,
      email: null,
      modality,
      active: true,
      audit: { updatedBy: "owner@example.com", updatedAt: new Date(0) },
    });
  }

  findByIds(ids: readonly string[]) {
    const found = new Map<string, Teacher>();
    for (const id of ids) {
      const teacher = this.teachers.get(id);
      if (teacher) found.set(id, teacher);
    }
    return Promise.resolve<ReadonlyMap<string, Teacher>>(found);
  }
}
