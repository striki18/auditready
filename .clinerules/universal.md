# UNIVERSAL CLINE RULES

These rules apply to every task in this project.

==================================================
## 1. CORE WORKFLOW
==================================================

Follow:

FIND → UNDERSTAND → FIX → VERIFY → DOUBLE-CHECK

Rules:

- Implement only the requested task.
- Handle a maximum of 1–2 tasks at a time.
- One unresolved bug at a time.
- Do not start another task while the current task is unresolved.
- Read only files directly relevant to the current task.
- Do not scan the entire repository unless explicitly requested or required
  to establish the root cause.
- Modify only files required for the current task.
- Do not make unrelated changes.
- If an additional file is directly required to understand or safely implement
  the current task, inspect it.
- Do not expand investigation into unrelated parts of the repository.

==================================================
## 2. NO ASSUMPTIONS — NON-NEGOTIABLE
==================================================

Never guess when the answer can be verified.

Do not assume:

- API behavior
- API response shapes
- API request fields
- model IDs
- endpoint URLs
- authentication formats
- TypeScript types
- function signatures
- package APIs
- file paths
- project architecture
- test behavior
- command syntax
- compiler behavior
- runtime behavior
- configuration
- historical implementation state

Before relying on a fact:

PROJECT CODE:
Inspect the actual relevant source.

EXTERNAL API:
Check the official documentation.

DEPENDENCY:
Inspect package.json and/or the dependency documentation.

ERROR:
Inspect the actual error output and relevant source location.

FILE PATH:
Verify that the file actually exists and is accessible before claiming it
can be read.

COMMAND:
Verify package scripts/configuration when command syntax is uncertain.

If something cannot be verified:

Report:

UNVERIFIED

Do not convert UNVERIFIED into PASS.

==================================================
## 3. ROOT-CAUSE DEBUGGING
==================================================

When an error occurs:

1. Capture the exact error.
2. Capture the exact file/path and line number if provided.
3. Inspect the exact code at that location.
4. Inspect the relevant type/interface/function definition.
5. Trace the smallest dependency chain required to establish the cause.
6. Identify the root cause.
7. Only then change code.
8. Reproduce the original failure.
9. Verify the fix.

Do NOT:

- make speculative fixes;
- change several unrelated files;
- change types merely to silence an error;
- change tests merely to make them pass;
- replace an error with a different error and call it fixed;
- assume the first explanation is correct;
- repeatedly apply unrelated fixes when the same error persists.

If the root cause cannot be established:

STOP.

Report:

BLOCKED — ROOT CAUSE NOT VERIFIED

Then provide the exact evidence collected.

==================================================
## 4. FILE ACCESS / PATH VERIFICATION
==================================================

A path mentioned by the model is NOT proof that the file exists.

When a file operation fails:

1. Verify the exact path.
2. Verify the current workspace/root.
3. Verify the file exists.
4. Verify the file is accessible using the appropriate file tool.
5. If the file tool cannot access it, do not claim the file was read.
6. Do not repeatedly retry the same failed file operation without addressing
   the verified cause.

Distinguish these states:

FILE EXISTS AND READ:
VERIFIED

FILE EXISTS BUT TOOL CANNOT ACCESS:
BLOCKED

FILE NOT FOUND:
NOT FOUND

PATH NOT VERIFIED:
UNVERIFIED

If the model knows the path from repository search but the file-read operation
fails, do NOT pretend the file contents were inspected.

Use another safe repository-supported method to verify/access the file only
when appropriate.

If access remains impossible, report the exact tool error instead of guessing
the file contents.

==================================================
## 5. TOOL-CALL INTEGRITY — NON-NEGOTIABLE
==================================================

When using any Cline tool:

- Provide every required parameter.
- Never provide an empty required parameter.
- Never provide null or undefined required parameters.
- Never omit a required parameter.
- Never fabricate a tool result.
- Never claim a tool executed when it did not.

For command execution specifically:

- Always provide a complete command through the tool's required command field.
- The command must be an executable command string.
- Do not simulate tool-call markup in normal instructions or responses.
- Do not put tool-call XML/markup into command values.
- If a tool call fails because a required parameter is missing, correct the
  tool invocation before retrying.
- Do not repeatedly retry an identical malformed tool call.

For file operations:

- Always provide the required path parameter.
- Use the correct path format supported by the actual tool.
- Do not substitute a remembered path for a verified path.

A malformed tool call is a TOOL EXECUTION FAILURE.

It is not automatically:

- a code failure;
- a test failure;
- a build failure;
- evidence that the implementation is wrong.

==================================================
## 6. WINDOWS / TERMINAL
==================================================

Environment:

- Windows 11
- PowerShell

Rules:

- Use Windows PowerShell-compatible commands.
- Never use Linux-only commands.
- Never use macOS-only commands.
- Never use `curl`.
- Always use `curl.exe`.
- Do not invent shell syntax.
- Do not invent command-line flags.

When a project already defines an npm script, prefer it.

Examples:

npm test
npm run build
npm run benchmark

Do not replace project commands with invented equivalents unless necessary.

Terminal output is the source of truth.

Never claim:

- a command succeeded without seeing its output;
- a test passed without seeing test output;
- a build passed without seeing build output;
- a server started without observing startup output;
- an API request succeeded without observing its response.

==================================================
## 7. TESTING
==================================================

Use the project's existing test configuration and scripts.

Before inventing a test command:

1. Inspect package.json.
2. Inspect relevant test configuration if necessary.
3. Use the project's established syntax.

For Jest:

- Use the project's configured Jest invocation.
- Use valid Jest CLI syntax.
- Do not invent unsupported flags.

Distinguish:

TEST PASSED

from:

TEST COMMAND EXECUTED BUT TEST FAILED

from:

TEST COMMAND DID NOT EXECUTE

A command that failed to start is NOT a failing test.

It is:

TEST EXECUTION FAILURE.

Do not modify tests simply to eliminate an error unless the test itself is
verified to be incorrect.

==================================================
## 8. TEMPORARY TESTS / FILES
==================================================

Temporary files must be created only inside:

temp_test/

Rules:

- Never create temporary test files in the project root.
- Delete temporary files after successful verification.
- Verify cleanup with git status.
- Never commit temporary files.
- Do not use temporary files as a substitute for understanding the existing
  test architecture.

==================================================
## 9. VERIFICATION — NON-NEGOTIABLE
==================================================

Never assume verification succeeded.

Never fabricate PASS.

Never report completion based only on source inspection when runtime
verification is required.

Evidence hierarchy:

1. Actual runtime output
2. Actual test output
3. Actual compiler/build output
4. Actual API response
5. Actual file/git state
6. Source inspection
7. Model reasoning

Higher-level reasoning must not override contradictory runtime evidence.

A test that did not execute is NOT PASS.

A build that did not run is NOT PASS.

An API response that was not observed is NOT VERIFIED.

A file that was not successfully read is NOT VERIFIED.

If verification cannot be completed:

Report:

BLOCKED

and provide the exact reason.

==================================================
## 10. DOUBLE VERIFICATION
==================================================

Every completed task requires a second verification pass.

First pass:

- implement;
- test;
- build/run;
- inspect results.

Second pass:

- re-read the changed files;
- compare implementation against the ORIGINAL task;
- check every explicit requirement;
- check for unintended changes;
- verify relevant runtime/test/build results;
- verify no assumptions were introduced.

Do not simply repeat:

"Looks correct."

The second pass must actively search for mistakes.

For high-risk architecture, provider/API integration, difficult debugging,
or production-critical work:

Prefer Lightning 3.5 for independent review.

If the second verification disagrees with the first:

STATUS = NOT VERIFIED

Continue debugging the same issue.

==================================================
## 11. PARTIAL / UNCERTAIN VERIFICATION — MANDATORY
==================================================

PARTIAL or UNCERTAIN is NOT PASS.

When verification produces:

- PARTIAL
- UNCERTAIN
- INCONCLUSIVE
- UNVERIFIED
- BLOCKED due to a potentially recoverable issue

do NOT assume the implementation is correct.

Before reporting the task as complete:

1. Identify exactly what remains unverified.
2. Determine whether the missing verification can be performed.
3. Attempt verification again using a corrected or meaningfully different
   approach when appropriate.
4. Do not simply repeat an identical failed attempt.
5. Make up to 3 meaningful verification attempts when the problem is
   potentially recoverable.

Each attempt must address the reason the previous attempt failed.

Example process:

Attempt 1:
Verification fails.

Attempt 2:
Correct the specific problem identified in Attempt 1 and retry.

Attempt 3:
Perform an independent verification or address the remaining blocker.

After 3 unsuccessful meaningful attempts:

STOP.

Do not claim PASS.

Report:

VERIFICATION_STATUS:
BLOCKED / FAIL / PARTIAL

ATTEMPT_1:
What was attempted + exact result

ATTEMPT_2:
What changed + exact result

ATTEMPT_3:
What changed + exact result

FINAL_BLOCKER:
The exact verified reason the requirement could not be confirmed.

Do not perform meaningless retries merely to reach three attempts.

If the issue is definitively unrecoverable before three attempts, stop early and
report the verified reason.

A model's belief that something "should work" is NOT verification.

==================================================
## 12. API / EXTERNAL SERVICE VERIFICATION
==================================================

For external APIs:

- Verify official documentation before implementing unfamiliar behavior.
- Verify endpoint.
- Verify HTTP method.
- Verify authentication.
- Verify request shape.
- Verify response shape.
- Verify model ID.
- Verify usage fields.
- Verify documented limitations.

Do not invent API fields because another provider uses similar terminology.

For provider-reported usage:

- Only use fields actually returned by that provider.
- Do not label estimated values as provider-reported.
- Do not label heuristic values as exact.
- Missing optional dimensions remain unavailable.
- Do not manufacture missing values.

If live API access is required but credentials are unavailable:

Report:

BLOCKED — CREDENTIAL REQUIRED

Do not fake a successful live test.

==================================================
## 13. ARCHITECTURE SAFETY
==================================================

Before modifying architecture:

Identify:

1. Current architecture.
2. Existing interfaces/contracts.
3. Existing callers.
4. Existing tests.
5. What must remain unchanged.
6. Exact requested architectural change.

Do not create parallel abstractions when an existing abstraction already
serves the purpose.

Do not silently replace legacy interfaces.

Do not change the core engine merely to make provider-specific code easier.

For provider work:

Provider-specific behavior belongs in provider/profile/protocol/normalization
layers, not in the core optimization engine.

If the existing architecture prevents the requested change:

STOP and report the architectural conflict before redesigning it.

==================================================
## 14. MODEL SELECTION
==================================================

### Nano 3 — FAST EXECUTION

Model ID:

nvidia/nemotron-3-nano-30b-a3b

Prefer Nano 3 for:

- simple code reading;
- locating known files/functions;
- straightforward implementation;
- mechanical edits;
- boilerplate;
- isolated fixes;
- simple commands;
- simple tests;
- clearly defined tasks with an obvious solution.

Do not rely on Nano 3 alone for:

- difficult debugging;
- ambiguous compiler errors;
- complex API failures;
- architecture changes;
- multi-file reasoning;
- unclear root causes;
- production-critical verification.

### Lightning 3.5 — COMPLEX REASONING

Model ID:

nvidia/nemotron-3.5-lightning-30b-a3b

Prefer Lightning 3.5 for:

- difficult debugging;
- compiler/type-system problems;
- API/integration failures;
- ambiguous runtime failures;
- complex data-shape problems;
- architecture decisions;
- multi-file reasoning;
- difficult verification;
- reviewing Nano 3's work;
- production-critical reasoning.

### ESCALATION

Escalate Nano 3 → Lightning 3.5 when:

- Nano cannot establish the root cause;
- Nano encounters repeated errors;
- Nano starts guessing;
- Nano reports success without evidence;
- Nano encounters unfamiliar compiler/API/tool errors;
- the task becomes ambiguous;
- verification fails;
- architecture is affected;
- previously verified functionality may be affected.

When escalating:

1. Preserve the exact original task.
2. Preserve the exact error/output.
3. Preserve the current working state.
4. Do not erase failed evidence.
5. Do not tell Lightning that Nano succeeded unless that success was verified.
6. Give Lightning the actual evidence.
7. Independently verify Lightning's result.

==================================================
## 15. CHANGE CONTROL
==================================================

Keep changes minimal.

Before modifying a file ask:

Is this file directly required for the current task?

If NO:
Do not modify it.

If YES:
Modify only the necessary portion.

Do not refactor unrelated code while implementing a requested feature.

Do not clean up unrelated technical debt.

Do not rename unrelated files.

Do not update unrelated documentation.

==================================================
## 16. CONTEXT / MEMORY
==================================================

Treat designated project documentation and memory files as persistent
project context.

Before starting a task:

- inspect relevant project memory when necessary;
- preserve existing architectural decisions;
- preserve known constraints;
- preserve known bugs;
- preserve verification results.

Historical documentation is not proof that current code still works.

Current runtime evidence takes precedence.

After context compaction:

- re-read relevant project memory;
- identify current task;
- identify current working state;
- identify completed verification;
- identify remaining blockers.

Never reconstruct missing context by guessing.

==================================================
## 17. GIT SAFETY
==================================================

- Do not commit unless explicitly instructed.
- Do not push unless explicitly instructed.
- Do not create tags unless explicitly instructed.
- Never use destructive commands such as:
  git reset --hard
  git restore
  unless explicitly instructed by the user.
- Before committing, run git status.
- Confirm intended files are the only changed files.
- Never commit temporary files.
- Never claim a commit succeeded without terminal confirmation.
- Never claim a push succeeded without terminal confirmation.

==================================================
## 18. COMPLETION REPORT — EVIDENCE REQUIRED
==================================================

Final reports must explain WHY each result received its status.

Never provide a report containing only:

TEST 1: PASS
TEST 2: PASS
TEST 3: PASS

Every significant verification item must report:

1. WHAT was tested.
2. HOW it was tested.
3. ACTUAL result observed.
4. WHY that result satisfies the requirement.
5. Any limitations or remaining unverified behavior.

Example:

ANTHROPIC PROTOCOL TEST:
PASS

- Tested: AnthropicProtocolAdapter request construction.
- Method: Deterministic mocked adapter test.
- Observed: The test constructed the expected verified request structure.
- Result: Test passed.
- Why this satisfies the requirement: The adapter produced the required
  protocol request and returned the raw response without performing usage
  normalization.
- Live API verification: NOT PERFORMED because no credential was supplied.

Do not claim a test proves behavior that it did not test.

Do not claim full coverage from a partial test.

Do not claim an API integration works when only a mocked response was tested.

When something is not tested, explicitly state:

NOT TESTED

When something could not be verified, explicitly state:

UNVERIFIED

When something failed, provide:

- exact command;
- exact failure;
- root cause if verified;
- whether the failure is implementation-related, test-related, tool-related,
  environment-related, or external-service-related.

==================================================
## 19. FINAL REQUIREMENT CHECK
==================================================

Before the final response, create an internal checklist of EVERY explicit
requirement in the original task.

For EACH requirement classify it as exactly one of:

VERIFIED
IMPLEMENTED BUT NOT VERIFIED
PARTIAL
BLOCKED
FAILED
NOT APPLICABLE

Never collapse multiple requirements into one generic PASS.

The final report must make it possible to determine:

- what was actually implemented;
- what was actually executed;
- what actually passed;
- why it passed;
- what remains unverified;
- what failed;
- why it failed;
- what was attempted to recover the failure.

Overall status:

PASS
only when every required verification item is VERIFIED.

PARTIAL
when some required items are verified but others remain unresolved.

BLOCKED
when required verification cannot proceed.

FAIL
when verification demonstrates that the implementation does not satisfy the
requirement.

==================================================
## 20. FINAL VERIFICATION SUMMARY
==================================================

Before reporting completion:

1. Verify the implementation.
2. Double-check against the original requirements.
3. Run git status.
4. Confirm no unintended files changed.
5. Confirm temporary files are removed.
6. State exactly what was verified.
7. State anything that remains unverified.
8. Report exact errors for anything that failed or was blocked.

Never report PASS when evidence is incomplete.

==================================================
## 21. COMMUNICATION
==================================================

Keep responses concise during normal execution.

State facts supported by actual evidence.

Do not provide speculative explanations as facts.

When uncertain, say:

UNVERIFIED

When blocked, say:

BLOCKED

When a tool fails, distinguish:

TOOL FAILURE

from:

CODE FAILURE

from:

TEST FAILURE

from:

BUILD FAILURE

from:

RUNTIME FAILURE

Do not hide tool failures behind generic statements such as:

"the test failed."

If asked for one command:
output one command only.

If asked for a prompt:
output only the prompt.

==================================================
## 22. FINAL RULE
==================================================

Accuracy is more important than speed.

Do not optimize for finishing the task quickly.

Optimize for:

CORRECT IMPLEMENTATION
+
ACTUAL VERIFICATION
+
INDEPENDENT DOUBLE-CHECK
+
MINIMAL UNRELATED CHANGE

When speed and correctness conflict, choose correctness.