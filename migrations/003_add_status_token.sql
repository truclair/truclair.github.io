ALTER TABLE commissions ADD COLUMN status_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_commissions_status_token ON commissions(status_token);
