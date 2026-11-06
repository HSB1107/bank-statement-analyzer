/** Public API of the corporate profile feature. */
export { CorporateProfile, CORPORATE_TABS } from "./components/corporate-profile";
export { CorporateProfileServiceToken, type CorporateProfileService } from "./services/corporate-service";
export { createMockCorporateService } from "./services/mock-corporate-service";
export { createHttpCorporateService } from "./services/http-corporate-service";
export { CORPORATE_ENDPOINTS } from "./services/endpoints";
export * from "./schemas/corporate";
