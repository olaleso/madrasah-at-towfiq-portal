-- Legacy roster intake without re-enrolment or inventing missing personal data.
-- No parent invitations are sent until an administrator verifies guardianship.
CREATE TABLE IF NOT EXISTS legacy_student_import_records (
 id TEXT PRIMARY KEY,
 source_hash TEXT NOT NULL,
 source_filename TEXT NOT NULL DEFAULT '',
 source_row INTEGER NOT NULL CHECK(source_row>1),
 student_id TEXT NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
 imported_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 review_note TEXT NOT NULL DEFAULT '',
 first_aid_consent INTEGER DEFAULT NULL CHECK(first_aid_consent IN (0,1)),
 photo_consent INTEGER DEFAULT NULL CHECK(photo_consent IN (0,1)),
 imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(source_hash,source_row)
);
CREATE INDEX IF NOT EXISTS idx_legacy_imports_date ON legacy_student_import_records(imported_at DESC);
CREATE INDEX IF NOT EXISTS idx_legacy_imports_source ON legacy_student_import_records(source_hash);
