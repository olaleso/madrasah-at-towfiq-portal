# Public Masjid contact page and private enquiry inbox

## Visitor experience
All general and service-specific enquiry links on `attowfiqmasjid.org` lead to `/contact/` instead of launching an email application. Service topics are preselected using a safe query parameter:

- `/contact/?topic=nikah` — Nikah
- `/contact/?topic=counselling` — Counselling
- `/contact/?topic=funeral` — Funeral enquiries
- `/contact/?topic=sheikh` — Scholar requests
- `/contact/?topic=volunteering` — Volunteering
- `/contact/` — General enquiries

Visitors can supply their name, email, optional telephone number, topic, and message and explicitly agree that the masjid may use those details for follow-up. They see a reference after a confirmed D1 write. A successful submission **does not** promise a booking or an email acknowledgement.

## Staff response
Portal administrator → **Community → Website content → Masjid website enquiries**. The secure inbox shows sender details, category, message, time, internal notes and the current status. Use **New**, **In progress**, or **Closed** for tracking. Closing does not automatically email the visitor: the team follows up using approved communication channels.

No application, pupil, guardian, DBS or attendance records are used for masjid website enquiries.

## Security & privacy
- Public intake `/api/public/masjid-enquiries` is restricted to the masjid's official origins, checks a honeypot and a minimum form-fill duration, validates all fields and enforces daily counters on a one-way hash of IP/email.
- The public response contains only success and a non-identifying reference; only admins can retrieve individual messages. Text is HTML-escaped in the admin UI.
- The contact page advises visitors not to submit sensitive information and to phone for urgent funeral matters.
- Messages remain in D1 until an approved retention policy is implemented; administrators should establish a retention policy before collecting live data at scale.
- There is no auto-email, SMS or WhatsApp promise, and no use of the admissions email address.

## Deployment — important order
1. Refresh Wrangler authentication if required and confirm D1 recovery/bookmark or backup.
2. Pull the portal repository; run `npm run test`.
3. Run `npx wrangler@latest d1 migrations apply attowfiq_portal --remote`. The additive migration `0017_masjid_contact_enquiries.sql` must pass.
4. Run `npx wrangler@latest deploy` from the portal repository.
5. Pull the Masjid website repository and run `npx wrangler@latest deploy`.
6. Verify `https://attowfiqmasjid.org/contact/` loads, and test one controlled message (not real personal data) before public use. Check the portal's private Website Content inbox, update its status, then delete the test record only using approved administrative retention procedures.

## Rollback
Revert the corresponding GitHub merge commit for the Masjid website and redeploy to restore the old enquiry links. Revert the portal merge if required. Keep the additive D1 table for auditability; **do not drop the table or roll back the whole database**, as that could destroy legitimate messages and unrelated student changes.
