-- ============================================================
-- FR-5 "Favorite translations" — additive only.
-- ============================================================

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_conversations_owner_favorite ON conversations(owner_id, is_favorite) WHERE is_favorite = TRUE;
