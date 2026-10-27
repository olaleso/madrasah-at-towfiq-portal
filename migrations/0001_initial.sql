PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, role TEXT NOT NULL CHECK(role IN ('admin','staff','teacher','parent')), password_hash TEXT, password_salt TEXT, active INTEGER NOT NULL DEFAULT 1,
 failed_logins INTEGER NOT NULL DEFAULT 0, locked_until TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, csrf_hash TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS auth_tokens (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, purpose TEXT NOT NULL CHECK(purpose IN ('invite','reset')), expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS classes (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, stage TEXT NOT NULL DEFAULT 'Foundation', teacher_id TEXT REFERENCES users(id) ON DELETE SET NULL, capacity INTEGER DEFAULT 25, schedule TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS students (
 id TEXT PRIMARY KEY, student_no TEXT NOT NULL UNIQUE, first_name TEXT NOT NULL, last_name TEXT NOT NULL, dob TEXT, gender TEXT, class_id TEXT REFERENCES classes(id) ON DELETE SET NULL, parent_id TEXT REFERENCES users(id) ON DELETE SET NULL, phone TEXT DEFAULT '', address TEXT DEFAULT '', medical_notes TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'active', joined_at TEXT DEFAULT CURRENT_TIMESTAMP, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS admissions (id TEXT PRIMARY KEY, child_name TEXT NOT NULL, dob TEXT, guardian_name TEXT NOT NULL, guardian_email TEXT NOT NULL, phone TEXT DEFAULT '', preferred_class TEXT DEFAULT '', message TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'new', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS attendance (id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE, date TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('present','absent','late','excused')), note TEXT DEFAULT '', recorded_by TEXT REFERENCES users(id), created_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(student_id,date));
CREATE TABLE IF NOT EXISTS homework (
 id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE, type TEXT NOT NULL CHECK(type IN ('hifdh','murajaa','qaaidah','islamic_studies')),
 surah_from TEXT DEFAULT '', verse_from INTEGER, surah_to TEXT DEFAULT '', verse_to INTEGER, page_number TEXT DEFAULT '', comments TEXT DEFAULT '', teacher_feedback TEXT DEFAULT '', due_date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'incomplete' CHECK(status IN ('incomplete','complete')), assigned_by TEXT REFERENCES users(id), completed_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_homework_student_due ON homework(student_id,due_date);
CREATE TABLE IF NOT EXISTS behaviour (
 id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE, reason_code TEXT NOT NULL, description TEXT NOT NULL, points INTEGER NOT NULL, notes TEXT DEFAULT '', recorded_by TEXT REFERENCES users(id), occurred_at TEXT DEFAULT CURRENT_TIMESTAMP, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_behaviour_student ON behaviour(student_id);
CREATE TABLE IF NOT EXISTS fee_invoices (
 id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE, period TEXT NOT NULL, amount_pence INTEGER NOT NULL CHECK(amount_pence>=0), due_date TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(student_id,period)
);
CREATE TABLE IF NOT EXISTS payments (
 id TEXT PRIMARY KEY, invoice_id TEXT NOT NULL REFERENCES fee_invoices(id) ON DELETE CASCADE, student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE, amount_pence INTEGER NOT NULL CHECK(amount_pence>0), method TEXT NOT NULL DEFAULT 'manual', reference TEXT DEFAULT '', recorded_by TEXT REFERENCES users(id), created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS announcements (id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL, audience TEXT NOT NULL DEFAULT 'all', created_by TEXT REFERENCES users(id), created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, recipient_id TEXT REFERENCES users(id) ON DELETE CASCADE, subject TEXT NOT NULL, body TEXT NOT NULL, student_id TEXT REFERENCES students(id) ON DELETE SET NULL, status TEXT NOT NULL DEFAULT 'inbox', created_by TEXT REFERENCES users(id), created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, title TEXT NOT NULL, event_date TEXT NOT NULL, description TEXT DEFAULT '', category TEXT DEFAULT 'community', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS quizzes (id TEXT PRIMARY KEY, question TEXT NOT NULL, options_json TEXT NOT NULL, answer_index INTEGER NOT NULL, category TEXT DEFAULT 'Islamic Knowledge', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS quiz_attempts (id TEXT PRIMARY KEY, quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, student_id TEXT REFERENCES students(id) ON DELETE SET NULL, answer_index INTEGER NOT NULL, is_correct INTEGER NOT NULL, points INTEGER NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(quiz_id,user_id));
CREATE TABLE IF NOT EXISTS school_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, actor_id TEXT REFERENCES users(id) ON DELETE SET NULL, action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT, detail TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS email_log (id TEXT PRIMARY KEY, recipient TEXT NOT NULL, subject TEXT NOT NULL, status TEXT NOT NULL, error TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);