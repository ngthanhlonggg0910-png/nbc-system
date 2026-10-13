import { ErrorHandler } from "../../middleware/errorMiddleware.js";

import * as payslipRepository from "../../repositories/payroll/payslip.repository.js";
import * as payrollPeriodRepository from "../../repositories/payroll/payrollPeriod.repository.js";

const EMPLOYEE_VISIBLE_STATUSES = [
  "waiting_confirmation",
  "confirmed",
  "employee_feedback",
  "adjusted",
  "published",
  "paid",
];

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

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

function roundCurrency(value) {
  return Math.round(toNumber(value));
}

function divideSafely(total, divisor) {
  if (!divisor || divisor <= 0) {
    return 0;
  }

  return roundCurrency(total / divisor);
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

function validateStaffId(staffId) {
  if (
    typeof staffId !== "string" ||
    !staffId.trim() ||
    staffId.trim().length > 30
  ) {
    throw new ErrorHandler(
      "Mã nhân viên không hợp lệ",
      400,
    );
  }
}

function validateYear(year) {
  if (
    !Number.isInteger(year) ||
    year < MIN_YEAR ||
    year > MAX_YEAR
  ) {
    throw new ErrorHandler(
      `Năm báo cáo phải nằm trong khoảng ${MIN_YEAR}-${MAX_YEAR}`,
      400,
    );
  }
}

function validateYearMonth(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(
      value.trim(),
    )
  ) {
    throw new ErrorHandler(
      "Tháng báo cáo phải có định dạng YYYY-MM",
      400,
    );
  }

  const year = Number(value.slice(0, 4));

  validateYear(year);
}

function mapEmployeeMonth(row) {
  return {
    payslipId: Number(row.id),
    periodCode: row.period_code,
    paymentDate: row.payment_date,

    amounts: {
      grossIncome: toNumber(
        row.gross_income,
      ),

      taxableIncome: toNumber(
        row.taxable_income,
      ),

      totalDeductions: toNumber(
        row.total_deductions,
      ),

      netSalary: toNumber(
        row.net_salary,
      ),
    },

    currentVersion: Number(
      row.current_version,
    ),

    status: row.status,
    publishedAt: row.published_at,
    signedAt: row.signed_at,
    paidAt: row.paid_at,
  };
}

function calculateEmployeeTotals(months) {
  return months.reduce(
    (result, month) => {
      result.grossIncome +=
        month.amounts.grossIncome;

      result.taxableIncome +=
        month.amounts.taxableIncome;

      result.totalDeductions +=
        month.amounts.totalDeductions;

      result.netSalary +=
        month.amounts.netSalary;

      return result;
    },
    {
      grossIncome: 0,
      taxableIncome: 0,
      totalDeductions: 0,
      netSalary: 0,
    },
  );
}

function calculateEmployeeAverages(
  totals,
  numberOfMonths,
) {
  return {
    grossIncome: divideSafely(
      totals.grossIncome,
      numberOfMonths,
    ),

    taxableIncome: divideSafely(
      totals.taxableIncome,
      numberOfMonths,
    ),

    totalDeductions: divideSafely(
      totals.totalDeductions,
      numberOfMonths,
    ),

    netSalary: divideSafely(
      totals.netSalary,
      numberOfMonths,
    ),
  };
}

/**
 * Báo cáo lương 12 tháng của một nhân viên.
 *
 * Ví dụ:
 * endMonth = 2026-07
 *
 * Khoảng dữ liệu:
 * 2025-08 → 2026-07
 */
export async function getEmployee12MonthReport({
  staffId,
  endMonth,
}) {
  validateStaffId(staffId);
  validateYearMonth(endMonth);

  const normalizedStaffId =
    staffId.trim();

  const normalizedEndMonth =
    endMonth.trim();

  const rows =
    await payslipRepository.findEmployee12MonthReport(
      {
        staffId: normalizedStaffId,
        endMonth: normalizedEndMonth,
        statuses:
          EMPLOYEE_VISIBLE_STATUSES,
      },
    );

  const months = rows.map(
    mapEmployeeMonth,
  );

  const totals =
    calculateEmployeeTotals(months);

  const numberOfMonths = months.length;

  const averages =
    calculateEmployeeAverages(
      totals,
      numberOfMonths,
    );

  const paidMonths = months.filter(
    (month) =>
      month.status === "paid" ||
      month.paidAt !== null,
  ).length;

  const confirmedMonths = months.filter(
    (month) =>
      month.status === "confirmed" ||
      month.signedAt !== null,
  ).length;

  return {
    staffId: normalizedStaffId,
    endMonth: normalizedEndMonth,

    range: {
      numberOfMonths,
      expectedMonths: 12,
      hasFull12Months:
        numberOfMonths === 12,
    },

    progress: {
      paidMonths,
      confirmedMonths,
      unpaidMonths:
        numberOfMonths - paidMonths,
      unconfirmedMonths:
        numberOfMonths -
        confirmedMonths,
    },

    months,
    totals,
    averages,
  };
}

/**
 * Báo cáo tổng quan một kỳ lương.
 */
export async function getPayrollPeriodReport(
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

  const statistics =
    await payrollPeriodRepository.getPeriodPayslipStatistics(
      periodId,
    );

  const totalPayslips = toNumber(
    statistics.total_payslips,
  );

  const confirmedCount = toNumber(
    statistics.confirmed_count,
  );

  const paidCount = toNumber(
    statistics.paid_count,
  );

  const feedbackCount = toNumber(
    statistics.employee_feedback_count,
  );

  return {
    period: {
      id: Number(period.id),
      code: period.period_code,
      name: period.period_name,
      startDate: period.start_date,
      endDate: period.end_date,
      paymentDate: period.payment_date,
      status: period.status,
      publishedAt: period.published_at,
      closedAt: period.closed_at,
    },

    payslips: {
      total: totalPayslips,

      draft: toNumber(
        statistics.draft_count,
      ),

      waitingConfirmation: toNumber(
        statistics.waiting_confirmation_count,
      ),

      confirmed: confirmedCount,

      employeeFeedback: feedbackCount,

      adjusted: toNumber(
        statistics.adjusted_count,
      ),

      published: toNumber(
        statistics.published_count,
      ),

      paid: paidCount,
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

    rates: {
      confirmationRate:
        totalPayslips > 0
          ? Number(
              (
                confirmedCount /
                totalPayslips *
                100
              ).toFixed(2),
            )
          : 0,

      paymentRate:
        totalPayslips > 0
          ? Number(
              (
                paidCount /
                totalPayslips *
                100
              ).toFixed(2),
            )
          : 0,

      feedbackRate:
        totalPayslips > 0
          ? Number(
              (
                feedbackCount /
                totalPayslips *
                100
              ).toFixed(2),
            )
          : 0,
    },
  };
}

/**
 * Báo cáo tổng hợp các kỳ lương trong một năm.
 */
export async function getPayrollYearReport(
  year,
) {
  validateYear(year);

  const periods =
    await payrollPeriodRepository.findPayrollPeriods(
      {
        year,
        status: null,
        limit: 100,
        offset: 0,
      },
    );

  const mappedPeriods = periods.map(
    (period) => ({
      id: Number(period.id),
      periodCode: period.period_code,
      periodName: period.period_name,
      status: period.status,
      paymentDate: period.payment_date,

      payslips: {
        total: toNumber(
          period.total_payslips,
        ),

        confirmed: toNumber(
          period.confirmed_payslips,
        ),

        feedback: toNumber(
          period.feedback_payslips,
        ),

        paid: toNumber(
          period.paid_payslips,
        ),
      },

      amounts: {
        grossIncome: toNumber(
          period.total_gross_income,
        ),

        totalDeductions: toNumber(
          period.total_deductions,
        ),

        netSalary: toNumber(
          period.total_net_salary,
        ),
      },
    }),
  );

  const totals = mappedPeriods.reduce(
    (result, period) => {
      result.totalPayslips +=
        period.payslips.total;

      result.confirmedPayslips +=
        period.payslips.confirmed;

      result.feedbackPayslips +=
        period.payslips.feedback;

      result.paidPayslips +=
        period.payslips.paid;

      result.grossIncome +=
        period.amounts.grossIncome;

      result.totalDeductions +=
        period.amounts.totalDeductions;

      result.netSalary +=
        period.amounts.netSalary;

      return result;
    },
    {
      totalPayslips: 0,
      confirmedPayslips: 0,
      feedbackPayslips: 0,
      paidPayslips: 0,
      grossIncome: 0,
      totalDeductions: 0,
      netSalary: 0,
    },
  );

  const activePeriods =
    mappedPeriods.filter(
      (period) =>
        period.status !== "cancelled",
    );

  return {
    year,

    periodSummary: {
      totalPeriods: mappedPeriods.length,

      activePeriods:
        activePeriods.length,

      draftPeriods:
        mappedPeriods.filter(
          (period) =>
            period.status === "draft",
        ).length,

      publishedPeriods:
        mappedPeriods.filter(
          (period) =>
            period.status ===
            "published",
        ).length,

      lockedPeriods:
        mappedPeriods.filter(
          (period) =>
            period.status === "locked",
        ).length,

      cancelledPeriods:
        mappedPeriods.filter(
          (period) =>
            period.status ===
            "cancelled",
        ).length,
    },

    totals,

    monthlyAverage: {
      grossIncome: divideSafely(
        totals.grossIncome,
        activePeriods.length,
      ),

      totalDeductions: divideSafely(
        totals.totalDeductions,
        activePeriods.length,
      ),

      netSalary: divideSafely(
        totals.netSalary,
        activePeriods.length,
      ),
    },

    periods: mappedPeriods,
  };
}

/**
 * Báo cáo dashboard nhanh dành cho HR.
 *
 * Mặc định sử dụng năm hiện tại.
 */
export async function getPayrollDashboardReport({
  year = new Date().getFullYear(),
} = {}) {
  validateYear(year);

  const yearReport =
    await getPayrollYearReport(year);

  const periods =
    yearReport.periods;

  const latestPeriod =
    periods.length > 0
      ? periods[0]
      : null;

  return {
    year,

    overview: {
      totalPeriods:
        yearReport.periodSummary
          .totalPeriods,

      publishedPeriods:
        yearReport.periodSummary
          .publishedPeriods,

      lockedPeriods:
        yearReport.periodSummary
          .lockedPeriods,

      totalPayslips:
        yearReport.totals
          .totalPayslips,

      totalNetSalary:
        yearReport.totals
          .netSalary,

      pendingFeedbacks:
        yearReport.totals
          .feedbackPayslips,
    },

    latestPeriod,

    periods,
  };
}