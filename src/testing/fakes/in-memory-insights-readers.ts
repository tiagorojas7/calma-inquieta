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
} from "~/modules/enrollments";
import type {
  PeriodCapacityRow,
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
}
