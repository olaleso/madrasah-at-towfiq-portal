-- v1.7.0: private in-app notification inbox; no external SMS/WhatsApp integration.
-- When a pupil is permanently deleted, discard the related notification.
CREATE TABLE IF NOT EXISTS portal_notifications (
 id TEXT PRIMARY KEY,
 recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('homework','attendance','behaviour','invoice','payment','progress','message')),
 source_id TEXT NOT NULL,
 title TEXT NOT NULL,
 body TEXT NOT NULL DEFAULT '',
 target_page TEXT NOT NULL CHECK(target_page IN ('homework','attendance','behaviour','fees','progress','communications')),
 read_at TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(recipient_id,kind,source_id)
);
CREATE INDEX IF NOT EXISTS idx_portal_notifications_recipient ON portal_notifications(recipient_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_notifications_unread ON portal_notifications(recipient_id,read_at);
