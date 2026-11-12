CREATE TABLE agent_runs (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  run_id text NOT NULL,
  modus text NOT NULL CHECK (modus ~ '^[a-z0-9-]{1,64}$'),
  band text NOT NULL CHECK (band IN ('bersih', 'rendah', 'mencurigakan', 'tinggi')),
  planner_source text NOT NULL CHECK (planner_source IN ('model', 'fallback')),
  agents jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_ms integer NOT NULL CHECK (total_ms >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX agent_runs_latest
  ON agent_runs (user_id, id DESC);
