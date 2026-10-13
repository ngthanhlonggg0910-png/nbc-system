import pool from "../../config/db.js";

export async function upsertLeaveAttendance({ staff_id, date }, client = pool) {
  const query = `
    INSERT INTO attendance_entries (
      staff_id,
      date,
      check_in,
      check_out,
      status
    )
    VALUES (
      $1,
      $2,
      NULL,
      NULL,
      ARRAY['leave']::TEXT[]
    )

    ON CONFLICT (staff_id, date)
    DO UPDATE SET
      status = ARRAY['leave']::TEXT[],
      check_in = NULL,
      check_out = NULL,
      updated_at = CURRENT_TIMESTAMP

    RETURNING *;
  `;

  const { rows } = await client.query(query, [staff_id, date]);

  return rows[0];
}
