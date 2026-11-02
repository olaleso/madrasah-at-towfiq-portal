-- Parent leave requests and absence notifications. Separate from the official register.
-- Records are retained for administrative review, with pupil deletion cascading safely.
CREATE TABLE IF NOT EXISTS student_leave_requests (
 id TEXT PRIMARY KEY,
 student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
 submitted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 request_type TEXT NOT NULL CHECK(request_type IN ('absence','leave')),
 starts_on TEXT NOT NULL,
 ends_on TEXT NOT NULL,
 reason TEXT NOT NULL CHECK(reason IN ('illness','appointment','family','travel','other')),
 details TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','acknowledged','approved','declined','cancelled')),
 review_note TEXT NOT NULL DEFAULT '',
 reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 reviewed_at TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(ends_on>=starts_on)
);
CREATE INDEX IF NOT EXISTS idx_student_leave_requests_child ON student_leave_requests(student_id,starts_on DESC);
CREATE INDEX IF NOT EXISTS idx_student_leave_requests_queue ON student_leave_requests(status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_leave_requests_submitter ON student_leave_requests(submitted_by,created_at DESC);
