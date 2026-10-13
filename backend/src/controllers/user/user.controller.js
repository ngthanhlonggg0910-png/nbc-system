import pool from "../../config/db.js";
import { catchAsyncError } from "../../middleware/catchAsyncError.js";
import { ErrorHandler } from "../../middleware/errorMiddleware.js";
import { sendToken } from "../../../utils/jwtToken.js";
import bcrypt from "bcryptjs";
import {
  deleteEmployeeAvatar,
  getEmployeeAvatarDisplayUrl,
  uploadEmployeeAvatar,
} from "../../services/storage/r2.service.js";

async function withAvatarDisplayUrl(user) {
  if (!user) return user;

  return {
    ...user,
    avatar_display_url: await getEmployeeAvatarDisplayUrl(user.avatar_url),
  };
}

//login
export const login = catchAsyncError(async (req, res, next) => {
  const { staffId, password } = req.body;
  const user = await pool.query(
    `SELECT e.*, r.code as role 
     FROM employees e 
     LEFT JOIN roles r ON e.role_id = r.id 
     WHERE e.staff_id = $1`,
    [staffId],
  );
  if (user.rows.length === 0) {
    return next(new ErrorHandler("Thông tin không chính xác!", 400));
  }
  const isPasswordMatch = await bcrypt.compare(
    password,
    user.rows[0].password_hash,
  );
  if (!isPasswordMatch) {
    return next(new ErrorHandler("Mật khẩu không chính xác!", 400));
  }
  // if (password !== user.rows[0].password_hash) {
  //   return next(new ErrorHandler("Mật khẩu không chính xác!", 400));
  // }
  if (!user.rows[0].is_active_staff) {
    return next(new ErrorHandler("Tài khoản đã bị khóa!", 403));
  }
  await pool.query(
    `UPDATE employees
   SET last_login_at = NOW(),
       failed_login_attempts = 0
   WHERE staff_id = $1`,
    [staffId],
  );
  sendToken(user.rows[0], 200, "Đăng nhập thành công", res);
});
//logout
export const logout = catchAsyncError(async (req, res, next) => {
  res
    .clearCookie("token", {
      httpOnly: true,
    })
    .status(200)
    .json({
      success: true,
      message: "Đăng xuất thành công",
    });
});
//forgot password
export const forgotPassword = catchAsyncError(async (req, res, next) => {
  const { staff_id } = req.body;

  if (!staff_id) {
    return next(new ErrorHandler("Vui lòng nhập mã nhân viên!", 400));
  }

  // Kiểm tra nhân viên có tồn tại không
  const employee = await pool.query(
    `
      SELECT staff_id
      FROM employees
      WHERE staff_id = $1
      `,
    [staff_id],
  );

  if (!employee.rows[0]) {
    return next(new ErrorHandler("Mã nhân viên không tồn tại!", 404));
  }

  // Lưu yêu cầu quên mật khẩu
  const result = await pool.query(
    `
      INSERT INTO reset_pass_requests (
        staff_id,
        status
      )
      VALUES ($1, 'pending')
      RETURNING *
      `,
    [staff_id],
  );

  return res.status(201).json({
    success: true,
    message: "Đã gửi yêu cầu đổi mật khẩu!",
    data: result.rows[0],
  });
});
//get list for reset password
export const getResetPasswordRequests = catchAsyncError(
  async (req, res, next) => {
    const result = await pool.query(`
    SELECT
      rr.id,
      rr.staff_id,
      CONCAT(e.last_name, ' ', e.first_name) AS employee,
      e.staff_id,
      rr.requested_at,
      rr.status
    FROM reset_pass_requests rr
    JOIN employees e
      ON e.staff_id = rr.staff_id
    ORDER BY rr.requested_at DESC
  `);

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  },
);

//reset password
export const resetPassword = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password) {
    return next(new ErrorHandler("Vui lòng nhập mật khẩu mới!", 400));
  }

  const request = await pool.query(
    `
      SELECT id, staff_id, status
      FROM reset_pass_requests
      WHERE id = $1
      `,
    [id],
  );

  if (!request.rows[0]) {
    return next(
      new ErrorHandler("Không tìm thấy yêu cầu reset mật khẩu!", 404),
    );
  }

  if (request.rows[0].status === "approved") {
    return next(new ErrorHandler("Yêu cầu này đã được xử lý!", 400));
  }

  const staffId = request.rows[0].staff_id;

  const passwordHash = await bcrypt.hash(password, 10);

  await pool.query("BEGIN");

  try {
    await pool.query(
      `
        UPDATE employees
        SET password_hash = $1
        WHERE staff_id = $2
        `,
      [passwordHash, staffId],
    );

    await pool.query(
      `
        UPDATE reset_pass_requests
        SET status = 'approved'
        WHERE id = $1
        `,
      [id],
    );

    await pool.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Reset mật khẩu thành công!",
    });
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
});
//profile
export const getProfile = catchAsyncError(async (req, res, next) => {
  const user = await pool.query(
    `SELECT 
      e.staff_id,
      e.first_name,
      e.last_name,
      e.email,
      e.phone,
      e.avatar_url,
      e.gender,
      e.birth_date,
      e.created_at AS join_date,
      e.is_active_staff,

      e.role_id,

      json_build_object(
        'id', r.id,
        'code', r.code,
        'name', r.name,
        'description', r.description,
        'permissions', r.permissions
      ) AS role,

      d.name AS department,
      j.name AS position

     FROM employees e 
     LEFT JOIN roles r 
       ON e.role_id = r.id

     LEFT JOIN departments d 
       ON e.department_id = d.id

     LEFT JOIN job_titles j 
       ON e.job_title_id = j.id

     WHERE e.staff_id = $1`,
    [req.user.staff_id],
  );

  res.status(200).json({
    success: true,
    user: await withAvatarDisplayUrl(user.rows[0]),
  });
});
//edit profile
export const updateProfile = catchAsyncError(async (req, res, next) => {
  const { name, birth_date, gender, phone, email } = req.body;

  if (!name || !email || !phone) {
    return next(
      new ErrorHandler("Vui lòng điền đầy đủ các thông tin bắt buộc!", 400),
    );
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new ErrorHandler("Định dạng email không hợp lệ!", 400));
  }

  // Validate phone format
  const phoneRegex = /^[0-9]{10,11}$/;
  if (!phoneRegex.test(phone.replace(/\s+/g, ""))) {
    return next(new ErrorHandler("Số điện thoại không hợp lệ!", 400));
  }

  // Split name into first_name and last_name
  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts.pop();
  const lastName = nameParts.join(" ");

  const result = await pool.query(
    `UPDATE employees
     SET 
       first_name = $1,
       last_name = $2,
       birth_date = $3,
       gender = $4,
       phone = $5,
       email = $6,
       updated_at = NOW()
     WHERE staff_id = $7
     RETURNING *`,
    [
      firstName,
      lastName,
      birth_date || null,
      gender !== undefined ? gender : null,
      phone,
      email,
      req.user.staff_id,
    ],
  );

  if (result.rows.length === 0) {
    return next(new ErrorHandler("Không tìm thấy nhân viên!", 404));
  }

  // Fetch full profile to return
  const user = await pool.query(
    `SELECT 
      e.staff_id,
      e.first_name,
      e.last_name,
      e.email,
      e.phone,
      e.avatar_url,
      e.gender,
      e.birth_date,
      e.created_at AS join_date,
      e.is_active_staff,

      e.role_id,

      json_build_object(
        'id', r.id,
        'code', r.code,
        'name', r.name,
        'description', r.description,
        'permissions', r.permissions
      ) AS role,

      d.name AS department,
      j.name AS position

     FROM employees e 
     LEFT JOIN roles r 
       ON e.role_id = r.id

     LEFT JOIN departments d 
       ON e.department_id = d.id

     LEFT JOIN job_titles j 
       ON e.job_title_id = j.id

     WHERE e.staff_id = $1`,
    [req.user.staff_id],
  );

  res.status(200).json({
    success: true,
    message: "Cập nhật thông tin cá nhân thành công!",
    user: await withAvatarDisplayUrl(user.rows[0]),
  });
});

//change password
export const changePassword = catchAsyncError(async (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return next(
      new ErrorHandler("Vui lòng điền đầy đủ thông tin mật khẩu!", 400),
    );
  }

  if (newPassword !== confirmPassword) {
    return next(new ErrorHandler("Mật khẩu xác nhận không khớp!", 400));
  }

  if (newPassword === currentPassword) {
    return next(
      new ErrorHandler(
        "Mật khẩu mới không được trùng với mật khẩu hiện tại!",
        400,
      ),
    );
  }

  // Password policy: minimum 6 chars
  if (newPassword.length < 6) {
    return next(new ErrorHandler("Mật khẩu mới phải có ít nhất 6 ký tự!", 400));
  }

  // Verify current password
  const user = await pool.query(
    `SELECT password_hash FROM employees WHERE staff_id = $1`,
    [req.user.staff_id],
  );

  const isPasswordMatch = await bcrypt.compare(
    currentPassword,
    user.rows[0].password_hash,
  );
  if (!isPasswordMatch) {
    return next(new ErrorHandler("Mật khẩu hiện tại không chính xác!", 400));
  }

  // Hash and save new password
  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  await pool.query(
    `UPDATE employees SET password_hash = $1, updated_at = NOW() WHERE staff_id = $2`,
    [newPasswordHash, req.user.staff_id],
  );

  res.status(200).json({
    success: true,
    message: "Đổi mật khẩu thành công!",
  });
});

//upload avatar
export const uploadAvatar = catchAsyncError(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorHandler("Vui lòng chọn ảnh đại diện!", 400));
  }

  const current = await pool.query(
    "SELECT avatar_url FROM employees WHERE staff_id = $1",
    [req.user.staff_id],
  );
  const uploaded = await uploadEmployeeAvatar(req.file, req.user.staff_id);

  try {
    await pool.query(
      `UPDATE employees SET avatar_url = $1, updated_at = NOW() WHERE staff_id = $2`,
      [uploaded.avatar_url, req.user.staff_id],
    );
  } catch (error) {
    await deleteEmployeeAvatar(uploaded.avatar_url).catch(() => undefined);
    throw error;
  }

  const previousAvatarUrl = current.rows[0]?.avatar_url;
  if (previousAvatarUrl && previousAvatarUrl !== uploaded.avatar_url) {
    await deleteEmployeeAvatar(previousAvatarUrl).catch((error) => {
      console.error("[Profile] Không thể xóa avatar cũ trên R2:", error);
    });
  }

  const avatarUrl = await getEmployeeAvatarDisplayUrl(uploaded.avatar_url);

  res.status(200).json({
    success: true,
    message: "Cập nhật ảnh đại diện thành công!",
    avatarUrl,
    avatarKey: uploaded.avatar_url,
  });
});
