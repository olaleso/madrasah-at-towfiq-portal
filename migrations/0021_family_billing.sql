-- Family billing. Student fees and payment history remain the source of truth.
CREATE TABLE IF NOT EXISTS family_invoices (
 id TEXT PRIMARY KEY,
 guardian_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 period TEXT NOT NULL,
 invoice_number TEXT NOT NULL UNIQUE,
 due_date TEXT,
 created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(guardian_id,period)
);
CREATE INDEX IF NOT EXISTS idx_family_invoices_guardian_period ON family_invoices(guardian_id,period);

CREATE TABLE IF NOT EXISTS family_invoice_lines (
 invoice_id TEXT PRIMARY KEY REFERENCES fee_invoices(id) ON DELETE RESTRICT,
 family_invoice_id TEXT NOT NULL REFERENCES family_invoices(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_family_invoice_lines_family ON family_invoice_lines(family_invoice_id);

-- One family payment is allocated to existing student ledger payments.
CREATE TABLE IF NOT EXISTS family_payment_batches (
 id TEXT PRIMARY KEY,
 family_invoice_id TEXT NOT NULL REFERENCES family_invoices(id) ON DELETE RESTRICT,
 amount_pence INTEGER NOT NULL CHECK(amount_pence>0),
 method TEXT NOT NULL,
 reference TEXT NOT NULL DEFAULT '',
 request_key TEXT NOT NULL UNIQUE,
 recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS family_payment_allocations (
 payment_id TEXT PRIMARY KEY REFERENCES payments(id) ON DELETE RESTRICT,
 batch_id TEXT NOT NULL REFERENCES family_payment_batches(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_family_payment_allocations_batch ON family_payment_allocations(batch_id);

-- Email delivery is decoupled from fee creation to avoid rate-limit losses.
CREATE TABLE IF NOT EXISTS family_invoice_email_queue (
 family_invoice_id TEXT PRIMARY KEY REFERENCES family_invoices(id) ON DELETE CASCADE,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed')),
 attempts INTEGER NOT NULL DEFAULT 0,
 last_error TEXT NOT NULL DEFAULT '',
 sent_at TEXT,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_family_invoice_email_queue_status ON family_invoice_email_queue(status,attempts,updated_at);

-- Protect the existing student ledger against concurrent or misplaced payments.
CREATE TRIGGER IF NOT EXISTS trg_fee_payments_guard
BEFORE INSERT ON payments
BEGIN
 SELECT CASE WHEN NEW.student_id <> (SELECT student_id FROM fee_invoices WHERE id=NEW.invoice_id)
   THEN RAISE(ABORT,'Payment must belong to the invoiced student') END;
 SELECT CASE WHEN NEW.amount_pence >
   (SELECT f.amount_pence-COALESCE((SELECT SUM(p.amount_pence) FROM payments p WHERE p.invoice_id=f.id),0)
    FROM fee_invoices f WHERE f.id=NEW.invoice_id)
   THEN RAISE(ABORT,'Payment exceeds the invoice balance') END;
END;
