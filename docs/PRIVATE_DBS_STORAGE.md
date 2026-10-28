# Private DBS certificate storage — v1.6.1

## IMPORTANT: perform these Cloudflare steps BEFORE deployment

The new `wrangler.jsonc` binds `env.DBS_FILES` to a **private** Cloudflare R2 bucket named `attowfiq-private-dbs`. This bucket **must exist** on the same Cloudflare account as the Worker before `npm run deploy` can succeed. Do not enable a public `r2.dev` URL or a public custom domain for this bucket.

In the same PowerShell project folder, using your existing logged-in Wrangler session:

```powershell
# Create private bucket once (if you have not already created it)
npx wrangler r2 bucket create attowfiq-private-dbs
if ($LASTEXITCODE -ne 0) { throw "Private R2 bucket creation failed" }

# Redundant automatic deletion rule; expires uploaded copies after 180 days
npx wrangler r2 bucket lifecycle add attowfiq-private-dbs dbs-180-days private/dbs/ --expire-days 180
if ($LASTEXITCODE -ne 0) { throw "R2 retention policy failed" }

# Confirm storage retention policy was installed
npx wrangler r2 bucket lifecycle list attowfiq-private-dbs
if ($LASTEXITCODE -ne 0) { throw "Could not verify R2 retention policy" }

# Once R2 exists, update the schema and Worker
git pull origin main
npm run test
if ($LASTEXITCODE -ne 0) { throw "Regression test failure" }
npm run db:migrate:remote
if ($LASTEXITCODE -ne 0) { throw "Remote database migration failure" }
npm run deploy
```

If the bucket already exists, **skip the create command** and just list it / configure its lifecycle. If you use multiple Cloudflare accounts, verify you are logged into the intended account and the bucket is created in the account shown by Wrangler.

## What the application stores

- A **minimal metadata register in D1**: active staff account, DBS level, original issue date, optional last 4 reference characters, checked-on date and the **madrasah’s policy-defined recheck due date**. DBS checks **do not have an official expiry date**.
- **In-app reminders** for admin accounts 60 days before the configured recheck date, and persistent overdue alerts until the date is updated. Warning badges appear at the Compliance nav link and in the workspace. No automatic emails or claims of staff eligibility.
- **Optional private R2 file**: a PDF, PNG or JPEG, up to 3 MB, which requires an explicit confirmation that temporary retention is necessary and lawful. Files are not stored in D1, frontend source, GitHub or Cloudflare Pages assets. Names/subject details never appear in file paths. File downloads are administrator-only, audited and served with no-store and attachment headers.
- **Two independent retention controls**: a daily Cloudflare Worker scheduled cleanup, plus an R2 bucket lifecycle policy for `private/dbs/` that expires objects after 180 days. Removal deletes the file while keeping the minimal recheck metadata. The admin can delete an uploaded copy earlier.

## Data protection and safeguarding

Disclosure and Barring Service documents may reveal criminal-offence information. Do **not** upload the certificate solely because a feature exists. Assess the correct lawful basis, necessity, information-handling rules, and retention period with the school's responsible safeguarding/data-protection personnel. DBS guidance typically recommends retaining certificate copies **no longer than necessary, usually no longer than six months**. Record the issue date and recheck date without retaining a full copy if that is sufficient. Never send the document by ordinary email.

Relevant guidance:

- [DBS checks and recheck dates — GOV.UK](https://www.gov.uk/guidance/dbs-check-requests-guidance-for-employers)
- [Handling DBS certificate information — GOV.UK](https://www.gov.uk/government/publications/handling-of-dbs-certificate-information/handling-of-dbs-certificate-information)
- [Cloudflare R2 lifecycle rules](https://developers.cloudflare.com/r2/buckets/object-lifecycles/)

## Acceptance test

Sign in as Admin, open **Compliance centre → Staff DBS checking register**. Select a fictional teacher and record the check type, issue date and a review date 30 days away. The alert should immediately show as **Due in 30 days** and appear in the navigation/workspace. A past review date should show **Overdue**; a date more than 60 days away should clear the warning. Upload a **dummy** PDF, download it, remove it, and check it cannot be accessed as a parent, teacher or ordinary office staff user.

Do not test with a real person's criminal record or DBS certificate until the school's compliance position and storage configuration are explicitly approved.
