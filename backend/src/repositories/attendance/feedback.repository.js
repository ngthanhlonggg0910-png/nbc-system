import pool from "../../config/db.js";

let schemaReady;

export function ensureFeedbackSchema(client = pool) {
  if (!schemaReady) {
    schemaReady = client.query(`
      CREATE TABLE IF NOT EXISTS attendance_feedbacks (
        id BIGSERIAL PRIMARY KEY,
        staff_id VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        reply TEXT,
        replied_at TIMESTAMPTZ,
        attendance_entry_id BIGINT,
        request_type VARCHAR(50) NOT NULL DEFAULT 'other',
        requested_check_in TIMESTAMPTZ,
        requested_check_out TIMESTAMPTZ,
        attachment_url VARCHAR(1000),
        replied_by VARCHAR(50),
        review_note VARCHAR(1000),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE attendance_feedbacks
        ADD COLUMN IF NOT EXISTS messages JSONB NOT NULL DEFAULT '[]'::jsonb;
      ALTER TABLE attendance_feedbacks
        ADD COLUMN IF NOT EXISTS initiated_by VARCHAR(20) NOT NULL DEFAULT 'employee';
      ALTER TABLE attendance_feedbacks DROP CONSTRAINT IF EXISTS ck_feedback_status;
      ALTER TABLE attendance_feedbacks
        ADD CONSTRAINT ck_feedback_status
        CHECK (status IN ('pending', 'reviewing', 'answered', 'approved', 'rejected', 'cancelled'));
      CREATE INDEX IF NOT EXISTS idx_attendance_feedbacks_staff_date
        ON attendance_feedbacks (staff_id, date DESC);
      CREATE INDEX IF NOT EXISTS idx_attendance_feedbacks_status
        ON attendance_feedbacks (status, created_at DESC);
    `).catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  }
  return schemaReady;
}

const selectColumns = `
  id, staff_id, date AS attendance_date, message, status,
  reply AS hr_reply, review_note AS internal_note,
  requested_check_in::time AS adjusted_check_in,
  requested_check_out::time AS adjusted_check_out,
  messages, request_type, initiated_by, replied_by AS handled_by,
  replied_at AS processed_at, created_at, updated_at
`;

export async function findAll({ staffId } = {}, client = pool) {
  await ensureFeedbackSchema(client);
  const values = [];
  const where = staffId ? "WHERE staff_id = $1" : "";
  if (staffId) values.push(staffId);
  const { rows } = await client.query(
    `SELECT ${selectColumns},
       (SELECT CONCAT_WS(' ', employee.last_name, employee.first_name)
        FROM employees AS employee
        WHERE employee.staff_id = attendance_feedbacks.staff_id
        LIMIT 1) AS employee_name
     FROM attendance_feedbacks ${where}
     ORDER BY created_at DESC, id DESC`,
    values,
  );
  return rows;
}

export async function findById(id, client = pool) {
  await ensureFeedbackSchema(client);
  const { rows } = await client.query(
    `SELECT ${selectColumns},
       (SELECT CONCAT_WS(' ', employee.last_name, employee.first_name)
        FROM employees AS employee
        WHERE employee.staff_id = attendance_feedbacks.staff_id
        LIMIT 1) AS employee_name
     FROM attendance_feedbacks WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function create(data, client = pool) {
  await ensureFeedbackSchema(client);
  const initialMessage = [{
    id: `${Date.now()}-${data.initiatedBy}`,
    sender: data.initiatedBy,
    text: data.message,
    createdAt: new Date().toISOString(),
  }];
  const { rows } = await client.query(
    `INSERT INTO attendance_feedbacks
      (staff_id, date, message, messages, request_type, initiated_by, status)
     VALUES ($1, $2::date, $3, $4::jsonb, $5, $6, $7)
     RETURNING ${selectColumns}`,
    [data.staffId, data.date, data.message, JSON.stringify(initialMessage), data.requestType, data.initiatedBy, data.status],
  );
  return rows[0];
}

export async function resolve(id, data, handledBy, client = pool) {
  await ensureFeedbackSchema(client);
  const { rows } = await client.query(
    `UPDATE attendance_feedbacks
     SET status = $2::varchar,
         reply = COALESCE($3, reply),
         review_note = COALESCE($4, review_note),
         requested_check_in = CASE WHEN NULLIF($5, '') IS NULL THEN requested_check_in ELSE (date + $5::time) AT TIME ZONE 'Asia/Ho_Chi_Minh' END,
         requested_check_out = CASE WHEN NULLIF($6, '') IS NULL THEN requested_check_out ELSE (date + $6::time) AT TIME ZONE 'Asia/Ho_Chi_Minh' END,
         replied_by = $7,
         replied_at = CASE WHEN $2::text IN ('approved', 'rejected') THEN CURRENT_TIMESTAMP ELSE replied_at END,
         messages = CASE WHEN NULLIF($3, '') IS NULL OR $9::boolean = false THEN messages ELSE messages || $8::jsonb END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING ${selectColumns}`,
    [
      id,
      data.status,
      data.reply || null,
      data.internalNote || null,
      data.adjustedCheckIn || null,
      data.adjustedCheckOut || null,
      handledBy,
      JSON.stringify(data.reply ? [{ id: `${Date.now()}-hr`, sender: "hr", text: data.reply, createdAt: new Date().toISOString() }] : []),
      data.appendReply !== false,
    ],
  );
  return rows[0] ?? null;
}
