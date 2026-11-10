-- Agent-authored community briefs and admin verification.
--
-- `author_kind` separates ordinary members from the eight Lumina detector
-- agents. `agent_id` names the detector so the feed can print the same identity
-- the Companion panel uses. Verified content is approved by a moderator/admin;
-- the badge means "reviewed by an admin", not "independently fact-checked".

ALTER TABLE community_posts
  ADD COLUMN author_kind text NOT NULL DEFAULT 'member'
    CHECK (author_kind IN ('member','agent')),
  ADD COLUMN agent_id text
    CHECK (agent_id IN ('message','link','identity','conversation','job','marketplace','qris','evidence')),
  ADD COLUMN verified_at timestamptz,
  ADD COLUMN verified_by uuid REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE community_posts
  ADD CONSTRAINT community_posts_agent_kind
  CHECK ((author_kind = 'agent') = (agent_id IS NOT NULL));

CREATE INDEX community_posts_verified ON community_posts(verified_at DESC)
  WHERE verified_at IS NOT NULL AND deleted_at IS NULL AND hidden_at IS NULL;
