import "dotenv/config";
import pool from "../src/config/db.js";

const requiredColumns = {
  employees: ["staff_id", "department_id", "is_active_staff"],
  departments: ["id", "name"],
  notifications: [
    "id",
    "title",
    "description",
    "notification_type",
    "tone",
    "audience",
    "staff_id",
    "target_tab",
    "allow_reply",
    "created_by",
    "published_at",
    "expires_at",
  ],
  notification_recipients: [
    "notification_id",
    "staff_id",
    "delivered_at",
    "read_at",
    "is_archived",
  ],
  notification_responses: [
    "id",
    "notification_id",
    "sender_staff_id",
    "message",
    "created_at",
    "updated_at",
  ],
  notification_attachments: [
    "id",
    "notification_id",
    "uploaded_by",
    "original_name",
    "stored_name",
    "mime_type",
    "size_bytes",
    "file_url",
    "created_at",
  ],
};

try {
  const { rows } = await pool.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ANY($1::TEXT[])
    ORDER BY table_name, ordinal_position;
  `, [Object.keys(requiredColumns)]);

  const actual = new Map();
  for (const row of rows) {
    if (!actual.has(row.table_name)) actual.set(row.table_name, new Set());
    actual.get(row.table_name).add(row.column_name);
  }

  const missing = [];
  for (const [table, columns] of Object.entries(requiredColumns)) {
    for (const column of columns) {
      if (!actual.get(table)?.has(column)) missing.push(`${table}.${column}`);
    }
  }

  if (missing.length > 0) {
    console.error("Notification schema is missing:");
    missing.forEach((item) => console.error(`- ${item}`));
    process.exitCode = 1;
  } else {
    console.log("Notification schema is ready.");
  }
} finally {
  await pool.end();
}
