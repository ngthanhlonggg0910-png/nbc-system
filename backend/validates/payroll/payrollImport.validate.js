import path from "node:path";

import { ErrorHandler } from "../../src/middleware/errorMiddleware.js";

const MAX_EXCEL_FILE_SIZE =
  10 * 1024 * 1024;

const MAX_HTML_FILE_SIZE =
  5 * 1024 * 1024;

const MAX_PAGE_SIZE = 100;

const IMPORT_STATUSES = [
  "uploaded",
  "validating",
  "validated",
  "failed",
  "committed",
  "cancelled",
];

const FILE_TYPES = [
  "excel",
  "html",
  "manual",
];

const EXCEL_EXTENSIONS = [
  ".xlsx",
];

const HTML_EXTENSIONS = [
  ".html",
  ".htm",
];

const EXCEL_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/octet-stream",
];

const HTML_MIME_TYPES = [
  "text/html",
  "application/xhtml+xml",
  "application/octet-stream",
];

function validationError(next, message) {
  return next(
    new ErrorHandler(message, 400),
  );
}

function isPositiveInteger(value) {
  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return false;
  }

  const normalizedValue =
    String(value).trim();

  if (!/^[1-9]\d*$/.test(normalizedValue)) {
    return false;
  }

  const number = Number(normalizedValue);

  return (
    Number.isSafeInteger(number) &&
    number > 0
  );
}

function isSinglePrimitiveValue(value) {
  return (
    typeof value === "string" ||
    typeof value === "number"
  );
}

function getFileExtension(fileName) {
  if (typeof fileName !== "string") {
    return "";
  }

  return path
    .extname(fileName)
    .toLowerCase();
}

/**
 * Xác định loại file dựa trên phần mở rộng.
 */
export function detectPayrollImportFileType(
  fileName,
) {
  const extension =
    getFileExtension(fileName);

  if (
    EXCEL_EXTENSIONS.includes(extension)
  ) {
    return "excel";
  }

  if (
    HTML_EXTENSIONS.includes(extension)
  ) {
    return "html";
  }

  return null;
}

/**
 * Kiểm tra param:
 * /imports/:importId
 */
export function validateImportIdParam(
  req,
  res,
  next,
) {
  const { importId } = req.params;

  if (!isPositiveInteger(importId)) {
    return validationError(
      next,
      "Mã lần import không hợp lệ",
    );
  }

  return next();
}

/**
 * Kiểm tra param:
 * /periods/:periodId/imports
 */
export function validatePayrollPeriodIdParam(
  req,
  res,
  next,
) {
  const { periodId } = req.params;

  if (!isPositiveInteger(periodId)) {
    return validationError(
      next,
      "Mã kỳ lương không hợp lệ",
    );
  }

  return next();
}

/**
 * Kiểm tra upload file Excel hoặc HTML.
 *
 * Middleware này phải chạy sau:
 *
 * upload.single("file")
 *
 * Vì multer cần tạo req.file trước.
 */
export function validatePayrollImportUpload(
  req,
  res,
  next,
) {
  if (!req.file) {
    return validationError(
      next,
      "Vui lòng chọn file bảng lương",
    );
  }

  if (
    !req.file.originalname ||
    typeof req.file.originalname !==
      "string"
  ) {
    return validationError(
      next,
      "Tên file không hợp lệ",
    );
  }

  if (
    req.file.originalname.length > 500
  ) {
    return validationError(
      next,
      "Tên file không được vượt quá 500 ký tự",
    );
  }

  const fileType =
    detectPayrollImportFileType(
      req.file.originalname,
    );

  if (!fileType) {
    return validationError(
      next,
      "Chỉ hỗ trợ file .xlsx, .html hoặc .htm",
    );
  }

  const mimeType =
    req.file.mimetype ?? "";

  if (
    fileType === "excel" &&
    !EXCEL_MIME_TYPES.includes(mimeType)
  ) {
    return validationError(
      next,
      "Định dạng MIME của file Excel không hợp lệ",
    );
  }

  if (
    fileType === "html" &&
    !HTML_MIME_TYPES.includes(mimeType)
  ) {
    return validationError(
      next,
      "Định dạng MIME của file HTML không hợp lệ",
    );
  }

  if (
    fileType === "excel" &&
    req.file.size > MAX_EXCEL_FILE_SIZE
  ) {
    return validationError(
      next,
      "File Excel không được vượt quá 10 MB",
    );
  }

  if (
    fileType === "html" &&
    req.file.size > MAX_HTML_FILE_SIZE
  ) {
    return validationError(
      next,
      "File HTML không được vượt quá 5 MB",
    );
  }

  if (
    !req.file.buffer ||
    req.file.buffer.length === 0
  ) {
    return validationError(
      next,
      "File tải lên không có dữ liệu",
    );
  }

  /*
   * Lưu loại file đã xác định để controller/service sử dụng.
   * Không cần đọc lại phần mở rộng ở các tầng sau.
   */
  req.payrollImportFileType = fileType;

  return next();
}

/**
 * Kiểm tra body upload.
 *
 * Dùng khi periodId được gửi trong multipart/form-data:
 *
 * payrollPeriodId=1
 * file=<binary>
 */
export function validatePayrollImportBody(
  req,
  res,
  next,
) {
  const payrollPeriodId =
    req.body?.payrollPeriodId;

  if (!isPositiveInteger(payrollPeriodId)) {
    return validationError(
      next,
      "Mã kỳ lương không hợp lệ",
    );
  }

  return next();
}

/**
 * Kiểm tra query danh sách import.
 *
 * GET /api/payroll/imports
 *
 * Query:
 * payrollPeriodId=1
 * status=validated
 * uploadedBy=HR0001
 * fileType=excel
 * page=1
 * limit=20
 */
export function validatePayrollImportListQuery(
  req,
  res,
  next,
) {
  const {
    payrollPeriodId,
    status,
    uploadedBy,
    fileType,
    page,
    limit,
  } = req.query;

  if (
    payrollPeriodId !== undefined &&
    !isPositiveInteger(payrollPeriodId)
  ) {
    return validationError(
      next,
      "Mã kỳ lương không hợp lệ",
    );
  }

  if (
    status !== undefined &&
    (
      typeof status !== "string" ||
      !IMPORT_STATUSES.includes(status)
    )
  ) {
    return validationError(
      next,
      "Trạng thái import không hợp lệ",
    );
  }

  if (
    fileType !== undefined &&
    (
      typeof fileType !== "string" ||
      !FILE_TYPES.includes(fileType)
    )
  ) {
    return validationError(
      next,
      "Loại file import không hợp lệ",
    );
  }

  if (uploadedBy !== undefined) {
    if (
      typeof uploadedBy !== "string" ||
      !uploadedBy.trim() ||
      uploadedBy.trim().length > 30
    ) {
      return validationError(
        next,
        "Mã người upload không hợp lệ",
      );
    }
  }

  if (
    page !== undefined &&
    !isSinglePrimitiveValue(page)
  ) {
    return validationError(
      next,
      "Trang chỉ được truyền một giá trị",
    );
  }

  if (
    page !== undefined &&
    !isPositiveInteger(page)
  ) {
    return validationError(
      next,
      "Trang phải là số nguyên dương",
    );
  }

  if (
    limit !== undefined &&
    !isSinglePrimitiveValue(limit)
  ) {
    return validationError(
      next,
      "Số bản ghi chỉ được truyền một giá trị",
    );
  }

  if (
    limit !== undefined &&
    !isPositiveInteger(limit)
  ) {
    return validationError(
      next,
      "Số bản ghi mỗi trang phải là số nguyên dương",
    );
  }

  if (
    limit !== undefined &&
    Number(limit) > MAX_PAGE_SIZE
  ) {
    return validationError(
      next,
      `Mỗi trang không được vượt quá ${MAX_PAGE_SIZE} bản ghi`,
    );
  }

  return next();
}

/**
 * Kiểm tra query danh sách lỗi import.
 *
 * GET /imports/:importId/errors?page=1&limit=50
 */
export function validateImportErrorListQuery(
  req,
  res,
  next,
) {
  const {
    page,
    limit,
  } = req.query;

  if (
    page !== undefined &&
    !isPositiveInteger(page)
  ) {
    return validationError(
      next,
      "Trang phải là số nguyên dương",
    );
  }

  if (
    limit !== undefined &&
    !isPositiveInteger(limit)
  ) {
    return validationError(
      next,
      "Số lỗi mỗi trang phải là số nguyên dương",
    );
  }

  if (
    limit !== undefined &&
    Number(limit) > MAX_PAGE_SIZE
  ) {
    return validationError(
      next,
      `Mỗi trang không được vượt quá ${MAX_PAGE_SIZE} lỗi`,
    );
  }

  return next();
}

/**
 * Kiểm tra yêu cầu commit dữ liệu.
 *
 * POST /imports/:importId/commit
 *
 * Body:
 * {
 *   "confirmed": true
 * }
 */
export function validateCommitPayrollImport(
  req,
  res,
  next,
) {
  if (
    !req.body ||
    typeof req.body !== "object" ||
    Array.isArray(req.body)
  ) {
    return validationError(
      next,
      "Dữ liệu xác nhận import không hợp lệ",
    );
  }

  const { confirmed } = req.body;

  if (confirmed === undefined) {
    return validationError(
      next,
      "Vui lòng xác nhận lưu dữ liệu bảng lương",
    );
  }

  if (typeof confirmed !== "boolean") {
    return validationError(
      next,
      "Trường confirmed phải là kiểu boolean",
    );
  }

  if (confirmed !== true) {
    return validationError(
      next,
      "Bạn phải xác nhận trước khi lưu dữ liệu",
    );
  }

  return next();
}

/**
 * Kiểm tra yêu cầu hủy import.
 *
 * POST /imports/:importId/cancel
 *
 * Body có thể không truyền hoặc:
 * {
 *   "reason": "Chọn nhầm file"
 * }
 *
 * Schema hiện tại chưa có cột cancel_reason,
 * nên reason chỉ dùng để audit log sau này.
 */
export function validateCancelPayrollImport(
  req,
  res,
  next,
) {
  if (
    req.body === undefined ||
    req.body === null
  ) {
    return next();
  }

  if (
    typeof req.body !== "object" ||
    Array.isArray(req.body)
  ) {
    return validationError(
      next,
      "Dữ liệu hủy import không hợp lệ",
    );
  }

  const { reason } = req.body;

  if (reason === undefined) {
    return next();
  }

  if (
    typeof reason !== "string" ||
    !reason.trim()
  ) {
    return validationError(
      next,
      "Lý do hủy không hợp lệ",
    );
  }

  if (reason.trim().length > 1000) {
    return validationError(
      next,
      "Lý do hủy không được vượt quá 1000 ký tự",
    );
  }

  return next();
}
