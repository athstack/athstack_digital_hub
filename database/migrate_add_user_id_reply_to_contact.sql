ALTER TABLE contact_messages
  ADD COLUMN user_id INT DEFAULT NULL AFTER id,
  ADD COLUMN reply_text TEXT DEFAULT NULL AFTER message,
  ADD COLUMN replied_at TIMESTAMP NULL DEFAULT NULL AFTER reply_text,
  ADD COLUMN replied_by INT DEFAULT NULL AFTER replied_at;

ALTER TABLE contact_messages ADD INDEX idx_user_id (user_id);
ALTER TABLE contact_messages ADD INDEX idx_replied_by (replied_by);
