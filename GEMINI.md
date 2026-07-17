# Gemini Developer Guide - AuditReady

This document provides instructions for developer workflows, agent rules, and the environment setup for AI assistants (like Gemini) working on the AuditReady codebase.

## AI Assistant Configuration

AI assistants are configured through workspace rules and custom configurations.

### Configuration Roots
- **Project-Scoped Rules**: Stored in `AGENTS.md` in the workspace root.
- **Global Config**: Stored under user directory (`.gemini/config`).

### Framework Version & Agent Rules
As defined in [AGENTS.md](file:///C:/Users/veto/Documents/Codex/2026-06-26/you-are-my-senior-full-stack/auditready/AGENTS.md):
- **Next.js Version**: Next.js 16 (Turbopack).
- **Breaking Changes**: This project uses React 19/Next 16 APIs, conventions, and file structures that differ from older Next.js configurations. 
- **Documentation Reference**: Refer to the Next.js distribution guides in `node_modules/next/dist/docs/` before making changes.

## Sandbox Guidelines
- Direct network access is performed via NAT64 translation (IPv6). External APIs like Supabase are resolved publicly.
- Temporary scratch files should be placed under the `.gemini` folder or workspace root and cleaned up before submission.
- Do not make assumptions about missing configurations (e.g. database schema). Use validation/probe scripts to inspect the state when database connections are online.
