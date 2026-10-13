import pool from "../../config/db.js";
import { catchAsyncError } from "../../middleware/catchAsyncError.js";
import { ErrorHandler } from "../../middleware/errorMiddleware.js";

// get all roles
export const getRole = catchAsyncError(async (req, res, next) => {
  const result = await pool.query(`
    SELECT 
      r.*,
      COUNT(e.staff_id)::int AS "userCount"
    FROM roles r
    LEFT JOIN employees e 
      ON e.role_id = r.id
    GROUP BY r.id
    ORDER BY r.id ASC
  `);

  return res.status(200).json({
    error: false,
    success: true,
    data: result.rows,
  });
});

// create role
export const create = catchAsyncError(async (req, res, next) => {
  const { code, name, description, permissions = [] } = req.body;

  const result = await pool.query(
    `
      INSERT INTO roles (
        code,
        name,
        description,
        permissions
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [code, name, description, permissions],
  );

  return res.status(201).json({
    message: "Tạo nhóm quyền thành công!",
    error: false,
    success: true,
    data: result.rows[0],
  });
});

// edit role
export const edit = catchAsyncError(async (req, res, next) => {
  const { code, name, description, permissions } = req.body;
  const { id } = req.params;

  const result = await pool.query(
    `
      UPDATE roles
      SET
        code = COALESCE($1, code),
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        permissions = COALESCE($4, permissions)
      WHERE id = $5
      RETURNING *
    `,
    [code ?? null, name ?? null, description ?? null, permissions ?? null, id],
  );

  if (result.rows.length === 0) {
    return next(new ErrorHandler("Không tìm thấy nhóm quyền!", 404));
  }

  return res.status(200).json({
    message: "Cập nhật nhóm quyền thành công!",
    error: false,
    success: true,
    data: result.rows[0],
  });
});

// delete role
export const deleteRole = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  const result = await pool.query(
    `
      DELETE FROM roles
      WHERE id = $1
      RETURNING *
    `,
    [id],
  );

  if (result.rows.length === 0) {
    return next(new ErrorHandler("Không tìm thấy nhóm quyền!", 404));
  }

  return res.status(200).json({
    message: "Xóa nhóm quyền thành công!",
    error: false,
    success: true,
  });
});

// update permissions
export const permission = catchAsyncError(async (req, res, next) => {
  const roles = req.body;

  for (const item of roles) {
    await pool.query(
      `
        UPDATE roles
        SET permissions = $1
        WHERE id = $2
      `,
      [item.permissions, item.id],
    );
  }

  return res.status(200).json({
    message: "Cập nhật phân quyền thành công!",
    error: false,
    success: true,
  });
});
