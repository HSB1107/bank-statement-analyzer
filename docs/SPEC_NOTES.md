# Spec notes transcribed from docs/FinnOne_Neo_BSA_Pass1_Screens.pdf

The PDF is image-only. These notes transcribe the copy and numbers screen by screen, so the build can check against them.

## Global

- Brand: "FinnOne Neo", sub "BANK STMT ANALYZER" (sidebar) / "BY NUCLEUS SOFTWARE" (login). Logo: rounded square, lime→cyan gradient, "N".
- Palette (dark): bg ~#0B0F14, surfaces #11161C/#161D25/#1E2731, text #E8EDF2, lime #C6FF00 (primary), cyan #00E5FF, green #00E0A0, amber #FFB547, magenta #FF4FD8, red #FF5C6C.
- Inter for UI; JetBrains Mono for numbers, IDs and labels (uppercase, letter-spaced micro labels).
- Footer strip: "FINNONE NEO · BANK STATEMENT ANALYZER · PROTOTYPE PASS 1" | "DEMO DATA · ARJUN MEHTA · MERIDIAN PRECISION (FICTIONAL) · NN / 14".
- Top bar: "Neo Suite CAS · FSA · LMS" app switcher; search "Search customer, case, account no..." ⌘K; env pill "UAT · NUC-APAC-01" (amber); bell with dot; help; avatar PR "Priya Raman — Senior Underwriter · Retail & SME".
- Sidebar: WORKSPACE: Executive Dashboard, Customers (1,184), Financial Profiles, Analysis Cases (2,947), Analysis Reports, Account Explorer. CONFIGURATION: Transaction Categories, Classification Rules, Income Recognition, Metrics & Ratios, Risk Indicators, Scoring Models, Analysis Templates, Peer Benchmarks. ADMINISTRATION: Users, Roles & Permissions, Integrations, Audit Trail, General Settings. Bottom: "v2.4.0-proto / Build 2026.11.05 · IN-WEST / ● DEMO DATA".
- Case header: CASE BSA-26-04421 | Meridian Precision Components Pvt. Ltd. / CUST-IN-000318 · SME Corporate · Manufacturing | REGION India · INR | PURPOSE SME Underwriting | PERIOD Jan – Jun 2026 | ACCOUNTS 3 | STAGE <stage, lime> | SYNTHETIC badge (amber dashed).
- Stepper (7): Case Context, Upload Statements, AI Processing, Transaction Validation, Financial Profiling, Underwriter Review, Report Generation.

## 01 SSO Login (screen 1)

Left: "● TRANSACTION INTELLIGENCE SUITE"; H1 "Bank Statement Analyzer"; "Decode Financial Behaviour. Discover Financial Health." (2nd sentence lime); paragraph "Reads bank statements from any bank, format or currency, then classifies every transaction, finds income, obligations and own-account transfers, maps counterparty fund flows and builds an explainable financial profile for individuals and businesses — every metric traceable to the source row."
Stats: 21 stage AI pipeline · 64 transaction categories · 6 confidence dimensions · 3 regions · 9 currencies.
Network animation with txn rows: NEFT CR SALARY +1,56,800; ACH D AUTO LOAN -14,600; UPI FRESHMART -4,076; RTGS APEX MOTORS +2.40 Cr; GST CHALLAN -41.2 L; IMPS OWN A/C ⇄ 25,000. "© 2026 NUCLEUS SOFTWARE EXPORTS LTD · PROTOTYPE".
Right: "UAT AP-SOUTH-1 · MUMBAI"; "SECURE SIGN-IN"; "Welcome back"; "Sign in to your Nucleus workspace."; ORGANISATION / TENANT card: NA "Nucleus APAC Lending" NUC-APAC-01, "Change"; lime button "Continue with Nucleus SSO →" (shield icon); info "On click: redirects to Nucleus IdP (SAML 2.0 / OIDC) · simulated in prototype". Features: MFA enforced by IdP; Regional data residency; Session audit logging; Idle timeout · 30 min. Links Privacy / Security / Support; v2.4.0.

## 02 Executive Dashboard (screen 2)

Breadcrumb Workspace / Executive Dashboard. H1 "Transaction Intelligence Dashboard"; sub "Statement processing, financial profiling and risk across retail and corporate underwriting." Filters: Period Last 30 days, Segment All, Region All, Analyst All, Refresh.
KPIs (with sparkline + delta): Customers Analysed 1,184 +7.4%; Bank Accounts 2,736 +9.1%; Analysis Cases 2,947 +8.6%; Statements Queued 214 +31.3% (amber); Awaiting Review 87 +12.9% (amber); Profiles Generated 2,318 +10.2%; Critical Signals 42 +27.3% (red, highlighted lime border); Avg Processing 6.8 min -21.8% (green = good).
Pipeline "Analysis Processing Pipeline 2,611 cases in last 30 days · click a stage to filter": 01 New Cases 46 (grey), 02 Documents Uploaded 61 (cyan), 03 AI Processing 29 (magenta), 04 Data Validation 52 (amber), 05 Financial Profiling 18 (blue/indigo), 06 Underwriter Review 87 (amber, selected), 07 Completed 2,318 (lime).
Work queue "Underwriting Work Queue 8 of 247 open"; filters Type Region Sector Risk Status Period Analyst. Columns CASE ID, CUSTOMER, TYPE, ACCTS, PERIOD, ANALYST, HEALTH, RISK, STATUS, UPDATED:

- BSA-26-04417 Arjun Mehta, Salaried, 2·INR, Jan-Jun 26, P. Raman, 72 Healthy, Moderate, Underwriter Review, 6 min
- BSA-26-04421 Meridian Precision Components, SME Corporate, 3·INR, Jan-Jun 26, P. Raman, 61 Watchlist, Elevated, Txn Validation, 14 min
- BSA-26-04409 Neha Kapoor, Self-employed, 1·INR, Jan-Jun 26, S. Menon, 64 Watchlist, Elevated, Completed, 38 min
- BSA-26-04425 GulfStar Industrial Trading LLC, Corporate, 2·AED, Jan-Jun 26, A. Haddad, —, —, AI Processing, 41 min
- BSA-26-04398 Southern Cross Logistics, Corporate, 1·AUD, Jan-Jun 26, J. Whitfield, 74 Healthy, Low, Completed, 1 hr
- BSA-26-04402 Al Noor Medical Centres, SME Corporate, 2·AED, Dec-May 26, A. Haddad, 52 Weak, High, Underwriter Review, 2 hr
- BSA-26-04430 Rohan Iyer, Salaried, 1·INR, Apr-Sep 26, S. Menon, —, —, Docs Uploaded, 2 hr
- BSA-26-04433 Tanvi Shah, Gig worker, 3·INR, Mar-Aug 26, —, —, —, New, 3 hr
  AI Insights (click to open case): CRITICAL "Potential circular fund movement observed in 2 corporate cases" (Out → related party → back within 30d · BSA-26-04421 +1); HIGH "Unusual decline in average monthly balances across 8 SME cases" (AMB -28% to -46% over 3 months); HIGH "Salary continuity concerns in 5 retail applications" (Delayed or missed expected credit · BSA-26-04417 +4); MEDIUM "Recurring EMI obligations increased materially in 6 profiles" (New ACH mandates in last 60 days); MEDIUM "High inflow concentration in 3 corporate accounts" (Top-3 counterparties > 70% of external inflows). Footer "Signals are indicators for review, not findings of fraud or credit decisions."
  Financial Health (latest score): donut 1,184 customers; Strong 162, Healthy 431, Watchlist 362, Weak 168, Critical 61. Bar chart CUSTOMERS BY SCORE BAND: <40 61, 40-54 168, 55-69 362, 70-84 431, 85+ 162. "Bands 40 / 55 / 70 / 85 · model SCM-RTL v2.1 & SCM-CORP v1.3 (configurable)".
  Retail vs Corporate (customers): Salaried individuals 612 (1,104 accounts, 1,368 cases, 1.8 accts/cust); Self-employed 238 (461 accounts, 579 cases, 1.9); SME 251 (812 accounts, 694 cases, 3.2); Corporate 83 (359 accounts, 306 cases, 4.3).
  Liquidity & Risk (Retail · INR selector): Avg monthly inflows ₹1.38 L; outflows ₹1.29 L; net cash flow ₹9.1k; Avg monthly balance ₹2.06 L. % OF CUSTOMERS: Negative net cash flow 23.4%; Irregular income 17.8%; FOIR above 50% 11.2%.
  Regional Overview (cases): India INR 2,214; Middle East AED SAR QAR +3 418; ANZ AUD NZD 315 — stacked health bars; dot-map with ME, IN, ANZ bubbles.
  Processing Quality (last 30 days): Extraction confidence 97.6%; Auto-classified 93.1%; Own-transfers detected 11.4%; Statements w/ gaps 6.2%; Analyst reclassifications 2.8%; Recon failures 0.9%.

## 03 Multi-Account Statement Ingestion (screen 5)

Breadcrumb Analysis Cases / Meridian Precision Components / BSA-26-04421. Stage: Upload Statements.
"Upload Bank Statements 9 files · 3 accounts · 13.5 MB"; accepted "PDF · XLS · XLSX · CSV · PNG · JPG · JPEG · TIFF". Dropzone "Drop statements for one or many accounts" / "Mix banks, formats and periods — bank, account, holder, type, currency and period are detected automatically. Password-protected PDFs prompt once." chip "◆ AUTO-IDENTIFY ON".
File cards (name, size · 05 Nov time, Bank, Holder, Account, Period, status, ID%, footer):
1 ICICI_CA_3307_Jan-Jun... PDF 4.8 MB 14:12, ICICI Bank, XXXX3307 · Current, 01 Jan – 30 Jun 26 · INR, Validated, ID 99%, Bank statement · 214 pp
2 HDFC_CA_5582_H1-202... XLSX 1.2 MB 14:13, HDFC Bank, XXXX5582 · Current, 01 Jan – 30 Jun 26, Validated, 99%, Bank statement · 3,912 rows
3 SBI_OD_0914_Jan26.pdf 610 KB 14:14, State Bank of India, XXXX0914 · OD / CC, 01 – 31 Jan 26, Validated 98%, 9 pp
4 SBI_OD_0914_Feb26.pdf 540 KB 14:15, 01 – 28 Feb 26, Validated 98%, 8 pp
5 SBI_OD_0914_Mar26.pdf 702 KB 14:16, 01 – 31 Mar 26, Validated 98%, 11 pp
6 SBI_OD_0914_Mar26 (1).pdf 702 KB 14:17 (struck through, red border), Duplicate · excluded, 98%, "Duplicate of SBI_OD_0914_Mar26.pdf"
7 SBI_OD_0914_May26_sc... JPG 3.4 MB 14:18 (amber border), 01 – 31 May 26, Low OCR on p.3, ID 84%, Scanned · 4 images · OCR
8 SBI_OD_0914_Jun26.pdf 655 KB 14:19, 01 – 30 Jun 26, Validated 98%, 10 pp
9 SBI_OD_Sanction_Letter_... PDF 880 KB 14:20, Account XXXX0914 · Sanction letter, Valid to 31 Dec 26, Limit extracted, 97%, Supporting · OD limit ₹12.00 cr
Holder for all: "Meridian Precision Comp. Pvt..."
Customer Context (Confirmed): CUSTOMER TYPE SME Corporate; SECTOR Manufacturing; REGION · COUNTRY India · IN; REPORTING CURRENCY INR; ANALYSIS PERIOD Jan – Jun 2026; EXPECTED ACCOUNTS 3; DECLARED TURNOVER ₹327.4 cr FY25; LINKED FSA CASE FSA-25-01842. Template note "Template BSA-TPL-SME-IN · SME Financial Profile v2.4 · corporate analytics on, retail metrics off".
Statement Coverage 17 / 18 months: grid ICICI XX3307 all covered; HDFC XX5582 all covered; SBI OD XX0914 Jan ✓ Feb ✓ Mar ✓2× Apr ✗ May low-OCR Jun ✓. Legend covered/low OCR/missing/2× duplicate.
Document Validation (2 issues): Duplicate documents 1 (SBI Mar 26 · SHA-256 match → excluded); Missing months 1 (SBI OD · April 2026 not uploaded); Missing pages 0 (page sequence continuous); Unsupported / corrupt 0; Inconsistent account nos. 0 (all match holder & IFSC); Overlapping periods 0 (after duplicate removal); Balance continuity 1 amber (SBI Mar close ≠ May open (Apr gap)).
Bank Identification & Account Mapping (AI-detected · editable; "3 accounts · 1 currency"): columns BANK ACCOUNT TYPE CCY PERIOD OPEN ₹CR CLOSE ₹CR ROLE:
ICICI Bank XXXX3307 Current INR Jan-Jun 26 2.40 1.28 Operating · Primary; HDFC Bank XXXX5582 Current INR Jan-Jun 26 1.10 0.64 Collections · Sec.; State Bank of India XXXX0914 OD / CC INR Jan-Jun 26* (5.20) (5.72) OD / CC. Footnote "* April 2026 missing for SBI OD. OD limit ₹12.00 cr taken from sanction letter — utilisation will be computed against this verified limit only."
Processing Options 12 of 12 on: OCR & text extraction; Transaction classification; Income identification; Expense categorisation; Internal transfer identification; Recurring obligation detection; Counterparty identification; Liquidity analysis; Cash-flow analysis; Anomaly detection; Risk signal generation; Financial health scoring.
Footer bar: ⚠ "Coverage incomplete: SBI OD April 2026 missing — OD utilisation and consolidated balances for April will show "Not Available". Request statement or proceed with reduced completeness (94.4%)." Buttons Save as Draft, Validate Documents (cyan outline), Start AI Processing (lime).

## 04 AI Processing Workspace (screen 6)

Stage AI Processing. KPIs: Progress 58%; Elapsed 01:44; ETA 00:52; Accounts processed 3 / 3; Transactions 9,318; Categories found 47; Extraction confidence 98.9%; Exceptions 7.
"21-Stage Pipeline job JOB-BSA-8K21 · started 14:21:06" ● Running, SIMULATED. Stages (name / detail / time):
1 Document ingestion — 9 files · 1 duplicate excluded · 8 retained — 0.9s
2 File integrity validation — checksums ok · 0 corrupt · 0 encrypted — 1.2s
3 Bank & account identification — ICICI XX3307 · HDFC XX5582 · SBI OD XX0914 — 2.1s
4 OCR & transaction extraction (warning) — 4 scanned images · mean OCR 96.2% · p.3 at 84% — 41.8s
5 Transaction row parsing — 9,318 rows parsed · 12 multi-line descriptions merged — 6.4s
6 Date & amount normalisation — DD/MM/YY → ISO · Dr/Cr columns → signed amounts — 1.7s
7 Debit / credit identification — 3,402 Cr · 5,916 Dr — 0.8s
8 Description enrichment — NEFT/RTGS/IMPS/UPI/ACH parsed · UTR & IFSC extracted — 8.9s
9 Transaction categorisation — 9,107 auto-classified (97.7%) · 211 low-confidence — 12.3s
10 Counterparty identification — 412 counterparties · 38 merged aliases — 9.6s
11 Duplicate transaction detection (warning) — 3 suspected duplicates (same UTR, amount, date) — 1.1s
12 Internal transfer identification — 486 own-account pairs · ₹62.2 cr matched — 2.4s
13 Recurring income identification (running 58%) — customer collection cadence · 41 payers
14 Recurring payment identification — payroll · rent · EMI · statutory — pending
15 Financial obligation detection — term loan · OD interest · lease
16 Cash-flow aggregation — operating / financing / investing buckets
17 Liquidity analysis — daily balances · OD utilisation vs ₹12.00 cr limit
18 Anomaly detection — rule pack AD-BSA-CORP v1.6 + statistical
19 Risk signal generation — severity · evidence · confidence
20 Financial profile computation — SCM-CORP v1.3
21 Financial report generation — BSA-TPL-SME-IN · 14 sections
Live Transaction Network ("forming as counterparties resolve · Jan-Jun 26 · ₹ cr"; legend Inflow green, Outflow red, Own transfer dashed cyan): hubs ICICI, HDFC, SBI-OD; inflow nodes Apex Motors, Ridgeline 2W, Volta Auto, Kestrel GmbH, 36 others; outflow nodes Shakti Steel, Prec. Castings, Payroll · 412, GST · TDS · EPF, 54 suppliers; label "⇄ ₹62.2 cr own-account".
Per Account: ICICI 3307 4,206 99.6%; HDFC 5582 3,912 99.9%; SBI OD 0914 1,200 94.1% (amber).
LIVE TRACE: CPTY APEX MOTORS LTD/RTGS → Apex Motor…; XFER ICICI→HDFC 1.50 cr ⇄ matched 0d; DUP? SBI 14-Mar UTR …8812 ×2; CAT EPFO ECR → Statutory · 0.99; REC Apex: 30-35d cadence · 6/6 mo.
Exceptions Raised (7 · routed to Transaction Validation): OCR SBI May p.3 · 38 rows below 90% OCR confidence; DUPLICATE 3 suspected duplicate debits · SBI 14-Mar · ₹0.42 cr; COVERAGE SBI OD April 2026 missing · balances N/A for April; RECON SBI Mar close ₹(0.71) cr ≠ May open ₹(1.24) cr — gap month; CLASSIFY 211 low-confidence categories (< 85%); CPTY 2 counterparties match director names → related-party check. (only 6 rows listed; header says 7)

## 05 Transaction Review & Validation (screen 7)

Stage Transaction Validation. KPIs: Accounts 3; Transactions 9,318; Credits 3,402; Debits 5,916; Categorised 9,107; Uncategorised 211; Low confidence 211; Exceptions 7.
Accounts navigator: Consolidated 9,318 (All 3 accounts · INR); ICICI XX3307 4,206 Current · Operating; HDFC XX5582 3,912 Current · Collections; SBI OD XX0914 1,200 OD/CC · limit ₹12.00 cr; Compare button.
Filters: search "Search narration, ref..."; Date 1–18 Jun; Amount ≥ ₹0.10 cr; Dr/Cr All; Category All; Counterparty All; Confidence All.
Columns DATE ACCT DESCRIPTION·REFERENCE COUNTERPARTY DEBIT CREDIT BALANCE CATEGORY CONF. (₹ crore). Rows:
02-Jun ICICI RTGS CR-APEX MOTORS LTD-INV 26/1187-… UTR ICICR52026060211874 | Apex Motors Ltd | – | 2.40 | 3.62 | Customer Collection | 99
02-Jun ICICI IMPS/P2A/OWN A/C HDFC XX5582 IMPS 615309882214 | Self · HDFC XX5582 | 1.50 | – | 2.12 | Own Account Transfer | 99
02-Jun HDFC IMPS CR/MERIDIAN PRECISION/ICICI XX3… IMPS 615309882214 | Self · ICICI XX3307 | – | 1.50 | 1.98 | Own Account Transfer | 99
03-Jun HDFC NEFT DR-SHAKTI STEEL & ALLOYS-PO 4471 NEFT N154260602448 | Shakti Steel & Alloys | 1.18 | – | 0.80 | Supplier Payment | 98
05-Jun ICICI ACH D-HDFC BANK TL 7781 EMI ACH 26060500912 | HDFC Bank · Term Lo… | 0.31 | – | 1.81 | Term Loan EMI | 98
07-Jun ICICI TRF FROM SBI OD A/C XX0914 FUNDING TRF 0607 1194 | Self · SBI OD XX0914 | – | 1.20 | 3.01 | OD Drawdown | 96
07-Jun ICICI BULK NEFT SALARY JUN26 412 RECORDS NEFT N158260607310 | Payroll (412 employees) | 2.24 | – | 0.77 | Payroll | 99
10-Jun HDFC CHQ DEP-K S TRADING CO CHQ 004417 | K S Trading Co | – | 1.20 | 2.00 | Customer Collection | 71 (selected, amber)
12-Jun HDFC GST CHALLAN 27AAACM4412R1Z5 MAY26 CBDT 0510301 | GSTN | 0.98 | – | 1.02 | GST | 99
14-Jun SBI NEFT DR-PRECISION CASTINGS HUB NEFT N165260614002 | Precision Castings Hub | 0.62 | – | (2.04) | Supplier Payment | 97
15-Jun ICICI CASH DEP BR 0412 CHAKAN UPI 4166 1882 0912 | Cash deposit | – | 0.20 | 0.97 | Unclassified | 62
18-Jun ICICI RTGS CR-RIDGELINE TWO WHEELERS PVT L… RTGS ICICR52026061844120 | Ridgeline Two-Wheel… | – | 1.95 | 2.92 | Customer Collection | 99
Footer "₹ crore · 12 of 1,284 rows matching · balances per account"; legend own-transfer pair (cyan bar), < 85% confidence (amber).
Classification drawer: "CLASSIFICATION DRAWER · HDFC XX5582 · 10-JUN-2026 · ROW 3,211"; "₹1.20 cr credit · cheque deposit from K S Trading Co". Actions: Accept, Change category, Internal transfer, Mark recurring, Comment, Non-operating (selected cyan), Flag for investigation (amber).
ORIGINAL BANK DESCRIPTION [FACT] "CHQ DEP-K S TRADING CO"; Normalised: Cheque deposit · K S Trading Co; Counterparty: K S Trading Co (new · first seen); Source HDFC_CA_5582_H1-2026.xlsx · row 3,211; Extraction 100% · native XLSX, no OCR.
AI CLASSIFICATION: Income > Customer Collection 0.71. "Credit from a trading-type entity into the collections account. Confidence is lower because the counterparty is new, it arrived by cheque (top payers use RTGS), the amount is round and the narration has no invoice reference." Alternatives: related-party receipt 0.18 · loan / capital 0.07 · other 0.04.
RELATED TRANSACTIONS: 28-May ICICI NEFT DR-K S TRADING CO-ADV (1.25); 10-Jun HDFC CHQ DEP-K S TRADING CO 1.20. Note "₹1.25 cr paid out 13 days earlier returns as ₹1.20 cr → linked to signal RS-C-04 (possible round-trip, needs investigation)." "Original values are preserved; every change is audited with a reason."
Transaction Reconciliation per account (19 passed, 3 warning, 2 failed, 3 N/A): checks × IC/HD/SB:
Opening + Credits − Debits = Closing: ✓ ✓ !; Running balance consistency ✓ ✓ ✓; Duplicate references ✓ ✓ ✗; Duplicate amount + date ✓ ✓ !; Missing statement periods ✓ ✓ ✗; Unexpected negative balances N/A N/A N/A; Currency mismatches ✓ ✓ ✓; Unexplained reversals ✓ ! ✓. Note "Negative balance N/A for current accounts with no OD; SBI is an OD account — negative is expected."
Session bar: "Session: 14 reclassified · 3 dupes excluded · 2 flagged"; Save Changes, Accept All ≥ 95%, Review 7 Exceptions (amber), Reprocess Selected, Approve Transaction Data (cyan), Generate Financial Profile → (lime).

## Individual profile shell (screens 06-09)

Breadcrumb Financial Profiles / Arjun Mehta / <Tab>. Header: avatar AM, "Arjun Mehta" INDIVIDUAL (cyan) SYNTHETIC; "CUST-IN-R-210457 · Salaried Individual · BSA-26-04417". Buttons PDF, Excel, print, refresh, Share with CAS (cyan outline), ✓ Save Final Profile (lime).
Meta: PERIOD Jan – Jun 2026 | ACCOUNTS 2 | TRANSACTIONS 124 | BANKS ICICI · HDFC | CURRENCY INR | ANALYSED 05 Nov 2026. Chips: Coverage 12/12 mo, Extraction 99.4%, Classified 96.0%.
Tabs: Overview, Income, Expenditure, Liquidity, Obligations & Debt, Transaction Behaviour, AI Risk Signals (4 badge), Report.
Accounts: ICICI XX4821 (salary, EMIs debit here), HDFC XX7710 (savings; drives consolidated balance; PL EMI debits HDFC).

## 06 Overview

KPIs: Avg monthly income ₹1,50,392 FACT "salary + interest only"; Avg monthly outflow ₹1,41,048 DERIVED "excl. one-offs & SIP"; Expense-to-income 93.5% DERIVED "Jan 81.7% → Jun 100.4%"; FOIR 15.4% DERIVED "policy 50% · EMIs only"; Avg daily balance ₹3,39,009 DERIVED "both accounts · 181 days"; Primary a/c low ₹4,510 FACT "05-May · ICICI XX4821" (red).
Financial Health Score gauge 72 / 100, band ticks 0,40,55,70,85,100; "Healthy · lower band"; "▼ 8 vs Jul-Dec 25 (80)". Model confidence 0.86; Data completeness 100%; Extraction conf. 99.4%; Classification conf. 96.0%. "SCM-RTL v2.1 · bands 40/55/70/85 configurable · decision support, not a credit decision".
Radar: Jan-Jun 26 (lime solid) vs Jul-Dec 25 (cyan dashed); axes Income Stability, Liquidity, Cash Flow, Debt Capacity, Balance Behaviour, Consistency. Scale 0/25/50/100.
AI SUMMARY Executive Summary "11 citations · conf. 0.84". Lead: "Recurring salary credits provide a stable income base. However, primary-account balances are declining and identified debt obligations increased in May; liquidity buffers warrant monitoring." Lines:

- FACT Salary from Novasphere Technologies credited in all 6 months; ₹1,42,500 → ₹1,56,800 from April.
- DERIVED Expense-to-income rose from 81.7% to 100.4%; net cash flow negative in May (−₹8,340) and June (−₹10,640).
- FACT New HDFC personal loan ₹3,00,000 disbursed 18-Apr; ₹2,40,000 paid out two days later (home furnishing).
- FACT ACH auto-loan EMI returned unpaid on 05-May (insufficient funds); re-presented and cleared 08-May.
- AI Pattern is consistent with higher committed outflows after the April loan rather than income stress. June close of ₹5,510 in the salary account puts the 05-Jul EMI at risk unless funds move from HDFC.
- INVESTIGATE Confirm purpose of the ₹2.40 L payment and whether the HDFC balance (₹3.17 L) is available for servicing.
  Score Dimensions (contributing & negative factors · Δ vs previous · confidence):
- Income Stability w25% 84 (-2) ▲ Salary 6/6 months · CV 4.8% · +10.0% revision in Apr ▼ May salary credited 5 days late — High
- Liquidity Health w20% 58 (-14) ▲ Consolidated ADB ₹3.39 L ▼ Primary a/c fell to ₹4,510 · 10 low-balance days — High
- Cash Flow Strength w20% 62 (-12) ▲ Net positive in 4 of 6 months ▼ Net negative May & Jun · retention 8.3% — High
- Debt Obligation Capacity w20% 78 (-10) ▲ FOIR 15.4% vs 50% policy ▼ New PL EMI ₹9,850 from May · 1 failed ACH — High
- Transaction Quality w7.5% 82 (-2) ▲ 96% classified · no duplicates ▼ 4.0% grouped as miscellaneous — Medium
- Financial Consistency w7.5% 70 (-6) ▲ Recurring commitments stable ▼ Card settlements +53.5% Jan → Jun — Medium
  Formula line: "Score = Σ dimension × weight = 84×0.25 + 58×0.2 + 62×0.2 + 78×0.2 + 82×0.075 + 70×0.075 = 72. Health score, model confidence and extraction confidence are reported separately."
  Financial Strengths: Salary every month from one employer for the full period; Salary revised +10.0% in April; Investments ₹10,000 SIP maintained all 6 months; Credit card settled in full each month (no revolving).
  Financial Concerns: Primary account depleted before EMI dates (May, Jun); Expense-to-income now ~100%; New unsecured loan taken in April.
  Underwriter Attention: Purpose of ₹2.40 L payment on 20-Apr; Card spend +53.5% Jan → Jun; Ask customer to move EMI mandate or maintain buffer.

## 07 Income

KPIs: Total credits ₹12,20,750 FACT "excl. ₹1.50 L own transfers"; Avg income ₹1,50,392 DERIVED "salary + interest / month"; Median ₹1,50,720 DERIVED "6 months"; Salary ₹8,97,900 FACT "6 credits · 1 employer"; Other recurring ₹4,450 FACT "savings interest · quarterly"; Non-recurring ₹3,18,400 FACT "loan ₹3.00 L + tax refund"; Growth +10.0% DERIVED "salary Q1 → Q2"; Volatility 4.8% DERIVED "coefficient of variation".
Monthly Income Trend (₹ thousand; legend Salary lime line, Other recurring cyan, Non-income credits magenta dashed, Total inflows bars): salary 142.5,142.5,142.5,156.8,156.8,156.8. Annotations "₹1.63 L incl. ₹18.4k tax refund" (Mar), "₹4.57 L incl. ₹3.00 L loan" (Apr bar amber). Note: "Not every credit is income: the ₹3.00 L HDFC personal-loan disbursement and ₹25,000 monthly own-account transfers are excluded; the tax refund is one-off and excluded from average income."
Income Source Distribution Jan-Jun donut "₹12.21 L external credits": Salary 73.6% ₹8,97,900 recurring; Interest income 0.4% ₹4,450 recurring; Loan disbursement 24.6% ₹3,00,000 not income; Tax refund 1.5% ₹18,400 one-off. "Not observed: professional, business, rental or investment income."
Salary Pattern Analysis "detected by rule IR-SAL-01 · employer narration + monthly cadence ± 5 days": Jan on time ₹1,42,500 credited day 1; Feb on time day 2; Mar on time day 2; Apr on time ₹1,56,800 day 1; May +5d day 6 (amber); Jun on time day 1. Credit frequency Monthly · 6 / 6; Typical credit date 1st – 2nd; Average salary ₹1,49,650; Amount variability 0% within band · 1 revision; Employer consistency Novasphere Technologies · 100%; Missed salary periods 0; Delayed credits 1 · May (+5 days); Change +10.0% from Apr 2026.
Income Stability Indicator IS-RTL v1.2 · configurable: 84 Stable "6 months observed (minimum 6 for a strong conclusion) · confidence 0.88". Recurring income periods 6 of 6; Salary variation (CV) 4.8%; Missed expected credits 0; Single-source dependence 99.5% of income (amber); Non-recurring inflow frequency 2 events · 26.1% of credits (amber); Delayed credits 1 of 6. AI: "Strongly salaried profile. The single delayed credit (May, +5 days) is isolated — amount and employer unchanged — so on its own it does not indicate employer stress. Recheck if repeated."
Derived: interest Mar ₹2,140 + Jun ₹2,310 (from FOIR table income Mar 1,44,640 & Jun 1,59,110).

## 08 Liquidity

KPIs: Avg monthly bal. ₹3,38,966 DERIVED; Avg daily balance ₹3,39,009 DERIVED; Avg month-end ₹3,04,207 DERIVED; Minimum (consol.) ₹2,64,100 FACT (amber top); Maximum (consol.) ₹6,03,860 FACT; Closing ₹3,22,460 FACT; Low-balance days 10 DERIVED "ICICI < ₹10k" (amber top); Negative balances 0 FACT; OD utilisation N/A FACT "no OD facility"; Liquidity buffer 2.3 mo DERIVED "closing ÷ avg outflow".
Balance Movement (daily EOD, 181 days, ₹; Consolidated cyan area, ICICI XX4821 (salary) lime, HDFC XX7710 dashed; View Daily). Markers: SAL each month; "PL ₹3.00 L in" (Apr 18 spike ~5.9L consolidated); "₹2.40 L out" (Apr 20); "ACH return · ₹4,510" (May 5); "₹5,510" (Jun 30 ICICI). Legend SAL salary credit; depletion/returned debit; loan disbursement; major payment; below ₹10,000 threshold. Note "Consolidated is driven by HDFC savings; the salary account — where EMIs debit — runs close to zero before each salary." HDFC ~2.5L Jan–Mar, ~2.8L Mar end, ~3.1-3.2L after Apr.
Liquidity Health Indicator LQ-RTL v1.4: 58 Watchlist "was 72 in Jul-Dec 25 · confidence 0.90". Average balance 78 (ADB ₹3.39 L vs ₹1.41 L avg monthly outflow); Balance volatility 48 (Salary a/c swings ₹4,510 – ₹1.89 L within months); Low-balance frequency 52 (10 days in 181 · all salary a/c); Recurring obligations 60 (₹1.20 L committed in June (rent, EMIs, card, utilities, SIP)); Cash-flow consistency 62 (Net positive 4 / 6 months); Liquidity buffer 66 (2.3 months of outflows on hand).
Inflows vs Outflows (₹ thousand · net line) bars per month.
Cash Flow Analysis external flows only: Total inflows ₹12,20,750; Total outflows ₹11,46,290; Net +₹74,460; Cash-flow margin 6.1%; Cash retention 8.3%; Negative months 2 of 6. Table ₹K: In 143 143 163 457 157 159; Out 126 129 155 402 165 170; Net 16 14 9 55 -8 -11; M-end 264 278 286 341 333 322. "Seasonality: April spike = loan in / furnishing out; not recurring."

## 09 Obligations, Debt & FOIR

FOIR · June 2026 "FOIR = recurring debt obligations ÷ monthly income × 100": 15.4% "● Within policy" "threshold 50% · PL-RTL-IN · was 10.2% in Jan". NUMERATOR · OBLIGATIONS ₹24,450 "Auto EMI ₹14,600 + PL EMI ₹9,850" chip "INFERRED from transactions". DENOMINATOR · INCOME ₹1,59,110 "June salary ₹1,56,800 + interest ₹2,310" chips INFERRED, "salary slip not verified". Note (amber): "Not double-counted: credit card settlements (avg ₹35,200) are spend paid in full, not a separate loan, so they are excluded from FOIR. Rent is shown separately: fixed-obligation ratio incl. rent = 35.5%."
FOIR Trend (monthly Jan-Jun 2026, policy threshold 50% red dashed): 10.2, 10.2, 10.1, 9.3, 15.6, 15.4. Table EMI obligations 14,600 ×4, 24,450, 24,450; Income 1,42,500 1,42,500 1,44,640 1,56,800 1,56,800 1,59,110. Headroom to policy ₹55,105 / month; Max new EMI @ 50% ₹55,105; Committed incl. rent ₹56,450 / month. "Headroom is arithmetic only (50% × ₹1,59,110 − ₹24,450). Affordability decision rests with the underwriter."
Recurring Payment Detection "7 obligations · rule pack RP-RTL v2.0 · counterparty + cadence ± 3 days + amount ± 10%": columns IDENTIFIED OBLIGATION, COUNTERPARTY / LENDER, AVG MONTHLY, FREQUENCY, LAST PAYMENT, REGULARITY, CONFIDENCE, IN FOIR?:

- Auto Loan EMI (ACH mandate · ICICI) Axis Bank · AUTOLN 88123 ₹14,600 Monthly · 5th 05-Jun-26 "5 of 6 on date" (amber) 0.98 FOIR
- Personal Loan EMI (ACH mandate · HDFC) HDFC Bank · PL55203 ₹9,850 Monthly · 5th 05-Jun-26 "2 of 2 · new from May" (cyan) 0.98 FOIR
- Rent (UPI · ICICI) K. Deshpande (landlord) ₹32,000 Monthly · 3rd 03-Jun-26 6 of 6 0.94 Fixed
- Credit card settlement (Spend, not debt — see note) ICICI Credit Card XX9034 ₹35,200 Monthly · 12th 12-Jun-26 "6 of 6 · full" 0.99 Excluded
- Utilities (BBPS · ICICI) MSEDCL · Telecom ₹7,833 Monthly 15-Jun-26 12 of 12 0.96 Fixed
- Investment SIP (Savings, discretionary) ICICI Prudential MF ₹10,000 Monthly · 10th 10-Jun-26 6 of 6 0.98 Excluded
- Life insurance (₹24,600 / yr ÷ 12) Suraksha Life · POL 55102 ₹2,050 Annual (Mar) 14-Mar-26 1 of 1 0.97 Fixed
  Debt Servicing Behaviour 6 checks: Failed auto-debit 1 (05-May · Axis auto loan · ACH return "insufficient funds") FACT; Repeated penalty charges 1 (₹590 ACH return charge · 05-May) FACT; Delayed EMI 1 (Auto EMI cleared 08-May (+3 days) on re-presentment) FACT; New recurring loan deduction 1 (HDFC PL55203 · ₹9,850 from 05-May) FACT; Changes in EMI amount 0 (Auto EMI constant at ₹14,600) FACT; Unusual repayment pattern 0 (no part-payments or prepayments seen) DERIVED. AI: "The May return happened two days after rent left the salary account and before salary landed on 6 May. It reads as a timing mismatch, not inability to pay — the auto-loan mandate still debits the salary account on the 5th, so the same gap recurs whenever salary arrives late. The PL EMI debits HDFC, which is well funded."
  Repayment Calendar (day of month paid): AUTO EMI Jan–Apr ✓05, May ✗05→✓08 (red), Jun ✓05; PL EMI Jan–Apr –, May ✓05, Jun ✓05; CARD all ✓12 full. "Next due: 05-Jul auto EMI ₹14,600 + PL EMI ₹9,850 · salary a/c balance on 30-Jun ₹5,510 · HDFC ₹3,16,950."
  Derived reconciliation: fixed-obligation ratio incl rent = (24,450+32,000)/159,110 = 35.5%; committed incl rent 56,450. Monthly expense excl SIP & one-offs: Jun 159,750 (=100.4% of 159,110), Jan ≈116,4xx (81.7%). Avg monthly outflow 1,41,048 = (11,46,290 − SIP 60,000 − ₹2,40,000 one-off)/6. Opening consolidated ≈ ₹2,48,000.

## Corporate profile shell (screens 10-13)

Breadcrumb Financial Profiles / Meridian Precision Components Pvt. Ltd. / <Tab>. Avatar MP; CORPORATE badge (lime) SYNTHETIC; "CUST-IN-000318 · SME Corporate · Manufacturing · BSA-26-04421". Meta PERIOD Jan – Jun 2026 | ACCOUNTS 3 | TRANSACTIONS 9,318 | BANKS ICICI · HDFC · SBI | CURRENCY INR · ₹ cr | ANALYSED 05 Nov 2026. Chips Coverage 17/18 mo (amber), Extraction 98.9%, Classified 97.7%.
Tabs: Overview, Business Inflows, Business Outflows, Liquidity, Cash Flow & WC, Debt & Financing, Fund Flow, AI Risk Signals (7), Report.

## 10 Corporate Overview

KPIs: Receipts proxy ₹156.40 cr DERIVED "H1 · excl. transfers, loans, related party"; Operating outflows ₹152.95 cr DERIVED "suppliers, payroll, statutory, opex"; Net op. cash proxy +₹3.45 cr DERIVED "Q1 +₹8.19 cr · Q2 −₹4.74 cr" (amber top); Top-3 inflow share 73.7% DERIVED "Apex · Ridgeline · Volta"; OD utilisation (Jun) 47.7% DERIVED "vs ₹12.00 cr sanctioned · peak 71%" (amber top); Debt service proxy 0.66× DERIVED "net op. cash ÷ debt service · H1" (amber top).
Financial Health Score 61/100 Watchlist "▼ 10 vs Jul-Dec 25 (71)". Dimensions (score, Δ): Operating Cash Flow 56 -14; Liquidity 54 -14; Collection Stability 72 -6; Debt Servicing 58 -14; Concentration 50 -8; Transaction Integrity 76 -4. Model confidence 0.81; Completeness 94.4%.
Corporate Profile Radar (Jan-Jun 26 vs Jul-Dec 25): Operating Cash Flow, Liquidity, Collections, Counterparty Conc., Debt Servicing, Txn Consistency, Working Capital. Note "Corporate axes replace individual ones (income, FOIR, spending) — retail metrics are not shown for business customers."
AI SUMMARY "17 citations · conf. 0.81". Lead: "Business inflows remain consistent, with strong collections from the top customer group. However, the accounts show elevated counterparty concentration and increasingly negative net operating cash flow in recent months."

- FACT Collections ₹156.40 cr in H1 from 41 payers; Q2 ₹72.10 cr vs Q1 ₹84.30 cr (−14.5%).
- DERIVED Top-3 customers 73.7% of external inflows; Apex Motors alone 37.0%, and its receipts fell from ₹11.6 cr (Mar) to ₹8.2 cr (Jun).
- DERIVED Net operating cash proxy negative in April (−₹1.15 cr) and June (−₹3.82 cr); OD drawn to 47.7% at June month-end, intra-month peak 71%.
- FACT ₹1.25 cr paid to K S Trading Co on 28-May; ₹1.20 cr received back from the same party on 10-Jun.
- AI Consistent with an OEM-driven slowdown in collections absorbed through the OD line. The K S Trading round-trip may be a related-party arrangement and should be explained before limits are renewed.
- INVESTIGATE Obtain Apex Motors ageing; confirm relationship with K S Trading Co; obtain SBI OD statement for April 2026.
  Inflow Concentration "share of external inflows · H1" chip "HHI 0.21 · high": Apex Motors Ltd 37.0%; Ridgeline Two-Wheelers 23.7%; Volta Auto Systems 13.0%; Kestrel Brakes GmbH 4.5%; Indus Tractors 2.5%; Other customers (36) 19.3%.
  Overall Assessment "analytical view · not a credit decision": FINANCIAL STRENGTHS: Collections from 41 payers every month; no month below ₹22 cr; Payroll (₹2.05–2.24 cr) and statutory dues paid on schedule all 6 months; Term-loan EMI never missed; no cheque returns; Clean reconciliation on both current accounts. FINANCIAL CONCERNS: Q2 collections −14.5%; Apex −18% Q2 vs Q1; Net operating cash negative in 2 of last 3 months; OD reliance rising: 5.9% → 47.7% month-end; Possible round-trip with K S Trading Co. UNDERWRITER ATTENTION: Missing SBI OD statement for April; Related-party check on K S Trading Co; Reconcile bank receipts proxy with FY25 revenue (₹327.4 cr).

## 11 Business Inflow Analysis

KPIs: Gross credits ₹223.80 cr FACT "all 3 accounts"; Own transfers ₹62.20 cr DERIVED "excluded · 486 matched pairs"; Loan / OD proceeds ₹4.00 cr FACT "HDFC term loan · 18-Mar"; Related-party receipt ₹1.20 cr AI "K S Trading · under review" (amber); Receipts proxy ₹156.40 cr DERIVED "customer collections only" (lime border); Payers 41 DERIVED "38 recurring · 3 one-off".
Business Inflow Trend (₹ crore monthly, quarter split; stacks Customer collections green, Term loan proceeds magenta, Related-party (possible) amber, Own-account transfers slate). Totals Jan 36.5, Feb 34.7, Mar 46.5, Apr 34.1, May 36.4, Jun 35.6; collections 27.1, 25.9, 31.3, 24.2, 25.8, 22.1. "Q1 collections ₹84.30 cr" | "Q2 ₹72.10 cr · -14.5%". Mar has 4.0 term loan; Jun has 1.2 related-party. Own transfers by month (derived): 9.4, 8.8, 11.2, 9.9, 10.6, 12.3 (=62.2).
Revenue Proxy · Methodology BSA-MET-RP-01: Gross credits (3 accounts) 223.80; − Own-account transfers (62.20); − Term-loan disbursement (4.00); − Possible related-party receipt (1.20); − Reversals / refunds (0.00); = Business receipts proxy 156.40. Annualised proxy ₹312.8 cr; FY25 revenue (FSA-25-01842) ₹327.4 cr. Note "Not accounting revenue. Bank receipts include GST, exclude credit sales not yet collected and any accounts not submitted. Use as a behavioural cross-check against financial statements."
Counterparty Concentration (monthly contribution · ₹ crore · top 5 shown + rest; chips Top-5 80.7%, Top-3 73.7%): # COUNTERPARTY JAN FEB MAR APR MAY JUN H1 ₹CR SHARE CUM.
1 Apex Motors Ltd 9.8 10.4 11.6 9.1 8.7 8.2 | 57.80 37.0% 37.0%
2 Ridgeline Two-Wheelers 6.2 6.5 6.9 6.1 5.8 5.6 | 37.10 23.7% 60.7%
3 Volta Auto Systems 3.4 3.1 3.8 3.3 3.5 3.2 | 20.30 13.0% 73.7%
4 Kestrel Brakes GmbH (EUR→INR) 2.1 – 2.6 – 2.4 – | 7.10 4.5% 78.2%
5 Indus Tractors 0.7 0.6 0.8 0.6 0.7 0.5 | 3.90 2.5% 80.7%
– Other customers (36) 4.9 5.3 5.6 5.1 4.7 4.6 | 30.20 19.3% 100.0%
Notes: "Multi-currency: Kestrel Brakes pays in EUR (€0.78 M in H1). Converted at RBI reference rate on value date; original EUR amount, rate and date are kept on each transaction. Balances are never summed across currencies before conversion." "Counterparty resolution: 412 counterparties after merging 38 aliases (e.g. "APEX MOTORS LTD/RTGS", "APEX MOTORS LIMITED", "APEXMOTORS"). Counterparty-ID confidence 96.4%, reported separately from classification confidence."
Concentration Trend (Top-3 share amber, Apex share lime; alert line "top-3 alert 60% · RI-CORP-07"): top-3 72, 77, 71, 76, 70, 77; Apex 36, 40, 37, 38, 34, 37.
Collection Consistency: ● Regularity of inflows — Collections in all 26 weeks; Apex pays every 30–35 days; ● Paying counterparties — 41 in H1 · 38 recurring (≥ 3 months); ● (red) Collection concentration — Top-3 73.7% · top-5 80.7% · HHI 0.21; ● (amber) Significant decline — June ₹22.10 cr — lowest month, −29.4% vs March peak; ● (amber) Largest customer trend — Apex receipts −18.2% Q2 vs Q1; share 37.7% → 36.1%; ● (grey) Seasonality — March peak consistent with year-end OEM settlements.
Health score weights not shown in PDF → chosen: OCF .20, Liquidity .15, Collection .20, Debt .15, Concentration .15, Integrity .15 → 61.3 → 61.

## 12 Corporate Liquidity & Cash Flow (tabs 3-4)

Breadcrumb .../ Liquidity. KPIs: Avg bank balance ₹3.25 cr DERIVED "ICICI + HDFC · daily"; Minimum ₹0.31 cr FACT "07-Jun · after payroll"; Maximum ₹6.84 cr FACT "19-Mar · TL proceeds"; Closing ₹1.92 cr FACT "30-Jun · current a/cs"; Low-balance days 9 DERIVED "< ₹0.50 cr · all in Jun" (amber top); Negative instances 0 FACT "current accounts"; OD util. (Jun) 47.7% DERIVED "₹5.72 cr of ₹12.00 cr" (amber top); Net cash (H1) -₹2.10 cr DERIVED "3 of 6 months negative" (amber top).
OD / CC Utilisation "SBI XX0914 · daily · against verified sanctioned limit ₹12.00 cr (sanction letter)": area chart 0–100%, stress zone > 75% shaded red "stress zone > 75% of ₹12.00 cr limit", April hatched "Not Available · SBI Apr statement missing", "peak 71% · 08-Jun". Note "Limit is taken only from the uploaded sanction letter; it is never inferred from balances. Without the letter this chart would show balance only, with utilisation marked Not Available."
Cash Runway BSA-MET-CR-02 · estimate: Net-burn runway 5.2 mo "if Q2 net operating trend continues" (amber); Gross cover 10 days "operating outflows with zero receipts" (red). ASSUMPTIONS: Available liquidity ₹8.20 cr (cash ₹1.92 + undrawn OD ₹6.28); Avg operating outflow ₹25.49 cr / mo (H1 average); Net operating burn ₹1.58 cr / mo (Q2 average (Apr–Jun)); Excludes: new borrowing, asset sales, delayed payables. "Runway is a behavioural estimate from bank data, not a forecast."
Cash-Flow Waterfall · H1 2026 "net liquidity position (bank balances − OD drawn), ₹ crore": Opening position -1.7; Customer collections +156.4; Suppliers (111.8); Payroll (12.8); Statutory (11.7); Other opex (16.7); Term loan in +4.0; Related party in +1.2; Debt service (5.3); Capex (4.3); Related party out (1.3); Closing position -3.8.
Liquidity Stress Indicators 6 checks: (amber) Frequent cash depletion — Current-account balance below ₹0.50 cr on 9 days, all in June; (red) Declining bank balances — Month-end ₹5.27 cr (Mar) → ₹1.92 cr (Jun), −63.6%; (red) Increasing OD utilisation — Month-end 5.9% (Mar) → 47.7% (Jun); peak 71%; (amber) Dependence on short-term borrowing — OD funded payroll on 7-Jun (₹1.20 cr transfer); (amber) Low liquidity before payroll / statutory — Balances lowest on 6–8 and 19–21 of each month; (red) Negative cash-flow months — Apr, May, Jun (net cash) · Apr, Jun (operating).
Monthly Cash Flow "bank-derived buckets · internal transfers excluded · not an accounting cash-flow statement" (₹ CR; JAN FEB MAR APR MAY JUN H1):
Operating inflows 27.10 25.90 31.30 24.20 25.80 22.10 | 156.40
Operating outflows (25.15) (24.21) (26.75) (25.35) (25.57) (25.92) | (152.95)
Net operating 1.95 1.69 4.55 (1.15) 0.23 (3.82) | 3.45
Financing (net) (0.83) (0.84) 3.14 (0.88) (0.91) (0.93) | (1.25)
Investing (capex) – – (3.40) (0.85) – – | (4.25)
Related party (net) – – – – (1.25) 1.20 | (0.05)
Net cash movement 1.12 0.85 4.29 (2.88) (1.93) (3.55) | (2.10)
OD month-end util. 36.5% 25.0% 5.9% N/A 21.5% 47.7% | –
"April OD utilisation is Not Available because the SBI statement is missing. April flows cover ICICI and HDFC only and are flagged incomplete; nothing is estimated for SBI."
Derived: debt service monthly 0.83 0.84 0.86 0.88 0.91 0.93 = 5.25 (TL EMI ₹0.31 cr + OD interest); Debt service proxy 0.66× = 3.45/5.25. Opening position = 2.40 + 1.10 − 5.20 = −1.70; closing 1.28 + 0.64 − 5.72 = −3.80. SBI month-end drawn: Jan 4.38, Feb 3.00, Mar 0.71, Apr N/A, May 2.58, Jun 5.72; May open 1.24 → April SBI net change −0.53 unseen (explained as April SBI→ICICI drawdowns visible only on ICICI side).

## 13 Counterparty & Fund Flow Intelligence (tab 6)

Transaction Intelligence Graph "H1 2026 · ₹ cr · edge ∝ value"; legend Customers green, Suppliers / payroll / statutory red, Lenders magenta, Own accounts dashed cyan, Flagged amber. Nodes: ICICI CA 3307, HDFC CA 5582, SBI OD 0914 (amber); Apex Motors Ltd ₹57.80 cr · 37.0% of inflows; Ridgeline Two-Wheelers ₹37.10 cr · 23.7%; Volta Auto Systems ₹20.30 cr · 13.0%; Kestrel Brakes GmbH ₹7.10 cr · EUR · 4.5%; 36 other customers ₹30.20 cr · 19.3%; HDFC Bank · Term Loan ₹5.25 cr · in ₹4.00 · out ₹5.25; K S Trading Co ₹1.25 cr · out ₹1.25 · in ₹1.20 (flagged, out from ICICI, back into HDFC dashed); Shakti Steel & Alloys ₹43.70 cr · 39.1% of suppliers; Precision Castings Hub ₹20.10 cr · 18.0%; 54 other suppliers ₹48.00 cr · 42.9%; Payroll · 412 staff ₹12.84 cr · monthly 7th; GSTN · CBDT · EPFO ₹11.65 cr · statutory. Label "⇄ ₹62.20 cr own transfers". Filter chips: All flows, Inflows, Outflows, Own transfers, Related party, ≥ ₹1 cr only. Footer "412 counterparties · 12 shown · grouped below ₹3 cr".
SELECTED NODE · COUNTERPARTY panel: K S Trading Co "● Potential related party"; "First seen 28-May-2026 · 2 transactions · counterparty-ID confidence 0.93"; Paid out ₹1.25 cr; Received ₹1.20 cr; Net -₹0.05 cr. TRIGGERING TRANSACTIONS FACT: 28-May NEFT DR-K S TRADING CO-ADV ICICI 3307 · p.181 · row 3,902 (1.25); 10-Jun CHQ DEP-K S TRADING CO HDFC 5582 · row 3,211 1.20. EVIDENCE DERIVED: Funds return to a different own account (HDFC) 13 days later; 96.0% of outflow returned; no goods/services narration; Registered address = director's KYC address; No GST invoice match in purchase register (if provided). AI "Pattern matches round-tripping indicator RT-02 (out → return within 30 days, ≥ 90% of value, related-address match). This is a potential risk indicator requiring investigation, not a finding of wrongdoing. conf. 0.84". Buttons View 2 transactions, Investigate (amber), Assign.
Fund-Flow Signals "potential risk indicators requiring investigation":

- CRITICAL Potential circular fund flow 0.84 — ICICI → K S Trading Co ₹1.25 cr (28-May) → HDFC ₹1.20 cr (10-Jun) · 13 days · 96% of amount returned → Obtain invoices / agreement; check director & shareholder links
- HIGH Potential related-party transactions 0.78 — K S Trading Co registered address matches director's residential address (KYC match) · first seen May 2026 → Confirm relationship; disclose under related-party policy
- HIGH High customer concentration 1.00 — Top-3 customers 73.7% of external inflows; Apex 37.0% → Ageing and contract tenure for top-3
- MEDIUM High supplier concentration 1.00 — Shakti Steel 39.1% of supplier payments; top-2 57.1% → Supply alternates; price pass-through terms
- MEDIUM Unusual round-amount transfers 0.71 — 4 round-sum transfers ≥ ₹1.00 cr to non-trade counterparties in Q2 → Review purpose of each transfer
- INFO Internal account transfers 0.99 — 486 own-account pairs, ₹62.20 cr, all matched within same day — excluded from inflows → None
  Top Incoming (₹ cr · H1): Apex Motors Ltd RTGS 57.80 37.0%; Ridgeline Two-Wheelers RTGS 37.10 23.7%; Volta Auto Systems NEFT 20.30 13.0%; Kestrel Brakes GmbH SWIFT · EUR 7.10 4.5%; Indus Tractors NEFT 3.90 2.5%.
  Top Outgoing: Shakti Steel & Alloys NEFT · 3×/mo 43.70; Precision Castings Hub NEFT · weekly 20.10; Payroll (412) Bulk NEFT · 7th 12.84; GSTN / CBDT / EPFO Challan · 7th, 20th 11.65; HDFC Bank · Term Loan ACH · 5th 5.25.
  Derived: suppliers total 111.80; other opex 16.66.

## 14 AI Risk Intelligence (screen 11)

Breadcrumb .../ AI Risk Signals. Severity cards: Critical 1 "fund flow" (red left border); High 3 "liquidity · cash flow · concentration" (amber); Medium 3 "collections · integrity" (magenta); Low 1 "marked false positive" (cyan).
CONFIDENCE FRAMEWORK · SIX SEPARATE DIMENSIONS: OCR confidence 96.2% "scanned SBI May only"; Transaction extraction 98.9% "row-level parse"; Classification 97.7% "211 low-confidence"; Counterparty ID 96.4% "38 aliases merged"; Metric data completeness 94.4% "SBI April missing" (amber); AI interpretation 0.81 "summary & signals" (magenta).
Ranked Risk Signals "8 signals · 31 rules evaluated · sorted by severity × financial impact"; filters Category All, Status All. Columns SIGNAL SEVERITY DESCRIPTION PERIOD EVIDENCE FINANCIAL IMPACT AI CONF. DETECTION STATUS OWNER:

- RS-C-04 CRITICAL Potential circular fund movement (Corporate) | 28-May → 10-Jun | 2 txns | ₹1.25 cr out · ₹1.20 cr back | 0.84 | Rule RT-02 + graph cycle | Investigate | P. Raman (selected row)
- RS-C-01 HIGH Rising OD utilisation (Liquidity) | Mar → Jun | 1,200 txns | 5.9% → 47.7% month-end · peak 71% | 1.00 | Threshold RI-LIQ-04 | Open | —
- RS-C-02 HIGH Negative operating cash-flow pattern (Corporate) | Apr, Jun | 3,118 txns | Q2 net operating −₹4.74 cr | 1.00 | Threshold RI-CF-02 | Acknowledged | P. Raman
- RS-C-03 HIGH High customer concentration (Corporate) | H1 | 412 txns | Top-3 73.7% of inflows | 1.00 | Threshold RI-CORP-07 | Acknowledged | —
- RS-C-05 MEDIUM Material decline in collections (Income) | Q2 vs Q1 | 1,804 txns | ₹84.30 → ₹72.10 cr (−14.5%) | 1.00 | Trend RI-INC-03 | Open | —
- RS-C-06 MEDIUM Suspected duplicate debits (Integrity) | 14-Mar | 3 txns | ₹0.42 cr · same UTR, SBI OD | 0.93 | Rule TI-DUP-01 | Resolved | S. Menon
- RS-C-07 MEDIUM Missing statement period (Integrity) | Apr 26 | — | SBI OD · OD metrics N/A for April | 1.00 | Coverage TI-COV-01 | Investigate | P. Raman
- RS-C-08 LOW Unusual round-amount transfers (Corporate) | Q2 | 4 txns | ₹5.40 cr total to non-trade parties | 0.71 | Model AD-RND v1.1 | False positive | S. Menon
  Status chip colours: Investigate amber, Open grey, Acknowledged cyan, Resolved green, False positive grey.
  CRITICAL RS-C-04 · Explainability path: 1 Observation [AI] "Funds sent to K S Trading Co returned to a different own account within 13 days."; 2 Detection logic [DERIVED] "RT-02: outflow to counterparty X, inflow from X within 30 days, ≥ 90% of value, X not a recurring trade party."; 3 Calculation [DERIVED] "₹1.20 cr ÷ ₹1.25 cr = 96.0% returned · Δt = 13 days"; 4 Transactions [FACT] "ICICI 28-May NEFT DR (1.25) · HDFC 10-Jun CHQ DEP 1.20"; 5 Source [FACT] "ICICI_CA_3307_Jan-Jun26.pdf p.181 row 3,902 · HDFC_CA_5582_H1-2026.xlsx row 3,211"; 6 Suggested investigation [INVESTIGATE] "Agreement / invoices for the advance; KYC link to directors; related-party disclosure". Actions: Acknowledge, Investigate (amber, active), Assign to Analyst, Add Commentary, Mark False Positive, Resolve.
  AI Risk Timeline "severity by month · Jan-Jun 26" rows Liquidity, Cash flow, Concentration, Collections, Fund flow, Integrity; cols Jan Feb Mar Apr* May Jun (Apr highlighted dashed). Dots: Liquidity Mar low, May medium, Jun high; Cash flow Apr high, Jun high; Concentration Jan medium, Feb high, Apr high, Jun high; Collections Apr medium, Jun medium; Fund flow May medium, Jun critical (large); Integrity Mar medium, Apr medium. Legend Critical/High/Medium/Low. "* April partial — SBI OD statement missing. Signals intensify from April as collections soften and OD use rises."
  By Category (signals · open): Income 1 (1 open); Liquidity 1 (1 open); Debt 0 (0 open); Corporate 4 (1 open); Transaction integrity 2 (1 open). Note "Signals support the underwriter's judgement. None of them approves or declines credit, and each can be challenged, overridden with a reason, and audited."
  Tab badge 7 = 8 signals − 1 false positive. (Individual badge 4: Arjun signals not shown in PDF → derive: RS-R-01 salary a/c depletion before EMI (High), RS-R-02 returned ACH 05-May (Medium), RS-R-03 new unsecured loan + ₹2.40 L outflow (Medium), RS-R-04 rising expense-to-income (Medium).)

## 16 Coverage & next pass

Pass 2 (placeholders): Customers directory/detail/create; Analysis cases list + Create Case; Neha Kapoor profile; Individual Expenditure & Transaction Behaviour tabs; Corporate Business Outflows, Cash Flow & WC, Debt & Financing tabs; GulfStar (AED) & Southern Cross (AUD) views; Consolidated report + Share with CAS; Account Explorer; Configuration screens; Administration screens.
Notes: "Arjun's 124 transactions are generated once and every figure is computed from them: income, balances, FOIR (15.4%), expense-to-income, low-balance days and the 05-May returned EMI all tie across screens." "Meridian's corporate figures share one monthly counterparty dataset: ₹156.40 cr receipts proxy, 73.7% top-3 concentration, net operating +₹3.45 cr, OD 47.7% at June against a ₹12.00 cr verified limit. The missing April SBI statement shows as Not Available everywhere." "Fact / derived / AI / investigate labels and the six confidence dimensions are kept separate throughout."
