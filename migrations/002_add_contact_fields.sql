ALTER TABLE commissions ADD COLUMN contact_method TEXT NOT NULL DEFAULT 'email';
ALTER TABLE commissions ADD COLUMN contact_handle TEXT NOT NULL DEFAULT '';
