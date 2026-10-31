# Masjid Phase 1 — reversible rollout and rollback

## Live baseline preserved
The pre-Phase-1 production Git commit is **`e5290b6864ea6ce3d525d42b1f44105f3cdcef25`** for the portal and **`853cf95ecb179bb2511d39b2671a890867e75323`** for the public masjid website.

The feature is disabled by default. New public events and announcements are **separate** from the Madrasah academic calendar and learner records.

## What's included
- Administrator creates and edits *masjid-specific* events and notices inside **Portal → Community → Website content**.
- Posts can be saved as drafts, published/unpublished or deleted.
- Event date/time/location and optional announcement expiry date.
- Published events automatically disappear from the homepage after their event date; expired notices disappear.
- Optional portal-controlled Phase 1 page experience: confirmed events, real notices, and four mobile quick-action links (prayer times, what's on, directions, donate).
- Existing prayer times, logo, gallery, YouTube integration, donation details, and Madrasah pages are untouched.

## Safe deployment order
1. Before deploying, verify tests pass for both companion PRs.
2. Deploy the portal update first from the portal repo: `git pull origin main; npm run test; npx wrangler@latest deploy`.
3. Deploy the masjid website second from `C:\App\masjid-at-towfiq-website`: `git pull origin main; npx wrangler@latest deploy`.
4. Verify `https://portal.attowfiqmasjid.org/api/public/masjid-community` returns `{"enabled":false,"events":[],"announcements":[]}`.
5. Go to **Portal → Website content**, add confirmed masjid event and notice records, mark the intended records **Publish**, and use **Enable Phase 1**.
6. Confirm `https://attowfiqmasjid.org/api/public/community` returns `"enabled":true`, then check the live What's On section on desktop and mobile.

## Instant reversal — no redeployment
In **Portal → Community → Website content**, click **Restore original site**.
The public homepage will revert to its pre-Phase-1 programme cards and remove the optional mobile shortcut bar after cached results refresh (typically up to about 30–60 seconds). All drafts/published posts are retained, and the feature can be switched back on later.

## Full code rollback
If you ever need to remove Phase 1 code (rather than just turn it off), revert the Phase 1 merge commits on both GitHub repositories and deploy the resulting main branches. Do not reset the D1 database, delete student records, or overwrite unrelated changes. The Phase 1 setting in `school_settings` remains inert when old code is deployed.

For a *temporary* redeployment of the exact pre-Phase-1 website, use a clean working copy of `853cf95ecb179bb2511d39b2671a890867e75323` rather than forcing a shared branch backward. The portal's pre-Phase-1 commit is `e5290b6864ea6ce3d525d42b1f44105f3cdcef25`.

## Security & factual safeguards
- Only portal administrators can publish, change the switch, edit or delete public masjid posts.
- Public endpoints do not expose unpublished posts, parent records, learners or DBS details.
- Data is plain text; HTML markup is rejected and public rendering uses text nodes rather than `innerHTML`.
- No automatic subscriptions, unsolicited email, unverified Jumu'ah times or fabricated event dates are introduced.
- No new D1 migration, R2 bucket, route or DNS change is required.
- Worker feed failures leave the original homepage intact.

## Suggested QA
- Toggle OFF and check original homepage, gallery and prayer times.
- Create an event as a draft: it must not appear publicly.
- Publish an event and a notice, enable Phase 1, check desktop and 375px mobile.
- Confirm expired notices and past events are hidden from the public feed.
- Switch OFF again; confirm the previous What’s On presentation returns while the saved content remains in the portal.
