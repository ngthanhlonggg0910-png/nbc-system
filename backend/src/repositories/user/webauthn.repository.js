import pool from "../../config/db.js";

export async function findCredentialsByEmployee(employeeId) {
    const result = await pool.query(
        `SELECT id, device_name AS "deviceName", created_at AS "createdAt", last_used_at AS "lastUsedAt"
         FROM credentials WHERE employee_id = $1 ORDER BY created_at DESC`,
        [employeeId]
    );
    return result.rows;
}

export async function findCredentialById(id) {
    const result = await pool.query(
        `SELECT id, employee_id AS "employeeId", public_key AS "publicKey", counter, device_name AS "deviceName", created_at AS "createdAt"
         FROM credentials WHERE id = $1`,
        [id]
    );
    return result.rows[0] ?? null;
}

export async function saveCredential({ id, employeeId, publicKey, counter, deviceName }) {
    const result = await pool.query(
        `INSERT INTO credentials (id, employee_id, public_key, counter, device_name, credential_type)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, device_name AS "deviceName", created_at AS "createdAt"`,
        [id, employeeId, publicKey, counter, deviceName, 'public-key']
    );
    return result.rows[0];
}

export async function updateCounter(id, counter) {
    const result = await pool.query(
        `UPDATE credentials SET counter = $2, last_used_at = NOW() WHERE id = $1 RETURNING id, counter`,
        [id, counter]
    );
    return result.rows[0] ?? null;
}

export async function deleteCredential(id, employeeId) {
    const result = await pool.query(
        `DELETE FROM credentials WHERE id = $1 AND employee_id = $2`,
        [id, employeeId]
    );
    return result.rowCount;
}
