/** Public API of the dashboard feature. */
export { DashboardScreen } from "./components/dashboard-screen";
export { useDashboardOverview } from "./hooks/use-dashboard";
export {
  caseHref,
  HealthChip,
  RiskChip,
  StageChip,
  bandTone,
  riskTone,
  stageTone,
} from "./components/case-chips";
export { SEVERITY_TONE } from "./components/insights-panel";
export { DashboardServiceToken, type DashboardService } from "./services/dashboard-service";
export { createMockDashboardService } from "./services/mock-dashboard-service";
export { createHttpDashboardService } from "./services/http-dashboard-service";
export { DASHBOARD_ENDPOINTS } from "./services/endpoints";
export * from "./schemas/dashboard";
