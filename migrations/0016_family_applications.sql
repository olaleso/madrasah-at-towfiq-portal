-- One household submission may contain multiple independently reviewed pupil applications.
-- Existing single-child applications remain unchanged (NULL group ID).
ALTER TABLE admissions ADD COLUMN family_application_id TEXT;
CREATE INDEX IF NOT EXISTS idx_admissions_family_application_id ON admissions(family_application_id);
