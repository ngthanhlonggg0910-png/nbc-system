import pool from "../../config/db.js";

export async function upsertAttendanceEntry(
  {
    staff_id,
    date,
    check_in,
    check_out,
    hours,
    status,
    device_in,
    device_out,
    note,
    shift_id,
    worked_minutes,
    late_minutes,
    early_leave_minutes,
    workday_units,
    is_manually_adjusted,
    calculated_at,
  },
  client = pool,
) {
  const query = `
    INSERT INTO attendance_entries (
      staff_id,
      date,
      check_in,
      check_out,
      hours,
      status,
      device_in,
      device_out,
      note,
      shift_id,
      worked_minutes,
      late_minutes,
      early_leave_minutes,
      workday_units,
      is_manually_adjusted,
      calculated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9,
      $10, $11, $12, $13, $14, $15, $16
    )

    ON CONFLICT (staff_id, date)
    DO UPDATE SET
      check_in = EXCLUDED.check_in,
      check_out = EXCLUDED.check_out,
      hours = EXCLUDED.hours,
      
      status =
          CASE
            WHEN 'overtime' = ANY(attendance_entries.status)
            THEN
              CASE
                WHEN 'overtime' = ANY(EXCLUDED.status)
                THEN EXCLUDED.status
                ELSE array_append(EXCLUDED.status, 'overtime')
              END
            ELSE EXCLUDED.status
          END,

      device_in = EXCLUDED.device_in,
      device_out = EXCLUDED.device_out,
      note = EXCLUDED.note,
      shift_id = EXCLUDED.shift_id,
      worked_minutes = EXCLUDED.worked_minutes,
      late_minutes = EXCLUDED.late_minutes,
      early_leave_minutes = EXCLUDED.early_leave_minutes,
      workday_units = EXCLUDED.workday_units,
      is_manually_adjusted = EXCLUDED.is_manually_adjusted,
      calculated_at = EXCLUDED.calculated_at,
      updated_at = CURRENT_TIMESTAMP

    RETURNING *;
  `;

  const values = [
    staff_id,
    date,
    check_in,
    check_out,
    hours,
    status,
    device_in,
    device_out,
    note,
    shift_id,
    worked_minutes,
    late_minutes,
    early_leave_minutes,
    workday_units,
    is_manually_adjusted,
    calculated_at,
  ];

  const { rows } = await client.query(query, values);

  return rows[0];
}

export async function findAttendanceEntries(client = pool) {
  const { rows } = await client.query(`
    SELECT *
    FROM attendance_entries
    ORDER BY date DESC, staff_id ASC
  `);

  return rows;
}

export async function findAttendanceEntryByStaffAndDate(
  staffId,
  date,
  client = pool,
) {
  const { rows } = await client.query(
    `SELECT * FROM attendance_entries WHERE staff_id = $1 AND date = $2::date LIMIT 1`,
    [String(staffId), date],
  );
  return rows[0] ?? null;
}

export async function getMonthlyEntriesByEmployeeId(staffId, month) {
  const sql = `
                SELECT *
                FROM attendance_entries
                WHERE staff_id = $1
                  AND TO_CHAR(date, 'YYYY-MM') = $2
                ORDER BY date ASC;
              `;

  const { rows } = await pool.query(sql, [staffId, month]);

  return rows;
}
