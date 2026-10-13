import pool from "../../config/db.js";
import { catchAsyncError } from "../../middleware/catchAsyncError.js";
import { ErrorHandler } from "../../middleware/errorMiddleware.js";

const employeeSelect = `
  SELECT
    e.staff_id,
    e.first_name,
    e.last_name,
    CONCAT_WS(' ', e.last_name, e.first_name) AS full_name,
    e.email,
    e.phone,
    e.avatar_url,
    e.gender,
    e.birth_date,
    e.created_at AS join_date,
    e.is_active_staff,
    e.employee_type,
    e.role_id,
    e.department_id,
    e.job_title_id,
    e.device_id,
    e.device_user_id,
    e.work_location_id,

    CASE
      WHEN r.id IS NULL THEN NULL
      ELSE json_build_object(
        'id', r.id,
        'code', r.code,
        'name', r.name,
        'description', r.description,
        'permissions', COALESCE(r.permissions, '{}'::TEXT[])
      )
    END AS role,

    CASE 
      WHEN d.id IS NULL THEN NULL 
      ELSE json_build_object(
        'id', d.id,
        'name', d.name
      )
    END AS department,

    CASE 
      WHEN j.id IS NULL THEN NULL 
      ELSE json_build_object(
        'id', j.id,
        'name', j.name
      )
    END AS position,

    CASE 
      WHEN w.id IS NULL THEN NULL 
      ELSE json_build_object(
        'id', w.id,
        'code', w.code,
        'name', w.name
      )
    END AS work_location

  FROM employees e

  LEFT JOIN roles r 
    ON r.id = e.role_id

  LEFT JOIN departments d 
    ON d.id = e.department_id

  LEFT JOIN job_titles j 
    ON j.id = e.job_title_id

  LEFT JOIN work_locations w 
    ON w.id = e.work_location_id
`;

const findEmployee = async (staffId) => {
  const result = await pool.query(`${employeeSelect} WHERE e.staff_id = $1`, [
    staffId,
  ]);
  return result.rows[0];
};

export const getEmployees = catchAsyncError(async (req, res, next) => {
  const keyword = String(req.query.search ?? "").trim();
  const values = [];
  let where = "";

  if (keyword) {
    values.push(`%${keyword}%`);
    where = `WHERE (
      e.staff_id ILIKE $1 OR
      CONCAT_WS(' ', e.last_name, e.first_name) ILIKE $1 OR
      e.email ILIKE $1 OR
      d.name ILIKE $1 OR
      j.name ILIKE $1
    )`;
  }

  const result = await pool.query(
    `${employeeSelect} ${where} ORDER BY e.created_at DESC, e.staff_id ASC`,
    values,
  );

  return res
    .status(200)
    .json({ error: false, success: true, data: result.rows });
});

export const getEmployee = catchAsyncError(async (req, res, next) => {
  const employee = await findEmployee(req.params.staffId);
  if (!employee)
    return next(new ErrorHandler("Không tìm thấy nhân viên!", 404));
  return res.status(200).json({ error: false, success: true, data: employee });
});

export const editEmployee = catchAsyncError(async (req, res, next) => {
  const { staffId } = req.params;
  const allowedFields = {
    first_name: "first_name",
    last_name: "last_name",
    email: "email",
    phone: "phone",
    gender: "gender",
    birth_date: "birth_date",
    is_active_staff: "is_active_staff",
    employee_type: "employee_type",
    role_id: "role_id",
    department_id: "department_id",
    job_title_id: "job_title_id",
    work_location_id: "work_location_id",
    device_id: "device_id",
    device_user_id: "device_user_id",
  };

  const entries = Object.entries(allowedFields).filter(([field]) =>
    Object.prototype.hasOwnProperty.call(req.body, field),
  );
  if (!entries.length)
    return next(
      new ErrorHandler("Không có thông tin hợp lệ để cập nhật!", 400),
    );

  if (Object.prototype.hasOwnProperty.call(req.body, "email")) {
    const email = String(req.body.email ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return next(new ErrorHandler("Định dạng email không hợp lệ!", 400));
    req.body.email = email;
  }

  const isUpdatingAttendanceDevice =
    Object.prototype.hasOwnProperty.call(req.body, "device_id") ||
    Object.prototype.hasOwnProperty.call(req.body, "device_user_id");

  if (isUpdatingAttendanceDevice) {
    const deviceIdValue = req.body.device_id;
    const deviceUserId = String(req.body.device_user_id ?? "").trim();
    const deviceId =
      deviceIdValue === "" || deviceIdValue == null
        ? null
        : Number(deviceIdValue);

    if ((deviceId === null) !== (deviceUserId === "")) {
      return next(
        new ErrorHandler(
          "Máy chấm công và mã chấm công phải được nhập cùng nhau hoặc cùng để trống!",
          400,
        ),
      );
    }

    if (deviceId !== null) {
      if (!Number.isInteger(deviceId) || deviceId <= 0) {
        return next(new ErrorHandler("Máy chấm công không hợp lệ!", 400));
      }

      const device = await pool.query(
        "SELECT id FROM attendance_devices WHERE id = $1",
        [deviceId],
      );
      if (!device.rows[0]) {
        return next(new ErrorHandler("Không tìm thấy máy chấm công!", 404));
      }

      const duplicate = await pool.query(
        `SELECT staff_id
         FROM employees
         WHERE device_id = $1
           AND device_user_id = $2
           AND staff_id <> $3
         LIMIT 1`,
        [deviceId, deviceUserId, staffId],
      );
      if (duplicate.rows[0]) {
        return next(
          new ErrorHandler(
            "Mã chấm công này đã được gán cho một nhân viên khác trên máy đã chọn!",
            409,
          ),
        );
      }
    }

    req.body.device_id = deviceId;
    req.body.device_user_id = deviceUserId || null;
  }

  const values = entries.map(([field]) =>
    req.body[field] === "" ? null : req.body[field],
  );
  const assignments = entries.map(
    ([, column], index) => `${column} = $${index + 1}`,
  );
  values.push(staffId);

  const result = await pool.query(
    `UPDATE employees SET ${assignments.join(", ")}, updated_at = NOW() WHERE staff_id = $${values.length} RETURNING staff_id`,
    values,
  );
  if (!result.rows[0])
    return next(new ErrorHandler("Không tìm thấy nhân viên!", 404));

  const employee = await findEmployee(staffId);
  return res.status(200).json({
    error: false,
    success: true,
    message: "Cập nhật nhân viên thành công!",
    data: employee,
  });
});

export const deleteEmployee = catchAsyncError(async (req, res, next) => {
  const { staffId } = req.params;
  if (String(req.user?.staff_id) === String(staffId))
    return next(
      new ErrorHandler("Bạn không thể xóa tài khoản đang đăng nhập!", 400),
    );

  try {
    const result = await pool.query(
      "DELETE FROM employees WHERE staff_id = $1 RETURNING staff_id",
      [staffId],
    );
    if (!result.rows[0])
      return next(new ErrorHandler("Không tìm thấy nhân viên!", 404));
    return res.status(200).json({
      error: false,
      success: true,
      message: "Xóa nhân viên thành công!",
      data: { staff_id: result.rows[0].staff_id },
    });
  } catch (error) {
    if (error.code === "23503")
      return next(
        new ErrorHandler(
          "Không thể xóa nhân viên vì đang có dữ liệu liên quan!",
          409,
        ),
      );
    throw error;
  }
});

// Backward-compatible export for code that used the old unfinished name.
export const getEmploy = getEmployees;
