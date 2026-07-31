# Simple verification script for Milestone 5.4.2
# Assumes the Next.js dev server is already running on http://localhost:3000

$BaseUrl = "http://localhost:3000"
$EvidenceRequestId = "25e5c8a4-b379-49ca-98b0-d50f1e2cde84"
$UploadUrl = "$BaseUrl/api/evidence/request/$EvidenceRequestId/upload"

# Ensure test files exist
if (-not (Test-Path 'test.txt')) { Set-Content -Path 'test.txt' -Value 'hello audit' }
if (-not (Test-Path 'empty.txt')) { New-Item -Path 'empty.txt' -ItemType File -Force | Out-Null }

# ---------------------------------------------------------------------------
# Dev server preparation (idempotent)
# ---------------------------------------------------------------------------
Write-Host "=== Killing any existing Node processes on port 3000 (best‑effort) ==="
# Attempt to kill any node processes that might be holding the port. Errors are ignored.
taskkill /F /IM node.exe 2>$null | Out-Null

# Ensure the PORT environment variable is set for Next.js
$env:PORT = "3000"

Write-Host "=== Starting Next.js dev server on port 3000 ==="
# Use cmd.exe to launch npm in a new process (non‑blocking)
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','npm run dev' -NoNewWindow
# Give the server time to start up (adjust if needed)
Start-Sleep -Seconds 12

# Create a uniquely named copy of test.txt for this run to ensure idempotency
$timestamp = Get-Date -UFormat %s
$uniqueTestFile = "test-$timestamp.txt"
Copy-Item -Path 'test.txt' -Destination $uniqueTestFile -Force

Write-Host "=== TEST 1: Valid upload ==="
$response = & curl.exe -i -X POST -F "file=@$uniqueTestFile" "$UploadUrl"
Write-Host $response
Write-Host ""

Write-Host "=== TEST 2: Duplicate upload (should fail) ==="
$response = & curl.exe -i -X POST -F "file=@$uniqueTestFile" "$UploadUrl"
Write-Host $response
Write-Host ""

Write-Host "=== TEST 3: Missing file ==="
$response = & curl.exe -i -X POST "$UploadUrl"
Write-Host $response
Write-Host ""

Write-Host "=== TEST 4: Empty file ==="
$response = & curl.exe -i -X POST -F "file=@empty.txt" "$UploadUrl"
Write-Host $response
Write-Host ""

$uniqueTestFile = "test-$timestamp.txt" # reuse same unique file name
Write-Host "=== TEST 5: Unknown evidence request ==="
$UnknownId = '123e4567-e89b-42d3-a456-426614174000'
$UnknownUrl = "$BaseUrl/api/evidence/request/$UnknownId/upload"
$response = & curl.exe -i -X POST -F "file=@test.txt" "$UnknownUrl"
Write-Host $response
Write-Host ""

Write-Host "=== TEST 6: Invalid UUID ==="
$InvalidUrl = "$BaseUrl/api/evidence/request/invalid/upload"
$response = & curl.exe -i -X POST -F "file=@test.txt" "$InvalidUrl"
Write-Host $response
Write-Host ""

Write-Host "=== npm run build ==="
npm run build