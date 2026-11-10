-- Per-account saved discussions, like a bookmark shelf. Saving is private: only
-- the owner's feed filter reads these rows, and the post itself carries no
-- public save counter.
CREATE TABLE community_saves (
  post_id uuid NOT NULL REFERENCES community_posts (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX community_saves_user_created_idx
  ON community_saves (user_id, created_at DESC);
