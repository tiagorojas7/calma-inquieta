import type { OrderStatus } from "../domain/order-core";

/** A period is `YYYY-MM`; omitting it reads every period. */
export interface InsightsPeriodFilter {
  readonly period?: string;
}

export interface OrderCountRow {
  readonly workshopId: string;
  readonly workshopName: string;
  readonly turnoId: string;
  readonly turnoLabel: string;
  readonly periodId: string;
  readonly period: string;
  readonly status: OrderStatus;
  readonly orders: number;
}

export interface ConfirmedSeatsRow {
  readonly periodId: string;
  readonly turnoId: string;
  readonly confirmedSeats: number;
}

/** Registered income: paid orders only, split into fee and materials. */
export interface IncomeFilter extends InsightsPeriodFilter {
  /** Payments registered at or after this instant. */
  readonly paidFrom?: Date;
  /** Payments registered before this instant. */
  readonly paidTo?: Date;
}

export interface IncomeRow {
  readonly workshopId: string;
  readonly workshopName: string;
  readonly period: string;
  readonly orders: number;
  readonly feeCentavos: number;
  readonly materialsCentavos: number;
}

export interface PendingSummary {
  readonly total: number;
  /** Pending orders requested before the cutoff. */
  readonly older: number;
}

export interface MaterialRow {
  readonly status: OrderStatus;
  readonly workshopId: string;
  readonly workshopName: string;
  readonly period: string;
  readonly supplierId: string;
  readonly supplierName: string;
  readonly materialName: string;
  readonly orders: number;
  readonly units: number;
  readonly amountCentavos: number;
}

export interface ParticipationRow {
  /** Students with a confirmed order in the period. */
  readonly students: number;
  /** Those who also have a confirmed order in another period. */
  readonly recurring: number;
}

/**
 * Aggregations other modules read for statistics. Every method returns
 * already-grouped rows, so no consumer loads orders to count them.
 */
export interface EnrollmentInsightsReader {
  ordersByStatus(
    filter: InsightsPeriodFilter,
  ): Promise<readonly OrderCountRow[]>;
  confirmedSeats(
    periodIds: readonly string[],
  ): Promise<readonly ConfirmedSeatsRow[]>;
  income(filter: IncomeFilter): Promise<readonly IncomeRow[]>;
  pendingSummary(olderThan: Date): Promise<PendingSummary>;
  /** Material lines of orders that are not cancelled. */
  materials(filter: InsightsPeriodFilter): Promise<readonly MaterialRow[]>;
  participation(period: string): Promise<ParticipationRow>;
}
