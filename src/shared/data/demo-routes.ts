import { ARJUN_CASE_ID, ARJUN_CUSTOMER_ID } from "./generators/arjun";
import { MERIDIAN_CASE_ID, MERIDIAN_CUSTOMER_ID } from "./generators/meridian";

/**
 * The Pass 1 demo entities, enumerated for static generation (GitHub Pages export).
 * Constants only — importing this does not generate any ledger.
 */
export const DEMO_CASE_IDS = [MERIDIAN_CASE_ID, ARJUN_CASE_ID] as const;
export const DEMO_CUSTOMERS = [
  { customerId: ARJUN_CUSTOMER_ID, kind: "individual" },
  { customerId: MERIDIAN_CUSTOMER_ID, kind: "corporate" },
] as const;
