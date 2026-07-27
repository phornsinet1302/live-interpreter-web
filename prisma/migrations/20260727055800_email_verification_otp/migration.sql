-- ============================================================
-- Email verification via OTP (one-time code), sent after registration
-- and confirmed via POST /auth/verify-email. Additive only — nullable
-- columns on the existing `users` table, no data at risk.
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code VARCHAR(6);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code_sent_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
