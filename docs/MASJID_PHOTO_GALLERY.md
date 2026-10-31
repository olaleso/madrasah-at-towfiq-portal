# Masjid At-Towfiq photo gallery

The public website at https://attowfiqmasjid.org/#gallery now reads approved photo metadata through its own Worker proxy, using the existing portal database. **No student, guardian or DBS records are exposed.**

## Publish the first image

1. Deploy the latest portal Worker and static assets (the GitHub Actions deployment workflow is deliberately gated by `vars.CLOUDFLARE_DEPLOY_ENABLED == 'true'`; a skipped deployment does not mean the changes are live).
2. Log into https://portal.attowfiqmasjid.org/ as an administrator.
3. Open **Website content → Life at Masjid At-Towfiq · Gallery**.
4. Select the edited *authentic* masjid photograph; supply a useful title and accessible description.
5. Confirm publication rights, select **Publish immediately** and **Use this as the homepage photo**, then upload.
6. Check https://attowfiqmasjid.org/#gallery and the hero on https://attowfiqmasjid.org/.
7. Test the lightbox on mobile and desktop. The featured photo may take up to approximately two minutes to propagate through public caches.

## Access controls

- Admin only: uploading, viewing private drafts, publishing, unpublishing, featuring, reordering and deleting images.
- Public: only published photographs and their brief descriptions. Drafts have no public image access.
- Each image is converted by the browser into a metadata-free JPEG before upload.
- Source uploads must be JPEG, PNG or WebP and under 12 MB; the processed JPEG must be no larger than 250 KB.
- Maximum 12 photographs in this initial, database-backed implementation.
- Original images are not placed in the repository and private staff DBS storage is never used.
- No extra D1 migration or R2 bucket is required: photos are stored in existing `school_settings` rows, with separate keys for metadata and image bytes.

## Operating notes

Collect permission for identifiable people before uploading. Avoid photos identifying children without appropriate parent/guardian permissions. Review photographs for incorrect or AI-altered building signage. The genuine photograph should be preferred over an AI recreation when depicting the actual masjid. Keep copies of source images offline because deleting a gallery image permanently removes its stored copy.

For future growth beyond 12 images, migrate media bytes to a separate public-gallery R2 bucket; do not mix public photos with the private DBS R2 bucket.

## Local deployment (PowerShell)

From the portal repository:

```powershell
git pull origin main
npm run test
npx wrangler@latest deploy
```

The site repository runs a GitHub validation workflow; its Cloudflare build/deployment is configured separately. In the website repo, `npx wrangler@latest deploy` can publish the Worker and static assets when the linked Cloudflare account credentials are available.
