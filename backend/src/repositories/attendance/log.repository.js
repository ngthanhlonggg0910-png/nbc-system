import pool from "../../config/db.js";

export async function getAllLogs() {
  return await pool.query("SELECT * FROM raw_attendance_logs");
}

//Lưu log thô vào bảng
export async function insertAttendanceLog({
  staff_id,
  device_id,
  device_user_id,
  device_record_id,
  timestamp,
}) {
  const query = `
    INSERT INTO raw_attendance_logs (
      staff_id,
      device_id,
      device_user_id,
      device_record_id,
      timestamp
    )
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (device_id, device_record_id)
    DO NOTHING
    RETURNING *;
  `;

  const values = [
    staff_id,
    device_id,
    device_user_id,
    device_record_id,
    timestamp,
  ];

  const { rows } = await pool.query(query, values);

  return rows[0] ?? null;
}

//dùng để lấy tất cả các log chấm công chưa được xử lý từ bảng raw_attendance_logs
export async function findPendingAttendanceLogs(client = pool) {
  const query = `
    SELECT
      id,
      staff_id,
      device_id,
      device_user_id,
      device_record_id,
      timestamp,
      status
    FROM raw_attendance_logs
    WHERE status = 'Chờ xử lý'
    ORDER BY device_user_id, timestamp;
  `;

  const { rows } = await client.query(query);

  return rows;
}

// Lấy toàn bộ log của một nhân viên trong một ngày theo múi giờ Việt Nam.
// Các log đã xử lý vẫn phải được lấy để tránh log mới ghi đè check-in/check-out cũ.
export async function findAttendanceLogsByDeviceStaffIdAndDate(
  staffIdDevice,
  date,
  client = pool,
) {
  const query = `
    SELECT
      id,
      staff_id,
      device_id,
      device_user_id,
      device_record_id,
      timestamp,
      status,
      synced_at,
      processed_at
    FROM raw_attendance_logs
    WHERE device_user_id::text = $1
      AND (
        timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'
      )::date = $2::date
    ORDER BY timestamp ASC, id ASC;
  `;

  const { rows } = await client.query(query, [String(staffIdDevice), date]);

  return rows;
}

//Đánh dấu các log chấm công thô đã được xử lý thành công để hệ thống không xử lý lại chúng.
export async function markAttendanceLogsProcessed(log_ids, client = pool) {
  if (!Array.isArray(log_ids) || log_ids.length === 0) {
    return;
  }

  const query = `
    UPDATE raw_attendance_logs
    SET
      status = 'Đã xử lý',
      processed_at = CURRENT_TIMESTAMP
    WHERE id = ANY($1::BIGINT[]);
  `;

  await client.query(query, [log_ids]);
}

//đánh dấu những log chấm công không xử lý được là "Lỗi".
export async function markAttendanceLogsError(log_ids, message, client = pool) {
  if (!Array.isArray(log_ids) || log_ids.length === 0) {
    return;
  }

  const query = `
    UPDATE raw_attendance_logs
    SET
      status = 'Lỗi',
      error_message = $2,
      error_at = CURRENT_TIMESTAMP
    WHERE id = ANY($1::BIGINT[]);
  `;

  await client.query(query, [log_ids, message]);
}

// Phân trang với dl thô
export async function findAllLogDetails(limit, offset) {
  return pool.query(
    `
    WITH log_details AS (
      SELECT
        l.id,
        mapping.staff_id AS staff_id,
        l.device_user_id AS staff_id_device,
        CONCAT(e.last_name, ' ', e.first_name) AS employee_name,
        d.code AS device_code,
        d.name AS device_name,
        l.device_id,
        l.timestamp,
        l.status,

        ROW_NUMBER() OVER (
          PARTITION BY
            l.device_user_id,
            DATE(l.timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
          ORDER BY l.timestamp ASC
        ) AS rn_asc,

        ROW_NUMBER() OVER (
          PARTITION BY
            l.device_user_id,
            DATE(l.timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
          ORDER BY l.timestamp DESC
        ) AS rn_desc,

        COUNT(*) OVER (
          PARTITION BY
            l.device_user_id,
            DATE(l.timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
        ) AS total_logs

      FROM raw_attendance_logs l

      LEFT JOIN attendance_staff_device_mappings mapping
        ON mapping.staff_id_device = l.device_user_id::text

      LEFT JOIN employees e
        ON e.staff_id = mapping.staff_id

      LEFT JOIN attendance_devices d
        ON d.id = l.device_id
    )

    SELECT
      *,
      CASE
        WHEN total_logs = 1 THEN 'Thiếu giờ ra'
        WHEN rn_asc = 1 THEN 'Vào'
        WHEN rn_desc = 1 THEN 'Ra'
      END AS direction
    FROM log_details
    WHERE total_logs = 1
       OR rn_asc = 1
       OR rn_desc = 1
    ORDER BY timestamp DESC
    LIMIT $1 OFFSET $2
    `,
    [limit, offset],
  );
}

export async function countLogDetails() {
  return pool.query(`
    WITH log_details AS (
      SELECT
        ROW_NUMBER() OVER (
          PARTITION BY
            device_user_id,
            DATE(timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
          ORDER BY timestamp ASC
        ) AS rn_asc,

        ROW_NUMBER() OVER (
          PARTITION BY
            device_user_id,
            DATE(timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
          ORDER BY timestamp DESC
        ) AS rn_desc,

        COUNT(*) OVER (
          PARTITION BY
            device_user_id,
            DATE(timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
        ) AS total_logs

      FROM raw_attendance_logs
    )

    SELECT COUNT(*)::INTEGER AS total
    FROM log_details
    WHERE total_logs = 1
       OR rn_asc = 1
       OR rn_desc = 1
  `);
}

export async function findStaffByDeviceUser(deviceId, deviceUserId) {
  const result = await pool.query(
    `
      SELECT staff_id
      FROM employees
      WHERE device_id = $1
        AND device_user_id = $2
      LIMIT 1
    `,
    [deviceId, String(deviceUserId)],
  );

  return result.rows[0] || null;
}
