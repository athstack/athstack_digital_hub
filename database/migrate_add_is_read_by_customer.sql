ALTER TABLE contact_messages
ADD COLUMN is_read_by_customer TINYINT(1) NOT NULL DEFAULT 0
AFTER reply_text;
