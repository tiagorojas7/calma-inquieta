export {
  PENDING_ALERT_HOURS,
  isPeriod,
  nextPeriod,
} from "./domain/insights-core";
export type {
  ConversionRow,
  ConversionTotals,
  IncomeStatRow,
  IncomeTotals,
  InsightsService,
  MaterialStatRow,
  MaterialsToOrder,
  OccupancyRow,
  OccupancyTotals,
  PanelView,
  SettlementsView,
  StatisticsQuery,
  StatisticsView,
  StudentStats,
  TeacherSettlementRow,
} from "./application/insights";
export {
  createInsightsService,
  createUnavailableInsightsService,
} from "./application/insights-service";
export type {
  InsightsServiceDeps,
  InsightsUseCases,
} from "./application/insights-service";
