CREATE TABLE IF NOT EXISTS commissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Pending',
    contact_method TEXT NOT NULL DEFAULT 'email',
    contact_handle TEXT NOT NULL DEFAULT '',
    reference_urls TEXT NOT NULL DEFAULT '[]',
    webhook_message_id TEXT,
    status_token TEXT UNIQUE,
    time TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_time ON commissions(time);
CREATE UNIQUE INDEX IF NOT EXISTS idx_commissions_status_token ON commissions(status_token);
