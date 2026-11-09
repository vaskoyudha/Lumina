CREATE TABLE community_posts (
  id uuid PRIMARY KEY,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('modus-baru','pertanyaan','pengalaman')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 10 AND 140),
  body text NOT NULL CHECK (char_length(body) BETWEEN 30 AND 6000),
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  hidden_at timestamptz
);
CREATE INDEX community_posts_recent ON community_posts(created_at DESC, id DESC) WHERE deleted_at IS NULL AND hidden_at IS NULL;
CREATE INDEX community_posts_category ON community_posts(category) WHERE deleted_at IS NULL AND hidden_at IS NULL;
CREATE TABLE community_replies (
  id uuid PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 5 AND 3000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  hidden_at timestamptz
);
CREATE INDEX community_replies_post ON community_replies(post_id, created_at, id);
CREATE TABLE community_helpful (
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY(post_id,user_id)
);
CREATE TABLE community_reports (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES community_replies(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('data-pribadi','spam','berbahaya')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  CHECK ((post_id IS NOT NULL)::integer + (reply_id IS NOT NULL)::integer = 1)
);
CREATE UNIQUE INDEX community_report_post_once ON community_reports(reporter_id,post_id) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX community_report_reply_once ON community_reports(reporter_id,reply_id) WHERE reply_id IS NOT NULL;

-- Remove only the shipped reference to the retired screen, retaining custom content.
UPDATE simulation_scenarios s SET payload=jsonb_set(payload,'{scenario,nodes}',
  (SELECT jsonb_agg(CASE WHEN n->>'text' LIKE '%Gunakan panduan darurat untuk langkah berikutnya.%'
    THEN jsonb_set(n,'{text}',to_jsonb(replace(n->>'text','Gunakan panduan darurat untuk langkah berikutnya.','Segera hubungi bank atau penyedia akun melalui kanal resmi dari perangkat lain yang aman.')))
    ELSE n END ORDER BY ordinal)
   FROM jsonb_array_elements(payload->'scenario'->'nodes') WITH ORDINALITY AS nodes(n,ordinal)))
WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(payload->'scenario'->'nodes') n
  WHERE n->>'text' LIKE '%Gunakan panduan darurat untuk langkah berikutnya.%');
