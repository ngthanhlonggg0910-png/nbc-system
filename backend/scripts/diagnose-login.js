import "dotenv/config";
import bcrypt from "bcryptjs";
import pool from "../src/config/db.js";

const staffId = String(process.env.LOGIN_STAFF_ID ?? "").trim().toUpperCase();
const password = process.env.LOGIN_PASSWORD;

if (!staffId || password === undefined) {
  console.error("Set LOGIN_STAFF_ID and LOGIN_PASSWORD before running this script.");
  process.exitCode = 1;
} else {
  try {
    const result = await pool.query(
      `SELECT staff_id, is_active_staff, password_hash
       FROM employees
       WHERE staff_id = $1`,
      [staffId],
    );
    const user = result.rows[0];

    if (!user) {
      console.log(JSON.stringify({ staffId, exists: false }));
    } else {
      const passwordHash = String(user.password_hash ?? "");
      const validHash = /^\$2[aby]\$\d{2}\$/.test(passwordHash);
      const passwordMatches = validHash
        ? await bcrypt.compare(password, passwordHash)
        : false;

      console.log(JSON.stringify({
        staffId,
        exists: true,
        active: Boolean(user.is_active_staff),
        validBcryptHash: validHash,
        passwordMatches,
      }));
    }
  } finally {
    await pool.end();
  }
}
