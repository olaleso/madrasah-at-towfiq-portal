-- One parent-facing absence notice per pupil and attendance date.
-- This stores delivery attempts only; it does not change historic attendance.
CREATE TABLE IF NOT EXISTS attendance_family_alerts (
 student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
 attendance_date TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'processing'
  CHECK(state IN ('processing','sent','not_sent','no_guardian_email')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(student_id,attendance_date)
);
CREATE INDEX IF NOT EXISTS idx_attendance_family_alerts_date
 ON attendance_family_alerts(attendance_date);
