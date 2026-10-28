# Madrasah At-Towfiq — One-Time GitHub and Cloudflare Setup

## Why the admin account will persist

The **local** `npm run preview` uses a persistent user-level SQLite file, not ephemeral memory. Keep `%LOCALAPPDATA%\MadrasahAtTowfiq\portal-preview.sqlite` and its sibling files when upgrading. On **Cloudflare**, the live admin and pupil records are stored in D1 independently of the code. **Never recreate or delete your existing database just because the code changes.**

## 1. Commit/push to your dedicated GitHub repository

This ZIP contains a `.git` directory with a local commit. You can also use the included Git bundle backup. Create a **new private** GitHub repository in your GitHub account named `madrasah-at-towfiq-portal`, with **no automatic README or licence**. Don't push real school pupil data. In PowerShell, from the project folder:

```powershell
# Run once to connect to the new repository
 git remote add origin https://github.com/olaleso/madrasah-at-towfiq-portal.git
 git branch -M main
 git push -u origin main
```

If `origin` already exists, use `git remote set-url origin https://github.com/olaleso/madrasah-at-towfiq-portal.git`. If GitHub asks for authentication, sign in with your Git Credential Manager/browser. GitHub may reject pushing unless you have created the repository and have write access. For **future fixes** commit/push from the same folder rather than replacing your project directory; pull new patches into that working copy.

## 2. One-time Cloudflare database setup

In PowerShell from the repo folder:

```powershell
npm install
npx wrangler login
npx wrangler d1 list
```

If you **already have** a D1 database called `attowfiq_portal`, **reuse its exact ID**. Otherwise create one once:

```powershell
npx wrangler d1 create attowfiq_portal
```

Copy the resulting `database_id` into `wrangler.jsonc` in place of the `00000000-0000-0000-0000-000000000000` placeholder. Never commit a fake ID, never delete the real D1 database to fix deployment. The D1 identifier may be safely stored in the project configuration.

Apply migrations (schema changes preserve existing records) and configure first-admin bootstrap secret:

```powershell
npm run db:migrate:remote
npx wrangler secret put SETUP_KEY
npm run deploy
```

For the first `SETUP_KEY`, enter a long unique random string (32+ characters) you keep private. Do not paste it into source code or public chat. Cloudflare prints your `workers.dev` URL after deploying. The public service will start with **no student data**. Create the live admin **once**, then sign in using the same credentials on all subsequent deployments. If a live admin already exists, sign in normally; do not rebootstrap.

### Future releases

From the SAME repository, after testing the new code:

```powershell
npm install
npm run test
npm run db:migrate:remote
npm run deploy
```

Cloudflare D1 stores your database independently from Wrangler code deployments. `npm run deploy` does **not** reset the admin account. Back up D1 before significant schema changes. Never use `wrangler d1 delete`, `DROP TABLE`, or recreate the database in an upgrade script.

## 3. Optional GitHub Actions automatic deployments

The `.github/workflows/deploy-cloudflare.yml` file uses `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as **GitHub Actions repository secrets**. The API token requires appropriately scoped Workers Scripts and D1 edit permissions. Add them in the private repo's GitHub Settings → Secrets and variables → Actions, then set the GitHub Actions repository variable `CLOUDFLARE_DEPLOY_ENABLED` to `true` (Settings → Secrets and variables → Actions → Variables). The workflow is disabled until this flag is explicitly enabled. Every subsequent push to `main` can apply additive migrations and deploy new Worker code while retaining D1 data.

Set a Cloudflare Worker secret `SETUP_KEY` with Wrangler at least once, on initial manual deployment. Worker runtime secrets remain across code deploys; don't put their plaintext in GitHub.

## Security boundary

The local preview is bound to 127.0.0.1 and must never be publicly exposed. Before accepting actual UK children's details, complete the safeguarding and UK GDPR reviews, backup/restore tests, operational monitoring, permission testing, access reviews, data-processing agreements, and resilience/recovery validation. A working authenticated prototype is not production security certification.

## v1.0.7 migration

Before deploying v1.0.7, from the existing checked-out project run:

```powershell
git pull origin main
npm run test
npm run db:migrate:remote
npm run deploy
```

The new migration adds optional medical, allergy and learning-support fields and separate, initially-unselected consent flags to admissions. It does not delete historic fields or data. Do not recreate the D1 database, reset the SETUP_KEY or recreate the admin account.

## v1.0.9 upgrade note

**This version renumbers the visible student registrations** to MATT-YYYY-NNNN using an additive D1 migration. Preserve a SQL backup first. Do not delete/recreate the D1 database. Apply migration 0005 before deploying the updated Worker; it creates the sequential-number counter. The migration intentionally replaces previous AT-format public registration numbers, but keeps internal student UUIDs and all linked records.

```powershell
npm run test
npx wrangler d1 export attowfiq_portal --remote --output "$env:USERPROFILE\\attowfiq-pre-v109.sql"
npm run db:migrate:remote
npm run deploy
```


## v1.0.10 repair

Migration `0006_fix_decimal_student_year.sql` repairs any student numbers erroneously stored as `MATT-2026.0-0001` (SQLite REAL-year formatting), without changing student IDs. The Worker now uses `printf('%04d', ?)` to ensure the year is consistently a four-digit integer. Keep the original database. Do not deploy if `npm run test` fails; confirm the D1 export exists first.


## v1.0.12 automated guardian invitation setup

To email parents automatically upon accepting an admission, configure `EMAIL_FROM` in `wrangler.jsonc` with a verified Resend sending domain and set the Worker secret with `npx wrangler secret put RESEND_API_KEY`. The default `notifications@example.org` is a placeholder and cannot send. A successful admission may still succeed even when email delivery is unavailable; in that case, staff receive the one-time invitation URL for secure sharing and can retry from **School management → Parents & guardians**. Verify consent, email and guardianship before activating real parent accounts.


## v1.0.13 official email identities (attowfiqmasjid.org)

The Worker config now sets `EMAIL_FROM` to `Madrasah At-Towfiq <notifications@attowfiqmasjid.org>` and `ADMISSIONS_EMAIL` to `admissions@attowfiqmasjid.org`. Guardian activation invitations use `Reply-To: admissions@attowfiqmasjid.org`. This config is **not sufficient for delivery**: verify the domain's *sending* capability in Resend, install the `RESEND_API_KEY` secret with `npx wrangler secret put RESEND_API_KEY`, and set up **Cloudflare Email Routing** to forward `admissions@attowfiqmasjid.org` to a separately verified destination inbox. Do not paste secrets into GitHub, chat or wrangler.jsonc. Configure and test the incoming admissions route before sending real guardian invitations so replies do not bounce. Keep Cloudflare's inbound MX records at the apex and apply only the precise DNS records Resend shows for SPF/DKIM/return-path (typically at the send subdomain); do not add competing MX records at the root. Once configured, run `npm run test` and `npm run deploy`. No D1 migration or account reset is needed.


## v1.0.14 branded guardian invitations

Run `git pull origin main`, `npm run test`, then `npm run deploy`. No database migration is needed. The parent invitation email loads the existing public logo at `https://portal.attowfiqmasjid.org/assets/at-towfiq-madrasah-logo.png`, uses a secure activation URL on the official portal, and sets Reply-To to `admissions@attowfiqmasjid.org`. Verify that this reply address can receive email before inviting real families. The responsive confirmation modal allows manual correction of the preferred first name without changing the original admission record. Check an actual Gmail/Outlook delivery after deployment.

## v1.0.15 application acknowledgement

After applying the code with `git pull origin main`, run `npm run test` followed by `npm run deploy`. New submissions entered through **Admissions → New application** trigger a styled acknowledgement sent using `notifications@attowfiqmasjid.org`, with `Reply-To: admissions@attowfiqmasjid.org`. Test with a fictional child and an email inbox you control. Verify the guardian receives an **application received** message with a reference, not an acceptance message; then edit the application and verify the acknowledgement is not resent. The provider may accept a message without guaranteeing final inbox delivery, so check real inboxes and provider logs. Failed email delivery never invalidates the newly saved application. The current admissions form is staff-only, not yet public self-service.


## v1.0.16 parent learning notifications

Run `git pull origin main`, `npm run test` and `npm run deploy` (no D1 migration). Verified Resend sending and Worker `RESEND_API_KEY` must remain configured. Create fictional homework and a positive and negative behaviour event to an authorised test guardian, then verify exactly one email per new record, including due date/points and a link to `https://portal.attowfiqmasjid.org/`. Resend status `sent` means the provider accepted the message, not proof the final mailbox received it. Check email logs and spam filtering. These events are separate from the application-received and acceptance invitations already implemented.

## v1.0.17 — Admin interface confirmation refresh

This is a client UI-only change. Pull from main, run the full smoke tests, then redeploy the existing Worker. No D1 migration or database backup beyond your normal deployment safeguards is required. After deployment, hard-refresh your browser and try changing an admission status to `Accepted`: a branded madrasah dialog appears instead of Chrome's default prompt. Test Cancel and ensure status remains unchanged. For any student deletion, **do not** complete deletion on live records; only verify the dialog requires typing `DELETE` and cancel it. Test the invoice and broadcast confirmations without sending a real invoice/broadcast by cancelling.


## v1.1.0 Family Learning Hub and personalised correspondence

Code-only deployment; no database schema changes. The parent dashboard now summarises already-scoped records (pupils, attendance, behaviour, homework, fees, announcements), and all pupil-related email HTML identifies the student's full name, not just the first name. New confirmation messages and portal messages retain server-side scope checks. Deploy with:
```powershell
git pull origin main
npm run test
if ($LASTEXITCODE -ne 0) { throw "Tests failed. Do not deploy." }
npm run deploy
```
Sign in as an existing test parent and confirm only their linked children appear. Validate a test admission invite, assignment, points credit/debit, and linked portal message. Avoid sending real safeguarding details or medical data in test messages.

## v1.1.1 – Immediate parent linking and dual-role staff accounts

Before deploying, run `git pull origin main` and `npm run test`. With a verified Resend sender still configured, deploy using `npm run deploy`. No D1 migrations are needed.

1. Create a *fictional* admission with a new guardian email you control. On acceptance, the guardian is linked immediately; an activation email should arrive and the user becomes Active only after following the link.
2. Test accepting a fictional pupil whose guardian email is associated with an existing **teacher** account. The pupil links to the same account, and a **linked-to-your-account** notification is sent, not a password reset. On next login/refresh, the teacher sees a **Family view** switch; check that family mode exposes only their child, and staff mode retains teaching permissions.
3. For historical unlinked accepted pupils, open **Parents & guardians → Link & notify** once, after verifying the recorded email and guardian identity. Do not use a different email to evade the unique account rule.
4. If a pupil has a *different* guardian already linked or an account was deliberately deactivated, the system requires manual review. Avoid exposing pupil records without verification.

No D1 migration, admin reset, student re-enrolment, new secret or duplicate account is required. Email provider acceptance is not final inbox-delivery confirmation.

## v1.1.2 — Fix misleading guardian-already-linked warning

Pull `main`, run `npm run test`, and deploy with `npm run deploy`. No database migration or reset is needed. To verify, use a **fictional second application** with an email matching a test parent who already has an active account. Acceptance should enrol/link without creating another user or changing the password; a linked-account confirmation is emailed. If Resend fails, enrolment still succeeds with an email-status warning instead of an enrolment error. Re-accepting an already-enrolled application should not resend an email.

## v1.2.0 — Mandatory class assignment and secure password recovery

Run `git pull origin main`, `npm run test` (must PASS), then `npm run deploy`. No D1 migration or database recreation required.

1. Create the appropriate classes in **School management → Classes & enrolment** before approving pending admissions. Class name, stage, teacher and capacity can be configured there.
2. In **Admissions**, choosing **Accepted** now opens the branded confirmation with a **required class selector**. Full classes are unavailable. If no classes exist, create one first. This writes the selected class into the pupil's student record atomically with enrolment; existing guardian linking and notification continue as before.
3. Use **Students → Assign class** or **Classes & enrolment → Manage pupils** to allocate previously accepted pupils currently marked Unassigned. No automatic class inference is performed, and prior student records are preserved.
4. Test **Forgot password?** on the login page using an active *test account* whose email inbox you control. Confirm the branded email arrives from `notifications@attowfiqmasjid.org`, the one-use 30-minute link opens the official portal, mismatched passwords are rejected and a successful reset signs out other sessions. A pending invitation account should activate its account instead of using recovery.

The backend uses the existing verified Resend `RESEND_API_KEY`, email sender and admissions reply-to. No additional API key or email domain is needed. For live verification, use only accounts and inboxes you control.

## v1.3.0 — Family fees & receipts

Code-only upgrade. From the Cloudflare-connected PowerShell project folder:
```powershell
git pull origin main
npm run test
if ($LASTEXITCODE -ne 0) { throw "Tests failed. Do not deploy." }
npm run deploy
```
Use a guardian email you control to create an individual test invoice. A branded new-invoice notice should arrive. Record a small manual test payment and confirm the receipt email describes the recorded payment and remaining balance. From **Fees & payments**, use **Send statement** to test a manual reminder for an outstanding invoice. A settled invoice must not be sent a balance reminder. Check the parent's own fee account for accurate paid/outstanding amounts and due-date badges. Avoid sending financial reminders to real families until account balances and guardian links are confirmed. Bulk invoice creation continues to be independent of outbound email; send statements individually if follow-up is needed. Email provider acceptance does not guarantee final inbox delivery, and these notices do not charge a payment method.


## v1.4.0 — Attendance register + one-time guardian absence notices

This release **requires applying migration 0007** before using the new code. Take an appropriate D1 recovery point. No records are deleted or reset.

```powershell
git pull origin main
npm run test
if ($LASTEXITCODE -ne 0) { throw "Tests failed. Do not migrate or deploy." }
npm run db:migrate:remote
if ($LASTEXITCODE -ne 0) { throw "Migration failed. Do not deploy." }
npm run deploy
```

After deployment, first verify class filtering and manual register saves. The guardian notice checkbox is OFF by default and available only for the current Europe/London day. Use a fictional pupil/guardian inbox to confirm one absence notice without medical or private attendance notes; repeat the save and confirm no duplicate email. Failed Resend delivery cannot undo the recorded attendance. Retrying a failed email is not automatic, to avoid duplicate notices. Production sender must already be configured.

## v1.5.0 — Classroom and family progress reports

1. Confirm the previous version and take a production D1 recovery point.
2. Pull `main` and run `npm run test` locally.
3. Apply **pending** migration `0008_pupil_progress_reports.sql` using `npm run db:migrate:remote`. Inspect the migration status; do not recreate the database.
4. Deploy with `npm run deploy` only after the migration succeeds.
5. With fictional test pupil accounts, check teacher classroom scope, report drafts, explicit publication, parent visibility, unpublishing and assigned-teacher isolation. Publishing does **not** send an email automatically.

```powershell
git pull origin main
npm run test
if ($LASTEXITCODE -ne 0) { throw "Tests failed; deployment cancelled." }
npm run db:migrate:remote
if ($LASTEXITCODE -ne 0) { throw "D1 migration failed; deployment cancelled." }
npm run deploy
```
