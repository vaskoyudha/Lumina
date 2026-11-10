-- Session metadata for the account settings surface. Rows created before this
-- migration backfill their timestamps to migration time; device and IP stay
-- unknown (NULL) instead of being guessed.
ALTER TABLE sessions
  ADD COLUMN user_agent text,
  ADD COLUMN client_ip text,
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN last_seen_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX sessions_user ON sessions(user_id);
