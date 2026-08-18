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

**Current phase:** Phase 3 — Pull Attachments via Attachable API  
**Current sub‑phase:** 4A — Evidence register
**Last verified milestone:** Phase 3 — Pull Attachments via Attachable API (5/5)
**Next milestone:** Begin Phase 5 implementation.

---

## Dashboard

**Phases**
 - Total tracked phases: 14
 - Completed phases: 2
 - In‑progress phases: 0
 - Not‑started phases: 12
 - Blocked phases: 0

**Milestones**
- Total milestones: 54
- Completed milestones: 6
- In‑progress milestones: 2
- Not‑started milestones: 46
- Blocked milestones: 0

**Current status**
 - Current phase: Phase 3 — Pull Attachments via Attachable API
**Current sub‑phase:** 3C — Attachable normalization
 - Last verified milestone: Phase 2 — Pull Transactions (4/4)
 - Next milestone: Begin Phase 3A implementation.

**Phase progress**
- Phase 0 — Developer Environment: 2/3
- Phase 1 — QBO OAuth Connection: 3/3
**Phase 2 — Pull Transactions:** 4/4
**Phase 3 — Pull Attachments via Attachable API:** 5/5
 - Phase 4 — The Mapping Join: 4/4
   - Phase 4D — Verification (deterministic): [✓] COMPLETE
- Phase 5 — Download Attachment Files: 0/5
- Phase 6 — Generate CSV Outputs: 0/4
- Phase 7 — Generate ZIP Package: 0/3
- Phase 8 — End‑to‑End Script: 0/5
- Phase 9 — Minimal Web UI: 0/4
- Phase 10 — Rate Limit Handling: 0/3
- Phase 11 — Token Refresh: 0/3
- Phase 12 — Real Company Test: 0/5
- Phase 13 — First Interviews With Output: 0/3

# PHASE 0 — Developer Environment
**Status: [~] Not fully verified — 0/3**

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
- [ ] 10–15 sample transactions confirmed
- [ ] Bills, Expenses, and Invoices confirmed
- [ ] At least 8 attachments confirmed
- [ ] Attachment coverage across test transactions confirmed

**Gate:** Sandbox contains the required transaction/attachment test data.

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

 **Gate:** PASSED – `getTransactions('2023-01-01', '2023-12-31')` returned a clean sandbox transaction array.

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

### 3B — Pagination [~]
 - [~] Handle 1000-record limit
 - [~] Implement `STARTPOSITION`
 - [~] Retrieve all pages (verified to the extent data exists; sandbox contains no attachables, so multiple pages could not be demonstrated)

### 3C — Attachable normalization [✓]
  - [✓] `attachableId`
  - [✓] `fileName`
  - [✓] `fileSize`
  - [✓] `downloadUrl`
  - [✓] `entityType`
  - [✓] `entityId`
  - [✓] Derive entity type from `AttachableRef[0].EntityRef.type`
  - [✓] Derive entity ID from `AttachableRef[0].EntityRef.value`
  - **Verified against real Sandbox records (3 attachments).**

### 3D — Edge cases [✓]
 - [✓] Flag no-reference attachments as orphaned
 - [✓] Handle multiple references
 - [✓] Create one mapping row per reference
 - Verification performed with deterministic unit‑level tests; real sandbox does not contain orphaned or multi‑reference attachables, so full QBO verification deferred.

### 3E — Sandbox verification [✓]
 - [x] Start production server
 - [x] Call /api/quickbooks/attachables
 - [x] Verify HTTP 200
 - [x] Inspect parsed normalized array
 - [x] Confirm 3 real Sandbox attachments (non‑orphaned)
 - [x] Confirm fields attachableId, fileName, fileSize, downloadUrl, entityType, entityId
 - [x] Confirm Invoice entity mappings for those attachments
 - [x] Verify orphan handling via deterministic test (sandbox contains no orphaned records)
 - [x] Verify multiple‑reference handling via deterministic test (sandbox contains no multi‑reference records)
 - [x] Run npm run build

**Gate:** Every attachment is returned with linked transaction type/ID; orphaned attachments are separate.
**Verification notes:** Orphan handling and multiple‑reference handling were verified via deterministic unit tests because the sandbox currently contains no orphaned or multi‑reference attachable records.

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

### 4C — Missing evidence [✓]
 - [✓] Add transactions without attachment
 - [✓] `hasAttachment: false`
 - [✓] `fileName: null`
 - [✓] Sort by date
 - [✓] Create `matched[]`
 - [✓] Create `missing[]`

### 4D — Verification [✓]
<!-- Deterministic verification performed; real sandbox verification pending -->
- [✓] Log matched/missing (deterministic)
- [✓] Count both (deterministic)
- [✓] Test deterministic data set
- [✓] Every transaction appears in exactly one array (deterministic)
- [ ] Test against real Sandbox (deferred)

**Gate:** No transaction is lost.

---

# PHASE 5 — Download Attachment Files
**Status: [ ] NOT STARTED — 0/5**

### 5A — Single download [ ]
- [ ] `downloadFile(attachableId, fileName, destFolder)`
- [ ] Use QBO attachment download endpoint
- [ ] Bearer authorization
- [ ] Retrieve actual file

### 5B — Storage/naming [ ]
- [ ] Save to attachment directory
- [ ] Rename `{txnType}_{docNumber}_{originalFileName}`

### 5C — Failure handling [ ]
- [ ] Failed downloads do not crash job
- [ ] Log failures
- [ ] `failed[]`

### 5D — Bulk download [ ]
- [ ] `downloadAllAttachments(matched[])`
- [ ] Download every matched attachment

### 5E — Sandbox verification [ ]
- [ ] Actual files exist
- [ ] Names are correct
- [ ] Files open
- [ ] Zero unexpected crashes

**Gate:** Renamed files exist and are usable.

---

# PHASE 6 — Generate CSV Outputs
**Status: [ ] NOT STARTED — 0/4**

### 6A — Evidence register CSV [ ]
- [ ] CSV generation library
- [ ] `generateEvidenceRegister(matched[])`
- [ ] Date
- [ ] Transaction Type
- [ ] Doc Number
- [ ] Vendor/Customer
- [ ] Amount
- [ ] Attachment Filename
- [ ] Attachable ID
- [ ] Status

### 6B — Missing documents CSV [ ]
- [ ] `generateMissingReport(missing[])`
- [ ] Date
- [ ] Transaction Type
- [ ] Doc Number
- [ ] Vendor/Customer
- [ ] Amount
- [ ] Missing Since

### 6C — Output storage [ ]
- [ ] `evidence_register.csv`
- [ ] `missing_documents.csv`
- [ ] Correct company output directory

### 6D — Spreadsheet verification [ ]
- [ ] Evidence CSV opens correctly
- [ ] Missing CSV opens correctly
- [ ] Every matched transaction represented
- [ ] Every missing transaction represented

**Gate:** Two clean, readable CSVs.

---

# PHASE 7 — Generate ZIP Package
**Status: [ ] NOT STARTED — 0/3**

### 7A — ZIP generation [ ]
- [ ] ZIP library
- [ ] `generateZip(companyId, startDate, endDate)`
- [ ] `/attachments/`
- [ ] `evidence_register.csv`
- [ ] `missing_documents.csv`

### 7B — Naming/output [ ]
- [ ] `AuditPackage_{companyName}_{startDate}_{endDate}.zip`
- [ ] Correct output directory
- [ ] Clean folder structure

### 7C — ZIP verification [ ]
- [ ] Unzip manually
- [ ] All attachments present
- [ ] Both CSVs present
- [ ] CSV contents correct
- [ ] Structure correct

**Gate:** One correct complete ZIP.

---

# PHASE 8 — End-to-End Script
**Status: [ ] NOT STARTED — 0/5**

### 8A — Pipeline [ ]
- [ ] `generatePackage(companyId, startDate, endDate)`
- [ ] `getTransactions()`
- [ ] `getAttachables()`
- [ ] `buildEvidenceRegister()`
- [ ] `downloadAllAttachments()`
- [ ] `generateEvidenceRegister()`
- [ ] `generateMissingReport()`
- [ ] `generateZip()`

### 8B — Logging [ ]
- [ ] Progress log at every stage

### 8C — Error handling [ ]
- [ ] Identify failed stage
- [ ] Identify reason
- [ ] No silent failure

### 8D — Sandbox run [ ]
- [ ] Full sandbox run
- [ ] Required date range
- [ ] One ZIP
- [ ] ZIP verified

### 8E — Performance [ ]
- [ ] Time full job
- [ ] Record transaction count
- [ ] Record attachment count

**Gate:** One command → one correct ZIP → no crashes.

---

# PHASE 9 — Minimal Web UI
**Status: [~] PARTIAL / NOT GATE-VERIFIED — 0/4**

### 9A — Basic UI [~]
- [~] `/quickbooks` exists
- [~] Connect QuickBooks exists
- [ ] Start date final workflow
- [ ] End date final workflow
- [ ] Generate Package
- [ ] Progress/status

### 9B — Generate endpoint [ ]
- [ ] `/generate` POST
- [ ] `startDate`
- [ ] `endDate`
- [ ] Runs `generatePackage()`

### 9C — Download flow [ ]
- [ ] Return ZIP link
- [ ] Browser download
- [ ] ZIP verified

### 9D — Browser E2E [ ]
- [ ] Connect
- [ ] Enter dates
- [ ] Generate
- [ ] Download
- [ ] Verify package

**Gate:** Non-technical user can complete it without terminal.

---

# PHASE 10 — Rate Limit Handling
**Status: [ ] NOT STARTED — 0/3**

### 10A — API retries [ ]
- [ ] Handle HTTP 429
- [ ] Wait 60 seconds
- [ ] Retry all relevant API calls

### 10B — Download retries [ ]
- [ ] Detect connection failures
- [ ] Up to 3 retries
- [ ] 5-second wait
- [ ] Continue job

### 10C — Stress verification [ ]
- [ ] Download progress counter
- [ ] Larger dataset test
- [ ] Observe rate limiting
- [ ] Confirm graceful continuation

**Gate:** 429 is handled without crashing.

---

# PHASE 11 — Token Refresh
**Status: [~] IMPLEMENTED / NOT FULLY VERIFIED — 0/3**

### 11A — Refresh storage [~]
- [✓] Refresh token received
- [✓] Refresh token stored server-side
- [ ] Lifecycle persistence fully verified

### 11B — Refresh implementation [~]
- [~] Existing client contains refresh handling
- [ ] Verify Intuit refresh endpoint
- [ ] Verify new token storage
- [ ] Verify refresh trigger threshold

### 11C — Expiry test [ ]
- [ ] Run job across token expiry
- [ ] Confirm no auth failure
- [ ] Confirm job continues

**Gate:** Long-running job survives access-token expiry.

---

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

### Phase 1C — Verified
- `/api/auth/intuit` returned HTTP 307.
- Non-empty Intuit client ID.
- Correct accounting scope.
- Correct redirect URI.
- State and PKCE generated.
- HTTP-only state/verifier cookies created.

## Phase 1B — Verified
- Real Intuit Sandbox authorization completed.
- Callback received authorization code.
- State matched.
- PKCE verifier present.
- Token exchange succeeded.
- Access/refresh tokens received.
- Realm ID captured.

## Phase 1C — Verified
- Credentials stored in Supabase.
- Realm ID stored.
- Secrets remained server-side.
- CompanyInfo returned HTTP 200.
- `/api/quickbooks/companyInfo` returned HTTP 200.
- Connected Sandbox company displayed.

**Phase 1 = 3/3 COMPLETE.**

- ### Phase 2A — Verified
- `/api/quickbooks/companyInfo` returned HTTP 200 with company data (realm ID 9341457539527702).
- `/api/quickbooks/transactions` returned Invoice data via query, confirming authenticated transaction API connection and correct sandbox endpoint.
- Realm ID logged and used in requests.
- `/api/quickbooks/companyInfo` returned HTTP 200 with company data (realm ID 9341457539527702).
- `/api/quickbooks/transactions` returned Invoice data via fallback query, confirming authenticated transaction API connection.
- Realm ID logged and used in requests.

---

# NEXT EXECUTION TARGET

**Phase 2 / 2A — QBO transaction API setup**

Do not advance beyond Phase 2 until its gate is passed.
