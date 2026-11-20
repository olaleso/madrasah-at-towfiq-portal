# Private saved Nikah certificates — Madrasah At-Towfiq

## Overview
Marriage Certificate Studio can save a generated **A4 PDF** with the groom,
bride, two witness names and Authorised Imam/Officiating Registrar, then search,
download or remove the saved copy. The mosque seal and certificate template
are rendered into the PDF before saving.

**Saving is not automatic**: an administrator must generate the certificate,
confirm authorised retention, then click **Save certificate securely**.
No parent, teacher, staff or anonymous user can list, store, download, or
delete saved certificates. The live certificate template itself remains
separate from generated documents.

## Storage and privacy
- PDF bytes: the existing private Cloudflare R2 binding `DBS_FILES`,
  **strictly separated by object key** `private/marriage-certificates/<uuid>.pdf`
  from `private/dbs/`. The file is never placed in public Cloudflare Pages
  assets and is not exposed by a public, unauthenticated URL.
- Search metadata: D1 table `marriage_certificates`, containing both parties'
  names, witness names, officiant, dates, mahr, reference number, private
  object key and a deletion marker. The list API returns only reference,
  parties' names, dates and saved timestamp—**not** the private R2 key.
- Auth: the existing signed-in admin session. Writing and deletion require
  CSRF protection. Download uses the authenticated, same-origin GET route
  and responds with `Content-Disposition: attachment` and
  `Cache-Control: private, no-store`.
- File upload: the portal sends the already-rendered PDF as multipart data.
  The server verifies its PDF header and EOF trailer and enforces a 3 MiB
  maximum. A unique request key prevents duplicate saves on network retry.
- Deleting a saved copy removes the private R2 PDF, hides it from the active
  list, and keeps a minimal audited deletion record in D1.

**Retention:** The application does not impose an automatic expiry on
saved marriage certificates. The masjid should adopt an approved records
retention policy and use the admin Delete copy action when appropriate.
Check any bucket-wide R2 lifecycle rules: a bucket rule for all objects could
also remove these certificates, so limit DBS expiry rules to the `private/dbs/`
prefix. D1 backups alone do **not** include R2 PDF data.

## Deployment
1. Make a fresh D1 backup, and ensure that the private R2 bucket is also
   backed up appropriately.
2. Pull latest GitHub `main`; run `npm test`.
3. Apply the new D1 migration:
   ```powershell
   npx wrangler d1 migrations apply attowfiq_portal --remote
   ```
   It will apply `0022_saved_marriage_certificates.sql` if previous migrations
   have already been applied.
4. Run `npx wrangler deploy`. No additional bucket or Cloudflare binding is
   needed: the existing private `DBS_FILES` binding is used.

## Administrator use
Open **Community → Marriage Certificates**, enter required details, generate,
confirm retention and click **Save certificate securely**. The portal shows a
reference such as `MAT-NIK-2026-ABC12345`. Use **Saved marriage certificates**
at the bottom of the page to search by reference, groom or bride and download
the original PDF. Each separate saving action creates an immutable PDF
record; changing names or dates and generating a new certificate does not
overwrite previously saved PDFs.

Deletion requires confirmation of the exact certificate reference and cannot
be reversed through the portal. Old certificates generated before this
feature was deployed are not automatically imported into the archive.
