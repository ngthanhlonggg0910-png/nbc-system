import "dotenv/config";
import pool from "../src/config/db.js";

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notification_attachments (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      notification_id BIGINT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
      uploaded_by VARCHAR(30) REFERENCES employees(staff_id) ON DELETE SET NULL,
      original_name VARCHAR(255) NOT NULL,
      stored_name VARCHAR(255) NOT NULL UNIQUE,
      mime_type VARCHAR(150) NOT NULL,
      size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
      file_url VARCHAR(1000) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_notification_attachments_notification
      ON notification_attachments(notification_id, created_at);
    ALTER TABLE notification_attachments
      ADD COLUMN IF NOT EXISTS size_bytes BIGINT,
      ADD COLUMN IF NOT EXISTS file_url VARCHAR(1000),
      ADD COLUMN IF NOT EXISTS storage_key VARCHAR(500),
      ADD COLUMN IF NOT EXISTS file_size BIGINT;
    ALTER TABLE notification_attachments
      ALTER COLUMN storage_key DROP NOT NULL,
      ALTER COLUMN file_size DROP NOT NULL;
  `);
  console.log("Notification attachments migration completed.");
} finally {
  await pool.end();
}
