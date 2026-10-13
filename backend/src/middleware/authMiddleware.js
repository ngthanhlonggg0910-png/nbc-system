import jwt from "jsonwebtoken";
import { catchAsyncError } from "./catchAsyncError.js";
import { ErrorHandler } from "./errorMiddleware.js";
import pool from "../config/db.js";

export const isAuthenticated = catchAsyncError(async (req, res, next) => {
  const token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : req.cookies?.token;

  if (!token) {
    return next(new ErrorHandler("Vui lòng đăng nhập!", 401));
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

  const user = await pool.query(
    `SELECT 
      e.*, 
      r.code AS role, 
      COALESCE(r.permissions, ARRAY[]::TEXT[]) AS permissions
   FROM employees e 
   LEFT JOIN roles r ON e.role_id = r.id 
   WHERE e.staff_id = $1`,
    [decoded.staff_id],
  );
  if (!user.rows[0]) {
    return next(new ErrorHandler("Người dùng không tồn tại!", 404));
  }
  req.user = user.rows[0];
  next();
});
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHandler(
          `Quyền: ${req.user.role} không được phép truy cập tài nguyên này`,
          403,
        ),
      );
    }
    next();
  };
};
export const authorizePermissions = (...requiredPermissions) => {
  return (req, res, next) => {
    const permissions = Array.isArray(req.user?.permissions)
      ? req.user.permissions
      : [];
    const allowed = requiredPermissions.every((permission) =>
      permissions.includes(permission),
    );
    if (!allowed)
      return next(
        new ErrorHandler("Bạn không có quyền thực hiện chức năng này!", 403),
      );
    next();
  };
};
