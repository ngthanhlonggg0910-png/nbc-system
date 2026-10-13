import { ErrorHandler } from "../src/middleware/errorMiddleware.js";

const MAX_ADJUSTMENTS_PER_REQUEST = 100;
const MAX_REASON_LENGTH = 2000;
const MAX_CHANGE_REASON_LENGTH = 2000;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_AMOUNT = 99999999999999999.99;

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

  const number = Number(
    normalizedValue,
  );

  return (
    Number.isSafeInteger(number) &&
    number > 0
  );
}

function isValidMoney(value) {
  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return false;
  }

  if (
    typeof value === "string" &&
    !value.trim()
  ) {
    return false;
  }

  const number = Number(value);

  return (
    Number.isFinite(number) &&
    number >= 0 &&
    number <= MAX_AMOUNT
  );
}

function isValidOptionalNonNegativeNumber(
  value,
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return true;
  }

  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return false;
  }

  const number = Number(value);

  return (
    Number.isFinite(number) &&
    number >= 0
  );
}

function validateAdjustmentItems(
  adjustments,
  next,
) {
  if (!Array.isArray(adjustments)) {
    return validationError(
      next,
      "Danh sách khoản điều chỉnh phải là một mảng",
    );
  }

  if (adjustments.length === 0) {
    return validationError(
      next,
      "Vui lòng nhập ít nhất một khoản cần điều chỉnh",
    );
  }

  if (
    adjustments.length >
    MAX_ADJUSTMENTS_PER_REQUEST
  ) {
    return validationError(
      next,
      `Mỗi lần chỉ được điều chỉnh tối đa ${MAX_ADJUSTMENTS_PER_REQUEST} khoản`,
    );
  }

  const salaryItemIds = new Set();

  for (
    let index = 0;
    index < adjustments.length;
    index += 1
  ) {
    const adjustment =
      adjustments[index];

    const position = index + 1;

    if (
      !isRequestBodyObject(
        adjustment,
      )
    ) {
      return validationError(
        next,
        `Khoản điều chỉnh ở vị trí ${position} không hợp lệ`,
      );
    }

    const {
      salaryItemId,
      newAmount,
      quantity,
      rate,
      description,
      reason,
    } = adjustment;

    if (
      !isPositiveInteger(
        salaryItemId,
      )
    ) {
      return validationError(
        next,
        `Mã khoản lương ở vị trí ${position} không hợp lệ`,
      );
    }

    const normalizedSalaryItemId =
      Number(salaryItemId);

    if (
      salaryItemIds.has(
        normalizedSalaryItemId,
      )
    ) {
      return validationError(
        next,
        `Khoản lương ${normalizedSalaryItemId} bị lặp lại`,
      );
    }

    salaryItemIds.add(
      normalizedSalaryItemId,
    );

    if (!isValidMoney(newAmount)) {
      return validationError(
        next,
        `Số tiền mới ở vị trí ${position} không hợp lệ`,
      );
    }

    if (
      !isValidOptionalNonNegativeNumber(
        quantity,
      )
    ) {
      return validationError(
        next,
        `Số lượng ở vị trí ${position} không hợp lệ`,
      );
    }

    if (
      !isValidOptionalNonNegativeNumber(
        rate,
      )
    ) {
      return validationError(
        next,
        `Đơn giá ở vị trí ${position} không hợp lệ`,
      );
    }

    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      return validationError(
        next,
        `Mô tả ở vị trí ${position} phải là chuỗi`,
      );
    }

    if (
      typeof description === "string" &&
      description.trim().length >
        MAX_DESCRIPTION_LENGTH
    ) {
      return validationError(
        next,
        `Mô tả ở vị trí ${position} không được vượt quá ${MAX_DESCRIPTION_LENGTH} ký tự`,
      );
    }

    if (
      typeof reason !== "string" ||
      !reason.trim()
    ) {
      return validationError(
        next,
        `Vui lòng nhập lý do cho khoản điều chỉnh ở vị trí ${position}`,
      );
    }

    const normalizedReason =
      reason.trim();

    if (
      normalizedReason.length < 5
    ) {
      return validationError(
        next,
        `Lý do điều chỉnh ở vị trí ${position} phải có ít nhất 5 ký tự`,
      );
    }

    if (
      normalizedReason.length >
      MAX_REASON_LENGTH
    ) {
      return validationError(
        next,
        `Lý do điều chỉnh ở vị trí ${position} không được vượt quá ${MAX_REASON_LENGTH} ký tự`,
      );
    }

    /*
     * Chuẩn hóa dữ liệu trước khi controller nhận.
     */
    adjustment.salaryItemId =
      normalizedSalaryItemId;

    adjustment.newAmount =
      Number(newAmount);

    adjustment.quantity =
      quantity === undefined ||
      quantity === null ||
      quantity === ""
        ? null
        : Number(quantity);

    adjustment.rate =
      rate === undefined ||
      rate === null ||
      rate === ""
        ? null
        : Number(rate);

    adjustment.description =
      typeof description === "string" &&
      description.trim()
        ? description.trim()
        : null;

    adjustment.reason =
      normalizedReason;
  }

  return null;
}

/**
 * Kiểm tra param:
 * /payslips/:payslipId/adjustments
 */
export function validateAdjustmentPayslipIdParam(
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
 * Kiểm tra param:
 * /feedbacks/:feedbackId/adjustments
 */
export function validateAdjustmentFeedbackIdParam(
  req,
  res,
  next,
) {
  const { feedbackId } = req.params;

  if (
    !isPositiveInteger(
      feedbackId,
    )
  ) {
    return validationError(
      next,
      "Mã phản hồi lương không hợp lệ",
    );
  }

  return next();
}

/**
 * POST
 * /api/payroll/admin/payslips/:payslipId/adjustments/preview
 *
 * Body:
 * {
 *   "adjustments": [
 *     {
 *       "salaryItemId": 1,
 *       "newAmount": 9904000,
 *       "reason": "Bổ sung ngày công bị thiếu"
 *     }
 *   ]
 * }
 *
 * Preview chưa ghi dữ liệu nên không yêu cầu confirmed.
 */
export function validatePreviewPayrollAdjustment(
  req,
  res,
  next,
) {
  if (!isRequestBodyObject(req.body)) {
    return validationError(
      next,
      "Dữ liệu xem trước điều chỉnh không hợp lệ",
    );
  }

  const error =
    validateAdjustmentItems(
      req.body.adjustments,
      next,
    );

  if (error) {
    return error;
  }

  return next();
}

/**
 * POST
 * /api/payroll/admin/payslips/:payslipId/adjustments
 *
 * Body:
 * {
 *   "confirmed": true,
 *   "feedbackId": 7,
 *   "changeReason": "Điều chỉnh sau phản hồi của nhân viên",
 *   "adjustments": [...]
 * }
 */
export function validateCreatePayrollAdjustment(
  req,
  res,
  next,
) {
  if (!isRequestBodyObject(req.body)) {
    return validationError(
      next,
      "Dữ liệu điều chỉnh phiếu lương không hợp lệ",
    );
  }

  const {
    confirmed,
    feedbackId,
    changeReason,
    adjustments,
  } = req.body;

  if (confirmed !== true) {
    return validationError(
      next,
      "Bạn phải xác nhận trước khi lưu điều chỉnh lương",
    );
  }

  if (
    feedbackId !== undefined &&
    feedbackId !== null &&
    feedbackId !== "" &&
    !isPositiveInteger(feedbackId)
  ) {
    return validationError(
      next,
      "Mã phản hồi lương không hợp lệ",
    );
  }

  if (
    typeof changeReason !==
      "string" ||
    !changeReason.trim()
  ) {
    return validationError(
      next,
      "Vui lòng nhập lý do chung cho lần điều chỉnh",
    );
  }

  const normalizedChangeReason =
    changeReason.trim();

  if (
    normalizedChangeReason.length <
    5
  ) {
    return validationError(
      next,
      "Lý do chung phải có ít nhất 5 ký tự",
    );
  }

  if (
    normalizedChangeReason.length >
    MAX_CHANGE_REASON_LENGTH
  ) {
    return validationError(
      next,
      `Lý do chung không được vượt quá ${MAX_CHANGE_REASON_LENGTH} ký tự`,
    );
  }

  const error =
    validateAdjustmentItems(
      adjustments,
      next,
    );

  if (error) {
    return error;
  }

  req.body.feedbackId =
    feedbackId === undefined ||
    feedbackId === null ||
    feedbackId === ""
      ? null
      : Number(feedbackId);

  req.body.changeReason =
    normalizedChangeReason;

  return next();
}