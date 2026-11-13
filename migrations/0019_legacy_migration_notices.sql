-- Queued, auditable service notices for a verified legacy student import.
-- The table stores just a guardian address and the new student IDs; details are
-- resolved when composing the email from the existing admissions/student rows.
CREATE TABLE IF NOT EXISTS legacy_migration_notices (
 id TEXT PRIMARY KEY,
 source_hash TEXT NOT NULL,
 batch_id TEXT NOT NULL,
 guardian_email TEXT NOT NULL,
 guardian_name TEXT NOT NULL DEFAULT '',
 student_ids_json TEXT NOT NULL DEFAULT '[]',
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed')),
 attempts INTEGER NOT NULL DEFAULT 0,
 last_error TEXT NOT NULL DEFAULT '',
 sent_at TEXT,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(batch_id,guardian_email)
);
CREATE INDEX IF NOT EXISTS idx_legacy_migration_notices_dispatch
 ON legacy_migration_notices(status,attempts,created_at);
