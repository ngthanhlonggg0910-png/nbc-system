import pool from "../../config/db.js";

export async function findAll() {
  const result = await pool.query(`
        SELECT *
        FROM attendance_devices
        ORDER BY id ASC
    `);

  return result.rows;
}

export async function findById(id) {
  const result = await pool.query(
    `
        SELECT *
        FROM attendance_devices
        WHERE id = $1
        `,
    [id],
  );

  return result.rows[0] ?? null;
}

export async function create(device) {
  const result = await pool.query(
    `
        INSERT INTO attendance_devices (
            code,
            name,
            ip,
            port,
            protocol,
            location,
            enabled
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        `,
    [
      device.code,
      device.name,
      device.ip,
      device.port,
      device.protocol,
      device.location,
      device.enabled,
    ],
  );

  return result.rows[0];
}

export async function update(id, device) {
  const result = await pool.query(
    `
        UPDATE attendance_devices
        SET
            code = $2,
            name = $3,
            ip = $4,
            port = $5,
            protocol = $6,
            location = $7,
            enabled = $8,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
        `,
    [
      id,
      device.code,
      device.name,
      device.ip,
      device.port,
      device.protocol,
      device.location,
      device.enabled,
    ],
  );

  return result.rows[0] ?? null;
}

// update lại máy chấm công sau khi đôgn bộ
export async function updateDeviceSyncSuccess(deviceId) {
  const query = `
        UPDATE attendance_devices
        SET
            status = 'online',
            last_sync = CURRENT_TIMESTAMP,
            last_connected_at = CURRENT_TIMESTAMP,
            sync_error = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
    `;

  await pool.query(query, [deviceId]);
}

export async function updateDeviceSyncError(deviceId, errorMessage) {
  const query = `
        UPDATE attendance_devices
        SET
            status = 'offline',
            sync_error = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
    `;

  await pool.query(query, [deviceId, String(errorMessage).slice(0, 2000)]);
}

// Tìm các máy đang bật
export async function findEnabled() {
  const { rows } = await pool.query(`
    SELECT *
    FROM attendance_devices
    WHERE enabled = TRUE
    ORDER BY id
  `);
  return rows;
}
