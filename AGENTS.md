 # AGENTS.md
 
 When executing any task:
 
 - Assume Windows 11 PowerShell.
 - Never use Linux or macOS commands.
 - Never use `curl`. Always use `curl.exe`.
 - Use only commands compatible with Windows PowerShell.
 - Implement only the requested task.
 - Modify only the files required for the task.
 - If another file is required, stop and ask first.
 - Read only the files required for the current task.
 - Do not scan the repository unless explicitly requested.
 - Verify every implementation before reporting completion.
 - Treat terminal output as the source of truth.
 - Never claim success without runtime verification.
 - Never claim a bug is fixed unless verification passes.
 - Resolve one bug at a time.
 - Follow this workflow: Find → Fix → Verify.
 - If verification fails, continue debugging the same bug until it passes.
 - Do not start another task while the current verification is failing.
 - Verify modified files using `git status` before reporting them.
 - Do not commit unless explicitly instructed.
 - Keep responses minimal.
 - If asked for one command, output one command only.
 - If asked for a prompt, output only the prompt.
 - If you do not have enough evidence, say so instead of guessing.