# COMMAND_RULES.md

## Environment

Assume Windows 11 PowerShell.

Never use Linux or macOS commands.

## HTTP

Never use curl.

Always use curl.exe.

## Database

Use Supabase CLI.

Never use psql.

## Verification

Terminal output is the source of truth.

Verify before claiming success.

Verification order:

1. Compile
2. Build
3. Runtime
4. Database (if applicable)
5. Browser (if applicable)
6. Regression

## Development

Implement only the requested task.

Never modify unrelated files.

Never implement future milestones.

One bug at a time.

Find → Fix → Verify.

Do not continue until verification passes.

## Git

Do not commit unless explicitly instructed.

## Responses

Keep responses minimal.

If asked for one command, output one command only.