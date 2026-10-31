# Madrasah At-Towfiq — Management Portal (v1.0.4)

**A runnable, Cloudflare Workers + D1 portal**, styled with the client-supplied Madrasah At-Towfiq Arabic calligraphy logo. Responsive desktop/tablet/mobile design with first-run administrator setup, real server-side accounts, sessions and role permissions. This is a standalone project, not a patch to BNMC or the public At-Towfiq website.

## Persistent admin login and safe upgrades — v1.0.4

`npm run preview` now uses a **persistent SQLite file outside the extracted ZIP** rather than the previous in-memory database. On Windows it is normally saved in `%LOCALAPPDATA%\MadrasahAtTowfiq\portal-preview.sqlite`; on Linux/macOS it is in your user data directory. To isolate an independent demo, set `AT_TOWFIQ_DATA_DIR` to a different folder before starting. The database is schema-versioned and upgraded without erasing existing users, sessions, student records or admissions. Stop the old preview, extract a new release and launch it normally; **sign in with the same account**.

**One-time caveat:** users created in the older in-memory preview cannot be recovered after that old process stopped. You will need to register one more time upon first launch of this persistent build. After that, normal updates reuse the account. Do not delete the SQLite file when upgrading. Close the preview before manually backing up its database (SQLite may keep WAL/SHM companions); back up the whole data folder. Real student records should not be entered into this local demo.

For live Cloudflare, user accounts persist in a D1 database. `wrangler deploy` changes code only; never delete/recreate the D1 database for updates. Use `wrangler d1 migrations apply attowfiq_portal --remote` to apply new schema changes without resetting records. **Database IDs are environment-specific; replace the placeholder ID only after creating or identifying the correct existing D1 database.**

### GitHub and Cloudflare

This package contains a committed local Git repository, an optional GitHub Actions deployment workflow (requires repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`), and a step-by-step `DEPLOYMENT.md`. There is no public deployment performed by packaging alone. Do **not** commit `.dev.vars`, Wrangler local files, `.sqlite` databases, real student records, or Cloudflare API tokens.

## Features already implemented

- Password-based sign-in, session cookies, password change, optional emailed password reset, role-based access and administrator first-run setup.
- Admin-created 7-day invitations to teachers, staff and parents. When Resend is not connected, a private invitation link is shown to the admin instead.
- Student profiles (guardian, class, contact, medical/support notes, enrolment status), full history tabs, CRUD and protected permanent deletion.
- Classes, staff/teacher assignment, family links, admissions tracking, bulk CSV student import.
- Attendance daily register (present/absent/late/excused), session dates and student history.
- Homework: four types — Qur’an **Hifdh**, Qur’an **Muraja’a**, **Qaaidah** and **Islamic Studies**, with Surah/from verse/to Surah/to verse or page number, due date, complete/incomplete status, teacher feedback and assignment comments.
- The full requested catalogue of good (+1 to +3) and negative (−1 to −5) behaviour, linked privately to students. Admin can remove entries. Behaviour scores are not publicly ranked.
- Fee invoices, manual payment ledger, outstanding balances and reporting. **Stripe/GoCardless transactions are NOT connected.**
- Private parent portal messages, announcements, events/calendar.
- Reporting with attendance, homework and behaviour summary + downloadable CSV.
- Daily Ilm quiz studio with one attempt/account/question and a knowledge leaderboard.
- Friday Jumu’ah email automation (opt-in, needs verified `RESEND_API_KEY` and `EMAIL_FROM`), failed-email log, preview and manual admin broadcast.
- Global search across authorised students, classes and homework; audit trail, school settings and sample-data generator (explicitly admin-triggered, disabled once students exist).

**Not production-ready without customer configuration and review:** verified email domain, Stripe/GoCardless payment and webhook integration, public admissions workflow with anti-spam controls, WhatsApp poster generation, operational monitoring/backups, UK safeguarding policies, UK GDPR DPIA/privacy notice, retention and deletion policy, controller/processor arrangements, penetration testing, production consent/accessibility checks. This version implements a substantial BNMC-style portal foundation, **not a byte-for-byte copy or completion of every BNMC integration**. Do not enter genuine children's data before these checks.

## Streamlined sidebar — version 1.0.2

The original 15 always-visible sidebar links have been reorganised into four day-to-day shortcuts (Dashboard, Students, Homework, Attendance) plus four expandable groups (Learning & character, School management, Community, Reports & administration). Role-based visibility is retained for administrators, teachers, staff and parents. Expanding a group does not reload the page; the selected group stays open during navigation, and keyboard users can operate all buttons. No existing feature or API route was removed. Use `Ctrl+C`, extract the new ZIP to a fresh folder and run `npm run preview` to see the change. Since v1.0.4 preview accounts are saved persistently on disk; do not use this demo for genuine pupil data.

## Windows local preview fix — version 1.0.1

If the browser displayed a black `Not found` page at `http://127.0.0.1:8787`, version 1.0.0 used `URL.pathname` when locating the `public` folder. On Windows, that produces an incorrect file path. Version 1.0.1 uses Node's cross-platform `fileURLToPath` and adds an explicit check that `public/index.html` exists. This does not change the Cloudflare Worker, D1 migrations, or school features.

**PowerShell upgrade:**

1. Press `Ctrl+C` in the old preview terminal to stop the previous server (port 8787 must be available).
2. Extract **the new ZIP** into a *new folder* (do not run the ZIP directly, and do not accidentally launch the old extracted copy).
3. Open PowerShell in the new `Madrasah-At-Towfiq-Portal` project folder containing `package.json`.
4. Run `npm run preview` and open `http://127.0.0.1:8787/`.
5. Enter the one-time setup key printed in the terminal to create the admin account.

The preview changed in v1.0.4 to persist data outside the code folder. Once the admin exists, no new setup key is needed. Production D1 data remains independent of local preview data.

## 0. Fast, no-install interactive demo (Node.js 22+)

For a quick evaluation without a Cloudflare account, extract the ZIP and run:

```bash
npm run preview
```

Open `http://127.0.0.1:8787`. The terminal prints a **one-time setup key only when there is no admin yet**. Create your admin credentials once, then go to Settings & access → Create sample records for fictional testing. As of v1.0.4, the preview uses a persistent SQLite database and **retains your admin account on restart**. It is still a QA convenience, NOT a production server; use fictional demonstration data only. It runs the same application Worker and schema as Cloudflare.

## 1. Run locally with Wrangler (Windows PowerShell or macOS/Linux)

Install Node 20+ and npm, then open the extracted project folder:

```bash
npm install
cp .dev.vars.example .dev.vars
```

On Windows PowerShell, copy using `Copy-Item .dev.vars.example .dev.vars`.

Edit `.dev.vars`. Replace `SETUP_KEY` with a long, random key (minimum 16 characters). The key is shown only to the first administrator during setup. Never share or commit it.

Then run:

```bash
npm run db:migrate:local
npm run dev
```

Open the address Wrangler prints (usually `http://localhost:8787`). On the first visit, the portal asks for an administrator name, email, strong password and the one-time setup key. After creating that account, logins are backed by **the local D1 database**.

For a realistic demonstration, sign in as admin → **Settings & access** → **Create sample records**. This loads **fictional demo students** into an EMPTY database. Do not run it in your production database.

Add teachers/parents through **Staff & guardians**, assign the teacher to a class, then link a parent to a student in the student's profile. Invitations display a private activation URL if email sending is not configured.

## 2. Deploy to Cloudflare Workers (recommended)

This is a **Cloudflare Worker with an `assets` binding and a D1 database**. It is not a static-only Pages upload; the API requires the Worker.

Authenticate:
```bash
npx wrangler login
npx wrangler d1 create attowfiq_portal
```

Copy the returned D1 `database_id` into `wrangler.jsonc`, replacing `00000000-0000-0000-0000-000000000000`.

```bash
npm run db:migrate:remote
npx wrangler secret put SETUP_KEY
npm run deploy
```

Set `SETUP_KEY` to a unique random 32+ character secret, stored as a Cloudflare encrypted Worker secret, NOT in source files. Use the live URL to create your first administrator.

**Email** (optional): verify a sending domain in Resend, then update `EMAIL_FROM` to your verified sender address and add `npx wrangler secret put RESEND_API_KEY`. This enables account invitations, password recovery and admin-controlled Jumu’ah broadcasts. Without this integration, password recovery emails are not sent (and an administrator should help restore user access through a controlled account-recovery policy).

**Jumu’ah reminder schedule:** the Worker cron is Friday at **08:00 UTC**, which is **09:00 BST during UK summer**. It stays OFF unless enabled by an administrator via the Automation Centre. For a consistent local Friday time year-round, update the schedule for daylight-saving changes or use a timezone-aware scheduler.

**Payments:** invoices and manual transactions work. Stripe or GoCardless merchant integration is a separate task requiring PCI-safe redirect/hosted payment flows and signature-verified webhooks, never client-side fake success.

## 3. Login security design

- Auth uses WebCrypto PBKDF2-SHA256 with a unique 16-byte per-account salt and 210,000 iterations.
- Random opaque 7-day bearer session cookies are marked HttpOnly/SameSite=Lax and Secure under HTTPS; only SHA-256 token hashes are stored in D1.
- All modifying authenticated endpoints require a fresh session-derived CSRF token plus same-origin request checks.
- Admin/Staff/Teacher/Parent access is checked server-side. Teachers see pupils in their assigned classes; parents see linked pupils only.
- Password lockout after 6 invalid attempts for 15 minutes; user invite and password reset tokens expire and are single-use.
- Sensitive changes are logged in `audit_log`. Before production add abuse protections/rate limits via Cloudflare WAF, MFA (if required), separate backups, operational alerting and an independent security review.

## 4. Notes for the owner

- **Parents:** add parent account → send activation invitation → create/link student via Student Profile; parents then see only that pupil's records, fees, announcements, messages and quizzes.
- **Staff/teachers:** grant access in Staff & guardians; assign teachers to Classes.
- **Homework:** teachers select `Hifdh`, `Muraja’a`, `Qaaidah`, `Islamic Studies`; the form changes fields based on the subject. Completion is updated from the tracker or a student profile.
- **Behaviour:** positive and concern points use fixed school-defined values, not manually adjustable deductions. Bullying/abuse issues additionally require escalation to a safeguarding lead.
- **Bulk CSV import:** `first_name,last_name,dob,gender,class_name,phone,address`; up to 200 per import; class names must match to link automatically.
- **Delete student:** administrator/staff access only and confirmation required; permanently deletes linked academic/payment records. Check statutory retention rules and backups before using this in production.
- **Privacy:** the portal contains special-category and minors' data; contact and medical notes require case-by-case handling. UK GDPR and safeguarding requirements must be agreed with the institution before go-live.

## Project layout

```
src/worker.js          Cloudflare Worker API, authentication, authorisation & scheduled email
migrations/0001_initial.sql  D1 schema
public/index.html      Responsive portal SPA
public/styles.css      Bespoke brand design
public/app.js          Interactive frontend
public/assets/at-towfiq-madrasah-logo.png   Uploaded client logo, cropped without modifying design
wrangler.jsonc         Worker assets, D1 and cron configuration
.dev.vars.example      Sample (non-secret) local config
```

**Design and development:** NuraSpecs — demo foundation for Madrasah At-Towfiq, Bolton.


## Admissions upgrade — v1.0.3

The Admissions module now reflects the parent application form supplied by the madrasah. It records student surname/forename, DOB, gender, full address/postcode, telephone/mobile, parent/guardian name, relationship, address, contact phone, emergency number, email, previous madrasah attendance/name, current beginner/Qaaidah/Qur’an/Arabic-literacy stages, Qaaidah page, Qur’an surah, planned weekly revision hours and notes. Office staff can **Create**, **View**, **Edit**, and change review status of applications. Previous records are kept intact by an additive migration. The applicant details in the reference screenshot were deliberately **not** embedded in the blank form or demo database.

**Existing Cloudflare D1 deployment:** Take a backup before upgrading. Deploy the updated Worker and static assets, then apply `npm run db:migrate:remote` with the proper database ID in `wrangler.jsonc`; Cloudflare executes only unapplied migrations. For an entirely new install, apply both 0001 and 0002 migrations.

**Local preview:** `npm run preview`; the persistent SQLite database automatically applies both migrations only once. It **preserves** the database on restart and across ZIP upgrades. The detailed admission form is available under **School management → Admissions → New application**. Only administrators and authorised office staff can view applicants' personal data. A public parent-facing form and a production privacy/retention workflow are not included in this release.

## v1.0.7 admissions simplification and consent records

The admissions form now collects **one home address** and **one guardian mobile contact**; the duplicate guardian address and daytime mobile inputs are removed. Existing legacy database columns remain untouched to preserve historic records.

Optional **medical information**, **allergies**, and **additional learning needs** are recorded only in restricted admissions records, alongside two distinct consent flags for **emergency first aid** and **internal learning photographs**. Flags default to not recorded; only record a tick if the parent/guardian explicitly agreed. A proper privacy notice, safeguarding process and sensitive-data access/retention review remain required before processing real children's data.

**Deployment:** run `npm run db:migrate:remote` after pulling the new commit and before `npm run deploy`. Migration `0003_safeguarding_declarations.sql` is additive and does not alter existing administrator accounts, billing history or admission records.

## v1.0.9 — Student numbers, Quran validation and homework/behaviour workflow

- Student IDs remain stable, but display numbers use `MATT-YYYY-NNNN`, starting at `0001` each year. Migration `0005_student_registration_numbers.sql` converts existing numbers, preserving pupil UUIDs, admissions, invoices, attendance, and homework. Back up D1 before migration; previously issued legacy numbers should be communicated to staff.
- All future accepted admissions allocate numbers atomically from a per-year D1 sequence. Repeated approval does not allocate an extra number.
- Hifdh and Muraja'a enforce the canonical 114-surah verse counts in both the interface and the Worker. E.g. Al-Fatihah has 7 verses; a verse 20 assignment is rejected.
- Homework has two stored statuses: `incomplete` at assignment and `complete` when an authorised teacher/admin updates the record and saves feedback. Overdue is an on-screen date indicator, not an independent stored status.
- Student profile behaviour recording loads the same full positive/negative catalogue used in Learning & Character.

**Deployment order**: `git pull origin main`, `npm run test`, back up the D1 database, `npm run db:migrate:remote`, then `npm run deploy`. Migration 0005 changes *displayed numbers* for existing pupils, not their database IDs or linked records.


## v1.0.10 release

Fixes MATT registration-number year formatting for newly accepted students, and adds migration 0006 to repair any existing display numbers containing a spurious `.0`. No database or administrator reset is needed. Run `npm run test` before applying pending remote migrations and deploying. GitHub Actions now tests pushes to `main` independently of Cloudflare deployment configuration.


## v1.0.12 — Staff, family directory and admission-triggered guardian invitations

- Sidebar: **Staff & administration** is separate from the **Parents & guardians** directory under School management. The guardian directory lists accepted pupils and their family contacts, and links back to student profiles.
- Admins may edit names, roles and status on staff accounts. Email changes for *other* staff revoke old sessions/password and issue an invitation to the new address; a logged-in admin changing their own email must supply their current password. The final active admin cannot be deactivated or demoted.
- When admission acceptance succeeds, the backend attempts an invitation to the recorded parent email. Matching already-active parent accounts are linked without creating duplicate accounts. Parent accounts awaiting activation are linked on invitation acceptance, not beforehand.
- **Email delivery prerequisites:** A verified sender address in `EMAIL_FROM` (not the example.org placeholder) and a Cloudflare Worker `RESEND_API_KEY` secret are required. Without them or when provider delivery fails, an authorized staff member is shown a **private one-time activation link**; email is not claimed sent. Staff can retry from Parents & guardians, after verifying the contact identity. Do not include real pupil data in an invitation email.
- The change is code only, requiring no D1 schema migration or reset. Verify that setup and safeguarding are complete before using real child/guardian records.


## v1.0.14 — Formal parent invitation design

- Replaces the native browser confirmation on **Parents & guardians → Invite / retry** with a responsive, branded invitation dialog showing the pupil, recorded guardian contact and a **reviewable preferred greeting name**. The greeting preview updates as the administrator types. Regenerating invalidates previous activation links.
- Replaces the plain-text-looking parent invitation with a responsive, table-based HTML email in navy/blue using the public Madrasah At-Towfiq logo, Arabic and transliterated taslīm, formal salutation (“Dear [preferred first name]”), admission confirmation, clear activation button, single-use 7-day expiry, and admissions reply address. Parent names and activation URLs are HTML-escaped, and the email subject contains no pupil identity.
- Existing admissions store a single guardian full-name field. The automatic first invitation uses the last word of that field as its provisional greeting (common surname-first forms). Staff should verify the name using the editable invitation dialog when inviting or resending, especially when name order differs.
- No D1 migrations or resets. `npm run test` validates the email payload using an intercepted Resend request; production delivery still depends on valid verified Resend configuration.

## v1.0.15 — Immediate application received email

- Creating an admission through the authorised **Admissions → New application** form now saves the record first, then attempts a separate, formal HTML acknowledgement to the guardian email. A rejection or email logging failure does not roll back the application. The response shows whether Resend accepted the receipt for delivery; the portal warns an administrator if it was not sent.
- Branded receipt uses the official logo and navy/blue palette, Arabic and transliterated taslīm, the registered guardian name, a reference in the format `MAT-YYYY-XXXXXXXXXX`, received date, review steps, and admissions contact email. The reference also appears in the application's staff directory row and detail view.
- Explicitly distinguishes **application received / awaiting review** from **admission accepted**; no activation link is issued until admission acceptance. The email excludes date of birth, medical/allergy information, home address, and other sensitive form fields.
- Email is dispatched only upon initial creation (`POST /api/admissions`), not every edit or change of status. Existing historical applications will not be backfilled automatically.
- The current Admissions form is accessible only to authorised staff/admin; a public self-service admissions page would be a separate change requiring abuse prevention and safeguarding review.
- No schema migration or D1 reset required. Verified Resend sending and the admissions reply inbox are prerequisites for a complete email experience.


## v1.0.16 — Automatic homework and behaviour notifications

- When an authorised administrator, staff member, or assigned teacher creates a homework assignment, the Worker saves it, records the audit event, then attempts one branded HTML email to the pupil's guardian with the subject, prescribed Qur’an passage or page, due date and a link to the parent portal.
- When a behaviour catalogue entry is recorded, the Worker sends a separate positive-recognition or points-deduction notice with the official catalogue reason and signed point change. Private teacher notes never appear in the notification.
- Recipients are derived **server-side**: prefer an active linked parent account; otherwise use the accepted admission's registered guardian email if no parent is linked. A pupil reassigned to another parent is **never** emailed to an obsolete admission contact; inactive pupils and invalid/missing recipients are skipped. User-supplied recipient addresses are not accepted by these endpoints.
- Notifications are sent only when the initial assignment/behaviour record is created, **not** when an assignment is marked complete or its status is updated. Original authenticated permissions, CSRF and audit history remain enforced.
- Saving learning records never depends on email delivery: the response includes `notification_status` (`sent`, `not_sent` or `no_guardian_email`), and the staff UI displays the outcome. `sent` means accepted by Resend, not guaranteed inbox delivery.
- The notification HTML shares the navy/blue design, official logo, Arabic and transliterated taslīm, personalised greeting and secure portal call to action. Only essential pupil data are included; detailed teacher feedback and sensitive notes remain in the protected portal.
- No D1 migration or admin reset. Verify actual delivery with a fictional guardian address before enabling real family communications; the admissions reply-to mailbox must be able to receive replies.


## v1.0.17 — Branded confirmation dialogs across the portal

- Replaced **every native browser** `confirm()` and `prompt()` call in the frontend with one responsive, branded `confirmDialog()` component. Audit includes admission acceptance, permanent student deletion, events, announcements, staff access toggles, bulk invoice issuing, Jumu'ah broadcasts and demonstration data.
- Each confirmation clearly states the action, consequence, and context. Destructive and mass-impact actions use stronger warning/danger styling. Permanent pupil deletion retains the exact **DELETE** typed confirmation requirement before the approve button can be enabled.
- The action overlay is independent of the form modal, so an invoice confirmation can be cancelled without losing entered data. Backdrop click, Close, Escape and Cancel all resolve **false**. Keyboard focus is restored and Tab is contained while the confirmation is open. Extra simultaneous clicks cannot approve another operation.
- Cancelling an admission acceptance restores the previous application dropdown state; no admissions, account or financial mutation is performed. Backend authorisation and safety checks remain unchanged.
- `npm run test` now scans shipped runtime files to prohibit `confirm()`, `prompt()` and `alert()` from being introduced again, parses the app script and checks key high-impact workflows.
- Frontend-only release: no SQL migrations, D1 resets, email secrets or admin account changes. Deploy with `git pull origin main && npm run test && npm run deploy` on PowerShell (run one command per line).


## v1.1.0 — Family Learning Hub and full pupil-name email personalisation

### Family Learning Hub
- Parents receive a dedicated, beautifully styled dashboard with a family summary, per-child profile cards, class and registration number, pending homework, attendance percentage, character point balance and next homework due.
- A recent-learning timeline combines the family's homework, behaviour and attendance; separate notices surface the school's existing announcements. Parent-specific navigation opens the relevant child profile, homework, behaviour and notices.
- **No new cross-family read permissions:** the dashboard uses the same existing API resources, filtered on the server by `studentScope()`. Parents cannot access admissions or other families' records. Teachers/admin/staff retain their existing dashboard.
- Works with more than one linked child and responsive layouts for phone/tablet/desktop. No database migration.

### Full student names in student-related emails
- Every student-related email includes the pupil's **full forename and surname** in its HTML body. This covers application receipts, admission acceptance invitations, new homework, positive and deducted behaviour points and pupil-linked private portal-message alerts.
- Email subject lines still omit pupil names; private message bodies, medical data, teacher notes and unrelated pupils are excluded. All child names are resolved from the server's admission/student record, escaped for HTML, and never sourced from arbitrary email recipient parameters.
- Pupil-linked parent-message alerts are restricted to the **current linked guardian**. An attempt to notify another parent about a pupil is rejected before saving. Staff announcements, password resets, general invitations and Jumu'ah broadcasts are not about individual pupils and remain generic.
- Existing Resend settings and Reply-To are retained. As always, failed email delivery cannot delete a saved admission, assignment or points record.

### Deployment
Run `git pull origin main`, `npm run test`, and `npm run deploy` from the existing project. No D1 migrations, account recreation or secret changes. Check parent account login at `https://portal.attowfiqmasjid.org/` and test new emails with a fictional pupil and guardian address you control. The automated test checks full names, non-disclosure and cross-family permissions.

## v1.1.1 — Immediate family linking on acceptance + automatic invitation

- When Admissions marks a pupil Accepted, the Worker **immediately associates** the student with the registered guardian email. A new parent account is created as inactive, linked to the pupil and automatically emailed a branded **single-use activation invitation**. The pupil is linked before the guardian activates; access remains disabled until activation.
- When the guardian email matches an **existing active account**, do not create duplicates or regenerate the password. Link the pupil and automatically send a branded **your child is linked** notification, with the full pupil name and a secure login button. Sending failures do not undo the link or admission.
- Accounts can serve as both a **teacher/staff/administrator** and a **guardian** under a single login, without changing the stored staff role. Such users get a **Family view / Staff view** switch. Family view sends a dedicated `x-portal-view: family` header; the Worker checks for at least one active child linked to the account, then enforces **parent-only access** for every API request. Existing staff mode retains its original permissions. This is a permission reduction, not a grant of new administrator rights.
- The Parents & guardians directory now distinguishes **Linked** from **Linked · activation pending**. Retrying an email for a previously accepted, unlinked pupil can also link that pupil to an existing staff account. The error for an already-existing non-parent account is eliminated.
- Safeguards: never override a pupil already linked to a different account; never reactivate an intentionally deactivated account; do not create duplicate student records or consume additional student numbers; email not sent never cancels enrolment; inactive guardian accounts cannot sign in. Staff authentication and current passwords are preserved.
- The update is **code-only**; no D1 schema migration or database reset. It applies automatically to **new admissions**; for previously accepted pupils still marked Not linked, use **Parents & guardians → Link & notify** once. Check the recorded guardian email and identity before linking. The existing test teacher email conflict can be resolved this way.
- Regression tests verify immediate linking, password-activation flow, existing teacher-as-guardian role retention, personalised email, restricted family API access, blocked family writes and idempotent re-approval.

## v1.1.2 — Existing-parent enrolment acknowledgement correction

- Fixes an incorrect error/warning when **another child is accepted under an already-registered parent account**. Successful enrolment and guardian linking are now confirmed independently from the confirmation popup and email status.
- `linked_existing`, `already_linked`, and `already_active` are shown as successful guardian states. Repeated acceptance of an already-enrolled child responds idempotently with `already_enrolled:true`, `invitation_status:already_linked` for a matching guardian; no extra student registration number, guardian account, or email is generated. Genuine mismatched guardian assignments still require manual review.
- An email-provider or email-log failure after linking cannot change a successful existing-parent link into a false admission error. The email delivery status is reported separately. Failures refreshing the admissions directory or rendering a post-save message no longer cause the interface to falsely label enrolment as unsuccessful.
- Adds tests for an existing parent's second child, unchanged parent password/role, no duplicate emails on repeated approval, and Resend downtime. No D1 migrations or account changes.

## v1.2.0 — Mandatory class allocation, class rosters and password recovery

- **New admissions require a class.** Staff must select a created class in the branded acceptance confirmation; full classes are disabled. The API rejects acceptance without `class_id`, with a non-existent class, or where the class is already full, **before** creating a student, consuming a registration number or sending the parent acceptance notification. The pupil's `class_id` is saved at the same time as their enrolment in the existing D1 transactional batch.
- **Existing pupils retain their data.** Previously accepted pupils with `class_id = NULL` are not automatically guessed into a class. Administrators can allocate them in the Student Directory with **Assign class**, or use **Classes & enrolment → Manage pupils** to add multiple unassigned pupils to a class. Current class members are locked against accidental removal; cross-class transfers use the pupil's **Change class** action. Active pupils cannot be left unassigned through the edit form. Teacher class-based permissions continue to apply.
- Class counts and capacities are enforced server-side for newly accepted students, student transfers and roster updates. Class creation/edits validate capacity. No independent student creation or bulk-import endpoints are enabled.
- **Forgot Password** is accessible from the sign-in screen and now sends a responsive official-branded Resend message, with Arabic taslīm, secure link on `portal.attowfiqmasjid.org`, a single-use token expiring after 30 minutes, and rate-limiting repeat requests. The public request response does not disclose whether an email is registered. The reset screen requires a matching password confirmation and 12+ characters, invalidates tokens and old sessions after successful reset, then guides the user back to sign in. Only active accounts with existing passwords receive reset emails; pending parent invitations still use their separate activation links.
- Regression suite covers admission rejection without a class, class assignment and capacity rules, roster restrictions, reset email, unknown-account nondisclosure, request throttling, password mismatch, single-use token, session revocation and new-password sign-in.
- **No migration / no data reset.** Current students, guardians, invoices and registration numbers are preserved. Before applying the first mandatory acceptance, create at least one class with available capacity. Existing unassigned pupil records can be allocated through roster management.

## v1.3.0 — Family Fee Centre and branded financial correspondence

- Automatically sends a private HTML **new-invoice notification** when staff issues an **individual** invoice, and a **payment acknowledgement/receipt** when staff records a manual payment. The email includes the full pupil name, billing month, invoice amount, payments recorded, balance due, deadline, navy-blue madrasah branding, Arabic taslīm, and a secure link to the family portal. Pupil names are intentionally absent from email subject lines.
- Adds **Send statement** for outstanding invoices in the staff fee table. This uses the same branded confirmation dialog and sends a courteous balance reminder to the currently linked parent/guardian. Paid invoices cannot receive payment demands. Parents and teachers cannot trigger reminders or access other families' financial records.
- Improves the family-facing **Fees & payments** page with due dates, clear **Paid / Part paid / Outstanding / Overdue** labels, overdue count, and statements ordered with overdue items first. Staff receive a concise overdue-attention prompt. The underlying ledger and payment constraints remain unchanged.
- All email recipients are looked up **server-side** using the currently linked guardian (or the accepted admissions contact where eligible). Private teacher notes, medical details, guardian addresses and bank/card information are excluded. A provider rejection or missing eligible recipient **never reverses** a saved invoice or payment; the staff UI distinguishes record-save success from email-provider acceptance.
- This release intentionally keeps existing **bulk invoice issuance** independent from outbound email delivery. Large bulk runs remain safe/fast and the UI explicitly notes that staff may send follow-up statements individually. Bulk issuance is **not** presented as having sent emails.
- **No payment processor was connected.** These emails confirm only records entered in the existing manual ledger; they must not be represented as evidence of bank settlement. Stripe/GoCardless still require separate configuration and safeguarding review.
- No database migration, D1 reset or new secret. Run `git pull origin main`, `npm run test`, then `npm run deploy`. Verify live Resend inbox delivery with a fictional pupil/guardian before real financial notifications.

## v1.4.0 — Class attendance and confidential family absence notices

- The **Attendance register** now offers a class filter, an explicit **Not marked** choice, and **Mark unmarked present** to fill only blank statuses. A pupil who has not been checked is never silently saved as present. Only marked pupils are submitted, with a maximum of 100 in each save. Changing class before saving discards unsaved selections.
- The Worker validates **all pupil IDs, assigned-teacher access, dates, active enrolment, duplicate entries and statuses before writing any changes**. It uses one D1 batch so a bad entry cannot leave half a register saved.
- Staff and assigned teachers may explicitly tick **Email guardians about newly marked absences** for the **current Bolton calendar day**. It is disabled by default and on past or future dates. **Late** and **Excused** entries, present pupils and unmarked rows never trigger an email.
- Each new absence notice uses the existing official branded HTML template and Resend configuration. The student's **full name** and attendance date are in the private body, never the subject. Notes are excluded. Recipients are resolved from the current guardian link, never from form input.
- Migration **0007_attendance_family_alerts.sql** creates a tiny per-pupil/date notice ledger. It prevents repeat notifications when staff click Save twice, re-save an absent pupil or correct the same date back to Absent. The ledger is removed automatically if a pupil is permanently deleted; past attendance remains untouched. A failed email **does not undo attendance** and is recorded as attempted rather than repeatedly resent. Staff can follow up through their normal communications tools.
- Family accounts remain read-only. Teachers still write only to their assigned class. No mass or retrospective email campaign is enabled.

**Required deployment order:** back up the production D1 database, `git pull origin main`, `npm run test`, `npm run db:migrate:remote` (only migration 0007 should be pending), and `npm run deploy`. Do not reset the D1 database. Existing student, class, guardian, fee and attendance records are preserved.

After deployment, use fictional pupils and email addresses you control to verify: an unmarked pupil stays unrecorded; marking a present pupil sends no email; an opted-in same-day absence sends one personalised email; re-saving it does not send another; a simulated provider failure leaves attendance saved. Only then consider enabling notifications for real guardians.

## v1.5.0 — Teacher Classroom Hub & monthly learner progress

- **My classroom** provides assigned teachers a class-scoped daily view: active pupils, how many registers are marked today, recorded absences, incomplete/overdue homework, and private report drafts. Teachers can open a pupil's profile, review overdue homework, take attendance, or start a progress report. Staff/admin users can also use this workspace.
- **Progress reports** are monthly, per-pupil records covering Hifdh, Muraja’a, Qaaidah and Islamic Studies. Each optional subject level is Developing / Progressing / Secure / Excellent. Reports also include a narrative teacher summary and practical at-home next steps. Only one report is allowed per pupil per month.
- New reports are **Draft by default** and **cannot be seen by parents**. Authorised administrators, office staff and the pupil's assigned teacher may explicitly **Publish to family**, after confirming visibility. Publishing requires at least one subject assessment and a meaningful summary. There is no automatic email broadcast.
- A **published report** appears only in the **currently linked guardian's** Progress reports page and the pupil's learning profile. If unpublished later, family access ends immediately. Staff acting as parents through **Family view** also receive parent-only read access; staff mode retains assigned-class scoping.
- Parent dashboard pupil cards now show the latest published report month and link directly to the family report centre. All narrative fields are rendered as escaped text. Family-facing reports must never contain medical, safeguarding, disciplinary or other restricted notes.
- A published report is a teacher assessment, **not** a medical, safeguarding or statutory grade. Attendance and homework are separate existing records and are not modified by report publication.

**Schema migration:** `migrations/0008_pupil_progress_reports.sql` adds a new private D1 table and index; it does not change existing admission, class, homework, guardian, fee or attendance data. Back up D1, apply the migration **before** deploying the new Worker. Do not reset D1, re-invite parents or regenerate passwords.

**Release procedure (PowerShell in the existing project directory):**
```powershell
git pull origin main
npm run test
if ($LASTEXITCODE -ne 0) { throw "Tests failed. Do not migrate or deploy." }
npm run db:migrate:remote
if ($LASTEXITCODE -ne 0) { throw "Migration failed. Do not deploy." }
npm run deploy
```

**Verification:** Use fictional pupils linked to guardian inboxes you control. Confirm that drafts are staff-only, a published report appears for only the correct parent, an assigned teacher cannot see another class's reports, and unpublishing removes a report from the family view. Do not test with safeguarding information.

## v1.6.0 — Compliance & Communications centre

### Communications (all authorised roles)
- **Two-way private conversations:** admin/staff/assigned teachers can start conversations; parents can start a message only to their active pupil’s assigned lead teacher, or reply within an existing conversation they participate in. Message replies inherit the original participants, subject and pupil link; the recipient is resolved by the server and cannot be changed by the sender.
- **In-app inbox:** conversation history, sent/received labels and individually tracked unread/read timestamps. Only the actual recipient can mark a message read. Parent/teacher views see only messages they sent or received and, for pupil-specific messages, only when the pupil is still linked to that guardian or assigned to that teacher. Admin/staff retain office oversight access.
- **Email alert:** when Resend is configured, the other participant receives a private inbox notification, showing the linked pupil’s full name when applicable but **never the message body**. A failed/no-provider email does not roll back the saved portal message.
- **Announcements:** the existing authorised audience-specific noticeboard remains available. Only admin/staff publish or remove announcements.
- **Safety limits:** ordinary private messages are not a designated safeguarding record or emergency reporting route. They are persistent, auditable portal messages; the user interface does not offer deletion.

### Compliance (administrator and office staff)
- **Policy review register:** title, category, version, owner, status (draft/current/retired), next review date and administrative review notes. Only admins can create/change policy records. Due/overdue reviews are highlighted, but the tracker does not store original signed policy documents.
- **Admission declarations snapshot:** authorised office users can view the most recent **accepted admission** record’s emergency first-aid and internal-photo declarations per active pupil. Snapshot is **not live consent**; a non-agreement and a missing declaration are displayed conservatively, not assumed to be permission. Changes or withdrawal must be handled by the school's actual consent workflow.
- **Restricted privacy/operational concern log:** admin/staff can submit minimal metadata for privacy requests, possible breaches, access reviews or other operational issues; office staff see **only their own** submissions; administrators see all and update review notes/status (open/in_review/closed). Do **not** record names or sensitive pupil/safeguarding case details in this operational tracker. Formal reporting/escalation remains separate.
- **Permissions:** parents and teachers cannot enumerate the compliance register or concerns. All state-changing requests use existing authenticated CSRF protection and audit logging.

### Migration & rollout
`migrations/0009_compliance_communications.sql` extends the existing `messages` table for thread roots and read receipts and adds two independent administrative tables. It **does not alter or delete existing message, family, admission, fee, attendance or report records**.

Take a recovery point for your **production D1** before migrating. In the existing local project folder run:
```powershell
git pull origin main
npm run test
if ($LASTEXITCODE -ne 0) { throw "Regression tests failed. Deployment stopped." }
npm run db:migrate:remote
if ($LASTEXITCODE -ne 0) { throw "Production migration failed. Deployment stopped." }
npm run deploy
```

For a safe test, use fictional parent and staff accounts and an email inbox you control. Create a private message, sign in as its guardian recipient, read and reply, verify that the sender sees the reply and no other guardian does, then test policy review dates and concern reporting. The compliance centre is an operational aid, **not a claim that the school is legally compliant**.

### v1.6.1 — Staff DBS recheck reminders and optional restricted copies

The Compliance Centre now has an **administrator-only** staff DBS register for all active administrator, teacher and office-staff accounts. It records the check level, certificate issue date, optional four-character reference suffix, original-check verification date and the madrasah's next **recheck due date**. DBS certificates do not have a statutory expiry date. The portal flags due dates within 60 days and overdue checks in a warning banner and sidebar badge.

Admins can optionally upload PDF/PNG/JPEG certificates (max 3 MB), download them with no-cache attachment responses or remove them early. Private documents live only in an **R2 bucket** and are subject to a **180-day retention cap**, enforced by a daily cleanup and an independently configured R2 lifecycle rule. The metadata and alert register works without uploaded files; no parents, teachers or non-admin office staff can read this sensitive register.

**Deployment prerequisite:** the new `wrangler.jsonc` refers to a private R2 bucket which must be created before deploying v1.6.1. Read [docs/PRIVATE_DBS_STORAGE.md](docs/PRIVATE_DBS_STORAGE.md) **before** running `npm run deploy`. Remote D1 migration: `0010_staff_dbs_review.sql`. No existing pupil, family, progress report, fee or compliance data is changed.

## v1.6.2 — Mandatory DBS certificate on initial registration

The Admin Compliance Centre now has one **DBS record form**, containing the check type, original certificate issue date, school's recheck due date, and a **mandatory PDF/PNG/JPEG certificate file** (3 MB maximum). The save call sends the metadata and the private file together to `POST /api/compliance/dbs/submit`. It will not create a new record if the file is missing or private R2 upload fails. Administrators must acknowledge the school's legal grounds and need for temporary retention before uploading.

Existing date-only DBS records created in v1.6.1 (including any already entered in the live portal) must be completed by uploading the certificate on their next edit; these are shown as **Upload required**. Once evidence has been received, routine recheck-date edits do not require reuploading the same certificate. Changing a certificate's **issue date** signifies a new certificate and requires uploading its copy. When the 180-day storage retention period ends, the file is removed but the minimal `document_received_at` timestamp remains; there is no requirement to retain the sensitive copy indefinitely.

Migration `0011_dbs_evidence_received.sql` adds the timestamp and backfills it from prior uploads. Existing DBS dates and prior files are preserved. The register, due-soon/overdue alert windows and other school records are unchanged. The browser no longer hides certificate controls based on an unreliable storage-status indicator; an actual missing R2 binding produces a clear error and the registration remains unsaved.

**Production rollout:** pull `main`, ensure the existing private `DBS_FILES` R2 binding and retention lifecycle are correct, back up D1 using a working recovery method, run `npm run test`, apply remote D1 migrations and then deploy. Test with a dummy certificate, never a real staff member's criminal-offence information during acceptance testing.

## v1.7.0 — Private in-app Notification Centre (no external SMS/WhatsApp provider required)

A **My notifications** page is available to administrators, staff, teachers and parents under **Community**, with an unread badge on the top-bar bell. Opening a notification acknowledges it and navigates to the relevant secure section. A **Mark all as read** action only affects records the current user is authorised to see.

New in-app notifications are created after successful business operations:
- Parent notifications for homework, behaviour/character updates (generic wording, no raw notes), selected absence alerts, new individual or bulk invoices, payment receipts and newly published progress reports;
- Recipient notifications for secure parent/teacher/office private messages.

All notifications are stored in Cloudflare D1, linked to a specific user and optionally to a student. The API re-checks active current guardian or teacher/class links **on every read and acknowledgement**, including dual-role Family view. Messages and behaviour details are not copied into the notification summary. Each event and recipient is de-duplicated, and deleting a pupil removes linked notification records. A scheduled retention cleanup discards records older than 365 days; review this period under your organisational retention policy.

**There is no automatic SMS or WhatsApp sending in v1.7.0.** The in-app workflow works now while the madrasah waits for FireText SMS business verification and decides on a compliant WhatsApp production provider. SMS/WhatsApp consent, sender details, templates, billing, delivery retries, callback signatures and opt-out processing must be separately approved and implemented before live external messages are enabled.

Migration: `0012_in_app_notifications.sql`. It adds a new notification table without modifying existing admission, family, attendance, fee or DBS data. Notifications are generated for events happening **after v1.7.0 deployment**; old events are not retrospectively delivered.


## v1.8.0 — Academic calendar & future communication preferences

**Academic calendar** is accessible to signed-in families and staff from **School management → Academic calendar**. Administrators can add, edit and remove academic terms with a name, school academic year and date range. Terms cannot overlap. Administrators and office staff can add, edit and remove term-linked or standalone school dates (holidays, closures, assessments, parent meetings and other school events). Dates must be valid; linked dates must remain inside their term. A term with linked dates cannot be removed or shortened to exclude those dates. All roles see the same non-confidential school calendar. Existing Events & announcements remain separate; this release does not send notices when dates are added.

**Contact preferences** is available to guardians, including a teacher/guardian using the restricted **Family view**, under **Community → Contact preferences**. Parents may voluntarily register an international-format mobile number and give or withdraw consent for future SMS, WhatsApp and optional community updates. All external messaging preferences default to **off**; enabling future channels requires explicit acknowledgement and an E.164 mobile number. Every actual change is recorded in an account-specific consent audit. Existing account-security, admissions, fee, learning, attendance and private-message emails and the in-app Notification Centre are **unaffected**. Saving consent does **not** verify the number, enable a paid service, create a WhatsApp account or send SMS/WhatsApp. Before enabling delivery, verify provider onboarding, templates, explicit notice text, processing arrangements, consent validity, a withdrawal workflow and sender identity.

Migration `0013_academic_calendar_communication_preferences.sql` creates four new tables, preserving legacy students, invoices, DBS certificates, messages and existing `events`. No external API keys are needed. New-term dates must be entered by an authorised administrator after deployment. Consent history retention requires organisational approval; it is not automatically deleted in this version.



## Masjid website content: YouTube video library

Administrators can open **Community → Website videos** in the Madrasah portal and curate public masjid content. The portal accepts YouTube watch, Shorts, live, embed and youtu.be URLs; extracts and validates the 11-character video ID; and supports titles, categories (Khutbah, Lecture, Qur’an, Community), summaries, draft/published status, a featured item, reordering and deletion. Only admins can make changes, using existing session and CSRF checks.

The public, read-only endpoint is `GET /api/public/masjid-videos`; it returns only **published** video metadata, never portal sessions, pupil records or unapproved drafts. Video metadata lives under `masjid_public_videos_v1` in the existing `school_settings` D1 table. **No database migration is required.**

The separate Masjid website (`olaleso/masjid-at-towfiq-website`) reads this feed through its own `GET /api/public/videos` proxy, displays bespoke video cards and loads the YouTube player on demand. Changes become public automatically (typically within a minute) without rebuilding either website.

**Initial deployment:** the portal deployment GitHub Actions job is gated by the repository variable `CLOUDFLARE_DEPLOY_ENABLED` and may be skipped when no Cloudflare credentials are configured. A one-time deployment of the portal source is required before this feature is available to admins. From a local checked-out portal repository, `git pull origin main` followed by `npx wrangler deploy` deploys without any new D1 migration. For ongoing source deployments, connect this **existing** portal Worker to GitHub Builds or configure the standard GitHub Actions Cloudflare secrets; never create a duplicate Worker.

## v1.9.0 — Weekly class timetable & safe family visibility

The new **School management → Weekly timetable** screen publishes structured, recurring weekday lessons. Each lesson belongs to an existing learning class and has a weekday, UK local start/end time, subject, optional room and optional public notes. Families see only lessons in classes attended by their **active, linked pupils**; teachers see only their assigned classes; staff and administrators can view/manage the full timetable. Guardian-facing class lists are also restricted to their own pupils’ classes (fixing a pre-existing overly broad GET `/api/classes` read scope).

**Office workflow:** administrators or staff create a class under **Classes & enrolment**, then use **Weekly timetable → Add lesson**. Modify or remove individual lessons from their day cards. Filter by accessible class and use **Print timetable** for a paper copy. Classroom teacher and room names appear only when assigned. Class names, enrolment, student numbers, student records, attendance and legacy free-text `classes.schedule` are not modified by timetable changes. Unstructured existing schedules are **not automatically converted**; a staff member must enter verified weekly sessions.

**Clash prevention:** the API rejects overlaps in the same class, overlapping sessions for the same assigned teacher, and double-booking of a named room (room names compared case-insensitively). End-to-start adjacency is allowed. Changing a class's lead teacher is also checked against that teacher's other weekly sessions. 24-hour HH:MM input, Monday–Sunday weekday, sensible subject lengths, authentication, CSRF and admin/staff-only mutation are enforced server-side. The timetable expresses a **recurring pattern**, not specific term dates; consult **Academic calendar** for holidays and closures. Time zone is **Europe/London**, with local wall-clock hours. No WhatsApp, SMS or automatic email is triggered by a timetable edit.

**Migration:** additive `0014_class_weekly_timetable.sql` creates only a new timetable table and indexes. It has no destructive changes to students, fees, guardians, DBS, academic calendar or other records. Apply remote D1 migration before deploying the new Worker. Test with fictional lesson data, including family isolation and teacher/room conflict checks.
