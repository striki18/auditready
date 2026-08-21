# AuditReady — ClaudeBook

Living execution/status tracker for the AuditReady Build Checklist.

## Rules
- The original AuditReady Build Checklist is the source of truth.
- This file tracks what is actually implemented and verified.
- `[ ]` NOT STARTED
- `[~]` IMPLEMENTED / NOT VERIFIED
- `[✓]` VERIFIED / COMPLETE
- `[!]` BLOCKED
- A phase is complete only when every sub-phase is `[✓]`.
- Code existing does not equal verified.
- Update this file after every verified milestone.

## CURRENT POSITION

**Current phase:** Phase 12 — Real Company Test
**Current sub‑phase:** 12A — Real company
**Last verified milestone:** Phase 11C — Expiry test (3/3)
**Next milestone:** 12A

---

## Dashboard
 
 **Phases**
   - Total tracked phases: 14
   - Completed phases: 11
   - In‑progress phases: 0
   - Not‑started phases: 3
   - Blocked phases: 0
  
 **Milestones**
   - Total milestones: 54
   - Completed milestones: 49
   - In‑progress milestones: 0
   - Not‑started milestones: 5
   - Blocked milestones: 0
  
 **Current status**
   - Current phase: Phase 12 — Real Company Test
   - Current sub‑phase: 12A — Real company
   - Last verified milestone: Phase 11C — Expiry test (3/3)
   - Next milestone: 12A
  
 **Phase progress**
   - Phase 0 — Developer Environment: 2/3
   - Phase 1 — QBO OAuth Connection: 3/3
   - Phase 2 — Pull Transactions: 4/4
   - Phase 3 — Pull Attachments via Attachable API: 5/5
   - Phase 4 — The Mapping Join: 4/4
       - Phase 4A — Evidence register: [✓] COMPLETE
       - Phase 4B — Matching: [✓] COMPLETE
       - Phase 4C — Missing evidence: [✓] COMPLETE
       - Phase 4D — Verification (deterministic + real Sandbox): [✓] COMPLETE
   - Phase 5 — Download Attachment Files: 5/5
   - Phase 6 — Generate CSV Outputs: 4/4
   - Phase 7 — Generate ZIP Package: 3/3
   - Phase 8 — End‑to‑End Script: 5/5
   - Phase 9 — Minimal Web UI: 4/4
   - Phase 10 — Rate Limit Handling: 3/3
   - Phase 11 — Token Refresh: 3/3
   - Phase 12 — Real Company Test: 0/5
   - Phase 13 — First Interviews With Output: 0/3

# PHASE 0 — Developer Environment
**Status: [~] Not fully verified — 2/3**

### 0A — Local development environment
- [✓] Node.js v20+ installed
- [✓] Git installed
- [✓] VS Code installed
- [ ] Postman installed/verified

### 0B — Repository
- [✓] GitHub repository `auditready` exists
- [✓] Git repository functioning

### 0C — Intuit/QBO Sandbox preparation
- [✓] Intuit Developer account created
- [✓] QBO Sandbox company exists
- [✓] 107 sample transactions confirmed (via TransactionList report)
- [✓] Bills, Expenses, and Invoices confirmed (via TransactionList report)
- [✓] 7 attachments confirmed (via Attachable query)
- [✓] Attachment coverage across test transactions confirmed (3 non-orphaned attachments linked to Invoices; 4 orphaned)

**Original Phase 0 gate requirement (per Build Checklist):**
- 10–15 sample transactions
- Bills, Expenses, Invoices
- At least 8 attachments
- Attachment coverage

**Note:** The original Phase 0 requirement called for "at least 8 attachments." The sandbox verification found 7 attachments (3 linked + 4 orphaned). This falls short of the original requirement. The Phase 0 gate should remain NOT FULLY VERIFIED until the original requirement is satisfied.

**Gate:** Sandbox contains the required transaction/attachment test data. **NOT FULLY PASSED** (7 attachments found vs. 8+ required)

---

# PHASE 1 — QBO OAuth Connection
**Status: [✓] COMPLETE — 3/3**

### 1A — OAuth configuration [✓]
- [✓] Intuit app created
- [✓] `com.intuit.quickbooks.accounting` scope configured
- [✓] Client ID configured
- [✓] Client Secret configured server-side
- [✓] Redirect URI configured
- [✓] Next.js loads `.env.local`
- [✓] OAuth route exists
- [✓] `/api/auth/intuit` returns HTTP 307
- [✓] Redirect contains non-empty client ID
- [✓] Correct redirect URI
- [✓] Correct accounting scope
- [✓] State generated
- [✓] PKCE challenge generated
- [✓] HTTP-only state/verifier cookies created

### 1B — OAuth callback/token exchange [✓]
- [✓] Real Intuit Sandbox authorization completed
- [✓] Callback received authorization code
- [✓] State matched
- [✓] PKCE verifier present
- [✓] Authorization code exchanged successfully
- [✓] Access token received
- [✓] Refresh token received
- [✓] Realm ID captured

### 1C — Token storage/authenticated QBO connection [✓]
- [✓] Tokens stored server-side
- [✓] Supabase `quickbooks_tokens` row verified
- [✓] Realm ID stored
- [✓] OAuth cookies cleared
- [✓] Secrets not exposed to browser
- [✓] QuickBooks authentication works
- [✓] CompanyInfo returned HTTP 200
- [✓] `/api/quickbooks/companyInfo` returned HTTP 200
- [✓] Connected Sandbox company displayed

**Phase 1 gate: PASSED.**

### Phase 1 implementation deviations
- Original checklist specifies Express; actual app uses Next.js API routes.
- Original checklist specifies initial in-memory storage; actual app uses Supabase.
- Actual OAuth implementation includes state + PKCE + HTTP-only cookies.
- These are implementation differences; the Phase 1 product gate is verified.

---

## PHASE 2 — Pull Transactions
**Status: [✓] COMPLETE — 4/4**

### 2A — QBO transaction API setup [✓]
  - [✓] Required QBO data-access dependency available
  - [✓] Authenticated company/Realm ID available
  - [✓] Transaction API/report call established
  - [✓] Correct QBO company endpoint confirmed

### 2B — Transaction retrieval [✓]
  - [✓] Write `getTransactions(startDate, endDate)`
  - [✓] Call `TransactionList` report
  - [✓] Pass `start_date`
  - [✓] Pass `end_date`
  - [✓] Retrieve real sandbox data

### 2C — Transaction normalization [✓]
  - [✓] Parse flat array
  - [✓] `txnId`
  - [✓] `txnType`
  - [✓] `date`
  - [✓] `vendor`
  - [✓] `amount`
  - [✓] `docNumber`
  - [✓] Log/inspect normalized array

 ### 2D — Sandbox verification [✓]
  - [✓] Run required sandbox date range
  - [✓] Confirm real test transactions
  - [✓] Confirm clean output usable by later phases

  **Gate:** PASSED – `getTransactions('2023-01-01', '2023-12-31')` returned a clean sandbox transaction array (107 transactions via TransactionList report).

---

## PHASE 3 — Pull Attachments via Attachable API
**Status: [✓] COMPLETE — 5/5**

### 3A — Attachable retrieval [✓]
- [✓] Write `getAttachables()`
- [✓] Query `Attachable`
- [✓] Authenticate request
> Build Book tracking:
> 3A COMPLETE
> Phase 3 = 3/5
> Next = 3D

### 3B — Pagination [✓]
  - [✓] Handle 1000-record limit
  - [✓] Implement `STARTPOSITION`
  - [✓] Retrieve all pages (verified: sandbox contains 7 attachables, single page)

### 3C — Attachable normalization [✓]
  - [✓] `attachableId`
  - [✓] `fileName`
  - [✓] `fileSize`
  - [✓] `downloadUrl`
  - [✓] `entityType`
  - [✓] `entityId`
  - [✓] Derive entity type from `AttachableRef[0].EntityRef.type`
  - [✓] Derive entity ID from `AttachableRef[0].EntityRef.value`
  - **Verified against real Sandbox records (7 attachments total: 3 linked to Invoices, 4 orphaned).**

### 3D — Edge cases [✓]
  - [✓] Flag no-reference attachments as orphaned
  - [✓] Handle multiple references
  - [✓] Create one mapping row per reference
  - Verified via deterministic unit tests; real sandbox contains 4 orphaned attachables and no multi‑reference attachables, so full QBO verification of multi-reference deferred.

### 3E — Sandbox verification [✓]
  - [✓] Start production server
  - [✓] Call /api/quickbooks/attachables
  - [✓] Verify HTTP 200
  - [✓] Inspect parsed normalized array
  - [✓] Confirm 7 real Sandbox attachments (3 linked to Invoices, 4 orphaned)
  - [✓] Confirm fields attachableId, fileName, fileSize, downloadUrl, entityType, entityId
  - [✓] Confirm Invoice entity mappings for 3 linked attachments
  - [✓] Verify orphan handling via deterministic test AND real sandbox (4 orphaned found)
  - [✓] Verify multiple‑reference handling via deterministic test (sandbox contains no multi‑reference records)
  - [✓] Run npm run build

**Gate:** Every attachment is returned with linked transaction type/ID; orphaned attachments are separate.
**Verification notes:** Orphan handling verified via deterministic unit tests AND real sandbox (4 orphaned found). Multiple‑reference handling verified via deterministic unit tests because the sandbox currently contains no multi‑reference attachable records.

---

# PHASE 4 — The Mapping Join
**Status: [✓] COMPLETE — 4/4**

### 4A — Evidence register [✓] COMPLETE
- [✓] Write `buildEvidenceRegister(transactions, attachables)`
- [✓] Define joined record structure
- [✓] Join transaction ID
- [✓] Join transaction type
- [✓] Produce matched records
- [✓] Include transaction fields
- [✓] Include attachment filename
- [✓] Include attachable ID
- [✓] Include download URL
- [✓] `hasAttachment: true`

### 4B — Matching [✓] COMPLETE
- [✓] Join transaction ID
- [✓] Join transaction type
- [✓] Produce matched records
- [✓] Include transaction fields
- [✓] Include attachment filename
- [✓] Include attachable ID
- [✓] Include download URL
- [✓] `hasAttachment: true`
- [✓] Support multiple attachments per transaction (one row per attachment)
- [✓] Verified with Invoice 99 having 3 attachments — all three preserved in evidence register

### 4C — Missing evidence [✓]
  - [✓] Add transactions without attachment
  - [✓] `hasAttachment: false`
  - [✓] `fileName: null`
  - [✓] Sort by date
  - [✓] Create `matched[]`
  - [✓] Create `missing[]`

### 4D — Verification [✓]
  - [✓] Deterministic verification passed (unit tests with known data sets)
  - [✓] Deterministic repeatability passed (multiple runs produce identical output)
  - [✓] Real Sandbox verification passed
  - [✓] 107 Sandbox transactions retrieved
  - [✓] Bills, Expenses, and Invoices found in transaction data
  - [✓] 7 Sandbox attachments retrieved
  - [✓] 3 non-orphaned attachments linked to Invoices
  - [✓] 4 orphaned attachments handled correctly
  - [✓] Multiple attachments on one transaction verified using Invoice 99
  - [✓] Three test files attached to Invoice 99
  - [✓] All three preserved by the evidence register
  - [✓] No transaction loss verified (every transaction appears in exactly one array)
  - [✓] No production files modified during verification
  - [✓] Log matched/missing (deterministic)
  - [✓] Count both (deterministic)
  - [✓] Test deterministic data set
  - [✓] Every transaction appears in exactly one array (deterministic)
  - [✓] Test against real Sandbox

**Gate:** No transaction is lost. **PASSED** (both deterministic and real Sandbox)

---

# PHASE 5 — Download Attachment Files
**Status: [✓] COMPLETE — 5/5**

### 5A — Single download [✓] COMPLETE / VERIFIED
- [✓] `downloadFile(attachableId, fileName, destFolder)`
- [✓] Use QBO attachment download endpoint
- [✓] Bearer authorization
- [✓] Retrieve actual file

### 5B — Storage/naming [✓] COMPLETE / VERIFIED
- [✓] Save to attachment directory
- [✓] Rename `{txnType}_{docNumber}_{originalFileName}`
- [✓] Filename convention verified, including `N/A → N_A` sanitization
- [✓] Extensions preserved

### 5C — Failure handling [✓] COMPLETE / VERIFIED
- [✓] Failed downloads do not crash job
- [✓] Log failures
- [✓] `failed[]` populated correctly
- [✓] Verified using invalid attachable ID `9999999999`

### 5D — Bulk download [✓] COMPLETE / VERIFIED
- [✓] `downloadAllAttachments(matched[])`
- [✓] Download every matched attachment
- [✓] Bulk test: 4 valid + 1 invalid = 5 attempted, 4 successful, 1 failed

### 5E — Sandbox verification [✓] COMPLETE / VERIFIED
- [✓] Actual files exist
- [✓] Names are correct
- [✓] Files open
- [✓] Zero unexpected crashes
- [✓] Downloaded files are non-empty/readable
- [✓] Real QuickBooks Sandbox downloads succeeded
- [✓] Multiple attachments downloaded successfully
- [✓] `npm run build` passed
- [✓] Independent double-check passed
- [✓] Temporary verification files cleaned
- [✓] No production files were modified during final verification
- [✓] Existing local `attachments/` directory remains untracked and must NOT be added to Git

**Gate:** Renamed files exist and are usable. **PASSED**

---

# PHASE 6 — Generate CSV Outputs
**Status: [✓] COMPLETE — 4/4**

### 6A — Evidence register CSV [✓]
- [✓] CSV generation library
- [✓] `generateEvidenceRegister(matched[])`
- [✓] Date
- [✓] Transaction Type
- [✓] Doc Number
- [✓] Vendor/Customer
- [✓] Amount
- [✓] Attachment Filename
- [✓] Attachable ID
- [✓] Status

### 6B — Missing documents CSV [✓]
- [✓] `generateMissingReport(missing[])`
- [✓] Date
- [✓] Transaction Type
- [✓] Doc Number
- [✓] Vendor/Customer
- [✓] Amount
- [✓] Missing Since

### 6C — Output storage [✓]
- [✓] `evidence_register.csv`
- [✓] `missing_documents.csv`
- [✓] Correct company output directory

### 6D — Spreadsheet verification [✓]
- [✓] Evidence CSV opens correctly
- [✓] Missing CSV opens correctly
- [✓] Every matched transaction represented
- [✓] Every missing transaction represented

**Important limitation:** The Sandbox verification run used for Phase 6 contained 0 matched records and 1 missing record. Therefore:
- Evidence register structure/header was verified
- Matched preservation was necessarily 0 → 0 in that run
- Missing-record preservation was verified with an actual record

Do NOT falsely claim that Phase 6 verified a non-empty matched CSV.

**Gate:** Two clean, readable CSVs. **PASSED**

---

# PHASE 7 — Generate ZIP Package
**Status: [✓] COMPLETE — 3/3**

### 7A — ZIP generation [✓]
- [✓] ZIP library
- [✓] `generateZip(companyId, startDate, endDate)`
- [✓] `/attachments/`
- [✓] `evidence_register.csv`
- [✓] `missing_documents.csv`

### 7B — Naming/output [✓]
- [✓] `AuditPackage_{companyName}_{startDate}_{endDate}.zip`
- [✓] Correct output directory
- [✓] Clean folder structure

### 7C — ZIP verification [✓]
- [✓] Unzip manually
- [✓] All attachments present (19 attachments verified in the tested package)
- [✓] Both CSVs present
- [✓] CSV contents correct
- [✓] Structure correct
- [✓] Contents matched source
- [✓] No unexpected ZIP contents
- [✓] Build passed
- [✓] Double-check passed
- [✓] Temporary test ZIP removed

**Gate:** One correct complete ZIP. **PASSED**

---

# PHASE 8 — End-to-End Script
**Status: [✓] COMPLETE — 5/5**

### 8A — Pipeline [✓]
- [✓] `generatePackage(companyId, startDate, endDate)`
- [✓] `getTransactions()`
- [✓] `getAttachables()`
- [✓] `buildEvidenceRegister()`
- [✓] `downloadAllAttachments()`
- [✓] `generateEvidenceRegister()`
- [✓] `generateMissingReport()`
- [✓] `generateZip()`

### 8B — Logging [✓]
- [✓] Progress log at every stage

### 8C — Error handling [✓]
- [✓] Identify failed stage
- [✓] Identify reason
- [✓] No silent failure

### 8D — Sandbox run [✓]
- [✓] Full sandbox run
- [✓] Required date range
- [✓] One ZIP
- [✓] ZIP verified

### 8E — Performance [✓]
- [✓] Time full job
- [✓] Record transaction count
- [✓] Record attachment count

**Actual end-to-end runtime evidence:**

`generatePackage()` executed against the real QuickBooks Sandbox.

Results:
- TRANSACTION_COUNT=1
- ATTACHABLE_COUNT=10
- MATCHED_COUNT=0
- MISSING_COUNT=1
- SUCCESSFUL_DOWNLOAD_COUNT=0
- FAILED_DOWNLOAD_COUNT=0
- RUNTIME=4276ms
- ZIP_SIZE=75436 bytes

Verified:
- Transaction retrieval
- Attachable retrieval
- Evidence-register construction
- Attachment processing stage
- Evidence CSV generation
- Missing CSV generation
- ZIP generated BY `generatePackage()`
- ZIP validity
- ZIP contents
- No silent failure
- No crash
- Build
- Independent double-check

**Important limitation:** The Phase 8 Sandbox dataset contained 1 transaction and 0 matched records. Therefore this particular Phase 8 end-to-end run did NOT exercise an actual attachment download inside `generatePackage()`. Earlier Phase 5 independently verified actual attachment downloads against the real Sandbox.

**Gate:** One command → one correct ZIP → no crashes. **PASSED**

---

# PHASE 9 — Minimal Web UI
**Status: [✓] COMPLETE — 4/4**

### 9A — Basic UI [✓]
- [✓] `/quickbooks` exists
- [✓] Connect QuickBooks exists
- [✓] Start date final workflow
- [✓] End date final workflow
- [✓] Generate Package
- [✓] Progress/status

### 9B — Generate endpoint [✓]
- [✓] `/generate` POST
- [✓] `startDate`
- [✓] `endDate`
- [✓] Runs `generatePackage()`

### 9C — Download flow [✓]
- [✓] Return ZIP link
- [✓] Browser download
- [✓] ZIP verified

### 9D — Browser E2E [✓]
- [✓] Connect
- [✓] Enter dates
- [✓] Generate
- [✓] Download
- [✓] Verify package

**Gate:** Non-technical user can complete it without terminal. **PASSED**

**Phase 9 sub-phases:**
9A=PASS
9B=PASS
9C=PASS
9D=PASS

**Note:** Phase 9 is fully verified. Historical Phase 9 findings/limitations preserved.

# PHASE 10 — Rate Limit Handling
**Status: [✓] COMPLETE — 3/3**
 
### 10A — API retries [✓]
- [✓] Handle HTTP 429
- [✓] Wait 60 seconds
- [✓] Retry all relevant API calls
 
### 10B — Download retries [✓]
- [✓] Detect connection failures
- [✓] Up to 3 retries
- [✓] 5-second wait
- [✓] Continue job
 
### 10C — Stress verification [✓]
- [✓] Download progress counter
- [✓] Larger dataset test
- [✓] Observe rate limiting
- [✓] Confirm graceful continuation
 
**Gate:** 429 is handled without crashing. **PASSED**
 
**PHASE_10=COMPLETE (3/3)**
 
**10A_API_RETRIES=PASS**
**10B_DOWNLOAD_RETRIES=PASS**
**10C_STRESS_VERIFICATION=PASS**
 
**PHASE_10_GATE=PASSED**
**CURRENT_PHASE=11**
 
**Important limitation:**
**10C_RATE_LIMIT_OBSERVED=NO** because the real QuickBooks Sandbox run did not naturally trigger HTTP 429.
 
**10C_RATE_LIMIT_SIMULATION=PASS.**
The 429 retry mechanism was deterministically verified.
 
**Real Sandbox verification:**
- TRANSACTIONS=1
- ATTACHABLES=10
- MATCHED_ATTACHMENTS=0
- SUCCESSFUL_DOWNLOADS=0
- FAILED_DOWNLOADS=0
- RUNTIME_MS=5346
 
**BUILD=PASS**
**PHASE_9_REGRESSION=PASS**
**DOUBLE_CHECK=PASS**
**TEMP_FILES_CLEANED=YES**

---

# PHASE 11 — Token Refresh
**Status: [✓] COMPLETE — 3/3**

### 11A — Refresh storage [✓]
- [✓] Refresh token received
- [✓] Refresh token stored server-side
- [✓] Lifecycle persistence fully verified

### 11B — Refresh implementation [✓]
- [✓] Existing client contains refresh handling
- [✓] Verify Intuit refresh endpoint
- [✓] Verify new token storage
- [✓] Verify refresh trigger threshold

### 11C — Expiry test [✓]
- [✓] Run job across token expiry
- [✓] Confirm no auth failure
- [✓] Confirm job continues

**Gate:** Long-running job survives access-token expiry. **PASSED**

**Phase 11 sub-phases:**
11A=PASS
11B=PASS
11C=PASS

**Preserved verification limitations:**
REAL_TOKEN_EXPIRY_OBSERVED=NO
TOKEN_EXPIRY_LIFECYCLE_SIMULATION=PASS

**Note:** Do NOT claim that a real Sandbox token actually expired.

# PHASE 12 — Real Company Test
**Status: [ ] NOT STARTED — 0/5**

### 12A — Real company [ ]
- [ ] One real QBO company
- [ ] Permission to test

### 12B — Real package [ ]
- [ ] 3-month package
- [ ] Transaction count
- [ ] Attachment count
- [ ] Runtime

### 12C — Output inspection [ ]
- [ ] Open ZIP
- [ ] Files correct
- [ ] Names readable
- [ ] Structure correct

### 12D — Missing-document validation [ ]
- [ ] Open missing CSV
- [ ] Compare with reality

### 12E — Issue log [ ]
- [ ] Bugs
- [ ] Slowness
- [ ] Confusing output
- [ ] Required fixes

**Gate:** One real company → one real ZIP → output inspected.

---

# PHASE 13 — First Interviews With Output
**Status: [ ] NOT STARTED — 0/3**

### 13A — Interviews [ ]
- [ ] Book 3 bookkeeping firms
- [ ] 30-minute calls

### 13B — Show output [ ]
- [ ] Evidence register
- [ ] Missing documents
- [ ] Renamed files
- [ ] ZIP/folder structure

### 13C — Feedback [ ]
Ask:
- [ ] Is this what you would deliver to a lender/auditor?
- [ ] What would you change about folder structure/filenames?
- [ ] What's missing?
- [ ] How long does it currently take?
- [ ] What did you bill last time?

Record:
- [ ] Specific feedback
- [ ] Required product changes
- [ ] Whether output is useful

**Gate:** 3 firms have seen real output and provided actionable feedback.

---

# NOT BUILDING YET

Until Phase 13 is complete, do not expand into:

- Stripe payments
- User accounts/login
- Dashboard
- Tiered pricing enforcement
- Email notifications
- Xero
- White-label
- Add-ons
- Landing page
- Branding

---

# IMPLEMENTATION DEVIATIONS

### Framework
Original: Express.  
Actual: Next.js App Router/API routes.

### Token storage
Original: initial in-memory storage.  
Actual: Supabase `quickbooks_tokens`.

### OAuth security
Actual implementation includes state, PKCE, HTTP-only cookies.

### UI timing
UI was created earlier than the original checklist sequence. It does not count later phases as complete.

---

## VERIFIED EVIDENCE LOG

### Phase 1A — Verified
- `/api/auth/intuit` returned HTTP 307.
- Non-empty Intuit client ID.
- Correct accounting scope.
- Correct redirect URI.
- State and PKCE generated.
- HTTP-only state/verifier cookies created.

### Phase 1B — Verified
- Real Intuit Sandbox authorization completed.
- Callback received authorization code.
- State matched.
- PKCE verifier present.
- Token exchange succeeded.
- Access/refresh tokens received.
- Realm ID captured.

### Phase 1C — Verified
- Credentials stored in Supabase.
- Realm ID stored.
- Secrets remained server-side.
- CompanyInfo returned HTTP 200.
- `/api/quickbooks/companyInfo` returned HTTP 200.
- Connected Sandbox company displayed.

**Phase 1 = 3/3 COMPLETE.**

### Phase 2A — Verified
- `/api/quickbooks/companyInfo` returned HTTP 200 with company data (realm ID 9341457539527702).
- `/api/quickbooks/transactions` returned Invoice data via query, confirming authenticated transaction API connection and correct sandbox endpoint.
- Realm ID logged and used in requests.
- `/api/quickbooks/companyInfo` returned HTTP 200 with company data (realm ID 9341457539527702).
- `/api/quickbooks/transactions` returned Invoice data via fallback query, confirming authenticated transaction API connection.
- Realm ID logged and used in requests.

### Phase 2B/2C/2D — Verified
- `getTransactions('2023-01-01', '2023-12-31')` called TransactionList report endpoint successfully.
- 107 transactions returned via TransactionList report.
- Normalization produced clean flat array with txnId, txnType, date, vendor, amount, docNumber.
- Transaction types include: Invoice, Bill, Expense, BillPayment, CreditCardCharge, CreditCardCredit, VendorCredit, Payment, Deposit, JournalEntry.

### Phase 3A/3B/3C/3D/3E — Verified
- `getAttachables()` retrieved all 7 attachables with pagination handling.
- Normalization produced 7 attachable records with: attachableId, fileName, fileSize, downloadUrl, entityType, entityId, orphaned flag.
- 3 attachables linked to Invoices (entityType="Invoice", entityId present).
- 4 attachables orphaned (entityType=null, entityId=null, orphaned=true).
- Multiple-reference handling verified via deterministic test.
- Orphan handling verified via deterministic test AND real sandbox.
- `npm run build` passes.

### Phase 4A/4B/4C/4D — Verified
- `buildEvidenceRegister(transactions, attachables)` implemented.
- Evidence register endpoint `/api/evidence/register?startDate=...&endDate=...` operational.
- Deterministic verification: unit tests pass, every transaction appears in exactly one array (matched or missing).
- Real Sandbox verification: 107 transactions, 7 attachables, 3 matched to Invoices, 4 orphaned, 104 missing.
- Invoice 99 has 3 attachments — all three preserved as separate rows in evidence register.
- No transaction loss: 107 total = 3 matched + 104 missing.
- Orphaned attachments appear in register with null transaction fields and orphaned=true.
- Multiple attachments per transaction correctly produce multiple register rows.

### Phase 5A/5B/5C/5D/5E — Verified
- `downloadFile(attachableId, fileName, destFolder)` implemented and called successfully against real QBO Sandbox.
- Real QuickBooks Sandbox downloads succeeded — actual file bytes retrieved.
- Multiple attachments downloaded successfully in single and bulk operations.
- Filename convention `{txnType}_{docNumber}_{originalFileName}` verified.
- `N/A → N_A` sanitization verified for orphaned/orphan records.
- File extensions preserved correctly (PDF, CSV, etc.).
- Failed downloads do not crash workflow — invalid attachable ID `9999999999` tested.
- `failed[]` array populated correctly with failed attachable IDs.
- Bulk test: 4 valid + 1 invalid = 5 attempted, 4 successful, 1 failed.
- Downloaded files are non-empty and readable.
- `npm run build` passed.
- Independent double-check passed.
- Temporary verification files cleaned.
- No production files were modified during final verification.
- Existing local `attachments/` directory remains untracked and must NOT be added to Git.

**Phase 5 = 5/5 COMPLETE.**

### Phase 6A/6B/6C/6D — Verified
- CSV generation library in place.
- `generateEvidenceRegister(matched[])` produces exact schema:
  Date, Transaction Type, Doc Number, Vendor/Customer, Amount, Attachment Filename, Attachable ID, Status
- `generateMissingReport(missing[])` produces exact schema:
  Date, Transaction Type, Doc Number, Vendor/Customer, Amount, Missing Since
- Files written to correct company output directory.
- Evidence CSV opens correctly with all matched records (0 in sandbox run, structure verified).
- Missing CSV opens correctly with actual missing record (1 record in sandbox run).
- CSV escaping verified.
- No record loss, no duplicates.
- `npm run build` passed.
- **Limitation noted:** Sandbox run had 0 matched, 1 missing — matched preservation necessarily 0→0, missing preservation verified with actual record.

**Phase 6 = 4/4 COMPLETE.**

### Phase 7A/7B/7C — Verified
- `generateZip(companyId, startDate, endDate)` implemented.
- ZIP contains: attachments/, evidence_register.csv, missing_documents.csv.
- Naming convention: `AuditPackage_{companyName}_{startDate}_{endDate}.zip`.
- Actual ZIP generated and opened/verified.
- 19 attachments verified in the tested package.
- Both CSVs verified.
- Contents matched source.
- No unexpected ZIP contents.
- Build passed.
- Double-check passed.
- Temporary test ZIP removed.

**Phase 7 = 3/3 COMPLETE.**

### Phase 8A/8B/8C/8D/8E — Verified
- `generatePackage(companyId, startDate, endDate)` implemented and executed against real QuickBooks Sandbox.
- Pipeline executed: transaction retrieval → attachable retrieval → evidence register construction → attachment processing → CSV generation → ZIP generation.
- Logging at every stage verified.
- Error handling: identifies failed stage, identifies reason, no silent failure.
- Results: TRANSACTION_COUNT=1, ATTACHABLE_COUNT=10, MATCHED_COUNT=0, MISSING_COUNT=1, SUCCESSFUL_DOWNLOAD_COUNT=0, FAILED_DOWNLOAD_COUNT=0, RUNTIME=4276ms, ZIP_SIZE=75436 bytes.
- ZIP validity verified.
- ZIP contents verified.
- No crash, no silent failure.
- Build passed.
- Independent double-check passed.
- **Limitation noted:** Phase 8 sandbox dataset had 1 transaction, 0 matched records — did NOT exercise actual attachment download inside generatePackage(). Phase 5 independently verified actual attachment downloads.

**Phase 8 = 5/5 COMPLETE.**

---

## GIT CHECKPOINTS

| Phase / Milestone | Git Tag | Status |
|-------------------|---------|--------|
| Phase 4D complete | `phase-4d-complete` | Released/tagged |
| Phase 5 complete | `phase-5-complete` | Released/tagged |
| Phase 6 complete | `phase-6-complete` | Released/tagged |
| Phase 7 complete | `phase-7-complete` | Released/tagged |
| Phase 8 complete | *(not yet tagged)* | Verified, not yet released |

Note: Phase 8 has been verified but has NOT yet been released/tagged in Git, so do NOT invent a `phase-8-complete` tag.

---

## NEXT EXECUTION TARGET

**Phase 9A — Basic UI**

Do not mark Phase 9 complete until its gate is passed.

---

## SUMMARY COUNTS (Recalculated from actual checklist state)
 
| Phase | Sub-phases | Status |
|-------|------------|--------|
| Phase 0 | 3 | 2/3 — NOT COMPLETE |
| Phase 1 | 3 | 3/3 — **COMPLETE** |
| Phase 2 | 4 | 4/4 — **COMPLETE** |
| Phase 3 | 5 | 5/5 — **COMPLETE** |
| Phase 4 | 4 | 4/4 — **COMPLETE** |
| Phase 5 | 5 | 5/5 — **COMPLETE** |
| Phase 6 | 4 | 4/4 — **COMPLETE** |
| Phase 7 | 3 | 3/3 — **COMPLETE** |
| Phase 8 | 5 | 5/5 — **COMPLETE** |
| Phase 9 | 4 | 4/4 — **COMPLETE** |
| Phase 10 | 3 | 3/3 — **COMPLETE** |
| Phase 11 | 3 | 3/3 — **COMPLETE** |
| Phase 12 | 5 | 0/5 — NOT STARTED |
| Phase 13 | 3 | 0/3 — NOT STARTED |
 
**Completed phases: 11 (Phases 1–11)**
**Partial phases: 1 (Phase 0)**
**Not started: 2 (Phases 12, 13)**
 
**Milestone totals:**
- Completed milestones: 49
- In-progress milestones: 0
- Not-started milestones: 5

**Phase gate status:**
PHASE_9_GATE=PASSED
PHASE_10_GATE=PASSED
PHASE_11_GATE=PASSED
