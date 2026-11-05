/** Public API of the cases feature. */
export { CaseFrame } from "./components/case-frame";
export { IngestionScreen } from "./components/ingestion-screen";
export { useCase, useCustomer, useProfiles } from "./hooks/use-cases";
export { CaseServiceToken, type CaseService } from "./services/case-service";
export { createMockCaseService } from "./services/mock-case-service";
export { createHttpCaseService } from "./services/http-case-service";
export { CASE_ENDPOINTS } from "./services/endpoints";
export * from "./schemas/cases";
