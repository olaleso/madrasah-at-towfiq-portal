-- Public masjid enquiry inbox, separate from student admissions and sensitive pupil records.
CREATE TABLE IF NOT EXISTS masjid_contact_enquiries (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 email TEXT NOT NULL,
 phone TEXT NOT NULL DEFAULT '',
 topic TEXT NOT NULL CHECK(topic IN ('general','nikah','counselling','funeral','sheikh','volunteering','other')),
 message TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','in_progress','closed')),
 admin_note TEXT NOT NULL DEFAULT '',
 reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_masjid_enquiries_status ON masjid_contact_enquiries(status,created_at DESC);
