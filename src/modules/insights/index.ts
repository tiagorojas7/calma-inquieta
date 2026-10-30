export {
  PENDING_ALERT_HOURS,
  isPeriod,
  nextPeriod,
  previousPeriod,
} from "./domain/insights-core";
export type {
  ActivityEarnings,
  ConversionRow,
  ConversionTotals,
  IncomeStatRow,
  EarningsTotals,
  EarningsView,
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
  SupplierMaterials,
  TeacherSettlementRow,
  TeacherToSettle,
} from "./application/insights";
export {
  createInsightsService,
  createUnavailableInsightsService,
} from "./application/insights-service";
export type {
  InsightsServiceDeps,
  InsightsUseCases,
} from "./application/insights-service";
