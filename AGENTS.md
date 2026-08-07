 # REQUIRED STARTUP PROTOCOL
 
 Before performing **any** task (implementation, debugging, explanation, planning, verification, or review), the agent **must**:
 
 1. Read the full contents of `AGENTS.md`.
 2. Read the full contents of `docs/development/COMMAND_RULES.md`.
 3. State that both files have been read.
 4. List the rules from `COMMAND_RULES.md` that apply to the current task.
  5. Confirm that every command it outputs complies with `COMMAND_RULES.md`.
  6. Before any implementation begins, explicitly identify:
     - Current milestone
     - Current Git tag
     - Files that are expected to change

     If any of these cannot be determined, stop and ask the user.
  7. If any command would violate `COMMAND_RULES.md`, stop and produce a compliant Windows PowerShell alternative.
 
 `COMMAND_RULES.md` is the single source of truth for command‑execution rules; the agent must not duplicate the PowerShell or `curl.exe` rules inside this file.
 
# EVIDENCE-FIRST RULE

1. Never guess.

2. Every factual statement about the project must be supported by one of:
   - repository files
   - terminal output
   - runtime verification
   - user-provided information

3. If evidence is missing, explicitly say:

   "I do not have enough evidence to conclude this."

4. Never assume:
   - migrations were applied
   - builds succeeded
   - tests passed
   - runtime behavior
   - package versions
   - endpoint behavior

5. Before proposing a fix, identify the exact failing operation using available evidence.

6. Clearly distinguish:
   - Observed facts
   - Inference
   - Assumptions

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

 This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
 <!-- END:nextjs-agent-rules -->
