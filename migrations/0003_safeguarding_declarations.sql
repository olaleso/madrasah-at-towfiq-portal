-- v1.0.7: Add optional health/support details and independent consent choices.
-- Preserve existing admissions, and retain legacy fields for historical data.
-- Never assume agreement: both consent flags default to 0 (not recorded).
ALTER TABLE admissions ADD COLUMN medical_information TEXT NOT NULL DEFAULT '';
ALTER TABLE admissions ADD COLUMN allergies TEXT NOT NULL DEFAULT '';
ALTER TABLE admissions ADD COLUMN additional_learning_needs TEXT NOT NULL DEFAULT '';
ALTER TABLE admissions ADD COLUMN consent_first_aid INTEGER NOT NULL DEFAULT 0 CHECK(consent_first_aid IN (0,1));
ALTER TABLE admissions ADD COLUMN consent_photos INTEGER NOT NULL DEFAULT 0 CHECK(consent_photos IN (0,1));