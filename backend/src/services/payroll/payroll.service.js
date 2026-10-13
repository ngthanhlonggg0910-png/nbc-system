import { ErrorHandler } from "../../middleware/errorMiddleware.js";

import * as payslipRepository from "../../repositories/payroll/payslip.repository.js";
import * as payslipDetailRepository from "../../repositories/payroll/payslipDetail.repository.js";
import * as payrollVersionRepository from "../../repositories/payroll/payrollVersion.repository.js";
import * as payrollFeedbackRepository from "../../repositories/payroll/payrollFeedback.repository.js";
import { getEffectiveEmployeePolicy } from "./payrollThirteenthMonth.service.js";

import {
  compareSnapshotItems,
  compareSnapshotSummary,
} from "./payrollVersionComparison.service.js";

const EMPLOYEE_VISIBLE_STATUSES = [
  "waiting_confirmation",
  "confirmed",
  "employee_feedback",
  "adjusted",
  "published",
  "paid",
];

const EMPLOYEE_ANNUAL_REPORT_STATUSES = [
  "confirmed",
  "published",
  "paid",
];

/**
 * PostgreSQL trả NUMERIC dưới dạng string.
 * Hàm này chuyển an toàn sang number để frontend dễ tính toán.
 */
function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function validatePositiveInteger(value, fieldName) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ErrorHandler(`${fieldName} không hợp lệ`, 400);
  }
}

function validateYear(year) {
  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100
  ) {
    throw new ErrorHandler("Năm tra cứu không hợp lệ", 400);
  }
}

function validateYearMonth(value, fieldName = "Tháng") {
  const pattern = /^\d{4}-(0[1-9]|1[0-2])$/;

  if (!pattern.test(value)) {
    throw new ErrorHandler(
      `${fieldName} phải có định dạng YYYY-MM`,
      400,
    );
  }
}

function calculateOffset(page, limit) {
  return (page - 1) * limit;
}

function calculateTotalPages(totalItems, limit) {
  return totalItems === 0
    ? 0
    : Math.ceil(totalItems / limit);
}

function calculateTenure(hireDate, periodEndDate) {
  if (!hireDate || !periodEndDate) {
    return null;
  }

  const toDateOnly = (value) => {
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    return String(value).slice(0, 10);
  };

  const start = new Date(`${toDateOnly(hireDate)}T00:00:00Z`);
  const end = new Date(`${toDateOnly(periodEndDate)}T00:00:00Z`);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start > end
  ) {
    return null;
  }

  let years = end.getUTCFullYear() - start.getUTCFullYear();
  let months = end.getUTCMonth() - start.getUTCMonth();

  if (end.getUTCDate() < start.getUTCDate()) {
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const display = [
    years > 0 ? `${years} năm` : null,
    months > 0 || years === 0 ? `${months} tháng` : null,
  ].filter(Boolean).join(" ");

  return {
    years,
    months,
    display,
  };
}

/**
 * Chuẩn hóa thông tin tổng quan phiếu lương.
 */
function mapPayslipSummary(row) {
  return {
    id: Number(row.id),
    periodCode: row.period_code,
    employee: {
      staffId: row.staff_id,
      fullName: row.employee_name,
      department: row.department,
      jobTitle: row.job_title,
    },
    attendance: {
      workDays: toNumber(row.work_days),
      totalWorkDays: toNumber(row.total_work_days),
    },
    salary: {
      grossIncome: toNumber(row.gross_income),
      taxableIncome: toNumber(row.taxable_income),
      totalDeductions: toNumber(row.total_deductions),
      netSalary: toNumber(row.net_salary),
    },
    currentVersion: Number(row.current_version),
    status: row.status,
    paymentDate: row.payment_date,
    publishedAt: row.published_at,
    publishedBy: row.published_by,
    signedAt: row.signed_at,
    paidAt: row.paid_at,
  };
}

function mapPayslipDetail(row) {
  return {
    id: Number(row.id),
    salaryItemId: Number(row.salary_item_id),
    code: row.item_code,
    label: row.item_label,
    category: row.category,
    taxable: row.taxable,
    includeIn12MonthAverage: row.include_in_12month_average,
    displayOrder: Number(row.display_order),
    amount: toNumber(row.amount),
    quantity: toNullableNumber(row.quantity),
    rate: toNullableNumber(row.rate),
    description: row.description,
  };
}

function groupPayslipDetails(rows) {
  const incomeItems = [];
  const deductionItems = [];

  for (const row of rows) {
    const item = mapPayslipDetail(row);

    if (item.category === "income") {
      incomeItems.push(item);
    }

    if (item.category === "deduction") {
      deductionItems.push(item);
    }
  }

  return {
    incomeItems,
    deductionItems,
  };
}

/**
 * Tìm phiếu lương và kiểm tra quyền sở hữu.
 *
 * Không được chỉ tìm bằng payslipId vì nhân viên có thể sửa URL
 * để truy cập phiếu lương của người khác.
 */
async function requireEmployeePayslip({
  staffId,
  payslipId,
}) {
  validatePositiveInteger(payslipId, "Mã phiếu lương");

  const payslip =
    await payslipRepository.findEmployeePayslipById({
      payslipId,
      staffId,
      visibleStatuses: EMPLOYEE_VISIBLE_STATUSES,
    });

  if (!payslip) {
    throw new ErrorHandler(
      "Không tìm thấy phiếu lương hoặc phiếu chưa được phát hành",
      404,
    );
  }

  return payslip;
}

/**
 * Lấy danh sách phiếu lương của nhân viên.
 */
export async function getEmployeePayslips({
  staffId,
  year,
  page = 1,
  limit = 12,
}) {
  if (!staffId) {
    throw new ErrorHandler(
      "Không xác định được nhân viên đăng nhập",
      401,
    );
  }

  validateYear(year);
  validatePositiveInteger(page, "Trang");
  validatePositiveInteger(limit, "Số bản ghi");

  if (limit > 50) {
    throw new ErrorHandler(
      "Mỗi trang không được vượt quá 50 bản ghi",
      400,
    );
  }

  const offset = calculateOffset(page, limit);

  const [rows, totalItems] = await Promise.all([
    payslipRepository.findEmployeePayslips({
      staffId,
      year,
      statuses: EMPLOYEE_VISIBLE_STATUSES,
      limit,
      offset,
    }),

    payslipRepository.countEmployeePayslips({
      staffId,
      year,
      statuses: EMPLOYEE_VISIBLE_STATUSES,
    }),
  ]);

  return {
    data: rows.map(mapPayslipSummary),

    pagination: {
      page,
      limit,
      totalItems,
      totalPages: calculateTotalPages(
        totalItems,
        limit,
      ),
    },
  };
}

/**
 * Lấy toàn bộ chi tiết của một phiếu lương.
 */
export async function getEmployeePayslipDetail({
  staffId,
  payslipId,
}) {
  if (!staffId) {
    throw new ErrorHandler(
      "Không xác định được nhân viên đăng nhập",
      401,
    );
  }

  const payslip = await requireEmployeePayslip({
    staffId,
    payslipId,
  });

  const [detailRows, feedbackRows] = await Promise.all([
    payslipDetailRepository.findVisibleDetailsByPayslipId(
      payslipId,
    ),
    payrollFeedbackRepository.findEmployeeFeedbacksByPayslip(
      {
        payslipId,
        staffId,
      },
    ),
  ]);

  const {
    incomeItems,
    deductionItems,
  } = groupPayslipDetails(detailRows);

  const tenure = calculateTenure(
    payslip.hire_date,
    payslip.end_date,
  );

  return {
    id: Number(payslip.id),

    period: {
      code: payslip.period_code,
      name: payslip.period_name,
      startDate: payslip.start_date,
      endDate: payslip.end_date,
      paymentDate: payslip.payment_date,
    },

    employee: {
      staffId: payslip.staff_id,
      fullName: payslip.employee_name,
      department: payslip.department,
      jobTitle: payslip.job_title,
      hireDate: payslip.hire_date,
      tenure,
      salaryCoefficient: toNullableNumber(
        payslip.base_coefficient,
      ),
    },

    attendance: {
      actualWorkDays: toNumber(payslip.work_days),
      standardWorkDays: toNumber(
        payslip.total_work_days,
      ),
      workDays: toNumber(payslip.work_days),
      totalWorkDays: toNumber(payslip.total_work_days),
      source:
        Number(payslip.attendance_rows) > 0
          ? "attendance_entries"
          : "payslip_snapshot",
      seniority:
        tenure?.display ??
        payslip.imported_seniority ??
        null,
    },

    coefficients: {
      baseCoefficient: toNullableNumber(
        payslip.base_coefficient,
      ),
    },

    income: {
      baseSalary: toNumber(payslip.base_salary),
      attendanceSalary: toNumber(
        payslip.attendance_salary,
      ),
      overtimeSalary: toNumber(
        payslip.overtime_salary,
      ),
      totalAllowance: toNumber(
        payslip.total_allowance,
      ),
      totalBonus: toNumber(
        payslip.total_bonus,
      ),
      grossIncome: toNumber(
        payslip.gross_income,
      ),
      taxableIncome: toNumber(
        payslip.taxable_income,
      ),
      items: incomeItems,
    },

    deductions: {
      socialInsurance: toNumber(
        payslip.social_insurance,
      ),
      healthInsurance: toNumber(
        payslip.health_insurance,
      ),
      unemploymentInsurance: toNumber(
        payslip.unemployment_insurance,
      ),
      personalIncomeTax: toNumber(
        payslip.personal_income_tax,
      ),
      totalDeductions: toNumber(
        payslip.total_deductions,
      ),
      items: deductionItems,
    },

    payment: {
      netSalary: toNumber(payslip.net_salary),
      reference: payslip.payment_reference,
      paidAt: payslip.paid_at,
    },

    status: payslip.status,
    currentVersion: Number(
      payslip.current_version,
    ),
    employeeComment: payslip.employee_comment,
    calculatedAt: payslip.calculated_at,
    publishedAt: payslip.published_at,
    signedAt: payslip.signed_at,
    confirmedBy: payslip.confirmed_by,
    confirmation: {
      confirmed: Boolean(payslip.signed_at),
      confirmedAt: payslip.signed_at,
      confirmedBy: payslip.confirmed_by,
    },
    feedbackSummary: {
      openCount: feedbackRows.filter((feedback) =>
        ["pending", "reviewing", "accepted", "adjusted"].includes(
          feedback.status,
        ),
      ).length,
      latestStatus: feedbackRows[0]?.status ?? null,
      latest: feedbackRows[0]
        ? {
            id: Number(feedbackRows[0].id),
            code: feedbackRows[0].feedback_code,
            issueType: feedbackRows[0].issue_type,
            salaryItemId: feedbackRows[0].salary_item_id
              ? Number(feedbackRows[0].salary_item_id)
              : null,
            salaryItemLabel: feedbackRows[0].salary_item_label,
            category: feedbackRows[0].category,
            status: feedbackRows[0].status,
            content: feedbackRows[0].content,
            proposedValue: feedbackRows[0].proposed_value,
            hrReply: feedbackRows[0].hr_reply,
            createdAt: feedbackRows[0].created_at,
            updatedAt: feedbackRows[0].updated_at,
          }
        : null,
    },
    createdAt: payslip.created_at,
    updatedAt: payslip.updated_at,
  };
}

/**
 * Nhân viên xác nhận phiếu lương.
 */
export async function confirmEmployeePayslip({
  staffId,
  payslipId,
}) {
  if (!staffId) {
    throw new ErrorHandler(
      "Không xác định được nhân viên đăng nhập",
      401,
    );
  }

  const payslip = await requireEmployeePayslip({
    staffId,
    payslipId,
  });

  if (payslip.status === "confirmed") {
    throw new ErrorHandler(
      "Phiếu lương này đã được xác nhận trước đó",
      409,
    );
  }

  if (payslip.status === "paid") {
    throw new ErrorHandler(
      "Phiếu lương đã thanh toán, không thể xác nhận lại",
      409,
    );
  }

  if (payslip.status === "employee_feedback") {
    throw new ErrorHandler(
      "Phiếu lương đang có phản hồi chờ HR xử lý",
      409,
    );
  }

  const allowedStatuses = [
    "waiting_confirmation",
    "adjusted",
    "published",
  ];

  if (!allowedStatuses.includes(payslip.status)) {
    throw new ErrorHandler(
      "Trạng thái phiếu lương hiện tại không cho phép xác nhận",
      409,
    );
  }

  const confirmed =
    await payslipRepository.confirmEmployeePayslip({
      payslipId,
      staffId,
      expectedStatuses: allowedStatuses,
    });

  if (!confirmed) {
    throw new ErrorHandler(
      "Phiếu lương vừa được thay đổi, vui lòng tải lại dữ liệu",
      409,
    );
  }

  return {
    id: Number(confirmed.id),
    staffId: confirmed.staff_id,
    periodCode: confirmed.period_code,
    status: confirmed.status,
    signedAt: confirmed.signed_at,
    message:
      "Bạn đã xác nhận thông tin phiếu lương chính xác",
  };
}

/**
 * Báo cáo lương lũy kế 12 tháng.
 */
export async function getEmployeePayroll12MonthReport({
  staffId,
  year,
}) {
  if (!staffId) {
    throw new ErrorHandler(
      "Không xác định được nhân viên đăng nhập",
      401,
    );
  }

  validateYear(year);

  const [row, thirteenthMonth] = await Promise.all([
    payslipRepository.findEmployeeAnnualSummary({
      staffId,
      year,
      statuses: EMPLOYEE_ANNUAL_REPORT_STATUSES,
    }),
    getEffectiveEmployeePolicy({ staffId, year }),
  ]);

  const months = (row?.monthly ?? []).map((month) => ({
    payslipId: Number(month.id),
    periodCode: month.periodCode,
    grossIncome: toNumber(month.grossIncome),
    taxableIncome: toNumber(
      month.taxableIncome,
    ),
    totalDeductions: toNumber(
      month.totalDeductions,
    ),
    netSalary: toNumber(month.netSalary),
    currentVersion: Number(month.currentVersion),
    status: month.status,
    paymentDate: month.paymentDate,
    publishedAt: month.publishedAt,
    signedAt: month.signedAt,
    paidAt: month.paidAt,
  }));

  const releasedPeriodCount = toNumber(
    row?.released_period_count,
  );

  const totals = {
    grossIncome: toNumber(row?.total_income),
    taxableIncome: toNumber(row?.total_taxable_income),
    totalDeductions: toNumber(row?.total_deductions),
    netSalary: toNumber(row?.total_net_salary),
  };

  const averages = {
    netSalary: toNumber(row?.average_net_salary),
  };

  const latest = row?.latest_payslip;
  const latestPayslip = latest
    ? {
        payslipId: Number(latest.id),
        periodCode: latest.periodCode,
        paymentDate: latest.paymentDate,
        status: latest.status,
        publishedAt: latest.publishedAt,
        paidAt: latest.paidAt,
      }
    : null;

  return {
    staffId,
    year,
    endMonth: `${year}-12`,
    releasedPeriodCount,
    numberOfMonths: releasedPeriodCount,
    months,
    monthly: months,
    totals,
    averages,
    totalIncome: totals.grossIncome,
    totalTaxableIncome: totals.taxableIncome,
    totalDeductions: totals.totalDeductions,
    totalNetSalary: totals.netSalary,
    averageNetSalary: averages.netSalary,
    latestPayslip,
    thirteenthMonth: {
      ...thirteenthMonth,
      estimatedAmount: thirteenthMonth.configured
        ? Math.round(averages.netSalary * thirteenthMonth.coefficient)
        : null,
    },
  };
}

/**
 * Lấy lịch sử phiên bản phiếu lương.
 */
export async function getEmployeePayslipVersions({
  staffId,
  payslipId,
}) {
  if (!staffId) {
    throw new ErrorHandler(
      "Không xác định được nhân viên đăng nhập",
      401,
    );
  }

  const payslip = await requireEmployeePayslip({
    staffId,
    payslipId,
  });

  const versions =
    await payrollVersionRepository.findPublishedVersions({
      payslipId,
    });

  return {
    payslipId: Number(payslip.id),
    periodCode: payslip.period_code,
    currentVersion: Number(
      payslip.current_version,
    ),

    versions: versions.map((version) => ({
      id: Number(version.id),
      versionNumber: Number(
        version.version_number,
      ),
      changeReason: version.change_reason,
      createdBy: version.created_by,
      createdByName: version.created_by_name,
      createdAt: version.created_at,
      publishedAt: version.published_at,

      isCurrent:
        Number(version.version_number) ===
        Number(payslip.current_version),
    })),
  };
}

/**
 * Đối chiếu hai phiên bản phiếu lương.
 *
 * Kết quả trả về cả:
 * - Chênh lệch tổng.
 * - Chi tiết khoản tăng.
 * - Chi tiết khoản giảm.
 * - Khoản không thay đổi.
 */
export async function compareEmployeePayslipVersions({
  staffId,
  payslipId,
  fromVersion,
  toVersion,
}) {
  if (!staffId) {
    throw new ErrorHandler(
      "Không xác định được nhân viên đăng nhập",
      401,
    );
  }

  validatePositiveInteger(
    fromVersion,
    "Phiên bản cũ",
  );

  validatePositiveInteger(
    toVersion,
    "Phiên bản mới",
  );

  if (fromVersion === toVersion) {
    throw new ErrorHandler(
      "Hai phiên bản đối chiếu phải khác nhau",
      400,
    );
  }

  const payslip = await requireEmployeePayslip({
    staffId,
    payslipId,
  });

  const [fromRecord, toRecord] =
    await Promise.all([
      payrollVersionRepository.findPublishedVersion({
        payslipId,
        versionNumber: fromVersion,
      }),

      payrollVersionRepository.findPublishedVersion({
        payslipId,
        versionNumber: toVersion,
      }),
    ]);

  if (!fromRecord) {
    throw new ErrorHandler(
      `Không tìm thấy phiên bản ${fromVersion}`,
      404,
    );
  }

  if (!toRecord) {
    throw new ErrorHandler(
      `Không tìm thấy phiên bản ${toVersion}`,
      404,
    );
  }

  const itemChanges = compareSnapshotItems(
    fromRecord.snapshot,
    toRecord.snapshot,
  );

  return {
    payslipId: Number(payslip.id),
    periodCode: payslip.period_code,

    fromVersion: {
      versionNumber: Number(
        fromRecord.version_number,
      ),
      createdAt: fromRecord.created_at,
      publishedAt: fromRecord.published_at,
      changeReason: fromRecord.change_reason,
    },

    toVersion: {
      versionNumber: Number(
        toRecord.version_number,
      ),
      createdAt: toRecord.created_at,
      publishedAt: toRecord.published_at,
      changeReason: toRecord.change_reason,
    },

    summaryChanges: compareSnapshotSummary(
      fromRecord.snapshot,
      toRecord.snapshot,
    ),

    itemChanges,

    increasedItems: itemChanges.filter(
      (item) => item.difference > 0,
    ),

    decreasedItems: itemChanges.filter(
      (item) => item.difference < 0,
    ),

    unchangedItems: itemChanges.filter(
      (item) => item.difference === 0,
    ),
  };
}
