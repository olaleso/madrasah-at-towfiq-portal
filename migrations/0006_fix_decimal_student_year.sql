-- v1.0.10: Repair numbers created by SQLite REAL interpolation (e.g. MATT-2026.0-0001).
-- Additive/data-preserving migration: does not change pupil UUIDs or linked records.
UPDATE students
SET student_no = substr(student_no,1,9) || substr(student_no,12)
WHERE student_no GLOB 'MATT-[0-9][0-9][0-9][0-9].0-[0-9][0-9][0-9][0-9]';
