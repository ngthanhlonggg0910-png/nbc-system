import pool from "../../config/db.js";

export async function createSession({ id, expiresAt, desktopIp, desktopUserAgent }) {
    const result = await pool.query(
        `INSERT INTO qr_login_sessions (id, expires_at, desktop_ip, desktop_user_agent, status)
         VALUES ($1, $2, $3, $4, 'pending') RETURNING id, expires_at AS "expiresAt"`,
        [id, expiresAt, desktopIp, desktopUserAgent]
    );
    return result.rows[0];
}

export async function findById(id) {
    const result = await pool.query(
        `SELECT id, status, staff_id AS "staffId", expires_at AS "expiresAt" FROM qr_login_sessions WHERE id = $1`,
        [id]
    );
    return result.rows[0] ?? null;
}

export async function updateToScanned(id, staffId, scannedIp) {
    const result = await pool.query(
        `UPDATE qr_login_sessions SET status = 'scanned', staff_id = $2, scanned_at = CURRENT_TIMESTAMP, scanned_ip = $3
         WHERE id = $1 AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP RETURNING *`,
        [id, staffId, scannedIp]
    );
    return result.rows[0] ?? null;
}

export async function updateToConfirmed(id, staffId) {
    const result = await pool.query(
        `UPDATE qr_login_sessions SET status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND status = 'scanned' AND staff_id = $2 AND expires_at > CURRENT_TIMESTAMP RETURNING *`,
        [id, staffId]
    );
    return result.rows[0] ?? null;
}

export async function updateToCancelled(id, staffId) {
    const result = await pool.query(
        `UPDATE qr_login_sessions SET status = 'cancelled' WHERE id = $1 AND status = 'scanned' AND staff_id = $2 RETURNING *`,
        [id, staffId]
    );
    return result.rows[0] ?? null;
}

export async function updateToConsumed(id) {
    const result = await pool.query(
        `UPDATE qr_login_sessions SET status = 'consumed', consumed_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND status = 'confirmed' AND expires_at > CURRENT_TIMESTAMP RETURNING *`,
        [id]
    );
    return result.rows[0] ?? null;
}
