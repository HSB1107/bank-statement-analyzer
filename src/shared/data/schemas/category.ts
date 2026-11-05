import { z } from "zod";

/** Category groups drive cash-flow bucketing. */
export const CategoryGroupSchema = z.enum([
  "income",
  "transfer",
  "obligation",
  "fixed_expense",
  "investment",
  "living",
  "business_outflow",
  "charges",
  "uncategorised",
]);
export type CategoryGroup = z.infer<typeof CategoryGroupSchema>;

/** The 64-category taxonomy (login screen: "64 transaction categories"). */
export const CATEGORY_TAXONOMY = {
  salary: { label: "Salary", group: "income" },
  interest_income: { label: "Interest Income", group: "income" },
  dividend: { label: "Dividend", group: "income" },
  rental_income: { label: "Rental Income", group: "income" },
  customer_collection: { label: "Customer Collection", group: "income" },
  professional_fees: { label: "Professional Fees", group: "income" },
  tax_refund: { label: "Tax Refund", group: "income" },
  refund_other: { label: "Refund / Reversal", group: "income" },
  loan_disbursement: { label: "Loan Disbursement", group: "income" },
  cash_deposit: { label: "Cash Deposit", group: "income" },
  other_credit: { label: "Other Credit", group: "income" },
  related_party_receipt: { label: "Related-party Receipt", group: "income" },
  capital_infusion: { label: "Capital Infusion", group: "income" },
  insurance_claim: { label: "Insurance Claim", group: "income" },
  gig_payout: { label: "Gig Payout", group: "income" },
  pension: { label: "Pension", group: "income" },
  own_account_transfer: { label: "Own Account Transfer", group: "transfer" },
  od_drawdown: { label: "OD Drawdown", group: "transfer" },
  od_repayment: { label: "OD Repayment", group: "transfer" },
  sweep: { label: "Sweep", group: "transfer" },
  auto_loan_emi: { label: "Auto Loan EMI", group: "obligation" },
  personal_loan_emi: { label: "Personal Loan EMI", group: "obligation" },
  home_loan_emi: { label: "Home Loan EMI", group: "obligation" },
  term_loan_emi: { label: "Term Loan EMI", group: "obligation" },
  credit_card_payment: { label: "Credit Card Settlement", group: "obligation" },
  od_interest: { label: "OD Interest", group: "obligation" },
  unclassified: { label: "Unclassified", group: "uncategorised" },
  rent: { label: "Rent", group: "fixed_expense" },
  utilities_electricity: { label: "Electricity", group: "fixed_expense" },
  utilities_telecom: { label: "Telecom", group: "fixed_expense" },
  insurance_premium: { label: "Insurance Premium", group: "fixed_expense" },
  school_fees: { label: "School Fees", group: "fixed_expense" },
  society_maintenance: { label: "Society Maintenance", group: "fixed_expense" },
  sip_mutual_fund: { label: "Investment SIP", group: "investment" },
  fixed_deposit: { label: "Fixed Deposit", group: "investment" },
  equity: { label: "Equity", group: "investment" },
  ppf_nps: { label: "PPF / NPS", group: "investment" },
  groceries: { label: "Groceries", group: "living" },
  dining: { label: "Dining", group: "living" },
  fuel: { label: "Fuel", group: "living" },
  shopping: { label: "Shopping", group: "living" },
  medical: { label: "Medical", group: "living" },
  travel: { label: "Travel", group: "living" },
  entertainment: { label: "Entertainment", group: "living" },
  cash_withdrawal: { label: "Cash Withdrawal", group: "living" },
  miscellaneous: { label: "Miscellaneous", group: "uncategorised" },
  personal_transfer: { label: "Personal Transfer", group: "living" },
  furnishing: { label: "Home Furnishing", group: "living" },
  supplier_payment: { label: "Supplier Payment", group: "business_outflow" },
  payroll: { label: "Payroll", group: "business_outflow" },
  gst: { label: "GST", group: "business_outflow" },
  tds: { label: "TDS", group: "business_outflow" },
  epf_esic: { label: "EPF / ESIC", group: "business_outflow" },
  other_statutory: { label: "Other Statutory", group: "business_outflow" },
  capex: { label: "Capex", group: "business_outflow" },
  logistics: { label: "Logistics", group: "business_outflow" },
  rent_commercial: { label: "Commercial Rent", group: "business_outflow" },
  utilities_business: { label: "Business Utilities", group: "business_outflow" },
  professional_services: { label: "Professional Services", group: "business_outflow" },
  marketing: { label: "Marketing", group: "business_outflow" },
  other_opex: { label: "Other Opex", group: "business_outflow" },
  related_party_payment: { label: "Related-party Payment", group: "business_outflow" },
  bank_charges: { label: "Bank Charges", group: "charges" },
  penalty_charges: { label: "Penalty Charges", group: "charges" },
} as const satisfies Record<string, { label: string; group: CategoryGroup }>;

type CategoryKey = keyof typeof CATEGORY_TAXONOMY;
const CATEGORY_KEYS = Object.keys(CATEGORY_TAXONOMY).filter((k): k is CategoryKey => k in CATEGORY_TAXONOMY);
const [firstKey, ...restKeys] = CATEGORY_KEYS;
if (!firstKey) throw new Error("Empty taxonomy");

export const CategoryIdSchema = z.enum([firstKey, ...restKeys]);
export type CategoryId = z.infer<typeof CategoryIdSchema>;

export const CATEGORY_IDS: readonly CategoryId[] = CategoryIdSchema.options;

export function categoryLabel(id: CategoryId): string {
  return CATEGORY_TAXONOMY[id].label;
}

export function categoryGroup(id: CategoryId): CategoryGroup {
  return CATEGORY_TAXONOMY[id].group;
}
