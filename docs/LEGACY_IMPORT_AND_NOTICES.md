# Legacy student enrolment and migration notices (November 2026)

## Purpose
The admin-only **School management → Legacy student import** path is for already-enrolled historic pupils, not new public admissions. It accepts 1–100 CSV rows per batch, including incomplete DOB, gender, guardian contacts, class, address and consent details.

This is a special migration pathway. Ordinary new admissions still use the full application and acceptance checks.

## Before a live import
1. Take a production D1 backup and verify it.
2. Apply migrations through **0019_legacy_migration_notices.sql**:
   `npx wrangler@latest d1 migrations apply attowfiq_portal --remote`.
3. Deploy current source: `npx wrangler@latest deploy`.
4. Confirm the source roster, contact addresses, identities, and possible same-name duplicates.
5. Use the prepared CSV; no direct Excel upload is supported. The source workbook should be retained securely offline.

## What happens to unknown information?
- **First and last names and original source row** are still essential for a safe identity record. Missing identity or possible duplicate pupils block import for review.
- UK `DD/MM/YYYY` or `DD.MM.YYYY`, ISO timestamps, and valid Excel day serials are normalized to `YYYY-MM-DD`.
- Invalid, impossible, ambiguous, or future birth dates are **left blank**, with the original value retained in the private review note. No fabricated DOB is entered.
- Unknown/nonstandard gender, invalid guardian email/phone and unsafe optional contact fields remain blank, flagged for office review.
- Unknown or unassigned old class labels remain unassigned. The administrator can assign an appropriate existing class later.
- First-aid and photography consents remain **unknown**, not automatically set to Yes or No.
- Parent accounts are **not created, linked or activated** by import. Existing family relationships must be verified separately.
- Only the selected, validated rows are committed, together, in a D1 batch transaction.

## First-live-cohort registration numbers
Normal new registrations use **MATT-YYYY-NNNN**, for example `MATT-2026-0001`. The sequence resets naturally for each new calendar year. For this initial live intake, the administrator can explicitly tick **First live intake: Start from 0001**. This is allowed **only if there are zero students, zero admissions and zero existing legacy-import records**, so it can safely replace the deleted 2026 test-series sequence. The reset and pupil enrolment occur in the same transaction. Once any real record exists, numbering continues from the last assigned number and cannot restart.

## Guardian migration email
The import confirmation screen offers **Automatically notify guardians** (enabled by default) plus a separate **I have verified guardian addresses** checkbox. Import can proceed without email notices if the admin disables sending. To send, the admin must attest that the selected records' addresses belong to the children's authorised guardians.

For each selected, newly imported batch:
- Only syntactically valid guardian emails are eligible. Blank and invalid email addresses do not receive messages.
- One notice is queued per distinct guardian email; siblings in the same batch appear together.
- Email includes pupils' names and their new MATT registration numbers, a portal link, details on completing missing profiles and contact information.
- No passwords, invitations, personal medical notes, login tokens or direct parent access are sent.
- The HTML template is in `src/legacy-migration-email.mjs`, with inline CSS, responsive layout, Arabic greeting, school logo, official address and site URL.
- The notice queue and status log are private, admin-only, in `legacy_migration_notices`.
- D1 commit does **not** depend on Resend success. The Worker attempts sending immediately using `ctx.waitUntil`; the daily scheduled job retries outstanding notices (up to four attempts). Emails are tracked as pending/sending/sent/failed and are not queued again when the same import is replayed.
- Resend delivery requires `RESEND_API_KEY` and `EMAIL_FROM`; the sender domain must be verified. **Sent** means accepted by the provider, not guaranteed receipt or reading.

## What to check after import
Run a read-only count query:
```powershell
npx wrangler@latest d1 execute attowfiq_portal --remote --command "SELECT (SELECT COUNT(*) FROM students) AS students, (SELECT COUNT(*) FROM legacy_student_import_records) AS legacy_imports, (SELECT COUNT(*) FROM legacy_migration_notices WHERE status='sent') AS notices_sent, (SELECT COUNT(*) FROM legacy_migration_notices WHERE status IN ('pending','sending','failed')) AS notices_outstanding;"
```
Then use Student Directory to assign classes manually. The Legacy student import screen shows outstanding details and notice status. Do not assume every guardian email was delivered simply because the pupils imported successfully.
