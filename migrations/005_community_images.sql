-- Community cover artwork is demo/seed content only. It is served from
-- public/images/community and is never accepted from the post editor, so the
-- column is restricted to that local prefix rather than an arbitrary URL.
ALTER TABLE community_posts
  ADD COLUMN image_url text
  CHECK (image_url IS NULL OR image_url LIKE '/images/community/%');
