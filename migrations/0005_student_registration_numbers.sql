-- v1.0.9: Use stable MATT-YYYY-NNNN numbers while retaining student IDs.
-- Backup before applying. Historical registrations are renumbered once in enrolment-year order.
CREATE TABLE IF NOT EXISTS student_number_sequences (
  enrollment_year INTEGER PRIMARY KEY,
  last_number INTEGER NOT NULL CHECK(last_number BETWEEN 0 AND 9999)
);
WITH years AS (
  SELECT id,
    CASE
      WHEN student_no GLOB 'AT-[0-9][0-9][0-9][0-9]-*' THEN CAST(substr(student_no,4,4) AS INTEGER)
      WHEN student_no GLOB 'MATT-[0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9]' THEN CAST(substr(student_no,6,4) AS INTEGER)
      ELSE COALESCE(CAST(NULLIF(substr(created_at,1,4),'') AS INTEGER),CAST(strftime('%Y','now') AS INTEGER))
    END AS yr, created_at
  FROM students
), numbered AS (
  SELECT id, yr, ROW_NUMBER() OVER (PARTITION BY yr ORDER BY created_at,id) AS n FROM years
)
UPDATE students SET student_no=(SELECT 'MATT-'||yr||'-'||printf('%04d',n) FROM numbered WHERE numbered.id=students.id);
INSERT INTO student_number_sequences(enrollment_year,last_number)
 SELECT CAST(substr(student_no,6,4) AS INTEGER), MAX(CAST(substr(student_no,11,4) AS INTEGER))
 FROM students GROUP BY CAST(substr(student_no,6,4) AS INTEGER)
 ON CONFLICT(enrollment_year) DO UPDATE SET last_number=MAX(student_number_sequences.last_number, excluded.last_number);
