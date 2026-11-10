CREATE TABLE companion_conversations (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 140),
  turns integer NOT NULL DEFAULT 0 CHECK (turns >= 0),
  risk text CHECK (risk IN ('bersih', 'rendah', 'mencurigakan', 'tinggi')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX companion_conversations_recent
  ON companion_conversations (user_id, updated_at DESC, id DESC)
  WHERE deleted_at IS NULL;
