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
