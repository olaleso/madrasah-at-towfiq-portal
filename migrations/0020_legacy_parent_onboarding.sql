-- Admin-reviewed follow-up invitation queue for historical pupil families.
CREATE TABLE IF NOT EXISTS legacy_parent_onboarding (
 id TEXT PRIMARY KEY,
 guardian_email TEXT NOT NULL UNIQUE,
 guardian_name TEXT NOT NULL DEFAULT '',
 user_id TEXT NOT NULL,
 student_ids_json TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed')),
 attempts INTEGER NOT NULL DEFAULT 0,
 last_error TEXT NOT NULL DEFAULT '',
 sent_at TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_legacy_parent_onboarding_dispatch
 ON legacy_parent_onboarding(status,attempts,created_at);
