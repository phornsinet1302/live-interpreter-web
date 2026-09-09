-- ============================================================
-- Migrate to Clerk-managed identity.
--
-- Clerk now owns credentials, email verification, sessions, and refresh
-- tokens, so:
--   - the `sessions` table (hashed refresh tokens) is fully obsolete —
--     dropped outright (also drops its FK, idx_sessions_expires_at index,
--     and sessions_self RLS policy along with it)
--   - users.password_hash / google_id / verification_code* / verified_at
--     are dropped (also drops idx_users_google_id along with the column)
--   - users.id keeps its existing `text` type (already the case for every
--     id column on this DB — see 20260727042318_init's notes) but stops
--     self-generating via gen_random_uuid()::text: the application now
--     writes Clerk's own user id (e.g. "user_2abc...") on insert, in the
--     auth middleware's find-or-create sync
-- ============================================================

DROP TABLE IF EXISTS sessions;

-- active_users is a `SELECT *` view (documentation-only, per the RLS block
-- in 20260727042318_init — not queried anywhere in the app), so it depends
-- on every users column including the ones being dropped below. Drop and
-- recreate it verbatim; CREATE OR REPLACE can't change a view's column
-- list, only a full DROP+CREATE can.
DROP VIEW IF EXISTS active_users;

ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
ALTER TABLE users DROP COLUMN IF EXISTS google_id;
ALTER TABLE users DROP COLUMN IF EXISTS verification_code;
ALTER TABLE users DROP COLUMN IF EXISTS verification_code_expires_at;
ALTER TABLE users DROP COLUMN IF EXISTS verification_code_sent_at;
ALTER TABLE users DROP COLUMN IF EXISTS verified_at;

ALTER TABLE users ALTER COLUMN id DROP DEFAULT;

CREATE OR REPLACE VIEW active_users AS
SELECT * FROM users WHERE deleted_at IS NULL;
