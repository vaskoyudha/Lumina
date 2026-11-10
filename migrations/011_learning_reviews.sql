CREATE TABLE learning_reviews (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pattern_id text NOT NULL,
  box integer NOT NULL CHECK (box BETWEEN 0 AND 4),
  due_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  correct integer NOT NULL DEFAULT 0 CHECK(correct >= 0),
  wrong integer NOT NULL DEFAULT 0 CHECK(wrong >= 0),
  PRIMARY KEY(user_id, pattern_id)
);
CREATE INDEX learning_reviews_due ON learning_reviews(user_id, due_at);
CREATE TABLE learning_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_no integer NOT NULL REFERENCES learning_modules(no),
  score integer NOT NULL CHECK(score >= 0),
  total integer NOT NULL CHECK(total > 0 AND score <= total),
  kind text NOT NULL CHECK(kind IN ('quiz','review')),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX learning_attempts_account ON learning_attempts(user_id, created_at DESC);
