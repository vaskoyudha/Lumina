CREATE TABLE learning_modules (
  no integer PRIMARY KEY CHECK (no BETWEEN 1 AND 99),
  metadata jsonb NOT NULL CHECK (jsonb_typeof(metadata) = 'object'),
  content jsonb CHECK (content IS NULL OR jsonb_typeof(content) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((metadata->>'no')::integer = no),
  CHECK (content IS NULL OR (content->>'no')::integer = no)
);

CREATE TABLE simulation_scenarios (
  id text PRIMARY KEY,
  module_no integer REFERENCES learning_modules(no),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (payload->'scenario'->'scenario'->>'id' = id)
);

CREATE TABLE learning_progress (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_no integer NOT NULL REFERENCES learning_modules(no),
  answers jsonb NOT NULL,
  score integer NOT NULL CHECK (score >= 0),
  total integer NOT NULL CHECK (total > 0 AND score <= total),
  missed_patterns text[] NOT NULL DEFAULT '{}',
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, module_no)
);

CREATE TABLE simulation_results (
  attempt_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario_id text NOT NULL REFERENCES simulation_scenarios(id),
  mode text NOT NULL CHECK (mode IN ('santai', 'tantangan')),
  outcome text NOT NULL CHECK (outcome IN ('success', 'recovery', 'compromised', 'failed')),
  decisions jsonb NOT NULL,
  finished_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX simulation_results_user ON simulation_results(user_id, finished_at DESC);
