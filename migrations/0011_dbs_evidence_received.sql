-- v1.6.2: preserve evidence-received timestamp after short-lived files are purged.
-- Keep the document itself subject to the 180-day R2 lifecycle.
ALTER TABLE staff_dbs_checks ADD COLUMN document_received_at TEXT;
UPDATE staff_dbs_checks
 SET document_received_at=document_uploaded_at
 WHERE document_uploaded_at IS NOT NULL AND document_received_at IS NULL;
