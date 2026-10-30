-- v1.8.0 — academic terms and dated school calendar events.
-- Existing school events, student records and email notifications are unchanged.
CREATE TABLE IF NOT EXISTS academic_terms (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 academic_year TEXT NOT NULL,
 starts_on TEXT NOT NULL,
 ends_on TEXT NOT NULL,
 notes TEXT NOT NULL DEFAULT '',
 created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(starts_on<=ends_on)
);
CREATE INDEX IF NOT EXISTS idx_academic_terms_dates ON academic_terms(starts_on,ends_on);
CREATE TABLE IF NOT EXISTS academic_calendar_entries (
 id TEXT PRIMARY KEY,
 term_id TEXT REFERENCES academic_terms(id) ON DELETE RESTRICT,
 title TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('holiday','closure','assessment','parent_meeting','school_event','other')),
 starts_on TEXT NOT NULL,
 ends_on TEXT NOT NULL,
 notes TEXT NOT NULL DEFAULT '',
 created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(starts_on<=ends_on)
);
CREATE INDEX IF NOT EXISTS idx_academic_calendar_entries_date ON academic_calendar_entries(starts_on,ends_on);
CREATE INDEX IF NOT EXISTS idx_academic_calendar_entries_term ON academic_calendar_entries(term_id);

-- Opt-in flags are future-channel consent records, NOT permission to begin sending.
-- Keep a history of updates for accountability and withdrawal evidence.
CREATE TABLE IF NOT EXISTS guardian_communication_preferences (
 user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 mobile_e164 TEXT NOT NULL DEFAULT '',
 sms_opt_in INTEGER NOT NULL DEFAULT 0 CHECK(sms_opt_in IN (0,1)),
 whatsapp_opt_in INTEGER NOT NULL DEFAULT 0 CHECK(whatsapp_opt_in IN (0,1)),
 community_updates_opt_in INTEGER NOT NULL DEFAULT 0 CHECK(community_updates_opt_in IN (0,1)),
 consent_updated_at TEXT,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS guardian_communication_preference_audit (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 changed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 sms_opt_in INTEGER NOT NULL,
 whatsapp_opt_in INTEGER NOT NULL,
 community_updates_opt_in INTEGER NOT NULL,
 mobile_e164 TEXT NOT NULL DEFAULT '',
 changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_guardian_comm_pref_audit ON guardian_communication_preference_audit(user_id,changed_at);
