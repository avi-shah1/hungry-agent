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
