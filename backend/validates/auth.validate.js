import { catchAsyncError } from "../src/middleware/catchAsyncError.js";
import { ErrorHandler } from "../src/middleware/errorMiddleware.js";

export const login = catchAsyncError(async (req, res, next) => {
  const { staffId, password } = req.body;
  if (!staffId) {
    return next(new ErrorHandler("Vui lòng điền mã nhân viên!", 400));
  }
  if (!password) {
    return next(new ErrorHandler("Vui lòng điền mật khẩu!", 400));
  }
  next();
});
