-- ============================================================
-- FR-12 notification settings + FR-13 reminder notifications.
-- Additive only: new nullable-safe boolean columns (all default TRUE, so
-- every existing user keeps receiving what they already implicitly got)
-- and one new table. No existing column or row is touched.
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_export_completed BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_translation_completed BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_system_updates BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_reminders BOOLEAN NOT NULL DEFAULT TRUE;

-- ============================================================
-- REMINDERS — a user schedules a message for a future time; a backend
-- poller (see backend/src/lib/reminder-scheduler.ts) fires a Notification
-- once remind_at has passed and fired_at is still null.
-- ============================================================

CREATE TABLE IF NOT EXISTS reminders (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message    TEXT NOT NULL,
    remind_at  TIMESTAMPTZ NOT NULL,
    fired_at   TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(remind_at) WHERE fired_at IS NULL;

-- Same caveat as every other RLS policy in this schema — inert against the
-- app's table-owning Prisma connection, kept as documentation of intent.
-- Real authorization is the userId-ownership check in reminders.service.ts.
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY reminders_self ON reminders
        FOR ALL TO PUBLIC
        USING (user_id = current_setting('app.current_user_id')::text);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
