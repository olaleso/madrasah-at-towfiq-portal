-- v1.9.0: weekly recurring timetable for existing learning classes.
-- Weekdays: 1=Monday ... 7=Sunday, times are Europe/London local wall clock.
-- No existing class.schedule free-text, student, fee or guardian records change.
CREATE TABLE IF NOT EXISTS class_timetable_sessions (
 id TEXT PRIMARY KEY,
 class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
 weekday INTEGER NOT NULL CHECK(weekday BETWEEN 1 AND 7),
 starts_at TEXT NOT NULL,
 ends_at TEXT NOT NULL,
 subject TEXT NOT NULL,
 room TEXT NOT NULL DEFAULT '',
 notes TEXT NOT NULL DEFAULT '',
 created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(starts_at < ends_at),
 CHECK(length(subject) BETWEEN 1 AND 100)
);
CREATE INDEX IF NOT EXISTS idx_class_timetable_day ON class_timetable_sessions(weekday,starts_at,ends_at);
CREATE INDEX IF NOT EXISTS idx_class_timetable_class ON class_timetable_sessions(class_id,weekday);
