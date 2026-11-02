# Guardian leave requests & absence notifications

## User flow
1. A linked guardian signs into the portal (or selects **Family view** if they are also staff).
2. From the family dashboard, or **Community → Leave & absence**, select the enrolled child.
3. Choose **Absence notification** or **Request leave / permission**, start/end dates, reason and optional brief explanation.
4. Submit; the request is stored as **Pending review** in a private queue. It is **not** automatically approved, excused or marked absent.
5. Admin/staff review under **Leave & absence**. They can **Acknowledge** a reported absence, **Approve** leave or **Decline** either, including an optional guardian-facing response.
6. Guardian receives a private in-app update and can see the outcome on the same page. Pending requests can be withdrawn, notifying staff.
7. Teachers see the requests for their assigned classes, but cannot approve or amend them.

## Important safeguards
- A guardian may submit only for an **active** pupil currently linked by `students.parent_id`. No arbitrary child ID or user-selected recipient is trusted.
- Office staff see the review queue. Teachers are restricted to their own classes.
- No confidential medical history is required. The optional details field is limited to 500 characters; avoid sensitive health details.
- Date range: 1–30 calendar days, beginning no earlier than 60 days before today and no later than 365 days into the future. Existing active overlapping requests are blocked.
- Staff decisions generate a notification to the currently linked guardian; submissions and withdrawals notify currently active admin/office staff and the assigned class teacher.
- Uses existing private `attendance` notification type and target, with a **Leave & absence** link prominently visible in the attendance page. This avoids rebuilding the existing notification table.
- Submissions **never modify the attendance register**, even after approval; staff record attendance separately on lesson days.
- Child deletion cascades related leave requests; user deletion retains the student's leave history but nulls the removed actor references.

## Deployment steps (PowerShell)
The portal currently requires manual Cloudflare deployment. This feature includes one additive migration.

```powershell
cd C:\App\Madrasah-At-Towfiq-Portal\madrasah-at-towfiq-portal
git pull origin main
npm run test

# Store backups OUTSIDE the Git repository.
New-Item -ItemType Directory -Force C:\App\Attowfiq-Backups | Out-Null
npx wrangler@latest d1 export attowfiq_portal --remote --output C:\App\Attowfiq-Backups\attowfiq-before-leave-requests.sql

# Add the new table and indexes, without changing existing records.
npx wrangler@latest d1 migrations apply attowfiq_portal --remote

# Deploy only after successful migration.
npx wrangler@latest deploy
```

If a remote backup fails, **do not proceed with the migration until a usable backup is available**. Do not paste private student data or database exports into a public chat.

## Smoke-check after deployment
- Admin opens **Leave & absence** and sees the queue, initially empty.
- A parent submits a single-day absence for their own pupil, sees Pending, and admin gets a private notification.
- Admin acknowledges; parent sees Acknowledged, with optional response.
- Parent submits a future leave request; admin approves or declines.
- Confirm the normal attendance register is unchanged until staff marks attendance.
- Test a Family-view account and a teacher assigned to that child's class.
- Never send a test submission for a real child without parent approval; use controlled test data.

## Rollback
The change is deliberately isolated to a new table, API handler, UI page and styles. To disable it after deployment, revert the feature's Git merge commit and deploy the reverted Worker. The additive database table can remain unused; **do not drop it** during rollback, as it may contain parent submissions and an auditable history. Keep a D1 backup before any future schema removal.

There is no new external SMS, WhatsApp or email delivery in this release; notifications are the portal's existing private in-app alerts.
