import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../../config/db.js";
import * as qrLoginRepository from "../../repositories/user/qr-login.repository.js";

export async function generateQR(desktopIp, desktopUserAgent) {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 90 * 1000); // Hết hạn sau 90 giây
    return await qrLoginRepository.createSession({ id: sessionId, expiresAt, desktopIp, desktopUserAgent });
}

export async function scanQR(sessionId, staffId, scannedIp) {
    const updated = await qrLoginRepository.updateToScanned(sessionId, staffId, scannedIp);
    if (!updated) throw new Error("Mã QR đã hết hạn hoặc không hợp lệ");
    return { desktopUserAgent: updated.desktop_user_agent, desktopIp: updated.desktop_ip, createdAt: updated.created_at };
}

export async function confirmQR(sessionId, staffId) {
    const updated = await qrLoginRepository.updateToConfirmed(sessionId, staffId);
    if (!updated) throw new Error("Mã QR đã hết hạn hoặc không hợp lệ");
    return { success: true };
}

export async function cancelQR(sessionId, staffId) {
    const updated = await qrLoginRepository.updateToCancelled(sessionId, staffId);
    if (!updated) throw new Error("Mã QR đã hết hạn hoặc không hợp lệ");
    return { success: true };
}

export async function pollQR(sessionId, ipAddress, userAgent) {
    const session = await qrLoginRepository.findById(sessionId);
    if (!session) return { status: "expired" };

    const now = new Date();
    if (new Date(session.expiresAt) <= now) {
        if (session.status === "pending" || session.status === "scanned") {
            await pool.query("UPDATE qr_login_sessions SET status = 'expired' WHERE id = $1", [sessionId]);
        }
        return { status: "expired" };
    }

    if (session.status === "pending" || session.status === "scanned") {
        return { status: session.status };
    }

    if (session.status === "confirmed") {
        const consumedSession = await qrLoginRepository.updateToConsumed(sessionId);
        if (!consumedSession) return { status: "expired" };

        const userResult = await pool.query(
            `SELECT e.*, r.code as role 
             FROM employees e 
             LEFT JOIN roles r ON e.role_id = r.id 
             WHERE e.staff_id = $1`,
            [session.staffId]
        );
        const user = userResult.rows[0];
        if (!user || !user.is_active_staff) throw new Error("Tài khoản đã bị khóa!");

        const accessToken = jwt.sign({ staff_id: user.staff_id }, process.env.JWT_SECRET_KEY, { expiresIn: "30d" });
        const refreshToken = crypto.randomBytes(40).toString("hex");
        const refreshTokenHash = await bcrypt.hash(refreshToken, await bcrypt.genSalt(10));

        await pool.query(
            `INSERT INTO login_sessions (id, expires_at, created_at, user_agent, staff_id, refresh_token_hash, ip_address)
             VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6)`,
            [crypto.randomUUID(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), userAgent, user.staff_id, refreshTokenHash, ipAddress]
        );

        await pool.query("UPDATE employees SET last_login_at = NOW(), failed_login_attempts = 0 WHERE staff_id = $1", [user.staff_id]);

        return { status: "confirmed", accessToken, refreshToken, user };
    }

    return { status: "expired" };
}
