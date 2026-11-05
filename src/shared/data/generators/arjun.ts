import { notAvailable } from "@/shared/lib/availability";
import { daysInMonth, isoDate, IsoDateSchema, type IsoDate } from "@/shared/lib/dates";
import { createRng, splitInteger, type Rng } from "@/shared/lib/prng";
import {
  AccountSchema,
  IndividualCustomerSchema,
  type Account,
  type IndividualCustomer,
} from "../schemas/customer";
import { CaseIdSchema, CustomerIdSchema } from "../schemas/ids";
import { type CategoryId } from "../schemas/category";
import { type Transaction } from "../schemas/transaction";
import { accountId, buildLedger, refDigits, type AccountLedgerConfig, type DraftTxn } from "./ledger-builder";
import { consolidatedEod } from "../selectors/ledger";

/**
 * Arjun Mehta — salaried individual, 2 INR accounts, Jan–Jun 2026, 124 transactions.
 *
 * Scenario script (from the PDF): salary from Novasphere (₹1,42,500 → ₹1,56,800 from April, May
 * credited 5 days late), rent, auto-loan EMI on the 5th (returned unpaid 05-May, re-presented 08-May),
 * SIP, card settlements in full, utilities, ₹25,000 monthly own transfers, an HDFC personal loan
 * (₹3,00,000 on 18-Apr, EMI from May) and a ₹2,40,000 outflow two days later.
 *
 * Discretionary spend is drawn from a seeded PRNG. Monthly totals and a few balance anchors are
 * pinned so the screens reconcile, and a closed-form calibration hits the balance averages.
 */

export const ARJUN_SEED = 210457;
const YEAR = 2026;
const R = 100; // rupees → paise

export const ARJUN_CUSTOMER_ID = CustomerIdSchema.parse("CUST-IN-R-210457");
export const ARJUN_CASE_ID = CaseIdSchema.parse("BSA-26-04417");
export const ARJUN_ICICI = accountId("ACC-ICICI-4821");
export const ARJUN_HDFC = accountId("ACC-HDFC-7710");

const d = (month1: number, day: number): IsoDate => isoDate(YEAR, month1, day);

export const ARJUN_ACCOUNTS: readonly Account[] = [
  AccountSchema.parse({
    id: ARJUN_ICICI,
    customerId: ARJUN_CUSTOMER_ID,
    bank: "ICICI",
    bankName: "ICICI Bank",
    last4: "4821",
    type: "savings",
    role: "salary",
    currency: "INR",
    odLimit: notAvailable("No OD facility"),
    label: "ICICI XX4821",
  }),
  AccountSchema.parse({
    id: ARJUN_HDFC,
    customerId: ARJUN_CUSTOMER_ID,
    bank: "HDFC",
    bankName: "HDFC Bank",
    last4: "7710",
    type: "savings",
    role: "savings",
    currency: "INR",
    odLimit: notAvailable("No OD facility"),
    label: "HDFC XX7710",
  }),
];

export const ARJUN_CUSTOMER: IndividualCustomer = IndividualCustomerSchema.parse({
  id: ARJUN_CUSTOMER_ID,
  caseId: ARJUN_CASE_ID,
  kind: "individual",
  name: "Arjun Mehta",
  initials: "AM",
  segment: "salaried",
  segmentLabel: "Salaried Individual",
  employer: "Novasphere Technologies",
  region: "IN",
  country: "India",
  reportingCurrency: "INR",
  accountIds: [ARJUN_ICICI, ARJUN_HDFC],
  period: { from: d(1, 1), to: d(6, 30), label: "Jan – Jun 2026" },
  analysedOn: d(11, 5),
  synthetic: true,
});

/** Balance anchors and opening position (all rupees). */
export const ARJUN_SCENARIO = {
  openingIcici: 20_000,
  openingHdfc: 2_28_000,
  salary: [1_42_500, 1_42_500, 1_42_500, 1_56_800, 1_56_800, 1_56_800],
  salaryDay: [1, 2, 2, 1, 6, 1],
  rent: 32_000,
  autoEmi: 14_600,
  plEmi: 9_850,
  sip: 10_000,
  ownTransfer: 25_000,
  achReturnCharge: 590,
  cardSettlement: [29_800, 31_200, 33_900, 34_700, 35_857, 45_743],
  electricity: [6_050, 5_820, 6_210, 6_940, 7_806, 6_980],
  telecom: 1_199,
  lifeInsurance: 24_600,
  taxRefund: 18_400,
  interest: { 3: 2_140, 6: 2_310 } satisfies Readonly<Record<number, number>>,
  plDisbursement: 3_00_000,
  furnishing: 2_40_000,
  /** Discretionary spend per month, split ICICI / HDFC (rupees). */
  miscIcici: [18_000, 16_000, 13_723, 26_000, 40_000, 44_077],
  miscHdfc: [14_751, 17_961, 18_306, 36_243, 13_238, 5_301],
  /** Targets the calibration solves for (PDF screen 08). */
  targetAdb: 3_39_009,
  targetAvgMonthly: 3_38_966,
} as const;

const ICICI_FILE: AccountLedgerConfig["files"][number] = {
  fileId: "SF-AM-ICICI-4821",
  fileName: "ICICI_SA_4821_Jan-Jun26.pdf",
  from: d(1, 1),
  to: d(6, 30),
  rowsPerPage: 18,
  extractionConfidence: 0.9935,
};
const HDFC_FILE: AccountLedgerConfig["files"][number] = {
  fileId: "SF-AM-HDFC-7710",
  fileName: "HDFC_SA_7710_H1-2026.pdf",
  from: d(1, 1),
  to: d(6, 30),
  rowsPerPage: 18,
  extractionConfidence: 0.9956,
};

const MONTH_TAG = ["JAN26", "FEB26", "MAR26", "APR26", "MAY26", "JUN26"] as const;

interface Merchant {
  key: string;
  name: string;
  narration: string;
  category: CategoryId;
  channel: DraftTxn["channel"];
}

const ICICI_MERCHANTS: readonly Merchant[] = [
  {
    key: "FRESHMART",
    name: "FreshMart",
    narration: "UPI/DR/FRESHMART RETAIL",
    category: "groceries",
    channel: "UPI",
  },
  { key: "SWIGGY", name: "Swiggy", narration: "UPI/DR/SWIGGY", category: "dining", channel: "UPI" },
  { key: "HPCL", name: "HPCL Fuel", narration: "POS HPCL FUEL STN BANER", category: "fuel", channel: "POS" },
  {
    key: "APOLLO",
    name: "Apollo Pharmacy",
    narration: "UPI/DR/APOLLO PHARMACY",
    category: "medical",
    channel: "UPI",
  },
  {
    key: "BIGBASKET",
    name: "BigBasket",
    narration: "UPI/DR/BIGBASKET",
    category: "groceries",
    channel: "UPI",
  },
  { key: "UBER", name: "Uber", narration: "UPI/DR/UBER INDIA", category: "travel", channel: "UPI" },
  {
    key: "BOOKMYSHOW",
    name: "BookMyShow",
    narration: "UPI/DR/BOOKMYSHOW",
    category: "entertainment",
    channel: "UPI",
  },
  { key: "DMART", name: "DMart", narration: "POS AVENUE SUPERMARTS", category: "groceries", channel: "POS" },
];

const HDFC_MERCHANTS: readonly Merchant[] = [
  { key: "AMAZON", name: "Amazon Pay", narration: "UPI/DR/AMAZON PAY", category: "shopping", channel: "UPI" },
  { key: "MYNTRA", name: "Myntra", narration: "UPI/DR/MYNTRA DESIGNS", category: "shopping", channel: "UPI" },
  {
    key: "CROMA",
    name: "Croma",
    narration: "POS INFINITI RETAIL CROMA",
    category: "shopping",
    channel: "POS",
  },
  { key: "MMT", name: "MakeMyTrip", narration: "UPI/DR/MAKEMYTRIP", category: "travel", channel: "UPI" },
  {
    key: "ATM",
    name: "ATM withdrawal",
    narration: "ATM WDL HDFC BANER",
    category: "cash_withdrawal",
    channel: "CASH",
  },
];

/** Months (0-based) whose ICICI misc spend includes one unidentified UPI payee → "Miscellaneous". */
const MISC_UNKNOWN_MONTHS = new Set([0, 1, 2, 4, 5]);

function ref(rng: Rng, prefix: string, len: number): string {
  return `${prefix}${refDigits(() => rng.next(), len)}`;
}

/** Fixed ICICI misc schedule for constrained months (balance anchors). */
const PINNED_ICICI_MISC: Readonly<Record<number, readonly (readonly [number, number])[]>> = {
  // May: one spend before rent so 05-May closes at ₹4,510 after the ₹590 return charge.
  4: [[2, 1_461]],
  // June: spends drive the salary account below ₹10,000 from 24-Jun (7 low-balance days) to ₹5,510 on 30-Jun.
  5: [
    [7, 6_200],
    [13, 8_400],
    [17, 7_900],
    [20, 9_300],
    [24, 8_977],
    [27, 1_850],
    [29, 1_450],
  ],
};

/** Fixed HDFC misc schedule for April: the max consolidated balance (₹6,03,860 on 18-Apr) depends on it. */
const PINNED_HDFC_MISC: Readonly<Record<number, readonly (readonly [number, number])[]>> = {
  3: [
    [9, 13_823],
    [22, 14_180],
    [27, 8_240],
  ],
};

/** Calibration pairs (HDFC misc rows whose amounts are rebalanced, month0 → [earlyDay, lateDay]). */
const CALIBRATION_DAYS: Readonly<Record<number, readonly [number, number]>> = {
  0: [6, 27],
  1: [5, 26],
};

function miscDrafts(rng: Rng, month0: number): DraftTxn[] {
  const m1 = month0 + 1;
  const out: DraftTxn[] = [];
  const salaryDay = ARJUN_SCENARIO.salaryDay[month0] ?? 1;
  const lastDay = daysInMonth(YEAR, m1);

  // ICICI: 7 rows.
  const pinnedI = PINNED_ICICI_MISC[month0];
  let iciciRows: (readonly [number, number])[];
  if (month0 === 4 && pinnedI) {
    const rest = splitInteger(rng, (ARJUN_SCENARIO.miscIcici[4] ?? 0) - 1_461, 6, 0.9);
    const days = [9, 14, 18, 21, 25, 28];
    iciciRows = [...pinnedI, ...rest.map((amt, i) => [days[i] ?? 28, amt] as const)];
  } else if (pinnedI) {
    iciciRows = [...pinnedI];
  } else {
    const amounts = splitInteger(rng, ARJUN_SCENARIO.miscIcici[month0] ?? 0, 7, 0.9);
    const start = Math.max(salaryDay + 1, 4);
    const end = month0 === 3 ? 18 : 22;
    iciciRows = amounts.map(
      (amt, i) => [Math.min(end, start + Math.floor(((end - start) * (i + rng.next())) / 7)), amt] as const,
    );
  }
  iciciRows.forEach(([day, amt], i) => {
    const unknown = MISC_UNKNOWN_MONTHS.has(month0) && i === 2;
    if (unknown) {
      const vpa = `98${refDigits(() => rng.next(), 8)}@ybl`;
      out.push({
        accountId: ARJUN_ICICI,
        date: d(m1, day),
        seq: 70,
        direction: "debit",
        amountMinor: amt * R,
        narration: `UPI/DR/${vpa}`,
        normalised: `UPI payment · ${vpa}`,
        reference: ref(rng, "UPI ", 12),
        channel: "UPI",
        counterparty: { key: `VPA-${vpa}`, name: "Unidentified UPI payee", kind: "unknown" },
        category: "miscellaneous",
        categoryConfidence: 0.52 + rng.next() * 0.2,
        alternatives: [
          { label: "Personal transfer", probability: 0.31 },
          { label: "Shopping", probability: 0.17 },
        ],
        counterpartyConfidence: 0.6,
      });
      return;
    }
    const m = rng.pick(ICICI_MERCHANTS);
    out.push({
      accountId: ARJUN_ICICI,
      date: d(m1, day),
      seq: 70,
      direction: "debit",
      amountMinor: amt * R,
      narration: m.narration,
      normalised: `${m.name}`,
      reference: ref(rng, m.channel === "POS" ? "POS " : "UPI ", 12),
      channel: m.channel,
      counterparty: { key: m.key, name: m.name, kind: "merchant" },
      category: m.category,
      categoryConfidence: 0.9 + rng.next() * 0.09,
    });
  });

  // HDFC: 3 rows.
  const pinnedH = PINNED_HDFC_MISC[month0];
  const calib = CALIBRATION_DAYS[month0];
  let hdfcRows: (readonly [number, number])[];
  if (pinnedH) {
    hdfcRows = [...pinnedH];
  } else {
    const amounts = splitInteger(rng, ARJUN_SCENARIO.miscHdfc[month0] ?? 0, 3, 0.7);
    const days = calib
      ? [calib[0], 15, calib[1]]
      : [rng.int(4, 9), rng.int(12, 18), rng.int(21, lastDay - 2)];
    hdfcRows = amounts.map((amt, i) => [days[i] ?? 15, amt] as const);
  }
  hdfcRows.forEach(([day, amt], i) => {
    const m = HDFC_MERCHANTS[(month0 + i) % HDFC_MERCHANTS.length] ?? HDFC_MERCHANTS[0];
    if (!m) return;
    out.push({
      accountId: ARJUN_HDFC,
      date: d(m1, day),
      seq: 70,
      direction: "debit",
      amountMinor: amt * R,
      narration: m.narration,
      normalised: m.name,
      reference: ref(rng, m.channel === "POS" ? "POS " : "UPI ", 12),
      channel: m.channel,
      counterparty: { key: m.key, name: m.name, kind: "merchant" },
      category: m.category,
      categoryConfidence: 0.9 + rng.next() * 0.09,
      recurringId: calib ? `calib-${month0}-${i}` : null,
    });
  });
  return out;
}

function fixedDrafts(rng: Rng): DraftTxn[] {
  const s = ARJUN_SCENARIO;
  const out: DraftTxn[] = [];
  for (let m0 = 0; m0 < 6; m0++) {
    const m1 = m0 + 1;
    const tag = MONTH_TAG[m0] ?? "";
    const salaryDay = s.salaryDay[m0] ?? 1;
    const salary = s.salary[m0] ?? 0;
    out.push({
      accountId: ARJUN_ICICI,
      date: d(m1, salaryDay),
      seq: 10,
      direction: "credit",
      amountMinor: salary * R,
      narration: `NEFT CR-NOVASPHERE TECHNOLOGIES PVT LTD-SAL ${tag}`,
      normalised: "Salary · Novasphere Technologies",
      reference: ref(rng, "NEFT N", 12),
      channel: "NEFT",
      counterparty: { key: "NOVASPHERE", name: "Novasphere Technologies", kind: "employer" },
      category: "salary",
      categoryConfidence: 0.99,
      recurringId: "salary",
    });
    out.push({
      accountId: ARJUN_ICICI,
      date: d(m1, 3),
      seq: 20,
      direction: "debit",
      amountMinor: s.rent * R,
      narration: `UPI/DR/K DESHPANDE/RENT ${tag}`,
      normalised: "Rent · K. Deshpande",
      reference: ref(rng, "UPI ", 12),
      channel: "UPI",
      counterparty: { key: "DESHPANDE", name: "K. Deshpande (landlord)", kind: "landlord" },
      category: "rent",
      categoryConfidence: 0.94,
      recurringId: "rent",
    });
    // Own-account transfer ICICI → HDFC (both legs).
    const xferDay = m0 === 4 ? 7 : 4;
    const pair = `AM-XFER-${m1}`;
    const imps = ref(rng, "IMPS ", 12);
    out.push({
      accountId: ARJUN_ICICI,
      date: d(m1, xferDay),
      seq: 30,
      direction: "debit",
      amountMinor: s.ownTransfer * R,
      narration: "IMPS/P2A/OWN A/C HDFC XX7710",
      normalised: "Own account transfer → HDFC XX7710",
      reference: imps,
      channel: "IMPS",
      counterparty: { key: "SELF-HDFC-7710", name: "Self · HDFC XX7710", kind: "own_account" },
      category: "own_account_transfer",
      categoryConfidence: 0.99,
      transferPairId: pair,
    });
    out.push({
      accountId: ARJUN_HDFC,
      date: d(m1, xferDay),
      seq: 30,
      direction: "credit",
      amountMinor: s.ownTransfer * R,
      narration: "IMPS CR/ARJUN MEHTA/ICICI XX4821",
      normalised: "Own account transfer ← ICICI XX4821",
      reference: imps,
      channel: "IMPS",
      counterparty: { key: "SELF-ICICI-4821", name: "Self · ICICI XX4821", kind: "own_account" },
      category: "own_account_transfer",
      categoryConfidence: 0.99,
      transferPairId: pair,
    });
    // Auto-loan EMI (May: returned on 05, re-presented 08).
    const emi = (day: number, effect?: DraftTxn["ledgerEffect"]): DraftTxn => ({
      accountId: ARJUN_ICICI,
      date: d(m1, day),
      seq: 40,
      direction: "debit",
      amountMinor: s.autoEmi * R,
      narration: effect
        ? "ACH D-AXIS BANK AUTOLN 88123-RTN INSUFFICIENT FUNDS"
        : "ACH D-AXIS BANK AUTOLN 88123",
      normalised: effect ? "Auto loan EMI · returned unpaid" : "Auto loan EMI · Axis Bank",
      reference: ref(rng, "ACH ", 11),
      channel: "ACH",
      counterparty: { key: "AXIS-AUTOLN", name: "Axis Bank · AUTOLN 88123", kind: "lender" },
      category: "auto_loan_emi",
      categoryConfidence: 0.98,
      recurringId: "auto-emi",
      ledgerEffect: effect,
    });
    if (m0 === 4) {
      out.push(
        emi(5, {
          kind: "excluded",
          reason: "returned_unpaid",
          note: "ACH return — insufficient funds; re-presented 08-May",
        }),
      );
      out.push({
        accountId: ARJUN_ICICI,
        date: d(5, 5),
        seq: 45,
        direction: "debit",
        amountMinor: s.achReturnCharge * R,
        narration: "ACH RTN CHGS AUTOLN 88123 INCL GST",
        normalised: "ACH return charge",
        reference: ref(rng, "CHG ", 10),
        channel: "ACH",
        counterparty: { key: "ICICI-BANK", name: "ICICI Bank", kind: "bank" },
        category: "penalty_charges",
        categoryConfidence: 0.99,
      });
      out.push(emi(8));
    } else {
      out.push(emi(5));
    }
    if (m0 >= 4) {
      out.push({
        accountId: ARJUN_HDFC,
        date: d(m1, 5),
        seq: 40,
        direction: "debit",
        amountMinor: s.plEmi * R,
        narration: "ACH D-HDFC BANK PL55203 EMI",
        normalised: "Personal loan EMI · HDFC Bank",
        reference: ref(rng, "ACH ", 11),
        channel: "ACH",
        counterparty: { key: "HDFC-PL", name: "HDFC Bank · PL55203", kind: "lender" },
        category: "personal_loan_emi",
        categoryConfidence: 0.98,
        recurringId: "pl-emi",
      });
    }
    out.push({
      accountId: ARJUN_ICICI,
      date: d(m1, 10),
      seq: 50,
      direction: "debit",
      amountMinor: s.sip * R,
      narration: "ACH D-ICICI PRUDENTIAL MF SIP",
      normalised: "Investment SIP · ICICI Prudential MF",
      reference: ref(rng, "ACH ", 11),
      channel: "ACH",
      counterparty: { key: "ICICI-PRU", name: "ICICI Prudential MF", kind: "merchant" },
      category: "sip_mutual_fund",
      categoryConfidence: 0.98,
      recurringId: "sip",
    });
    out.push({
      accountId: ARJUN_ICICI,
      date: d(m1, 12),
      seq: 50,
      direction: "debit",
      amountMinor: (s.cardSettlement[m0] ?? 0) * R,
      narration: "BIL/ONL/ICICI CREDIT CARD XX9034",
      normalised: "Credit card settlement · paid in full",
      reference: ref(rng, "BIL ", 12),
      channel: "BBPS",
      counterparty: { key: "ICICI-CC", name: "ICICI Credit Card XX9034", kind: "bank" },
      category: "credit_card_payment",
      categoryConfidence: 0.99,
      recurringId: "card",
    });
    out.push({
      accountId: ARJUN_ICICI,
      date: d(m1, 15),
      seq: 50,
      direction: "debit",
      amountMinor: (s.electricity[m0] ?? 0) * R,
      narration: "BBPS/MSEDCL/170264019851",
      normalised: "Electricity · MSEDCL",
      reference: ref(rng, "BBPS ", 10),
      channel: "BBPS",
      counterparty: { key: "MSEDCL", name: "MSEDCL", kind: "merchant" },
      category: "utilities_electricity",
      categoryConfidence: 0.96,
      recurringId: "utilities",
    });
    out.push({
      accountId: ARJUN_ICICI,
      date: d(m1, 15),
      seq: 51,
      direction: "debit",
      amountMinor: s.telecom * R,
      narration: "BBPS/AIRTEL POSTPAID/98200",
      normalised: "Telecom · Airtel postpaid",
      reference: ref(rng, "BBPS ", 10),
      channel: "BBPS",
      counterparty: { key: "AIRTEL", name: "Airtel", kind: "merchant" },
      category: "utilities_telecom",
      categoryConfidence: 0.96,
      recurringId: "utilities",
    });
    const interest: number | undefined = m1 === 3 ? s.interest[3] : m1 === 6 ? s.interest[6] : undefined;
    if (interest !== undefined) {
      out.push({
        accountId: ARJUN_HDFC,
        date: d(m1, daysInMonth(YEAR, m1)),
        seq: 90,
        direction: "credit",
        amountMinor: interest * R,
        narration: "INT.PD:SB:7710 Q-END",
        normalised: "Savings interest",
        reference: ref(rng, "INT ", 8),
        channel: "INT",
        counterparty: { key: "HDFC-BANK", name: "HDFC Bank", kind: "bank" },
        category: "interest_income",
        categoryConfidence: 0.99,
        recurringId: "interest",
      });
    }
  }
  // One-offs.
  out.push({
    accountId: ARJUN_ICICI,
    date: d(3, 14),
    seq: 50,
    direction: "debit",
    amountMinor: s.lifeInsurance * R,
    narration: "ACH D-SURAKSHA LIFE POL 55102",
    normalised: "Life insurance premium · annual",
    reference: ref(rng, "ACH ", 11),
    channel: "ACH",
    counterparty: { key: "SURAKSHA", name: "Suraksha Life · POL 55102", kind: "merchant" },
    category: "insurance_premium",
    categoryConfidence: 0.97,
    recurringId: "insurance",
  });
  out.push({
    accountId: ARJUN_ICICI,
    date: d(3, 24),
    seq: 10,
    direction: "credit",
    amountMinor: s.taxRefund * R,
    narration: "NEFT CR-CPC ITR REFUND AY2025-26",
    normalised: "Income-tax refund",
    reference: ref(rng, "NEFT N", 12),
    channel: "NEFT",
    counterparty: { key: "CPC-ITD", name: "Income Tax Department (CPC)", kind: "government" },
    category: "tax_refund",
    categoryConfidence: 0.99,
  });
  out.push({
    accountId: ARJUN_HDFC,
    date: d(4, 18),
    seq: 10,
    direction: "credit",
    amountMinor: s.plDisbursement * R,
    narration: "LOAN DISB PL55203 HDFC BANK",
    normalised: "Personal loan disbursement · HDFC PL55203",
    reference: ref(rng, "LN ", 10),
    channel: "TRF",
    counterparty: { key: "HDFC-PL", name: "HDFC Bank · PL55203", kind: "lender" },
    category: "loan_disbursement",
    categoryConfidence: 0.99,
  });
  out.push({
    accountId: ARJUN_HDFC,
    date: d(4, 20),
    seq: 20,
    direction: "debit",
    amountMinor: s.furnishing * R,
    narration: "IMPS DR-URBANKRAFT INTERIORS",
    normalised: "Payment · Urbankraft Interiors",
    reference: ref(rng, "IMPS ", 12),
    channel: "IMPS",
    counterparty: { key: "URBANKRAFT", name: "Urbankraft Interiors", kind: "merchant" },
    category: "furnishing",
    categoryConfidence: 0.86,
    alternatives: [
      { label: "Personal transfer", probability: 0.09 },
      { label: "Shopping", probability: 0.05 },
    ],
  });
  return out;
}

/**
 * Solve for amount shifts between two HDFC rows in January and February so that the average
 * daily balance and the mean of monthly averages hit the PDF values. Each shift moves Δ rupees
 * from the early row to the late row, which adds Δ × gap rupee-days without changing monthly totals.
 */
function calibrate(drafts: DraftTxn[]): DraftTxn[] {
  const probe = buildLedger(drafts, ledgerConfigs(), "PROBE");
  const eod = consolidatedEod(probe, ARJUN_CUSTOMER.period.from, ARJUN_CUSTOMER.period.to);
  const days = eod.length;
  const adb = eod.reduce((a, p) => a + p.balanceMinor, 0) / days / R;
  const monthlyAvgs = [0, 1, 2, 3, 4, 5].map((m0) => {
    const pts = eod.filter((p) => Number(p.date.slice(5, 7)) === m0 + 1);
    return pts.reduce((a, p) => a + p.balanceMinor, 0) / pts.length / R;
  });
  const amb = monthlyAvgs.reduce((a, b) => a + b, 0) / 6;
  const dA = ARJUN_SCENARIO.targetAdb - adb;
  const dM = ARJUN_SCENARIO.targetAvgMonthly - amb;
  // x_j, x_f are rupee-day shifts in Jan (31 d) and Feb (28 d).
  // dA = (xj + xf) / days ; dM = xj / (6*31) + xf / (6*28)
  const a11 = 1 / days;
  const a12 = 1 / days;
  const a21 = 1 / (6 * 31);
  const a22 = 1 / (6 * 28);
  const det = a11 * a22 - a12 * a21;
  const xj = (dA * a22 - a12 * dM) / det;
  const xf = (a11 * dM - a21 * dA) / det;
  const shifts: Record<number, number> = { 0: xj, 1: xf };
  return drafts.map((t) => {
    const id = t.recurringId ?? "";
    const match = /^calib-(\d)-(\d)$/.exec(id);
    if (!match) return t;
    const m0 = Number(match[1]);
    const idx = Number(match[2]);
    const pair = CALIBRATION_DAYS[m0];
    const x = shifts[m0];
    if (!pair || x === undefined || idx === 1) return { ...t, recurringId: null };
    const delta = Math.round(x / (pair[1] - pair[0]));
    const amountMinor = idx === 0 ? t.amountMinor - delta * R : t.amountMinor + delta * R;
    if (amountMinor <= 0)
      throw new Error(
        `Calibration produced a non-positive amount (adb=${adb.toFixed(1)}, amb=${amb.toFixed(1)}, xj=${xj.toFixed(0)}, xf=${xf.toFixed(0)}); adjust the scenario.`,
      );
    return { ...t, amountMinor, recurringId: null };
  });
}

function ledgerConfigs(): AccountLedgerConfig[] {
  return [
    {
      accountId: ARJUN_ICICI,
      currency: "INR",
      openingMinor: ARJUN_SCENARIO.openingIcici * R,
      files: [ICICI_FILE],
    },
    {
      accountId: ARJUN_HDFC,
      currency: "INR",
      openingMinor: ARJUN_SCENARIO.openingHdfc * R,
      files: [HDFC_FILE],
    },
  ];
}

export interface ArjunDataset {
  customer: IndividualCustomer;
  accounts: readonly Account[];
  transactions: readonly Transaction[];
  openingBalances: Readonly<Record<string, number>>;
}

let cache: ArjunDataset | null = null;

/** Generates Arjun's ledger once (seeded) and memoises it. */
export function getArjunDataset(): ArjunDataset {
  if (cache) return cache;
  const rng = createRng(ARJUN_SEED);
  const drafts: DraftTxn[] = [...fixedDrafts(rng)];
  for (let m0 = 0; m0 < 6; m0++) drafts.push(...miscDrafts(rng, m0));
  const calibrated = calibrate(drafts);
  const transactions = buildLedger(calibrated, ledgerConfigs(), "AM");
  cache = {
    customer: ARJUN_CUSTOMER,
    accounts: ARJUN_ACCOUNTS,
    transactions,
    openingBalances: {
      [ARJUN_ICICI]: ARJUN_SCENARIO.openingIcici * R,
      [ARJUN_HDFC]: ARJUN_SCENARIO.openingHdfc * R,
    },
  };
  return cache;
}

export const ARJUN_PERIOD = {
  from: IsoDateSchema.parse("2026-01-01"),
  to: IsoDateSchema.parse("2026-06-30"),
} as const;
