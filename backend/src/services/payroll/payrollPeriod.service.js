import { ErrorHandler } from "../../middleware/errorMiddleware.js";
import pool from "../../config/db.js";

import * as payrollPeriodRepository from "../../repositories/payroll/payrollPeriod.repository.js";

const PERIOD_STATUSES = [
  "draft",
  "published",
  "locked",
  "cancelled",
];

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;
const MAX_PAGE_SIZE = 100;

function toNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function validatePositiveInteger(
  value,
  fieldName,
) {
  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new ErrorHandler(
      `${fieldName} không hợp lệ`,
      400,
    );
  }
}

function validatePeriodStatus(status) {
  if (
    status !== null &&
    status !== undefined &&
    !PERIOD_STATUSES.includes(status)
  ) {
    throw new ErrorHandler(
      "Trạng thái kỳ lương không hợp lệ",
      400,
    );
  }
}

function validateYear(year) {
  if (year === null || year === undefined) {
    return;
  }

  if (
    !Number.isInteger(year) ||
    year < MIN_YEAR ||
    year > MAX_YEAR
  ) {
    throw new ErrorHandler(
      `Năm phải nằm trong khoảng ${MIN_YEAR}-${MAX_YEAR}`,
      400,
    );
  }
}

/**
 * Kiểm tra mã kỳ lương có đúng YYYY-MM.
 */
function validatePeriodCode(periodCode) {
  if (
    typeof periodCode !== "string" ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(
      periodCode.trim(),
    )
  ) {
    throw new ErrorHandler(
      "Mã kỳ lương phải có định dạng YYYY-MM",
      400,
    );
  }

  const year = Number(
    periodCode.slice(0, 4),
  );

  if (year < MIN_YEAR || year > MAX_YEAR) {
    throw new ErrorHandler(
      `Năm kỳ lương phải nằm trong khoảng ${MIN_YEAR}-${MAX_YEAR}`,
      400,
    );
  }
}

/**
 * Kiểm tra chuỗi ngày YYYY-MM-DD và đảm bảo ngày tồn tại thật.
 *
 * Ví dụ 2026-02-30 sẽ bị từ chối.
 */
function validateDateString(
  value,
  fieldName,
  {
    required = true,
  } = {},
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    if (required) {
      throw new ErrorHandler(
        `${fieldName} là bắt buộc`,
        400,
      );
    }

    return;
  }

  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    throw new ErrorHandler(
      `${fieldName} phải có định dạng YYYY-MM-DD`,
      400,
    );
  }

  const [
    year,
    month,
    day,
  ] = value.split("-").map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day),
  );

  const isValid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  if (!isValid) {
    throw new ErrorHandler(
      `${fieldName} không phải ngày hợp lệ`,
      400,
    );
  }
}

function compareDateStrings(firstDate, secondDate) {
  return firstDate.localeCompare(secondDate);
}

/**
 * Đảm bảo ngày bắt đầu và ngày kết thúc nằm đúng
 * trong tháng của periodCode.
 */
function validatePeriodDates({
  periodCode,
  startDate,
  endDate,
  paymentDate,
}) {
  validateDateString(
    startDate,
    "Ngày bắt đầu",
  );

  validateDateString(
    endDate,
    "Ngày kết thúc",
  );

  validateDateString(
    paymentDate,
    "Ngày thanh toán",
    {
      required: false,
    },
  );

  if (
    compareDateStrings(endDate, startDate) < 0
  ) {
    throw new ErrorHandler(
      "Ngày kết thúc không được trước ngày bắt đầu",
      400,
    );
  }

  if (!startDate.startsWith(periodCode)) {
    throw new ErrorHandler(
      "Ngày bắt đầu phải thuộc đúng tháng của kỳ lương",
      400,
    );
  }

  if (!endDate.startsWith(periodCode)) {
    throw new ErrorHandler(
      "Ngày kết thúc phải thuộc đúng tháng của kỳ lương",
      400,
    );
  }

  if (
    paymentDate &&
    compareDateStrings(paymentDate, endDate) < 0
  ) {
    throw new ErrorHandler(
      "Ngày thanh toán không được trước ngày kết thúc kỳ lương",
      400,
    );
  }
}

function normalizeText(
  value,
  fieldName,
  {
    maxLength,
  },
) {
  if (typeof value !== "string") {
    throw new ErrorHandler(
      `${fieldName} là bắt buộc`,
      400,
    );
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new ErrorHandler(
      `${fieldName} không được để trống`,
      400,
    );
  }

  if (
    maxLength &&
    normalizedValue.length > maxLength
  ) {
    throw new ErrorHandler(
      `${fieldName} không được vượt quá ${maxLength} ký tự`,
      400,
    );
  }

  return normalizedValue;
}

/**
 * Chuẩn hóa PostgreSQL DATE thành chuỗi YYYY-MM-DD.
 *
 * Không dùng toISOString() vì DATE được pg chuyển thành thời điểm
 * 00:00 theo múi giờ máy chủ và có thể bị lùi ngày khi đổi sang UTC.
 */
function formatDateOnly(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(
      value.getMonth() + 1,
    ).padStart(2, "0");
    const day = String(
      value.getDate(),
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  return null;
}

function mapPayrollPeriod(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    periodCode: row.period_code,
    periodName: row.period_name,
    startDate: formatDateOnly(row.start_date),
    endDate: formatDateOnly(row.end_date),
    paymentDate: formatDateOnly(
      row.payment_date,
    ),
    status: row.status,

    publication: {
      publishedAt: row.published_at,
      publishedBy: row.published_by,
      publishedByName:
        row.published_by_name ?? null,
    },

    lock: {
      closedAt: row.closed_at,
      lockedBy: row.locked_by,
      lockedByName:
        row.locked_by_name ?? null,
    },

    creation: {
      createdBy: row.created_by,
      createdByName:
        row.created_by_name ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },

    statistics: {
      totalPayslips: toNumber(
        row.total_payslips,
      ),
      confirmedPayslips: toNumber(
        row.confirmed_payslips,
      ),
      feedbackPayslips: toNumber(
        row.feedback_payslips,
      ),
      paidPayslips: toNumber(
        row.paid_payslips,
      ),
      totalGrossIncome: toNumber(
        row.total_gross_income,
      ),
      totalDeductions: toNumber(
        row.total_deductions,
      ),
      totalNetSalary: toNumber(
        row.total_net_salary,
      ),
    },
  };
}

/**
 * Kiểm tra kỳ lương tồn tại.
 */
export async function requirePayrollPeriod(
  periodId,
) {
  validatePositiveInteger(
    periodId,
    "Mã kỳ lương",
  );

  const period =
    await payrollPeriodRepository.findById(
      periodId,
    );

  if (!period) {
    throw new ErrorHandler(
      "Không tìm thấy kỳ lương",
      404,
    );
  }

  return period;
}

/**
 * Lấy danh sách kỳ lương.
 */
export async function getPayrollPeriods({
  status = null,
  year = null,
  page = 1,
  limit = 20,
} = {}) {
  validatePeriodStatus(status);
  validateYear(year);
  validatePositiveInteger(page, "Trang");
  validatePositiveInteger(
    limit,
    "Số bản ghi mỗi trang",
  );

  if (limit > MAX_PAGE_SIZE) {
    throw new ErrorHandler(
      `Mỗi trang không được vượt quá ${MAX_PAGE_SIZE} bản ghi`,
      400,
    );
  }

  const offset = (page - 1) * limit;

  const [rows, totalItems] =
    await Promise.all([
      payrollPeriodRepository.findPayrollPeriods(
        {
          status,
          year,
          limit,
          offset,
        },
      ),

      payrollPeriodRepository.countPayrollPeriods(
        {
          status,
          year,
        },
      ),
    ]);

  return {
    data: rows.map(mapPayrollPeriod),

    pagination: {
      page,
      limit,
      totalItems,
      totalPages:
        totalItems === 0
          ? 0
          : Math.ceil(totalItems / limit),
    },
  };
}

/**
 * Lấy kỳ lương theo ID.
 */
export async function getPayrollPeriodById(
  periodId,
) {
  const period = await requirePayrollPeriod(
    periodId,
  );

  const statistics =
    await payrollPeriodRepository.getPeriodPayslipStatistics(
      periodId,
    );

  return {
    ...mapPayrollPeriod(period),

    statistics: {
      totalPayslips: toNumber(
        statistics.total_payslips,
      ),
      draftCount: toNumber(
        statistics.draft_count,
      ),
      waitingConfirmationCount: toNumber(
        statistics.waiting_confirmation_count,
      ),
      confirmedCount: toNumber(
        statistics.confirmed_count,
      ),
      employeeFeedbackCount: toNumber(
        statistics.employee_feedback_count,
      ),
      adjustedCount: toNumber(
        statistics.adjusted_count,
      ),
      publishedCount: toNumber(
        statistics.published_count,
      ),
      paidCount: toNumber(
        statistics.paid_count,
      ),
      totalGrossIncome: toNumber(
        statistics.total_gross_income,
      ),
      totalDeductions: toNumber(
        statistics.total_deductions,
      ),
      totalNetSalary: toNumber(
        statistics.total_net_salary,
      ),
    },
  };
}

/**
 * Lấy kỳ lương bằng mã YYYY-MM.
 */
export async function getPayrollPeriodByCode(
  periodCode,
) {
  validatePeriodCode(periodCode);

  const normalizedCode = periodCode.trim();

  const period =
    await payrollPeriodRepository.findByCode(
      normalizedCode,
    );

  if (!period) {
    throw new ErrorHandler(
      `Không tìm thấy kỳ lương ${normalizedCode}`,
      404,
    );
  }

  return mapPayrollPeriod(period);
}

/**
 * Tạo kỳ lương.
 */
export async function createPayrollPeriod({
  periodCode,
  periodName,
  startDate,
  endDate,
  paymentDate = null,
  createdBy,
  managerId = null,
  approverId = null,
  description = null,
  scopeType = "enterprise",
  unitIds = [],
}) {
  validatePeriodCode(periodCode);

  const normalizedCode = periodCode.trim();

  const normalizedName = normalizeText(
    periodName,
    "Tên kỳ lương",
    {
      maxLength: 150,
    },
  );

  validatePeriodDates({
    periodCode: normalizedCode,
    startDate,
    endDate,
    paymentDate,
  });

  const exists =
    await payrollPeriodRepository.periodCodeExists(
      normalizedCode,
    );

  if (exists) {
    throw new ErrorHandler(
      `Kỳ lương ${normalizedCode} đã tồn tại`,
      409,
    );
  }

  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const created = await payrollPeriodRepository.createPayrollPeriod(
        {
          periodCode: normalizedCode,
          periodName: normalizedName,
          startDate,
          endDate,
          paymentDate,
          createdBy,
          managerId: managerId || createdBy,
          approverId: approverId || null,
          description: typeof description === "string" ? description.trim().slice(0, 2000) : null,
          scopeType: scopeType === "selected_units" ? "selected_units" : "enterprise",
          unitIds: Array.isArray(unitIds) ? unitIds.map(Number).filter(Number.isInteger) : [],
        }, client);
      await client.query("COMMIT");
      return mapPayrollPeriod(created);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error.code === "23505") {
      throw new ErrorHandler(
        `Kỳ lương ${normalizedCode} đã tồn tại`,
        409,
      );
    }

    if (error.code === "23503") {
      throw new ErrorHandler(
        "Nhân viên tạo kỳ lương không tồn tại",
        400,
      );
    }

    if (error.code === "23514") {
      throw new ErrorHandler(
        "Dữ liệu kỳ lương vi phạm quy tắc hệ thống",
        400,
      );
    }

    throw error;
  }
}

/**
 * Cập nhật kỳ lương bản nháp.
 */
export async function updatePayrollPeriod({
  periodId,
  periodName,
  startDate,
  endDate,
  paymentDate = null,
}) {
  const period = await requirePayrollPeriod(
    periodId,
  );

  if (period.status !== "draft") {
    throw new ErrorHandler(
      "Chỉ có thể cập nhật kỳ lương ở trạng thái bản nháp",
      409,
    );
  }

  const normalizedName = normalizeText(
    periodName,
    "Tên kỳ lương",
    {
      maxLength: 150,
    },
  );

  validatePeriodDates({
    periodCode: period.period_code,
    startDate,
    endDate,
    paymentDate,
  });

  const updated =
    await payrollPeriodRepository.updateDraftPayrollPeriod(
      {
        periodId,
        periodName: normalizedName,
        startDate,
        endDate,
        paymentDate,
      },
    );

  if (!updated) {
    throw new ErrorHandler(
      "Kỳ lương vừa được thay đổi, vui lòng tải lại dữ liệu",
      409,
    );
  }

  return mapPayrollPeriod(updated);
}

/**
 * Hủy kỳ lương bản nháp.
 *
 * Không cho hủy nếu kỳ đã có phiếu lương.
 */
export async function cancelPayrollPeriod(
  periodId,
) {
  const period = await requirePayrollPeriod(
    periodId,
  );

  if (period.status === "cancelled") {
    throw new ErrorHandler(
      "Kỳ lương này đã được hủy trước đó",
      409,
    );
  }

  if (period.status !== "draft") {
    throw new ErrorHandler(
      "Chỉ có thể hủy kỳ lương ở trạng thái bản nháp",
      409,
    );
  }

  const hasPayslips =
    await payrollPeriodRepository.hasPayslips(
      periodId,
    );

  if (hasPayslips) {
    throw new ErrorHandler(
      "Không thể hủy kỳ lương đã có phiếu lương",
      409,
    );
  }

  const cancelled =
    await payrollPeriodRepository.cancelDraftPayrollPeriod(
      {
        periodId,
      },
    );

  if (!cancelled) {
    throw new ErrorHandler(
      "Kỳ lương vừa được thay đổi, vui lòng tải lại dữ liệu",
      409,
    );
  }

  return mapPayrollPeriod(cancelled);
}

/**
 * Khóa kỳ lương đã phát hành.
 *
 * Điều kiện:
 * - Kỳ phải đang published.
 * - Phải có phiếu lương.
 * - Không còn phiếu đang chờ xác nhận.
 * - Không còn phản hồi nhân viên chưa xử lý.
 * - Không còn phiếu ở trạng thái adjusted nhưng chưa phát hành lại.
 */
export async function lockPayrollPeriod({
  periodId,
  lockedBy,
}) {
  const period = await requirePayrollPeriod(
    periodId,
  );

  if (period.status === "locked") {
    throw new ErrorHandler(
      "Kỳ lương này đã được khóa trước đó",
      409,
    );
  }

  if (period.status !== "published") {
    throw new ErrorHandler(
      "Chỉ có thể khóa kỳ lương đã được phát hành",
      409,
    );
  }

  const statistics =
    await payrollPeriodRepository.getPeriodPayslipStatistics(
      periodId,
    );

  const totalPayslips = toNumber(
    statistics.total_payslips,
  );

  if (totalPayslips === 0) {
    throw new ErrorHandler(
      "Không thể khóa kỳ lương chưa có phiếu lương",
      409,
    );
  }

  const waitingConfirmationCount = toNumber(
    statistics.waiting_confirmation_count,
  );

  if (waitingConfirmationCount > 0) {
    throw new ErrorHandler(
      `Còn ${waitingConfirmationCount} phiếu lương đang chờ nhân viên xác nhận`,
      409,
    );
  }

  const feedbackCount = toNumber(
    statistics.employee_feedback_count,
  );

  if (feedbackCount > 0) {
    throw new ErrorHandler(
      `Còn ${feedbackCount} phản hồi lương chưa được xử lý`,
      409,
    );
  }

  const adjustedCount = toNumber(
    statistics.adjusted_count,
  );

  if (adjustedCount > 0) {
    throw new ErrorHandler(
      `Còn ${adjustedCount} phiếu đã điều chỉnh nhưng chưa phát hành lại`,
      409,
    );
  }

  const negativeNetCount = toNumber(statistics.negative_net_count);
  if (negativeNetCount > 0) {
    throw new ErrorHandler(
      `Còn ${negativeNetCount} phiếu lương có thực lĩnh âm`,
      409,
    );
  }

  const locked =
    await payrollPeriodRepository.lockPayrollPeriod(
      {
        periodId,
        lockedBy,
      },
    );

  if (!locked) {
    throw new ErrorHandler(
      "Kỳ lương vừa được thay đổi, vui lòng tải lại dữ liệu",
      409,
    );
  }

  return mapPayrollPeriod({
    ...locked,

    total_payslips:
      statistics.total_payslips,

    confirmed_payslips:
      statistics.confirmed_count,

    feedback_payslips:
      statistics.employee_feedback_count,

    paid_payslips:
      statistics.paid_count,

    total_gross_income:
      statistics.total_gross_income,

    total_deductions:
      statistics.total_deductions,

    total_net_salary:
      statistics.total_net_salary,
  });
}

/**
 * Lấy thống kê kỳ lương.
 */
export async function getPayrollPeriodStatistics(
  periodId,
) {
  const period = await requirePayrollPeriod(
    periodId,
  );

  const statistics =
    await payrollPeriodRepository.getPeriodPayslipStatistics(
      periodId,
    );

  return {
    period: {
      id: Number(period.id),
      periodCode: period.period_code,
      periodName: period.period_name,
      status: period.status,
    },

    payslips: {
      total: toNumber(
        statistics.total_payslips,
      ),
      draft: toNumber(
        statistics.draft_count,
      ),
      waitingConfirmation: toNumber(
        statistics.waiting_confirmation_count,
      ),
      confirmed: toNumber(
        statistics.confirmed_count,
      ),
      employeeFeedback: toNumber(
        statistics.employee_feedback_count,
      ),
      adjusted: toNumber(
        statistics.adjusted_count,
      ),
      published: toNumber(
        statistics.published_count,
      ),
      paid: toNumber(
        statistics.paid_count,
      ),
    },

    amounts: {
      grossIncome: toNumber(
        statistics.total_gross_income,
      ),
      totalDeductions: toNumber(
        statistics.total_deductions,
      ),
      netSalary: toNumber(
        statistics.total_net_salary,
      ),
    },
  };
}
