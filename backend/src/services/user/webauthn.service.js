import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import pool from "../../config/db.js";
import * as webauthnRepository from "../../repositories/user/webauthn.repository.js";
import { signChallenge, verifyChallenge } from "../../../utils/webauthn-challenge.util.js";
import { sendToken } from "../../../utils/jwtToken.js";

export async function generateRegOptions(staffId, rpID) {
    const employeeResult = await pool.query(
        "SELECT staff_id, first_name, last_name FROM employees WHERE staff_id = $1",
        [staffId]
    );
    const employee = employeeResult.rows[0];
    if (!employee) throw new Error("Không tìm thấy nhân viên");
    const displayName = `${employee.last_name || ""} ${employee.first_name || ""}`.trim() || staffId;

    const options = await generateRegistrationOptions({
        rpName: "NBC System",
        rpID,
        userID: Buffer.from(staffId),
        userName: staffId,
        userDisplayName: displayName,
        attestationType: "none",
        authenticatorSelection: {
            authenticatorAttachment: "platform",
            residentKey: "preferred",
            userVerification: "preferred",
        },
    });

    const challengeToken = signChallenge({
        challenge: options.challenge,
        staffId,
        exp: Date.now() + 60000,
    });

    return { options, challengeToken };
}

export async function verifyReg(credential, challengeToken, deviceName, staffId, expectedOrigin, expectedRPID, userAgent) {
    const payload = verifyChallenge(challengeToken);
    if (!payload || payload.staffId !== staffId) {
        throw new Error("Challenge không hợp lệ hoặc đã hết hạn");
    }

    const verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge: payload.challenge,
        expectedOrigin,
        expectedRPID,
    });

    if (!verification.verified) throw new Error("Xác thực đăng ký thất bại");

    const { id, publicKey, counter } = verification.registrationInfo.credential;
    const publicKeyBase64 = Buffer.from(publicKey).toString("base64url");

    const saved = await webauthnRepository.saveCredential({
        id,
        employeeId: staffId,
        publicKey: publicKeyBase64,
        counter,
        deviceName: deviceName || "Thiết bị sinh trắc học",
    });

    return saved;
}

export async function generateAuthOptions(identifier, rpID) {
    const employeeResult = await pool.query(
        `SELECT e.staff_id, e.is_active_staff, e.locked_until
         FROM employees e
         LEFT JOIN employee_personal_details epd ON e.staff_id = epd.staff_id
         WHERE e.staff_id = $1 OR e.phone = $1 OR epd.cccd_number = $1 OR epd.identity_number = $1`,
        [identifier]
    );
    const employee = employeeResult.rows[0];
    if (!employee) throw new Error("Tài khoản chưa đăng ký sinh trắc học");

    if (employee.locked_until && new Date(employee.locked_until) > new Date()) {
        throw new Error("Tài khoản đang bị khóa!");
    }
    if (!employee.is_active_staff) throw new Error("Tài khoản đã bị khóa!");

    const credentials = await webauthnRepository.findCredentialsByEmployee(employee.staff_id);
    if (credentials.length === 0) throw new Error("Tài khoản chưa đăng ký sinh trắc học");

    const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: credentials.map(c => ({ id: c.id, type: "public-key" })),
        userVerification: "preferred",
    });

    const challengeToken = signChallenge({
        challenge: options.challenge,
        staffId: employee.staff_id,
        exp: Date.now() + 60000,
    });

    return { options, challengeToken };
}

export async function verifyAuth(credential, challengeToken, expectedOrigin, expectedRPID, res) {
    const payload = verifyChallenge(challengeToken);
    if (!payload) throw new Error("Xác thực sinh trắc học thất bại");
    const staffId = payload.staffId;

    const storedCredential = await webauthnRepository.findCredentialById(credential.id);
    if (!storedCredential || storedCredential.employeeId !== staffId) {
        throw new Error("Xác thực sinh trắc học thất bại");
    }

    const employeeResult = await pool.query(
        `SELECT e.*, r.code as role 
         FROM employees e 
         LEFT JOIN roles r ON e.role_id = r.id 
         WHERE e.staff_id = $1`,
        [staffId]
    );
    const employee = employeeResult.rows[0];
    if (!employee) throw new Error("Xác thực sinh trắc học thất bại");

    if (employee.locked_until && new Date(employee.locked_until) > new Date()) {
        throw new Error("Tài khoản đang bị khóa!");
    }

    const verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge: payload.challenge,
        expectedOrigin,
        expectedRPID,
        credential: {
            id: storedCredential.id,
            publicKey: Buffer.from(storedCredential.publicKey, "base64url"),
            counter: Number(storedCredential.counter),
        },
    });

    if (!verification.verified) throw new Error("Xác thực sinh trắc học thất bại");

    await webauthnRepository.updateCounter(storedCredential.id, verification.authenticationInfo.newCounter);
    await pool.query(
        "UPDATE employees SET last_login_at = NOW(), failed_login_attempts = 0 WHERE staff_id = $1",
        [staffId]
    );

    sendToken(employee, 200, "Đăng nhập thành công", res);
}
