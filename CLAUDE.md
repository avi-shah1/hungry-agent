# FeedMe

Mobile-first personal food agent. Read `ARCHITECTURE.md` before writing any code; it defines the module boundaries, contracts and failure behaviour.

## Rules

- Follow `ARCHITECTURE.md`. If a change contradicts it, update the doc in the same PR and say why.
- Code computes facts (distance, price, hours, diet filters, scores). The LLM only handles ambiguity and explanations.
- Every provider returns the shared `Candidate` type from `src/contracts/`. Do not leak provider-specific shapes outside their service folder.
- TGTG, Exa and Kernel failures must never break a Feed Me request: timeouts, try/catch, degrade gracefully.
- Kernel must stop before final purchase. Never put credentials, tokens or payment details in prompts, logs or commits.
- Validate all LLM output against zod schemas; fall back to deterministic ranking when invalid.
- Scoring and filters are pure functions with unit tests.
- TypeScript strict mode. No `any` in `contracts/` or `scoring/`.

## Working in parallel

One owner per folder at a time: `app/` (frontend), `src/services/discovery|tgtg|enrichment|ordering/`, `src/services/scoring/`, `src/agents/`, `src/db/`. Do not edit `src/contracts/` without flagging it, since everything depends on it.

## Commands

Added here once the project is scaffolded (dev, build, test, lint, migrate).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
