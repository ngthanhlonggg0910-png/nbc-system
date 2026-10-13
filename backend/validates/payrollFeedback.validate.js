import { ErrorHandler } from "../src/middleware/errorMiddleware.js";

const MAX_PAGE_SIZE = 100;
const MAX_CONTENT_LENGTH = 5000;
const MAX_HR_REPLY_LENGTH = 5000;
const MAX_KEYWORD_LENGTH = 100;

const FEEDBACK_CATEGORIES = [
  "income",
  "deduction",
  "attendance",
  "personal_information",
  "other",
];

const FEEDBACK_STATUSES = [
  "pending",
  "reviewing",
  "accepted",
  "rejected",
  "adjusted",
  "resolved",
];

const FEEDBACK_ISSUE_TYPES = [
  "attendance",
  "base_salary",
  "overtime",
  "allowance",
  "bonus_kpi",
  "insurance",
  "personal_income_tax",
  "deduction",
  "gross_income",
  "net_salary",
  "other",
];

function validationError(next, message) {
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

function isSinglePrimitiveValue(value) {
  return (
    typeof value === "string" ||
    typeof value === "number"
  );
}

/**
 * Kiểm tra:
 * /feedbacks/:feedbackId
 */
export function validateFeedbackIdParam(
  req,
  res,
  next,
) {
  const { feedbackId } = req.params;

  if (!isPositiveInteger(feedbackId)) {
    return validationError(
      next,
      "Mã phản hồi lương không hợp lệ",
    );
  }

  return next();
}

/**
 * Kiểm tra:
 * /payslips/:payslipId/feedbacks
 */
export function validateFeedbackPayslipIdParam(
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
 * POST
 * /api/payroll/me/:payslipId/feedbacks
 *
 * Body:
 * {
 *   "category": "deduction",
 *   "content": "Khoản BHXH chưa chính xác",
 *   "attachmentUrl": "/uploads/..."
 * }
 */
export function validateCreatePayrollFeedback(
  req,
  res,
  next,
) {
  if (!isRequestBodyObject(req.body)) {
    return validationError(
      next,
      "Dữ liệu phản hồi không hợp lệ",
    );
  }

  const {
    category,
    issueType,
    salaryItemId,
    proposedValue,
    priority,
    content,
  } = req.body;

  if (typeof issueType !== "string" || !FEEDBACK_ISSUE_TYPES.includes(issueType.trim().toLowerCase())) {
    return validationError(next, "Vui lòng chọn loại vấn đề hợp lệ");
  }

  if (typeof category !== "string") {
    return validationError(next, "Loại phản hồi không hợp lệ");
  }

  const normalizedCategory = category.trim().toLowerCase();

  if (
    !FEEDBACK_CATEGORIES.includes(
      normalizedCategory,
    )
  ) {
    return validationError(
      next,
      "Loại phản hồi không hợp lệ",
    );
  }

  if (
    typeof content !== "string" ||
    !content.trim()
  ) {
    return validationError(
      next,
      "Vui lòng nhập nội dung phản hồi",
    );
  }

  const normalizedContent =
    content.trim();

  if (normalizedContent.length < 10) {
    return validationError(
      next,
      "Nội dung phản hồi phải có ít nhất 10 ký tự",
    );
  }

  if (
    normalizedContent.length >
    MAX_CONTENT_LENGTH
  ) {
    return validationError(
      next,
      `Nội dung phản hồi không được vượt quá ${MAX_CONTENT_LENGTH} ký tự`,
    );
  }

  if (salaryItemId !== undefined && salaryItemId !== null && salaryItemId !== "" && !isPositiveInteger(salaryItemId)) {
    return validationError(next, "Khoản mục lương không hợp lệ");
  }

  if (proposedValue !== undefined && proposedValue !== null && typeof proposedValue !== "string") {
    return validationError(next, "Giá trị đề nghị kiểm tra không hợp lệ");
  }

  if (priority !== undefined && !["low", "normal", "high", "urgent"].includes(priority)) {
    return validationError(next, "Mức ưu tiên không hợp lệ");
  }

  req.body.category =
    normalizedCategory;

  req.body.issueType = issueType.trim().toLowerCase();
  req.body.salaryItemId = salaryItemId === undefined || salaryItemId === null || salaryItemId === ""
    ? null
    : Number(salaryItemId);
  req.body.proposedValue = typeof proposedValue === "string" && proposedValue.trim()
    ? proposedValue.trim().slice(0, 255)
    : null;
  req.body.priority = priority ?? "normal";

  req.body.content =
    normalizedContent;

  return next();
}

/**
 * GET /api/payroll/me/feedbacks
 *
 * Query:
 * {
 *   status: "pending",
 *   year: 2026,
 *   page: 1,
 *   limit: 20
 * }
 */
export function validateEmployeeFeedbackListQuery(
  req,
  res,
  next,
) {
  const {
    status,
    year,
    page,
    limit,
  } = req.query;

  if (status !== undefined) {
    if (
      !isSinglePrimitiveValue(status)
    ) {
      return validationError(
        next,
        "Trạng thái chỉ được truyền một giá trị",
      );
    }

    const normalizedStatus =
      String(status).trim().toLowerCase();

    if (
      !FEEDBACK_STATUSES.includes(
        normalizedStatus,
      )
    ) {
      return validationError(
        next,
        "Trạng thái phản hồi không hợp lệ",
      );
    }

    req.query.status =
      normalizedStatus;
  }

  if (year !== undefined) {
    if (!isPositiveInteger(year)) {
      return validationError(
        next,
        "Năm tra cứu không hợp lệ",
      );
    }

    const normalizedYear =
      Number(year);

    if (
      normalizedYear < 2000 ||
      normalizedYear > 2100
    ) {
      return validationError(
        next,
        "Năm tra cứu phải nằm trong khoảng 2000-2100",
      );
    }
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
 * GET /api/payroll/admin/feedbacks
 *
 * Query:
 * {
 *   status: "pending",
 *   category: "deduction",
 *   periodId: 1,
 *   staffId: "NBC012345",
 *   keyword: "Nguyễn Văn An",
 *   page: 1,
 *   limit: 20
 * }
 */
export function validateAdminFeedbackListQuery(
  req,
  res,
  next,
) {
  const {
    status,
    category,
    periodId,
    staffId,
    keyword,
    page,
    limit,
  } = req.query;

  if (status !== undefined) {
    if (
      !isSinglePrimitiveValue(status)
    ) {
      return validationError(
        next,
        "Trạng thái chỉ được truyền một giá trị",
      );
    }

    const normalizedStatus =
      String(status).trim().toLowerCase();

    if (
      !FEEDBACK_STATUSES.includes(
        normalizedStatus,
      )
    ) {
      return validationError(
        next,
        "Trạng thái phản hồi không hợp lệ",
      );
    }

    req.query.status =
      normalizedStatus;
  }

  if (category !== undefined) {
    if (
      !isSinglePrimitiveValue(category)
    ) {
      return validationError(
        next,
        "Loại phản hồi chỉ được truyền một giá trị",
      );
    }

    const normalizedCategory =
      String(category).trim().toLowerCase();

    if (
      !FEEDBACK_CATEGORIES.includes(
        normalizedCategory,
      )
    ) {
      return validationError(
        next,
        "Loại phản hồi không hợp lệ",
      );
    }

    req.query.category =
      normalizedCategory;
  }

  if (
    periodId !== undefined &&
    !isPositiveInteger(periodId)
  ) {
    return validationError(
      next,
      "Mã kỳ lương không hợp lệ",
    );
  }

  if (staffId !== undefined) {
    if (
      !isSinglePrimitiveValue(staffId) ||
      !String(staffId).trim()
    ) {
      return validationError(
        next,
        "Mã nhân viên không hợp lệ",
      );
    }

    if (
      String(staffId).trim().length > 30
    ) {
      return validationError(
        next,
        "Mã nhân viên không được vượt quá 30 ký tự",
      );
    }

    req.query.staffId =
      String(staffId).trim();
  }

  if (keyword !== undefined) {
    if (
      !isSinglePrimitiveValue(keyword)
    ) {
      return validationError(
        next,
        "Từ khóa chỉ được truyền một giá trị",
      );
    }

    const normalizedKeyword =
      String(keyword).trim();

    if (
      normalizedKeyword.length >
      MAX_KEYWORD_LENGTH
    ) {
      return validationError(
        next,
        `Từ khóa không được vượt quá ${MAX_KEYWORD_LENGTH} ký tự`,
      );
    }

    req.query.keyword =
      normalizedKeyword;
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
 * POST
 * /api/payroll/admin/feedbacks/:feedbackId/review
 *
 * Body không bắt buộc.
 *
 * HR nhấn "Tiếp nhận xử lý".
 */
export function validateStartFeedbackReview(
  req,
  res,
  next,
) {
  if (
    req.body !== undefined &&
    !isRequestBodyObject(req.body)
  ) {
    return validationError(
      next,
      "Dữ liệu tiếp nhận phản hồi không hợp lệ",
    );
  }

  return next();
}

/**
 * POST
 * /api/payroll/admin/feedbacks/:feedbackId/accept
 *
 * Body:
 * {
 *   "confirmed": true,
 *   "hrReply": "HR xác nhận khoản khấu trừ bị sai."
 * }
 */
export function validateAcceptPayrollFeedback(
  req,
  res,
  next,
) {
  if (!isRequestBodyObject(req.body)) {
    return validationError(
      next,
      "Dữ liệu xử lý phản hồi không hợp lệ",
    );
  }

  const {
    confirmed,
    hrReply,
  } = req.body;

  if (confirmed !== true) {
    return validationError(
      next,
      "Bạn phải xác nhận phản hồi này là chính xác",
    );
  }

  if (
    typeof hrReply !== "string" ||
    !hrReply.trim()
  ) {
    return validationError(
      next,
      "Vui lòng nhập nội dung trả lời nhân viên",
    );
  }

  const normalizedReply =
    hrReply.trim();

  if (normalizedReply.length < 5) {
    return validationError(
      next,
      "Nội dung trả lời phải có ít nhất 5 ký tự",
    );
  }

  if (
    normalizedReply.length >
    MAX_HR_REPLY_LENGTH
  ) {
    return validationError(
      next,
      `Nội dung trả lời không được vượt quá ${MAX_HR_REPLY_LENGTH} ký tự`,
    );
  }

  req.body.hrReply =
    normalizedReply;

  return next();
}

/**
 * POST
 * /api/payroll/admin/feedbacks/:feedbackId/reject
 *
 * Body:
 * {
 *   "confirmed": true,
 *   "hrReply": "Dữ liệu hiện tại đúng theo bảng chấm công."
 * }
 */
export function validateRejectPayrollFeedback(
  req,
  res,
  next,
) {
  if (!isRequestBodyObject(req.body)) {
    return validationError(
      next,
      "Dữ liệu từ chối phản hồi không hợp lệ",
    );
  }

  const {
    confirmed,
    hrReply,
  } = req.body;

  if (confirmed !== true) {
    return validationError(
      next,
      "Bạn phải xác nhận thao tác từ chối",
    );
  }

  if (
    typeof hrReply !== "string" ||
    !hrReply.trim()
  ) {
    return validationError(
      next,
      "Phải nhập lý do từ chối để nhân viên đối chiếu",
    );
  }

  const normalizedReply =
    hrReply.trim();

  if (normalizedReply.length < 10) {
    return validationError(
      next,
      "Lý do từ chối phải có ít nhất 10 ký tự",
    );
  }

  if (
    normalizedReply.length >
    MAX_HR_REPLY_LENGTH
  ) {
    return validationError(
      next,
      `Lý do từ chối không được vượt quá ${MAX_HR_REPLY_LENGTH} ký tự`,
    );
  }

  req.body.hrReply =
    normalizedReply;

  return next();
}

/**
 * POST
 * /api/payroll/admin/feedbacks/:feedbackId/resolve
 *
 * Body:
 * {
 *   "confirmed": true,
 *   "hrReply": "Đã điều chỉnh và phát hành lại phiếu lương."
 * }
 */
export function validateResolvePayrollFeedback(
  req,
  res,
  next,
) {
  if (!isRequestBodyObject(req.body)) {
    return validationError(
      next,
      "Dữ liệu hoàn tất phản hồi không hợp lệ",
    );
  }

  const {
    confirmed,
    hrReply,
  } = req.body;

  if (confirmed !== true) {
    return validationError(
      next,
      "Bạn phải xác nhận hoàn tất phản hồi",
    );
  }

  if (
    hrReply !== undefined &&
    hrReply !== null
  ) {
    if (typeof hrReply !== "string") {
      return validationError(
        next,
        "Nội dung trả lời phải là chuỗi",
      );
    }

    if (
      hrReply.trim().length >
      MAX_HR_REPLY_LENGTH
    ) {
      return validationError(
        next,
        `Nội dung trả lời không được vượt quá ${MAX_HR_REPLY_LENGTH} ký tự`,
      );
    }

    req.body.hrReply =
      hrReply.trim() || null;
  }

  return next();
}

/**
 * DELETE
 * /api/payroll/me/feedbacks/:feedbackId
 *
 * Nhân viên phải xác nhận trước khi xóa phản hồi pending.
 *
 * Body:
 * {
 *   "confirmed": true
 * }
 */
export function validateDeletePayrollFeedback(
  req,
  res,
  next,
) {
  if (!isRequestBodyObject(req.body)) {
    return validationError(
      next,
      "Dữ liệu xóa phản hồi không hợp lệ",
    );
  }

  if (req.body.confirmed !== true) {
    return validationError(
      next,
      "Bạn phải xác nhận trước khi xóa phản hồi",
    );
  }

  return next();
}

export {
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
};
