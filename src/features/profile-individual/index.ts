/** Public API of the individual profile feature. */
export { IndividualProfile, INDIVIDUAL_TABS } from "./components/individual-profile";
export { IndividualProfileServiceToken, type IndividualProfileService } from "./services/individual-service";
export { createMockIndividualService } from "./services/mock-individual-service";
export { createHttpIndividualService } from "./services/http-individual-service";
export { INDIVIDUAL_ENDPOINTS } from "./services/endpoints";
export * from "./schemas/individual";
