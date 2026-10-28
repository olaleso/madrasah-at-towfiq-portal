-- v1.6.0: retain legacy messages; add private reply threads and per-recipient read state.
ALTER TABLE messages ADD COLUMN thread_root_id TEXT REFERENCES messages(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN read_at TEXT;
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_root_id,created_at);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_read ON messages(recipient_id,read_at);

-- Operational compliance tracker: policies and review deadlines (not legal certification).
CREATE TABLE IF NOT EXISTS compliance_policies (
 id TEXT PRIMARY KEY,
 title TEXT NOT NULL,
 category TEXT NOT NULL CHECK(category IN ('safeguarding','data_protection','health_safety','education','other')),
 version TEXT NOT NULL DEFAULT '1.0',
 owner TEXT NOT NULL DEFAULT '',
 review_due TEXT,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','current','retired')),
 notes TEXT NOT NULL DEFAULT '',
 created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_compliance_policies_review ON compliance_policies(status,review_due);

-- Internal privacy/security concern metadata; not a safeguarding case-management system.
CREATE TABLE IF NOT EXISTS compliance_concerns (
 id TEXT PRIMARY KEY,
 kind TEXT NOT NULL CHECK(kind IN ('privacy_request','possible_breach','access_review','operational')),
 title TEXT NOT NULL,
 occurred_on TEXT NOT NULL,
 description TEXT NOT NULL DEFAULT '',
 action_taken TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_review','closed')),
 reported_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_compliance_concerns_status ON compliance_concerns(status,occurred_on);
