# Family Billing & Payments — Madrasah At-Towfiq

## Purpose
A guardian with multiple pupils receives **one invoice per billing month**, with a
separate fee line for each child. The existing per-pupil ledger remains the
source of truth, and payments are still traceable to individual pupils.

This feature does **not** collect payment online. Stripe and GoCardless remain
unconnected. It records payments received manually by the Madrasah.

## Deployment
1. Take a **fresh production D1 export/backup** before the migration.
2. Pull the latest `main` branch.
3. Run `npm ci` and `npm test`, including `family-billing.test.mjs`.
4. Apply `0021_family_billing.sql` on the production D1 database with Wrangler.
5. Deploy the Worker and static assets.
6. Confirm the **Fees & payments → Family billing & statements** panel appears.

The migration introduces:
- `family_invoices`: one issued family document per guardian/month
- `family_invoice_lines`: links to existing `fee_invoices`
- `family_payment_batches` and `family_payment_allocations`: link one
  family payment to child-ledger payments without duplication
- `family_invoice_email_queue`: retryable consolidated email delivery
- `trg_fee_payments_guard`: prevents a payment being attributed to the wrong
  pupil or exceeding the remaining charge.

It does not delete, backdate or overwrite historical fees/payments.

## Administrator workflow

1. Open **School management → Fees & payments**.
2. Under **Family billing & statements**, click **Create family invoices**.
3. Select **One family**, **Selected families**, or **All verified families**.
   The list is derived from active pupils whose linked guardian has an active
   account and has set a password. Missing/unverified guardians are excluded.
4. Choose the billing month, the default per-student charge (initially £30),
   and the due date. When billing **one family**, individual pupil amounts
   can be adjusted to reflect an approved discount.
5. Review the confirmation and issue. The portal creates a family header and
   child charges that are missing; it *reuses* any existing charges for the
   same pupil/month and does not alter previously entered fees or payments.
6. Click **Send pending family invoice emails** to send up to six queued
   messages at a throttled pace. The daily scheduled Worker continues
   processing queued items; already accepted messages are not resent.
7. Open a family statement and use **Record family payment**. A single
   payment is allocated to the oldest outstanding child charges (by due date)
   and generates **one family receipt email**. Request IDs prevent double
   payments caused by browser retries.
8. Use **Email family statement** for a consolidated reminder and **Download
   PDF** for a branded multi-page A4 document.

## Parent experience

A parent sees only the charges for pupils currently linked to their account.
Charges are grouped by guardian and month. Opening a statement displays the
child-by-child breakdown, total paid, balance, due date and family payment
history. A PDF can be downloaded without sending personal records to a
third-party document-generation service.

Existing historical student invoices show up automatically as grouped
**family statements**, without requiring re-issue. When an administrator
formally issues that month as a family invoice, existing charges are linked
to the new family header without being recreated.

## Safety and reconciliation

- Guardian grouping uses the internal `parent_id`, **not email or surname**.
- Unlinked pupils and unactivated guardians need manual verification.
- If a pupil's linked guardian changes after a family invoice is issued,
  the system blocks payment and email actions on the affected formal invoice
  until an administrator reviews it. Parent access remains scoped to the
  *current* verified child relationship.
- Existing receipts, allocations and audit history remain intact.
- Amounts are stored in integer pence; staff can set zero-fee lines only
  when explicitly overriding an individual fee.
- A payment cannot exceed the family balance or an individual child balance.
  Database triggers also enforce this in concurrent update situations.
- Sending an email is a separate action from saving the invoice/payment.
  Email failure does not roll back the ledger.
- There is no automated family discount. A sibling discount policy should be
  approved separately before introducing automatic discounts.
- The original student-level fee ledger is retained under the expandable
  **Detailed student invoice ledger** for administrative reconciliation.

## Read-only verification

```powershell
npx wrangler d1 execute attowfiq_portal --remote --command "SELECT period,COUNT(*) AS families FROM family_invoices GROUP BY period ORDER BY period DESC;"
npx wrangler d1 execute attowfiq_portal --remote --command "SELECT status,COUNT(*) AS total FROM family_invoice_email_queue GROUP BY status;"
```

### Caveat
Sent email status means the provider *accepted* the message, not proof the
guardian received it. Investigate bounced/rejected recipients through the
provider event dashboard and the `email_log` table.
