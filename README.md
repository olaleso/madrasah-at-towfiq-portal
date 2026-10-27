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