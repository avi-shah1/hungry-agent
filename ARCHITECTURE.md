# FeedMe — Architecture

FeedMe is a mobile-first personal food agent. The user shares their location and picks priorities (Cheap / Healthy / Filling / Fast). FeedMe searches nearby food sources, ranks them against the user's profile, returns the top 3, and can prepare a pickup order up to (not including) payment.

**Product principle:** minimise browsing, maximise decision and action. FeedMe says "this is what you should get", not "what do you want?".

## Core rules (read these first)

1. **Code owns facts, the LLM owns ambiguity.** Distance, budget, opening hours, pickup windows, dietary hard-exclusions and scores are computed deterministically. The LLM only reasons about uncertain menus, close-scoring options, TGTG trade-offs and writing explanations.
2. **Everything is normalised to one `Candidate` shape** (see Contracts). Nothing downstream knows whether an option came from Places or TGTG.
3. **Optional integrations fail soft.** TGTG, Exa and Kernel failures must never fail a Feed Me request. Use timeouts, catch everything, return empty or degraded results.
4. **Never stop at "the LLM said so" for money or actions.** Kernel stops before final purchase. A human taps "Approve order". Payment credentials never enter model context or logs.
5. **Subjective classifications are estimates.** Health and filling scores carry a confidence value. Never claim exact calories or macros unless a source provides them.
6. **Do not enrich everything.** Discover ~30, filter to ~10, enrich 5–10, return 3.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind, Browser Geolocation API |
| Backend | Next.js route handlers (Node/TypeScript) |
| Agent orchestration | Mastra (decision agent + workflow) |
| Database | Neon Postgres |
| Model access | Neon AI Gateway where practical, behind a replaceable model adapter |
| Enrichment | Exa (menu/page discovery only) |
| Discovery | A structured places API (see Open decisions) |
| Too Good To Go | Unofficial client, isolated module, experimental |
| Ordering | Kernel browser automation |
| Review | CodeRabbit (optional) |

Executor and Fly.io are used only if a real need appears (e.g. deployment for phone testing).

## Request flow: "Feed Me"

```
Phone: location + priorities
  → POST /api/feed
  → load profile (Neon)
  → in parallel, with per-stage timeouts:
       ├─ discovery/places   (deterministic)
       └─ tgtg               (experimental, may return [])
  → normalise to Candidate[]
  → hard filters (diet, budget, open, pickup window, max walk)
  → pre-score on structured data → keep top ~10
  → exa enrichment on top 5–10 (menus, dietary items, ordering page)
  → final deterministic scoring with adjusted weights
  → Mastra decision agent: pick/personalise top 3 + reasons
  → persist recommendations (Neon)
  → stream progress + result to the phone (SSE)
```

Order flow: user taps **Get This** → `POST /api/order` → ordering service picks route (DoorDash vs. restaurant site) → Kernel builds pickup basket → returns checkout summary → UI shows **Approve order**. MVP success = reaching the correct restaurant/item/checkout. Final payment is not a demo dependency.

## Repo layout

```
app/                         # Next.js App Router
  (screens)/                 # onboarding, home, results, order-prep, confirm
  api/
    feed/route.ts            # Feed Me orchestration endpoint (SSE)
    order/route.ts           # start order preparation
    feedback/route.ts        # thumbs up/down
    profile/route.ts         # preferences CRUD
src/
  contracts/                 # zod schemas + types: Candidate, Profile, Recommendation, CheckoutSummary
  db/                        # Neon client, migrations, queries
  services/
    preferences/             # profile load/save, priority → weight adjustment
    discovery/               # places API client, returns Candidate[]
    tgtg/                    # isolated experimental client, returns Candidate[] or []
    enrichment/              # Exa: menus, dietary items, ordering URL, estimates + confidence
    scoring/                 # filters, distance, scores (pure functions, unit-tested)
    ordering/                # route selection + Kernel sessions + checkout summary
  agents/                    # Mastra decision agent, workflow, model adapter
  lib/                       # geo (haversine), timeouts, logging
tests/                       # unit tests for scoring/filters; fixtures for each provider
ARCHITECTURE.md
CLAUDE.md
```

**Ownership boundaries** (so parallel agents don't collide): `contracts/` is written first and only changed deliberately. Each `services/*` folder and `agents/` has one owner at a time. Frontend never imports service internals, only calls `/api/*` and uses `contracts/` types.

## Contracts

### Candidate (the single internal format)

```ts
type Candidate = {
  id: string;
  provider: "places" | "tgtg";
  restaurant: string;
  item?: string;                    // e.g. "Surprise Bag", "Veggie Burrito"
  address?: string;
  lat: number;
  lng: number;
  open: boolean | null;             // null = unknown
  price?: number;                   // integer minor units, with currency
  currency?: string;
  pickupWindow?: { start: string; end: string };  // TGTG
  availability?: number;            // TGTG remaining, if exposed
  distanceM?: number;
  walkMinutes?: number;
  distanceIsApproximate?: boolean;  // true if straight-line fallback used
  enrichment?: {
    menuUrl?: string;
    orderingUrl?: string;
    vegetarianItems?: string[];
    healthScore?: number;           // 0..1
    healthConfidence?: "low" | "medium" | "high";
    fillingScore?: number;          // 0..1
    fillingConfidence?: "low" | "medium" | "high";
    source: "exa";
  };
  scores?: Record<"price" | "distance" | "health" | "filling" | "preference" | "availability", number>;
  finalScore?: number;
};
```

### Profile

```ts
type Profile = {
  userId: string;
  diet: string | null;              // hard exclusion source
  budget: number;
  maxWalkMinutes: number;
  preferredCuisines: string[];
  weights: { price: number; distance: number; health: number; filling: number };
};
```

### Recommendation (agent output)

```ts
type Recommendation = {
  rank: 1 | 2 | 3;
  label: string;                    // "Best overall", "Cheapest", "Fastest"…
  candidateId: string;
  restaurant: string;
  item: string;
  price: number;
  walkMinutes: number;
  reason: string;                   // one or two sentences
};
```

The agent may only return `candidateId`s that exist in its input. Validate this in code.

## Scoring

```
final_score =
    price_score        * w_price
  + distance_score     * w_distance
  + health_score       * w_health
  + filling_score      * w_filling
  + preference_score   * w_preference
  + availability_score * w_availability
```

- **Hard filters run first** (not weights): diet exclusions, over budget, closed, TGTG window already ended or not reachable in time, beyond max walk time.
- **Priority buttons adjust weights** from the stored profile, then re-normalise to sum to 1:
  - Cheap → raise `price`
  - Fast → raise `distance` and `availability`
  - Healthy → raise `health`
  - Filling → raise `filling`
  - Multiple buttons stack.
- **Distance:** use a routing API if available. Fallback is straight-line (haversine) with a walking-time estimate of ~5 km/h × ~1.3 detour factor, and set `distanceIsApproximate = true`. Never ask an LLM for distance.
- Low-confidence enrichment scores are shrunk toward neutral rather than trusted.
- Scoring is pure functions with unit tests. No I/O inside.

## Mastra decision agent

- **Input:** top ~10 scored candidates + profile + selected priorities.
- **Job:** compare close scores, reason about uncertain menu data, weigh TGTG trade-offs (cheap but unknown contents, tight pickup window), choose 3 diverse recommendations, write short reasons.
- **Does not:** compute facts, change prices/distances, or invent items. Output is schema-validated; invalid output falls back to the top 3 by `finalScore` with templated reasons.
- Model access goes through a small adapter so the gateway can be swapped.

## Integrations

### Places / discovery
Deterministic. Input `{lat, lng, radius}` → nearby open restaurants with address, coordinates, open status. Exa is never used for geospatial discovery.

### Too Good To Go (experimental)
- Isolated in `services/tgtg/`; only exported function is `searchNearby(lat, lng, radius): Promise<Candidate[]>`.
- Authenticate, search stores, read price, pickup window and remaining count if exposed.
- Hard timeout; any auth/API/parse error → log and return `[]`.
- Feature flag `TGTG_ENABLED`. Credentials/tokens live in env/secret store, never in the model context.
- No official consumer API exists; expect breakage and treat it as a demo bonus, not a dependency.

### Exa enrichment
Find the current menu or ordering page, identify vegetarian/vegan items, estimate price and whether a dish seems healthy or filling. Output estimates with confidence. Cache results per restaurant in Neon to cut latency and cost. Only runs on the shortlisted candidates.

### Kernel ordering
Steps: open DoorDash or the restaurant's direct ordering page → select pickup → find restaurant → select item → configure obvious required options → add to basket → reach checkout → return summary → **stop**.
- Expected blockers: login, CAPTCHA, location confirmation, changed page structure, bot detection, payment auth. Each maps to a clear `needs_user_action` or `failed` state shown in the UI, never a silent hang.
- Auth is handled by a pre-authenticated Kernel browser profile or by the user, not by the model typing credentials.
- Hard session timeout and step budget.
- The UI must show the real checkout summary returned by Kernel, not a model-written one.

## Database (Neon)

| Table | Purpose |
|---|---|
| `users` | id, created_at |
| `profiles` | diet, budget, max_walk_minutes, cuisines, weights |
| `recommendations` | request id, location (coarse), priorities, returned candidates, chosen option |
| `feedback` | recommendation id, thumbs up/down, optional reason |
| `order_attempts` | recommendation id, route, status, checkout summary, failure reason |
| `enrichment_cache` | restaurant key, enrichment JSON, fetched_at |

Learning from feedback is a stretch goal: store everything now, use it for `preference_score` later. Store precise location only if needed; prefer coarse location for history.

## Latency budget

Run discovery and TGTG in parallel. Suggested per-stage timeouts (tune after measuring): places 3s, TGTG 4s, Exa batch 6s, agent 8s. Stream progress to the UI over SSE ("Finding places…", "Checking Too Good To Go…", "Reading menus…", "Choosing…") so the wait feels intentional. Return a degraded but valid result rather than waiting past budget.

## Failure behaviour

| Failure | Behaviour |
|---|---|
| Geolocation denied | Prompt for manual address/area; no request without a location |
| TGTG auth/API error | Skip TGTG, continue |
| Exa timeout | Use un-enriched candidates, lower confidence |
| Routing API down | Straight-line distance, mark approximate |
| Agent invalid output | Fall back to top 3 by `finalScore` |
| Fewer than 3 valid candidates | Return what exists; suggest widening radius/budget |
| Kernel blocked (login/CAPTCHA/bot) | Show `needs_user_action` with a link to the restaurant/DoorDash page |
| Kernel can't find item | Report failure, offer next recommendation |

## Security and privacy

- Secrets (Neon, Exa, Kernel, TGTG, model gateway) in environment variables, never committed, never in prompts.
- The model sees candidate data and the profile only. It never sees tokens, payment details or session cookies.
- No final purchase without explicit user approval in the UI.
- Log provider errors, not credentials or full precise location history.

## Milestones

1. **Contracts + scaffold:** Next.js app, `contracts/`, Neon connection, profile CRUD.
2. **Discovery + scoring:** places client, haversine/routing, filters, scoring with tests. Feed endpoint returns scored candidates.
3. **Frontend v1:** onboarding, home with geolocation + 4 buttons, results screen on real data.
4. **Enrichment + Mastra agent:** Exa shortlist enrichment, decision agent, schema validation and fallback. Top 3 with reasons.
5. **Kernel ordering:** reach the restaurant and checkout for one DoorDash flow and one direct-site flow. Approval screen.
6. **TGTG (parallel track, timeboxed):** only merged if it works end to end; feature flagged.
7. **Stretch:** feedback loop, learned preferences, polish, CodeRabbit pass.

## Open decisions

| Decision | Recommendation |
|---|---|
| Places API | Pick one with open-now and coordinates (e.g. Google Places). Check free tier and rate limits before building |
| Routing API | Use the same vendor if cheap; otherwise rely on the straight-line fallback for the demo |
| TGTG client | Check what unofficial client exists for your stack. A Python client may need a tiny sidecar service. Verify login flow (it uses an emailed confirmation) and its terms-of-service risk early |
| DoorDash vs. direct ordering | Test one real restaurant on each before committing the demo to either |
| Currency/region for the demo | Pick the demo city now; it drives Places coverage, TGTG availability and DoorDash support |
| Demo fallback | Have a recorded or fixture-based run, clearly labelled, in case a live integration fails |
