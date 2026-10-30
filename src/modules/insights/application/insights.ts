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
  /** The current month's earnings, same figures as the statistics. */
  readonly month: EarningsTotals;
  /** What is due today, beyond the alerts. */
  readonly today: {
    /** Suppliers with materials still to be ordered. */
    readonly suppliersToOrder: readonly string[];
    /** Orders whose materials were requested and not yet delivered. */
    readonly ordersToDeliver: number;
    /** Intensivo requests waiting for their deposit. */
    readonly pendingIntensiveRequests: number;
  };
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

export interface TeacherSettlementRow {
  readonly teacherId: string;
  readonly teacherName: string;
  readonly modality: "own" | "third_party";
  /** Distinct agreed percentages (basis points) the month's periods froze. */
  readonly percentagesBp: readonly number[];
  /** Workshops of the month the teacher is responsible for. */
  readonly activities: readonly string[];
  /** Paid orders behind the income. */
  readonly orders: number;
  /** Distinct students (normalized emails) with a paid order. */
  readonly students: number;
  /** Registered fee income, materials excluded. */
  readonly fee: Money;
  /** Null when no percentage was agreed (own modality). */
  readonly estimate: Money | null;
}

export interface SettlementsView {
  readonly period: string;
  readonly rows: readonly TeacherSettlementRow[];
  readonly totals: { readonly fee: Money; readonly estimate: Money };
}

/** One row of the main statistics table: a taller or an intensivo. */
export interface ActivityEarnings {
  readonly kind: "taller" | "intensivo";
  readonly id: string;
  readonly name: string;
  /** Confirmed seats. */
  readonly enrolled: number;
  /** Seats offered. */
  readonly capacity: number;
  /** Fees, deposits and materials charged. */
  readonly collected: Money;
  readonly teacherName: string | null;
  readonly teacherModality: "own" | "third_party" | null;
  /** What is settled with a third-party teacher; zero otherwise. */
  readonly teacherPay: Money;
  /** What is paid to suppliers for the materials charged. */
  readonly materialsCost: Money;
  /** collected - teacherPay - materialsCost. */
  readonly profit: Money;
}

export interface EarningsTotals {
  readonly enrolled: number;
  readonly capacity: number;
  readonly occupancyPercent: number;
  readonly collected: Money;
  readonly teacherPay: Money;
  readonly materialsCost: Money;
  readonly profit: Money;
}

export interface TeacherToSettle {
  readonly teacherId: string;
  readonly teacherName: string;
  readonly modality: "own" | "third_party";
  readonly activities: readonly string[];
  /** Null for an own teacher: only third-party teachers are settled. */
  readonly toSettle: Money | null;
}

export interface SupplierMaterials {
  readonly supplierId: string;
  readonly supplierName: string;
  readonly orders: number;
  readonly units: number;
  /** What the students paid for these materials. */
  readonly charged: Money;
  /** What is paid to the supplier. */
  readonly cost: Money;
}

export interface EarningsView {
  readonly period: string;
  readonly activities: readonly ActivityEarnings[];
  readonly totals: EarningsTotals;
  /** Students with a confirmed taller order, split into new and returning. */
  readonly students: StudentStats;
  readonly teachers: readonly TeacherToSettle[];
  readonly suppliers: readonly SupplierMaterials[];
  /**
   * True while no supplier cost is stored: the students' price counts as
   * the cost, so materials net to zero.
   */
  readonly materialsAtCost: boolean;
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
  /** The Excel replacement: earnings per taller and intensivo of a month. */
  earnings(
    actor: AdminActor,
    query: StatisticsQuery,
  ): Promise<Result<EarningsView, AdminFailure | Invalid<"period">>>;
  /** Per teacher: linked students, associated income and estimated share. */
  settlements(
    actor: AdminActor,
    query: StatisticsQuery,
  ): Promise<Result<SettlementsView, AdminFailure | Invalid<"period">>>;
}
