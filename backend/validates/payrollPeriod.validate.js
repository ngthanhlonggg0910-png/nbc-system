import { ErrorHandler } from "../src/middleware/errorMiddleware.js";

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;
const MAX_PAGE_SIZE = 100;
const MAX_PERIOD_NAME_LENGTH = 150;
const MAX_CANCEL_REASON_LENGTH = 1000;

const PERIOD_STATUSES = [
  "draft",
  "published",
  "locked",
  "cancelled",
];

function validationError(
  next,
  message,
) {
  return next(
    new ErrorHandler(message, 400),
  );
}

function isRequestBodyObject(body) {
  return (
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body)
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

function isValidYear(value) {
  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return false;
  }

  const normalizedValue =
    String(value).trim();

  if (!/^\d{4}$/.test(normalizedValue)) {
    return false;
  }

  const year = Number(normalizedValue);

  return (
    Number.isInteger(year) &&
    year >= MIN_YEAR &&
    year <= MAX_YEAR
  );
}

/**
 * Kiểm tra mã kỳ lương YYYY-MM.
 */
function isValidPeriodCode(value) {
  if (typeof value !== "string") {
    return false;
  }

  const normalizedValue = value.trim();

  if (
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(
      normalizedValue,
    )
  ) {
    return false;
  }

  const year = Number(
    normalizedValue.slice(0, 4),
  );

  return (
    year >= MIN_YEAR &&
    year <= MAX_YEAR
  );
}

/**
 * Kiểm tra ngày YYYY-MM-DD và bảo đảm ngày tồn tại.
 */
function isValidDate(value) {
  if (typeof value !== "string") {
    return false;
  }

  const normalizedValue = value.trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      normalizedValue,
    )
  ) {
    return false;
  }

  const [
    year,
    month,
    day,
  ] = normalizedValue
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day),
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function validatePeriodDates(
  {
    periodCode,
    startDate,
    endDate,
    paymentDate,
  },
  next,
) {
  if (!isValidDate(startDate)) {
    return validationError(
      next,
      "Ngày bắt đầu phải có định dạng YYYY-MM-DD và là ngày hợp lệ",
    );
  }

  if (!isValidDate(endDate)) {
    return validationError(
      next,
      "Ngày kết thúc phải có định dạng YYYY-MM-DD và là ngày hợp lệ",
    );
  }

  if (
    paymentDate !== undefined &&
    paymentDate !== null &&
    paymentDate !== "" &&
    !isValidDate(paymentDate)
  ) {
    return validationError(
      next,
      "Ngày thanh toán phải có định dạng YYYY-MM-DD và là ngày hợp lệ",
    );
  }

  const normalizedStartDate =
    startDate.trim();

  const normalizedEndDate =
    endDate.trim();

  const normalizedPaymentDate =
    typeof paymentDate === "string"
      ? paymentDate.trim()
      : null;

  if (
    normalizedEndDate <
    normalizedStartDate
  ) {
    return validationError(
      next,
      "Ngày kết thúc không được trước ngày bắt đầu",
    );
  }

  if (
    periodCode &&
    !normalizedStartDate.startsWith(
      periodCode,
    )
  ) {
    return validationError(
      next,
      "Ngày bắt đầu phải thuộc tháng của kỳ lương",
    );
  }

  if (
    periodCode &&
    !normalizedEndDate.startsWith(
      periodCode,
    )
  ) {
    return validationError(
      next,
      "Ngày kết thúc phải thuộc tháng của kỳ lương",
    );
  }

  if (
    normalizedPaymentDate &&
    normalizedPaymentDate <
      normalizedEndDate
  ) {
    return validationError(
      next,
      "Ngày thanh toán không được trước ngày kết thúc kỳ lương",
    );
  }

  return null;
}

/**
 * Kiểm tra:
 * /periods/:periodId
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
 * GET /api/payroll/admin/periods
 *
 * Query:
 * - year
 * - status
 * - page
 * - limit
 */
export function validatePayrollPeriodListQuery(
  req,
  res,
  next,
) {
  const {
    year,
    status,
    page,
    limit,
  } = req.query;

  if (
    Array.isArray(year) ||
    Array.isArray(status) ||
    Array.isArray(page) ||
    Array.isArray(limit)
  ) {
    return validationError(
      next,
      "Mỗi tham số truy vấn chỉ được xuất hiện một lần",
    );
  }

  if (
    year !== undefined &&
    year !== "" &&
    !isValidYear(year)
  ) {
    return validationError(
      next,
      `Năm phải nằm trong khoảng ${MIN_YEAR}-${MAX_YEAR}`,
    );
  }

  if (
    status !== undefined &&
    status !== ""
  ) {
    if (typeof status !== "string") {
      return validationError(
        next,
        "Trạng thái kỳ lương không hợp lệ",
      );
    }

    const normalizedStatus =
      status.trim().toLowerCase();

    if (
      !PERIOD_STATUSES.includes(
        normalizedStatus,
      )
    ) {
      return validationError(
        next,
        "Trạng thái kỳ lương phải là draft, published, locked hoặc cancelled",
      );
    }

    req.query.status =
      normalizedStatus;
  }

  if (
    page !== undefined &&
    page !== "" &&
    !isPositiveInteger(page)
  ) {
    return validationError(
      next,
      "Số trang không hợp lệ",
    );
  }

  if (
    limit !== undefined &&
    limit !== "" &&
    !isPositiveInteger(limit)
  ) {
    return validationError(
      next,
      "Số bản ghi mỗi trang không hợp lệ",
    );
  }

  if (
    limit !== undefined &&
    limit !== "" &&
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
 * POST /api/payroll/admin/periods
 */
export function validateCreatePayrollPeriod(
  req,
  res,
  next,
) {
  if (!isRequestBodyObject(req.body)) {
    return validationError(
      next,
      "Dữ liệu tạo kỳ lương không hợp lệ",
    );
  }

  const {
    periodCode,
    periodName,
    startDate,
    endDate,
    paymentDate,
  } = req.body;

  if (!isValidPeriodCode(periodCode)) {
    return validationError(
      next,
      "Mã kỳ lương phải có định dạng YYYY-MM",
    );
  }

  if (
    typeof periodName !== "string" ||
    !periodName.trim()
  ) {
    return validationError(
      next,
      "Tên kỳ lương là bắt buộc",
    );
  }

  if (
    periodName.trim().length >
    MAX_PERIOD_NAME_LENGTH
  ) {
    return validationError(
      next,
      `Tên kỳ lương không được vượt quá ${MAX_PERIOD_NAME_LENGTH} ký tự`,
    );
  }

  const normalizedPeriodCode =
    periodCode.trim();

  const dateError = validatePeriodDates(
    {
      periodCode:
        normalizedPeriodCode,
      startDate,
      endDate,
      paymentDate,
    },
    next,
  );

  if (dateError) {
    return dateError;
  }

  req.body.periodCode =
    normalizedPeriodCode;

  req.body.periodName =
    periodName.trim();

  req.body.startDate =
    startDate.trim();

  req.body.endDate =
    endDate.trim();

  req.body.paymentDate =
    typeof paymentDate === "string" &&
    paymentDate.trim()
      ? paymentDate.trim()
      : null;

  return next();
}

/**
 * PATCH /api/payroll/admin/periods/:periodId
 *
 * Service hiện tại yêu cầu đầy đủ:
 * - periodName
 * - startDate
 * - endDate
 * - paymentDate có thể null
 */
export function validateUpdatePayrollPeriod(
  req,
  res,
  next,
) {
  if (!isRequestBodyObject(req.body)) {
    return validationError(
      next,
      "Dữ liệu cập nhật kỳ lương không hợp lệ",
    );
  }

  const {
    periodName,
    startDate,
    endDate,
    paymentDate,
  } = req.body;

  if (
    typeof periodName !== "string" ||
    !periodName.trim()
  ) {
    return validationError(
      next,
      "Tên kỳ lương là bắt buộc",
    );
  }

  if (
    periodName.trim().length >
    MAX_PERIOD_NAME_LENGTH
  ) {
    return validationError(
      next,
      `Tên kỳ lương không được vượt quá ${MAX_PERIOD_NAME_LENGTH} ký tự`,
    );
  }

  const dateError = validatePeriodDates(
    {
      periodCode: null,
      startDate,
      endDate,
      paymentDate,
    },
    next,
  );

  if (dateError) {
    return dateError;
  }

  req.body.periodName =
    periodName.trim();

  req.body.startDate =
    startDate.trim();

  req.body.endDate =
    endDate.trim();

  req.body.paymentDate =
    typeof paymentDate === "string" &&
    paymentDate.trim()
      ? paymentDate.trim()
      : null;

  return next();
}

/**
 * POST /api/payroll/admin/periods/:periodId/cancel
 *
 * Body:
 * {
 *   "reason": "Tạo nhầm kỳ lương"
 * }
 *
 * Service hiện tại chưa lưu reason vào database.
 * Validator vẫn kiểm tra nếu client gửi reason.
 */
export function validateCancelPayrollPeriod(
  req,
  res,
  next,
) {
  if (
    req.body === undefined ||
    req.body === null
  ) {
    req.body = {};
    return next();
  }

  if (!isRequestBodyObject(req.body)) {
    return validationError(
      next,
      "Dữ liệu hủy kỳ lương không hợp lệ",
    );
  }

  const { reason } = req.body;

  if (
    reason === undefined ||
    reason === null ||
    reason === ""
  ) {
    return next();
  }

  if (typeof reason !== "string") {
    return validationError(
      next,
      "Lý do hủy kỳ lương phải là chuỗi",
    );
  }

  const normalizedReason =
    reason.trim();

  if (normalizedReason.length < 5) {
    return validationError(
      next,
      "Lý do hủy kỳ lương phải có ít nhất 5 ký tự",
    );
  }

  if (
    normalizedReason.length >
    MAX_CANCEL_REASON_LENGTH
  ) {
    return validationError(
      next,
      `Lý do hủy kỳ lương không được vượt quá ${MAX_CANCEL_REASON_LENGTH} ký tự`,
    );
  }

  req.body.reason =
    normalizedReason;

  return next();
}
