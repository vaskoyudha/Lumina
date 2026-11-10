-- A post can carry more than one cover image. Demo/seed artwork only: the
-- editor still accepts no uploads, so every entry stays under the local
-- /images/community prefix enforced by 005_community_images.sql for image_url.
ALTER TABLE community_posts
  ADD COLUMN image_urls text[] NOT NULL DEFAULT '{}'
  CHECK (cardinality(image_urls) <= 8);

-- Backfill the single-cover rows so the gallery and the legacy column agree.
UPDATE community_posts
SET image_urls = ARRAY[image_url]
WHERE image_url IS NOT NULL AND cardinality(image_urls) = 0;
