-- Transcripts now live with their account, so a conversation opened on another
-- device can render the same turns. Attachment bytes are still device-only;
-- the transcript keeps only the attachment name, size, and MIME type.
ALTER TABLE companion_conversations
  ADD COLUMN transcript jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD CONSTRAINT companion_conversations_transcript_array
    CHECK (jsonb_typeof(transcript) = 'array');

COMMENT ON COLUMN companion_conversations.transcript IS
  'Sanitized turn array; no attachment bytes, blob URLs, or local OCR recall keys.';
