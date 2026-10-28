-- v1.5.0: one monthly learning narrative per pupil, with explicit publication.
-- Existing attendance, homework, admissions and guardian records are untouched.
CREATE TABLE IF NOT EXISTS pupil_progress_reports (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  hifdh TEXT NOT NULL DEFAULT '',
  murajaa TEXT NOT NULL DEFAULT '',
  qaaidah TEXT NOT NULL DEFAULT '',
  islamic_studies TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  next_steps TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id,period)
);
CREATE INDEX IF NOT EXISTS idx_progress_reports_student_period
  ON pupil_progress_reports(student_id,period DESC);
