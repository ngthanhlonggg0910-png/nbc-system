import { ErrorHandler } from "../src/middleware/errorMiddleware.js";

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;
const MAX_PAGE_SIZE = 50;

/**
 * Trả lỗi validation theo chuẩn error middleware của dự án.
 */
function validationError(next, message) {
  return next(new ErrorHandler(message, 400));
}

/**
 * Kiểm tra một giá trị có phải số nguyên dương hay không.
 *
 * Hợp lệ:
 * "1", "12", 1, 12
 *
 * Không hợp lệ:
 * "1.5", "-1", "abc", mảng, object
 */
function isPositiveInteger(value) {
  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return false;
  }

  const normalizedValue = String(value).trim();

  if (!/^[1-9]\d*$/.test(normalizedValue)) {
    return false;
  }

  const number = Number(normalizedValue);

  return (
    Number.isSafeInteger(number) &&
    number > 0
  );
}

/**
 * Kiểm tra năm.
 */
function isValidYear(value) {
  if (!isPositiveInteger(value)) {
    return false;
  }

  const year = Number(value);

  return year >= MIN_YEAR && year <= MAX_YEAR;
}

/**
 * Kiểm tra định dạng YYYY-MM.
 *
 * Hợp lệ:
 * 2026-01
 * 2026-07
 * 2026-12
 *
 * Không hợp lệ:
 * 2026-1
 * 07-2026
 * 2026-13
 */
function isValidYearMonth(value) {
  if (typeof value !== "string") {
    return false;
  }

  return /^\d{4}-(0[1-9]|1[0-2])$/.test(
    value.trim(),
  );
}

/**
 * Kiểm tra request query có bị truyền dạng mảng hay object không.
 *
 * Ví dụ không hợp lệ:
 * ?year=2026&year=2027
 * ?page[value]=1
 */
function isSinglePrimitiveValue(value) {
  return (
    typeof value === "string" ||
    typeof value === "number"
  );
}

/**
 * GET /api/payroll/me
 *
 * Query hợp lệ:
 * {
 *   year: 2026,
 *   page: 1,
 *   limit: 12
 * }
 *
 * Tất cả đều không bắt buộc.
 */
export function validatePayrollYearQuery(
  req,
  res,
  next,
) {
  const {
    year,
    page,
    limit,
  } = req.query;

  if (
    year !== undefined &&
    !isSinglePrimitiveValue(year)
  ) {
    return validationError(
      next,
      "Năm tra cứu chỉ được truyền một giá trị",
    );
  }

  if (
    year !== undefined &&
    !isValidYear(year)
  ) {
    return validationError(
      next,
      `Năm tra cứu phải nằm trong khoảng ${MIN_YEAR}-${MAX_YEAR}`,
    );
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
 * Các API có param:
 * /api/payroll/me/:payslipId
 */
export function validatePayslipIdParam(
  req,
  res,
  next,
) {
  const { payslipId } = req.params;

  if (!isPositiveInteger(payslipId)) {
    return validationError(
      next,
      "Mã phiếu lương không hợp lệ",
    );
  }

  return next();
}

/**
 * GET /api/payroll/me/12-month
 *
 * Query:
 * {
 *   endMonth: "2026-07"
 * }
 *
 * endMonth không bắt buộc.
 * Nếu không truyền, controller dùng tháng hiện tại.
 */
export function validatePayrollReportQuery(
  req,
  res,
  next,
) {
  const { year, endMonth } = req.query;

  if (
    year !== undefined &&
    !isSinglePrimitiveValue(year)
  ) {
    return validationError(
      next,
      "Năm báo cáo chỉ được truyền một giá trị",
    );
  }

  if (
    year !== undefined &&
    !isValidYear(year)
  ) {
    return validationError(
      next,
      `Năm báo cáo phải nằm trong khoảng ${MIN_YEAR}-${MAX_YEAR}`,
    );
  }

  if (endMonth === undefined) {
    return next();
  }

  if (!isSinglePrimitiveValue(endMonth)) {
    return validationError(
      next,
      "Tháng kết thúc chỉ được truyền một giá trị",
    );
  }

  if (!isValidYearMonth(String(endMonth))) {
    return validationError(
      next,
      "Tháng kết thúc phải có định dạng YYYY-MM",
    );
  }

  const legacyYear = Number(
    String(endMonth).slice(0, 4),
  );

  if (legacyYear < MIN_YEAR || legacyYear > MAX_YEAR) {
    return validationError(
      next,
      `Năm báo cáo phải nằm trong khoảng ${MIN_YEAR}-${MAX_YEAR}`,
    );
  }

  return next();
}

/**
 * GET /api/payroll/me/:payslipId/comparison
 *
 * Query bắt buộc:
 * {
 *   fromVersion: 1,
 *   toVersion: 2
 * }
 */
export function validatePayslipComparisonQuery(
  req,
  res,
  next,
) {
  const {
    fromVersion,
    toVersion,
  } = req.query;

  if (
    fromVersion === undefined ||
    toVersion === undefined
  ) {
    return validationError(
      next,
      "Vui lòng chọn đầy đủ phiên bản cũ và phiên bản mới",
    );
  }

  if (
    !isSinglePrimitiveValue(fromVersion) ||
    !isSinglePrimitiveValue(toVersion)
  ) {
    return validationError(
      next,
      "Mỗi phiên bản chỉ được truyền một giá trị",
    );
  }

  if (!isPositiveInteger(fromVersion)) {
    return validationError(
      next,
      "Phiên bản cũ không hợp lệ",
    );
  }

  if (!isPositiveInteger(toVersion)) {
    return validationError(
      next,
      "Phiên bản mới không hợp lệ",
    );
  }

  const oldVersion = Number(fromVersion);
  const newVersion = Number(toVersion);

  if (oldVersion === newVersion) {
    return validationError(
      next,
      "Hai phiên bản đối chiếu phải khác nhau",
    );
  }

  if (oldVersion > newVersion) {
    return validationError(
      next,
      "Phiên bản cũ phải nhỏ hơn phiên bản mới",
    );
  }

  return next();
}

/**
 * POST /api/payroll/me/:payslipId/confirm
 *
 * Body hợp lệ:
 * {
 *   "confirmed": true
 * }
 */
export function validateConfirmPayslip(
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
      "Dữ liệu xác nhận phiếu lương không hợp lệ",
    );
  }

  const { confirmed } = req.body;

  if (confirmed === undefined) {
    return validationError(
      next,
      "Vui lòng xác nhận phiếu lương",
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
      "Bạn phải đồng ý xác nhận phiếu lương",
    );
  }

  return next();
}

/**
 * Các API có param:
 * /api/payroll/admin/payslips/:payslipId/versions/:versionNumber
 */
export function validatePayslipVersionParam(
  req,
  res,
  next,
) {
  const { versionNumber } = req.params;

  if (!isPositiveInteger(versionNumber)) {
    return validationError(
      next,
      "Số phiên bản phiếu lương không hợp lệ",
    );
  }

  return next();
}
