-- ============================================================
-- Live Interpretation Platform - Additive schema alignment
--
-- CONTEXT: this migration was originally authored as a from-scratch
-- CREATE-based baseline, but on first `migrate deploy` it turned out the
-- target Neon database already had all 12 tables (created by an earlier,
-- now-lost session) with real data in them (1 user, 1 session, 85
-- api_usage_logs, 9 audit_logs rows). That CREATE-based attempt failed
-- (relation "users" already exists) and was rolled back in full — nothing
-- from it persisted. This replacement is an ADDITIVE/idempotent migration
-- that brings the existing tables up to the authoritative schema without
-- dropping or recreating anything that already holds data:
--   - adds the enum values that were missing (moderator/archived/
--     critical/expired)
--   - converts users.theme and exports.type from plain text to real enums
--   - tightens nullability on conversations.title / conversation_messages
--     .translated_text (both 0 rows at migration time, so trivial)
--   - drops the extra UNIQUE(conversation_id) on subtitle_sessions (the
--     authoritative DDL intentionally allows a history of sessions per
--     conversation, unlike summaries which IS 1:1)
--   - adds the named indexes / CHECK constraints from the authoritative
--     DDL that weren't present (existing Prisma-style indexes are left in
--     place rather than dropped, to avoid any risk to the live FK graph)
--   - adds the triggers, views, and RLS policies from the authoritative
--     DDL, none of which existed yet (this DB was built purely from a
--     Prisma schema.prisma, which cannot express any of the three)
--   - adds `DEFAULT gen_random_uuid()::text` to every id column, since
--     ids are stored as `text` (not native `uuid`) on this database and
--     the application's Prisma schema now expects the DB to generate ids
--
-- Deliberately NOT done here (would touch the entire FK graph or every
-- timestamp column for marginal benefit, given the "keep data, minimize
-- disruption" choice for this reconciliation): converting id/foreign-key
-- columns from `text` to native `uuid`, or `timestamp` to `timestamptz`.
-- prisma/schema.prisma matches the DB on this — see the model comments.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- ENUM VALUES THAT WERE MISSING
-- ============================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'moderator';
ALTER TYPE conversation_status ADD VALUE IF NOT EXISTS 'archived';
ALTER TYPE suggestion_priority ADD VALUE IF NOT EXISTS 'critical';
ALTER TYPE subtitle_status ADD VALUE IF NOT EXISTS 'expired';

-- ============================================================
-- NEW ENUM TYPES (theme / export type were plain text columns)
-- ============================================================

DO $$ BEGIN
    CREATE TYPE user_theme AS ENUM ('light', 'dark', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE export_type AS ENUM ('transcript', 'summary', 'audio', 'full');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- COLUMN TYPE CONVERSIONS (plain text -> real enum)
-- ============================================================

ALTER TABLE users ALTER COLUMN theme DROP DEFAULT;
ALTER TABLE users ALTER COLUMN theme TYPE user_theme USING theme::user_theme;
ALTER TABLE users ALTER COLUMN theme SET DEFAULT 'system';

ALTER TABLE exports ALTER COLUMN type TYPE export_type USING type::export_type;

-- ============================================================
-- NULLABILITY FIXES (both columns have 0 rows at migration time)
-- ============================================================

UPDATE conversations SET title = 'New Conversation' WHERE title IS NULL;
ALTER TABLE conversations ALTER COLUMN title SET DEFAULT 'New Conversation';
ALTER TABLE conversations ALTER COLUMN title SET NOT NULL;

UPDATE conversation_messages SET translated_text = '' WHERE translated_text IS NULL;
ALTER TABLE conversation_messages ALTER COLUMN translated_text SET NOT NULL;

-- ============================================================
-- SUBTITLE SESSIONS: drop the 1:1 unique constraint — the authoritative
-- DDL intentionally allows a history of sessions per conversation.
-- ============================================================

ALTER TABLE subtitle_sessions DROP CONSTRAINT IF EXISTS subtitle_sessions_conversation_id_key;
CREATE INDEX IF NOT EXISTS idx_subtitle_sessions_conversation_id ON subtitle_sessions(conversation_id);

-- ============================================================
-- CHECK CONSTRAINTS FROM THE AUTHORITATIVE DDL (none existed yet)
-- ============================================================

DO $$ BEGIN
    ALTER TABLE users ADD CONSTRAINT chk_email_format
        CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE speakers ADD CONSTRAINT speakers_confidence_check
        CHECK (confidence >= 0 AND confidence <= 1);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE conversation_messages ADD CONSTRAINT conversation_messages_confidence_check
        CHECK (confidence >= 0 AND confidence <= 1);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE subtitle_sessions ADD CONSTRAINT subtitle_sessions_font_size_check
        CHECK (font_size > 0 AND font_size <= 72);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- DEFAULT gen_random_uuid() ON EVERY ID COLUMN (ids are `text`, not
-- native `uuid`, on this database — cast to match the column type)
-- ============================================================

ALTER TABLE users               ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE sessions            ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE conversations       ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE speakers            ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE conversation_messages ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE summaries           ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE suggested_actions   ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE subtitle_sessions   ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE exports             ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE notifications       ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE api_usage_logs      ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE audit_logs          ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- ============================================================
-- MISSING NAMED INDEXES FROM THE AUTHORITATIVE DDL (additive only —
-- existing Prisma-style indexes from the earlier session are left in
-- place rather than dropped/renamed, to avoid any risk to the live FK
-- graph for essentially cosmetic naming differences)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_owner_status ON conversations(owner_id, status);

CREATE INDEX IF NOT EXISTS idx_messages_created_at ON conversation_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_suggested_actions_priority ON suggested_actions(priority);

CREATE INDEX IF NOT EXISTS idx_exports_status ON exports(status);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_usage_logs(endpoint);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- ============================================================
-- TRIGGERS (none existed yet — this DB was built from a Prisma
-- schema.prisma, which cannot express triggers)
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_conversations_updated_at ON conversations;
CREATE TRIGGER trigger_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION set_conversation_started_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'active' AND OLD.status = 'waiting' AND NEW.started_at IS NULL THEN
        NEW.started_at = NOW();
    END IF;
    IF NEW.status = 'ended' AND OLD.status IN ('active', 'paused') AND NEW.ended_at IS NULL THEN
        NEW.ended_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_conversation_status_change ON conversations;
CREATE TRIGGER trigger_conversation_status_change
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION set_conversation_started_at();

-- ============================================================
-- VIEWS (none existed yet)
-- ============================================================

CREATE OR REPLACE VIEW active_users AS
SELECT * FROM users WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_conversations AS
SELECT * FROM conversations WHERE status IN ('waiting', 'active', 'paused');

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
--
-- NOTE: these policies do not apply to the table-owning role, which is
-- what the application's Prisma connection uses — so RLS here is inert
-- for this app's connection and is kept only as documentation of intent.
-- Real authorization is enforced in the application layer (ownership
-- checks in each module's service, e.g. conversations.service.ts).
-- None of this existed yet on this database (also not expressible via a
-- plain Prisma schema.prisma).
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY users_self_access ON users
        FOR ALL TO PUBLIC
        USING (id = current_setting('app.current_user_id')::text AND deleted_at IS NULL);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY conversations_owner ON conversations
        FOR ALL TO PUBLIC
        USING (owner_id = current_setting('app.current_user_id')::text);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY messages_via_conversation ON conversation_messages
        FOR ALL TO PUBLIC
        USING (
            conversation_id IN (
                SELECT id FROM conversations
                WHERE owner_id = current_setting('app.current_user_id')::text
            )
        );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY notifications_self ON notifications
        FOR ALL TO PUBLIC
        USING (user_id = current_setting('app.current_user_id')::text);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY sessions_self ON sessions
        FOR ALL TO PUBLIC
        USING (user_id = current_setting('app.current_user_id')::text);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- END OF MIGRATION
-- ============================================================
