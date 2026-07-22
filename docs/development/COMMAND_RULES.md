# AuditReady Development Command Rules

These rules are mandatory for every implementation, verification, and response.

Failure to follow these rules is considered an implementation error.

---

# 1. Environment

Project OS

- Windows 11
- PowerShell
- Next.js
- Supabase CLI

Never assume Linux or macOS.

---

# 2. HTTP Requests

Always use

curl.exe

Never use

curl
wget
httpie

Never use Linux curl examples.

---

# 3. Database Queries

Always use

supabase db query "<sql>" --linked

Never use

psql

Never assume PostgreSQL CLI exists.

---

# 4. Database Migrations

Always use

supabase db push --linked

---

# 5. File Operations

Only use PowerShell commands.

Allowed

Get-ChildItem
Get-Content
Set-Content
Copy-Item
Move-Item
Remove-Item
Test-Path
New-Item

Never use

ls
cat
cp
mv
rm
touch
grep
sed
awk
find
wc

---

# 6. Git

Allowed

git status
git add
git commit
git push
git reset
git clean
git restore
git log

---

# 7. Browser Verification

If any UI changes are implemented, browser verification is mandatory.

API verification alone is not sufficient.

---

# 8. Verification Order

Always verify in this exact order.

1. Migration
2. Database
3. API
4. Browser
5. Regression
6. Git Status

Never change this order.

---

# 9. Scope

Implement only the requested milestone.

Never implement future milestones.

Never add nice-to-have features.

Never refactor unrelated code.

---

# 10. Completion Rule

A milestone is complete only after every required verification succeeds.

Implementation alone is never considered complete.

---

# 11. Output Format

At the end of every milestone, report exactly:

1. Files changed
2. Database verification
3. API verification (if applicable)
4. Browser verification (if applicable)
5. Regression verification
6. Git status
7. Defects fixed
8. Confirmation

No additional commentary.

---

# 12. Windows Compatibility

Every command must work in Windows PowerShell exactly as written.

If a command does not work in Windows PowerShell, do not output it.

Do not substitute Linux or macOS commands.

---

# 13. Authority

Read this document before implementing every milestone.

Every command, verification step, and code modification must comply with this document.
