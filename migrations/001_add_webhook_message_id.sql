-- Add webhook message ID for Discord notification cleanup on delete.
-- Safe to re-run only if the column does not already exist.
ALTER TABLE commissions ADD COLUMN webhook_message_id TEXT;
