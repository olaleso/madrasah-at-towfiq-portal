# Legacy student bulk import — first production intake

## Data audit (11 November 2026)
The first confidential legacy Excel roster (`AttowfiqMadrasat.xlsx`) contained **82 student rows** and 30 entirely blank separator rows.

| Field | Present in source | Missing |
|---|---:|---:|
| Student name | 82 | 0 |
| Raw date of birth | 60 | 22 |
| Guardian name | 79 | 3 |
| Guardian phone | 68 | 14 |
| Home address | 78 | 4 |
| Guardian email | 67 | 15 |

Two DOB issues require special handling:
- Original Excel row 5: embedded text DOB and Excel date serial **disagree**. The new CSV leaves DOB blank and flags verification.
- Original Excel row 109: date entered as `13/0/2019` (invalid month). The new CSV leaves DOB blank and flags verification.

Thus **24 DOBs remain blank** in the prepared CSV. Gender and assigned class were not supplied in the source and remain empty for all 82. Numeric UK mobile numbers losing an initial zero in Excel have been normalised only when they clearly match the standard 10-digit `7xxxxxxxxx` pattern. All other contact values are preserved for human review. No student date/gender/class/guardian relationship is invented.

The prepared **confidential** files are available to the user as chat downloads:
- `AtTowfiq_Legacy_Students_Import.csv` — portal-ready UTF-8 CSV.
- `AtTowfiq_Legacy_Import_Review.xlsx` — audit, priority review, instructions.

**Do not commit these private files to GitHub, attach them to a public issue, or share them outside authorised school personnel.**

## The user flow
1. Administrator goes to **School management → Legacy student import** (or Students → **Import legacy pupils**).
2. Select the prepared CSV, choose **Preview and check duplicates**, and review every line. The worker checks both row validity and possible matches to existing students.
3. Deselect existing duplicates, blocked rows and anything requiring verification before import. Missing DOB, gender, class or parent email is **allowed** and clearly flagged.
4. Type `IMPORT LEGACY STUDENTS` as the final confirmation, then click **Import selected pupils**.
5. Successful import creates active historic student entries, one historical accepted-admission record each, normal `MATT-YYYY-NNNN` registration numbers, and source provenance. The source roster row/hash prevents retry duplicates.
6. No class is assumed and no parent accounts or email invitations are created. The administrator confirms family relationships and class assignments separately.
7. Admin can complete a profile from the legacy queue. Verified linked parents can fill blank DOB, gender, phone, address, emergency contact and health/learning support fields from their child's own profile. They can explicitly record Yes/No for first-aid and activity photography consent. No consent is inferred from old missing data. Parents cannot modify existing values or another family's records.

## Security/integrity
- Admin-only import preview/commit/list; the school staff and parents cannot invoke the bulk import.
- CSV file is parsed locally in the browser, never stored as a raw blob in D1. Only selected validated records are sent to authenticated Worker API calls.
- The Worker **revalidates the selected rows** and searches for likely existing students, even if the browser preview was manipulated.
- A D1 `batch()` transaction commits allocation, pupil records, admission linkage, and import provenance atomically. Failure rolls back the batch; a retry of the exact source file skips already imported source rows.
- The existing `POST /api/students` and `POST /api/students/bulk` bans remain intact for ordinary manual student creation.
- No auto parent invitation, photo/first-aid consent, invoice, payment, attendance, homework or behaviour record is created. Existing admissions consent declarations are not fabricated (`parent_confirmed=0`). Explicit consents remain nullable/unknown in the new legacy provenance table until a linked guardian or administrator records an answer.
- Parent edits are restricted by linked-child role check and only allowed on previously blank fields, including health/learning support and emergency contact. A prior explicit consent cannot be changed by a parent without office review. Guardian email changes require admin verification and cannot be changed after a parent account is linked through this profile editor.
- Uploaded CSV is **not** sent to GitHub, an external AI service, or an email provider.

## Deploy (PowerShell)
**Do not deploy until a fresh D1 backup or Time Travel recovery point has been verified.** The schema change is additive.

```powershell
cd C:\App\Madrasah-At-Towfiq-Portal\madrasah-at-towfiq-portal
git pull origin main
npm run test
npx wrangler@latest d1 time-travel info attowfiq_portal
npx wrangler@latest d1 migrations apply attowfiq_portal --remote
npx wrangler@latest deploy
```

The migration is `0018_legacy_student_import_records.sql`. It introduces a new tracking table/index only, without modifying existing pupil records. The migration is prerequisite to the deployed import Worker.

After deployment, **select the CSV in the administrator page and preview before committing**. GitHub merges and Cloudflare deploys do not import real students by themselves. The live database has not been modified by development.

## Verification
- Admin import page loads and parses the prepared 82-row CSV.
- Preview shows missing DOB/gender/class/parent fields, and the source row warning for rows 5 and 109.
- Possible duplicate rows are blocked until excluded; the user must type the exact confirmation.
- After actual import, verify the created count, unique registration numbers, correct phone formats and blank unknown fields.
- Verify the Parents & guardians page: no automatic family invitations; confirm each guardian identity before **Link & notify**.
- Assign classes explicitly and verify capacity.
- Test a linked parent can fill an empty contact or DOB field, provide previously absent health/learning support, and explicitly choose Yes or No to first-aid/photography consent. Verify other guardians cannot read or modify those details, and parents cannot overwrite pre-existing values.

## Rollback and data retention
The UI/API can be reverted by reverting the feature PR merge commit and redeploying. **Do not drop the import tracking table**; it records which source rows were imported and protects against duplication.

After a real import, do not roll back the entire live D1 database without assessing other records created afterward. If an import must be undone, the school's administrator should review each imported pupil and related records under the approved data-correction policy before any deletion. Never delete active pupil records automatically as part of a rollback.

## Correcting the first batch
Rows **5 and 109** need DOB verification. Address disagreements between members of a family should not be overwritten by assumptions; check the source/guardian. All missing information should be requested through approved guardian contact and verified before updating the official register.
