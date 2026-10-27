-- v1.0.8: Accepted admissions must become student records exactly once.
-- Add a permanent link without removing old applications or student history.
ALTER TABLE admissions ADD COLUMN student_id TEXT REFERENCES students(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_admissions_student_id ON admissions(student_id) WHERE student_id IS NOT NULL;

-- Backfill previously accepted applications so existing pupils appear after migration.
-- Admission IDs are UUIDs, and are reused as student IDs for retry-safe enrolment.
INSERT OR IGNORE INTO students (id,student_no,first_name,last_name,dob,gender,phone,address,status)
SELECT a.id,
       'AT-' || strftime('%Y','now') || '-' || upper(substr(replace(a.id,'-',''),1,10)),
       trim(a.first_name), trim(a.last_name), a.dob, a.gender,
       coalesce(nullif(trim(a.guardian_phone),''),nullif(trim(a.phone),''),''),
       trim(coalesce(a.home_address,'') || CASE WHEN trim(coalesce(a.postcode,''))<>'' THEN ', ' || a.postcode ELSE '' END),
       'active'
FROM admissions a
WHERE a.status='accepted' AND a.student_id IS NULL
  AND trim(coalesce(a.first_name,''))<>'' AND trim(coalesce(a.last_name,''))<>''
  AND trim(coalesce(a.dob,''))<>'';

UPDATE admissions SET student_id=id
WHERE status='accepted' AND student_id IS NULL
  AND EXISTS (SELECT 1 FROM students s WHERE s.id=admissions.id);