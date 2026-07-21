# API Testing Verification Guide

This guide standardizes how developers verify that the local Next.js API is running correctly and how to test the various endpoints deterministically. **No application code is modified** – only documentation is added.

---

## 1. Start the server

Always verify that the Next.js development server is running before making any API calls.

**Command**

```bash
npm run dev
```

**Expected output** (look for the following line before proceeding):

```
Local:
http://localhost:3000
```

*Do **not** run any `curl` commands before this line appears.*

---

## 2. Windows PowerShell

PowerShell aliases `curl` to `Invoke-WebRequest`, which changes the behavior of the command. **Never use the alias**.

Instead, call the native executable directly:

```powershell
curl.exe -i http://localhost:3000/api/engagements
```

---

## 3. Alternative – PowerShell native

You can also use the PowerShell‑native cmdlet `Invoke‑RestMethod`:

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/engagements
```

---

## 4. Verify server first

Before testing any specific API endpoint, confirm the server responds with HTTP 200:

```powershell
curl.exe -i http://localhost:3000/
```

**Expected**

```
HTTP/1.1 200 OK
```

Only after this succeeds should you test individual APIs.

---

## 5. Standard verification sequence

Follow this order when checking the core endpoints:

### CompanyInfo

```powershell
curl.exe -i http://localhost:3000/api/quickbooks/companyInfo
```

### Engagements

```powershell
curl.exe -i http://localhost:3000/api/engagements
```

### Evidence Plan

```powershell
curl.exe -i "http://localhost:3000/api/evidence/plan?engagement_id=<id>"
```

### Evidence History

```powershell
curl.exe -i "http://localhost:3000/api/evidence/history?realm_id=<realm>&catalog_id=<id>"
```

---

## 6. Common errors

| Error | Meaning |
|-------|---------|
| `curl: (7)` | Server is not running. This is **not** an application bug. |
| `Connection refused` | Wrong port or the server has stopped. |
| `Invoke-WebRequest` asking for `Uri` | You accidentally used the PowerShell `curl` alias. Use `curl.exe` instead. |

---

## 7. Verify evidence plan via database (optional)

If you need to confirm that evidence plan items are correctly recorded in the database, you can run the following SQL query against your local database:

```sql
SELECT
    engagement_id,
    COUNT(*) AS items
FROM audit_evidence_plan
GROUP BY engagement_id;
```

This will list each `engagement_id` along with the number of associated evidence plan items, helping you cross‑verify the API response against the stored data.

---

**Summary**: Ensure the dev server is up, use `curl.exe` (or `Invoke‑RestMethod`) for requests, verify the root endpoint first, then follow the standard sequence. This makes local API testing deterministic and reduces confusion caused by PowerShell aliases.
