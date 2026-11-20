-- Admin-only archive of generated Nikah certificates.
-- PDF documents are held in the existing private R2 bucket under a dedicated
-- prefix. D1 stores searchable metadata; only admins can access either.
CREATE TABLE IF NOT EXISTS marriage_certificates (
 id TEXT PRIMARY KEY,
 reference TEXT NOT NULL UNIQUE,
 request_key TEXT NOT NULL UNIQUE,
 groom_name TEXT NOT NULL,
 bride_name TEXT NOT NULL,
 witness1_name TEXT NOT NULL,
 witness2_name TEXT NOT NULL,
 imam_name TEXT NOT NULL,
 nikah_date TEXT,
 issue_date TEXT NOT NULL,
 mahr TEXT NOT NULL DEFAULT '',
 document_key TEXT NOT NULL UNIQUE,
 document_size INTEGER NOT NULL CHECK(document_size>0 AND document_size<=3145728),
 created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 deleted_at TEXT,
 deleted_by TEXT REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_marriage_certificates_dates ON marriage_certificates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marriage_certificates_names ON marriage_certificates(groom_name,bride_name);
