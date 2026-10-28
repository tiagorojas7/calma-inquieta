import type { AdminFailure, Invalid, Money, Result } from "~/modules/_shared";
import type { AdminActor } from "~/modules/admin-access";
import type { OrderStatus } from "~/modules/enrollments";

export interface OccupancyTotals {
  readonly capacity: number;
  readonly confirmed: number;
  readonly free: number;
  readonly percent: number;
}

export interface OccupancyRow extends OccupancyTotals {
  readonly workshopId: string;
  readonly workshopName: string;
  readonly turnoId: string;
  readonly turnoLabel: string;
}

export interface ConversionTotals {
  /** Every request, cancelled ones included. */
  readonly received: number;
  readonly pending: number;
  readonly confirmed: number;
  readonly cancelled: number;
  /** Confirmed over received, to spot enquiries that never closed. */
  readonly percent: number;
}

export interface ConversionRow extends ConversionTotals {
  readonly workshopId: string;
  readonly workshopName: string;
}

export interface IncomeTotals {
  readonly orders: number;
  readonly fee: Money;
  readonly materials: Money;
  readonly total: Money;
}

export interface IncomeStatRow extends IncomeTotals {
  readonly workshopId: string;
  readonly workshopName: string;
}

export interface StudentStats {
  readonly students: number;
  readonly recurring: number;
  readonly percent: number;
}

export interface MaterialStatRow {
  readonly status: OrderStatus;
  readonly workshopId: string;
  readonly workshopName: string;
  readonly materialName: string;
  readonly supplierName: string;
  readonly orders: number;
  readonly units: number;
  readonly amount: Money;
}

export interface StatisticsView {
  readonly period: string;
  readonly occupancy: {
    readonly rows: readonly OccupancyRow[];
    readonly totals: OccupancyTotals;
  };
  readonly conversion: {
    readonly rows: readonly ConversionRow[];
    readonly totals: ConversionTotals;
  };
  readonly income: {
    readonly rows: readonly IncomeStatRow[];
    readonly totals: IncomeTotals;
  };
  readonly students: StudentStats;
  readonly materials: readonly MaterialStatRow[];
}

export interface MaterialsToOrder {
  readonly orders: number;
  readonly units: number;
}

export interface PanelView {
  /** The current Cordoba month. */
  readonly period: string;
  readonly nextPeriod: string;
  readonly occupancy: OccupancyTotals;
  readonly pending: { readonly total: number; readonly older: number };
  /** Payments registered this month. */
  readonly confirmedThisMonth: number;
  readonly income: IncomeTotals;
  readonly materialsToOrder: MaterialsToOrder;
  readonly alerts: {
    /** Pending requests waiting longer than 48 hours. */
    readonly pendingOverdue: number;
    /** Published workshops with no open period next month. */
    readonly withoutOpenPeriod: readonly {
      readonly workshopId: string;
      readonly name: string;
    }[];
    readonly materialsNotRequested: MaterialsToOrder;
  };
}

export interface StatisticsQuery {
  /** `YYYY-MM`; the current Cordoba month when omitted. */
  readonly period?: string;
}

/** The admin contract of the panel and its statistics. */
export interface InsightsService {
  panel(actor: AdminActor): Promise<Result<PanelView, AdminFailure>>;
  statistics(
    actor: AdminActor,
    query: StatisticsQuery,
  ): Promise<Result<StatisticsView, AdminFailure | Invalid<"period">>>;
}
