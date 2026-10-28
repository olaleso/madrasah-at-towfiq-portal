-- v1.6.1: minimal administrator-controlled DBS check register.
-- DBS certificates do not legally expire. review_due is an organisational recheck date.
-- No criminal history/disclosure text or full certificate numbers are stored in D1.
CREATE TABLE IF NOT EXISTS staff_dbs_checks (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
 check_level TEXT NOT NULL DEFAULT 'enhanced' CHECK(check_level IN ('basic','standard','enhanced','enhanced_barred')),
 issued_on TEXT NOT NULL,
 review_due TEXT NOT NULL,
 reference_last4 TEXT NOT NULL DEFAULT '',
 checked_on TEXT,
 document_key TEXT,
 document_mime TEXT,
 document_uploaded_at TEXT,
 document_purge_after TEXT,
 updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_staff_dbs_review_due ON staff_dbs_checks(review_due);
CREATE INDEX IF NOT EXISTS idx_staff_dbs_purge_due ON staff_dbs_checks(document_purge_after);
