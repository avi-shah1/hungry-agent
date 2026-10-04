CREATE TABLE users (
  id          TEXT PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
  user_id           TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  diet              TEXT,
  budget            NUMERIC NOT NULL CHECK (budget >= 0),
  max_walk_minutes  INTEGER NOT NULL CHECK (max_walk_minutes > 0),
  cuisines          TEXT[] NOT NULL DEFAULT '{}',
  weights           JSONB NOT NULL,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE recommendations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- coarse location only (rounded), never precise history
  coarse_lat        NUMERIC(6, 2),
  coarse_lng        NUMERIC(6, 2),
  priorities        TEXT[] NOT NULL DEFAULT '{}',
  candidates        JSONB NOT NULL,
  chosen_candidate_id TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE feedback (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id  UUID NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  thumbs_up          BOOLEAN NOT NULL,
  reason             TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_attempts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id  UUID NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  route              TEXT NOT NULL CHECK (route IN ('doordash', 'direct')),
  status             TEXT NOT NULL CHECK (status IN ('ready_for_approval', 'needs_user_action', 'failed')),
  checkout_summary   JSONB,
  failure_reason     TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE enrichment_cache (
  restaurant_key  TEXT PRIMARY KEY,
  enrichment      JSONB NOT NULL,
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX recommendations_user_idx ON recommendations(user_id, created_at DESC);
CREATE INDEX feedback_recommendation_idx ON feedback(recommendation_id);
CREATE INDEX order_attempts_recommendation_idx ON order_attempts(recommendation_id);
