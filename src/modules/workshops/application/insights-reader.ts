export type InsightsPeriodStatus = "draft" | "open" | "closed";

/** The capacity of one turno in one period (draft periods are not listed). */
export interface PeriodCapacityRow {
  readonly workshopId: string;
  readonly workshopName: string;
  readonly periodId: string;
  readonly period: string;
  readonly periodStatus: Exclude<InsightsPeriodStatus, "draft">;
  readonly turnoId: string;
  readonly turnoLabel: string;
  readonly capacity: number;
}

/** A published workshop and the status of its period for a month, if any. */
export interface PublishedWorkshopRow {
  readonly workshopId: string;
  readonly name: string;
  readonly periodStatus: InsightsPeriodStatus | null;
}

/** Aggregations other modules read for statistics and the admin panel. */
export interface WorkshopInsightsReader {
  capacity(period: string): Promise<readonly PeriodCapacityRow[]>;
  publishedWorkshops(period: string): Promise<readonly PublishedWorkshopRow[]>;
}
