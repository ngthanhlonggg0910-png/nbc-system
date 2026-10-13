import pool from "../../config/db.js";

export async function findAll() {
  const query = ` SELECT * 
                    FROM attendance_sync_schedules
                    ORDER BY id ASC
                `;
  const result = await pool.query(query);
  return result.rows;
}

// Tìm lịch theo ID
export async function findById(id) {
  const result = await pool.query(
    `
        SELECT *
        FROM attendance_sync_schedules
        WHERE id = $1
        `,
    [id],
  );

  return result.rows[0] ?? null;
}

// Tìm lịch đến hạn
export async function findDueSchedules() {
  const result = await pool.query(`
        SELECT
            id,
            name,
            time,
            frequency,
            enabled,
            last_run,
            next_run
        FROM attendance_sync_schedules
        WHERE enabled = TRUE
          AND next_run IS NOT NULL
          AND next_run <= CURRENT_TIMESTAMP
        ORDER BY next_run ASC
    `);

  return result.rows;
}

// Cập nhật lịch khi chạy thành công
export async function markSyncScheduleSuccess({ id, nextRun, lastResult }) {
  const result = await pool.query(
    `
        UPDATE attendance_sync_schedules
        SET
            last_run = CURRENT_TIMESTAMP,
            next_run = $2,
            last_result = $3::jsonb,
            last_error = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
        `,
    [id, nextRun, JSON.stringify(lastResult)],
  );

  return result.rows[0] ?? null;
}

// Cập nhật lịch khi chạy lỗi
export async function markSyncScheduleFailed({ id, nextRun, errorMessage }) {
  const result = await pool.query(
    `
        UPDATE attendance_sync_schedules
        SET
            last_run = CURRENT_TIMESTAMP,
            next_run = $2,
            last_result = NULL,
            last_error = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
        `,
    [id, nextRun, String(errorMessage).slice(0, 2000)],
  );

  return result.rows[0] ?? null;
}

// Bật tắt lịch
export async function updateEnabled(id, enabled) {
  const result = await pool.query(
    `
        UPDATE attendance_sync_schedules
        SET
            enabled = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
        `,
    [id, enabled],
  );

  return result.rows[0] ?? null;
}

// update lịch
export async function updateAttendanceSchedule(
  id,
  { name, time, enabled },
  client = pool,
) {
  const query = `
    UPDATE attendance_sync_schedules
    SET
      name = $2,
      time = $3,
      enabled = $4,

      next_run = CASE
        WHEN $4 = FALSE THEN NULL

        WHEN (
          CURRENT_DATE + $3::time
        ) AT TIME ZONE 'Asia/Ho_Chi_Minh' > CURRENT_TIMESTAMP
        THEN (
          CURRENT_DATE + $3::time
        ) AT TIME ZONE 'Asia/Ho_Chi_Minh'

        ELSE (
          CURRENT_DATE + INTERVAL '1 day' + $3::time
        ) AT TIME ZONE 'Asia/Ho_Chi_Minh'
      END,

      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *;
  `;

  const { rows } = await client.query(query, [id, name, time, enabled]);

  return rows[0];
}

// Thêm lịch
export async function createAttendanceSchedule(
  { name, time, frequency = "Hàng ngày", enabled = true },
  client = pool,
) {
  const query = `
    WITH schedule_time AS (
      SELECT
        (
          (
            CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh'
          )::date + $2::time
        ) AT TIME ZONE 'Asia/Ho_Chi_Minh' AS today_run
    )
    INSERT INTO attendance_sync_schedules (
      name,
      time,
      frequency,
      enabled,
      next_run
    )
    SELECT
      $1,
      $2::time,
      $3,
      $4,
      CASE
        WHEN $4 = FALSE THEN NULL

        WHEN schedule_time.today_run > CURRENT_TIMESTAMP
          THEN schedule_time.today_run

        ELSE schedule_time.today_run + INTERVAL '1 day'
      END
    FROM schedule_time
    RETURNING *;
  `;

  const values = [name, time, frequency, enabled];

  const { rows } = await client.query(query, values);

  return rows[0];
}
