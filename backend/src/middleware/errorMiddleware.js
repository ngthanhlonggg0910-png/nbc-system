export class ErrorHandler extends Error {
  constructor(message, statusCode, code = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const ErrorMiddleware = (err, req, res, next) => {
  err.message = err.message || "Internal Server Error";
  err.statusCode = err.statusCode || 500;
  if (err.code == 11000) {
    const message = "Duplicate entry found";
    err = new ErrorHandler(message, 400);
  }
  if (err.name === "JsonWebTokenError") {
    const message = "Lỗi đăng nhập!.";
    err = new ErrorHandler(message, 401);
  }
  if (err.name === "TokenExpiredError") {
    const message = "Token của bạn đã hết hạn. Vui lòng đăng nhập lại.";
    err = new ErrorHandler(message, 401);
  }
  const errorMessage = err.errors
    ? Object.values(err.errors)
        .map((err) => err.message)
        .join("\n")
    : err.message;
  return res.status(err.statusCode).json({
    success: false,
    message: errorMessage,
    ...(err.code ? { code: err.code } : {}),
    ...(err.details ? { details: err.details } : {}),
  });
};
