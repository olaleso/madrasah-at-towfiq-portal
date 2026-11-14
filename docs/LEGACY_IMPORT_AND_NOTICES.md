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


## Legacy parent onboarding — follow-up to the original migration notice
Migration notices merely confirm that existing pupil records have moved. They are **not** account invitations. Parent onboarding requires separate, explicit administrator review.

1. Apply `0020_legacy_parent_onboarding.sql`, then deploy the latest Worker and portal assets.
2. Open **School management → Legacy student import → Link and invite imported families**.
3. Review guardian groups and the children assigned to each email. Missing addresses, differing guardian names, deactivated accounts and conflicting links require manual correction.
4. Select only the groups whose identities, email ownership and authorization to access each child have been verified. Confirm **Link verified families**.
5. This creates/reuses one guardian account per verified address, links its imported children and queues one separate follow-up email per family. The historical student import is not repeated.
6. Choose **Send queued follow-up invitations** to send up to 10 eligible queued emails, respecting rate limits. The daily scheduler processes more queue entries, in bounded serial batches.
7. New accounts get a single-use, seven-day activation link; existing active accounts get sign-in instructions. The HTML says explicitly that it is a **follow-up to the earlier migration notice**. It includes all linked children and their registration numbers. Already-accepted onboarding emails are not resent by the normal queue.

The onboarding queue is `legacy_parent_onboarding`, separate from `legacy_migration_notices`. Both have retry state and capped attempts; accepted by Resend is not guaranteed inbox delivery. The admin must confirm guardian identity before authorizing access. No parent should be linked merely because an email exists in an old spreadsheet.

Read-only report:
```powershell
npx wrangler d1 execute attowfiq_portal --remote --command "SELECT status,COUNT(*) AS total FROM legacy_parent_onboarding GROUP BY status;"
```

## Existing-account password access follow-up (November 2026)
A verified family account can exist without the guardian remembering its password. Onboarding follow-ups for active accounts therefore include a **Set or reset my password** link that uses the existing 30-minute, one-time password-reset mechanism, plus the normal sign-in link. Reset is optional: the existing password remains valid until changed. New inactive accounts continue to receive their seven-day activation links.

For already-sent follow-ups, an administrator can use **School management → Legacy student import → Family onboarding → Send password link** on an already-linked, previously-onboarded active family. This sends a new continuation email to that single guardian only; it does not relink pupils, duplicate the existing account, or resend the original migration notice. The new recovery link expires after 30 minutes and the admin action is audited. Only previously accepted onboarding groups with unchanged verified pupil links are eligible.
