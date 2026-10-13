const PAYROLL_STATUS_LABELS = {
  draft: "Bản nháp",
  validated: "Đã kiểm tra",
  waiting_confirmation: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  employee_feedback: "Đang phản hồi",
  adjusted: "Đã điều chỉnh",
  published: "Đã phát hành",
  paid: "Đã thanh toán",
  cancelled: "Đã hủy",
};

const PAYROLL_STATUS_TONES = {
  draft: "neutral",
  validated: "info",
  waiting_confirmation: "warning",
  confirmed: "success",
  employee_feedback: "warning",
  adjusted: "info",
  published: "success",
  paid: "success",
  cancelled: "danger",
};

export function toNumber(value, fallback = 0) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

export function formatPayrollMoney(value) {
  return new Intl.NumberFormat("vi-VN").format(
    toNumber(value),
  );
}

export function formatPayrollDate(value) {
  if (!value) {
    return "Chưa cập nhật";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("vi-VN").format(
    date,
  );
}

export function formatPayrollMonth(periodCode) {
  if (!periodCode) {
    return "--/----";
  }

  const match = String(periodCode).match(
    /^(\d{4})-(\d{2})$/,
  );

  if (!match) {
    return String(periodCode);
  }

  const [, year, month] = match;

  return `${month}/${year}`;
}

export function getPayrollYear(periodCode) {
  if (!periodCode) {
    return null;
  }

  const year = Number(
    String(periodCode).slice(0, 4),
  );

  return Number.isInteger(year)
    ? year
    : null;
}

export function getPayrollStatusLabel(status) {
  return (
    PAYROLL_STATUS_LABELS[status] ??
    status ??
    "Chưa xác định"
  );
}

export function getPayrollStatusTone(status) {
  return (
    PAYROLL_STATUS_TONES[status] ??
    "neutral"
  );
}

export function mapSalaryItem(item = {}) {
  return {
    id: toNumber(
      item.id,
      null,
    ),

    // id là khóa của payslip_details; salaryItemId mới là khóa ổn định
    // của salary_master_items dùng khi tạo phản hồi.
    salaryItemId: toNumber(
      item.salaryItemId ??
        item.salary_item_id ??
        item.criterionId ??
        item.criterion_id,
      null,
    ),

    code:
      item.code ??
      item.itemCode ??
      item.item_code ??
      "",

    label:
      item.label ??
      item.itemLabel ??
      item.item_label ??
      "Khoản lương",

    category:
      item.category ?? "income",

    amount: toNumber(item.amount),

    quantity:
      item.quantity === null ||
      item.quantity === undefined
        ? null
        : toNumber(item.quantity),

    rate:
      item.rate === null ||
      item.rate === undefined
        ? null
        : toNumber(item.rate),

    taxable: Boolean(
      item.taxable ??
        item.isTaxable ??
        item.is_taxable,
    ),

    includeIn12MonthAverage: Boolean(
      item.includeIn12MonthAverage ??
        item.include_in_12month_average,
    ),

    description:
      item.description ?? "",

    displayOrder: toNumber(
      item.displayOrder ??
        item.display_order,
    ),
  };
}

/**
 * Chuẩn hóa một dòng từ API:
 * GET /api/payroll/me
 */
export function mapPayslipSummary(row = {}) {
  const salary = row.salary ?? {};
  const employee = row.employee ?? {};
  const attendance = row.attendance ?? {};

  const id = toNumber(
    row.id ??
      row.payslipId ??
      row.payslip_id,
    null,
  );

  const periodCode =
    row.periodCode ??
    row.period_code ??
    row.month ??
    "";

  const status = row.status ?? "published";

  return {
    id,
    payslipId: id,

    periodCode,
    month: formatPayrollMonth(periodCode),
    year: getPayrollYear(periodCode),

    employee: {
      staffId:
        employee.staffId ??
        row.staffId ??
        row.staff_id ??
        "",

      fullName:
        employee.fullName ??
        row.employeeName ??
        row.employee_name ??
        "",

      department:
        employee.department ??
        row.department ??
        "",

      jobTitle:
        employee.jobTitle ??
        row.jobTitle ??
        row.job_title ??
        "",
    },

    attendance: {
      workDays: toNumber(
        attendance.workDays ??
          row.workDays ??
          row.work_days,
      ),

      totalWorkDays: toNumber(
        attendance.totalWorkDays ??
          row.totalWorkDays ??
          row.total_work_days,
      ),
    },

    salary: {
      grossIncome: toNumber(
        salary.grossIncome ??
          row.grossIncome ??
          row.gross_income ??
          row.gross,
      ),

      taxableIncome: toNumber(
        salary.taxableIncome ??
          row.taxableIncome ??
          row.taxable_income ??
          row.taxable,
      ),

      totalDeductions: toNumber(
        salary.totalDeductions ??
          row.totalDeductions ??
          row.total_deductions ??
          row.deductions,
      ),

      netSalary: toNumber(
        salary.netSalary ??
          row.netSalary ??
          row.net_salary ??
          row.net,
      ),
    },

    currentVersion: toNumber(
      row.currentVersion ??
        row.current_version,
      1,
    ),

    status,
    statusLabel: getPayrollStatusLabel(status),
    statusTone: getPayrollStatusTone(status),

    paymentDate:
      row.paymentDate ??
      row.payment_date ??
      null,

    publishedAt:
      row.publishedAt ??
      row.published_at ??
      null,

    publishedBy:
      row.publishedBy ??
      row.published_by ??
      null,

    signedAt:
      row.signedAt ??
      row.signed_at ??
      null,

    paidAt:
      row.paidAt ??
      row.paid_at ??
      null,
  };
}

export function mapPayslipList(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map(mapPayslipSummary)
    .filter((payslip) => payslip.id !== null)
    .sort((first, second) =>
      String(second.periodCode).localeCompare(
        String(first.periodCode),
      ),
    );
}

/**
 * Chuẩn hóa dữ liệu từ API:
 * GET /api/payroll/me/:payslipId
 */
export function mapPayslipDetail(data = {}) {
  const period = data.period ?? {};
  const employee = data.employee ?? {};
  const attendance = data.attendance ?? {};
  const coefficients = data.coefficients ?? {};
  const income = data.income ?? {};
  const deductions = data.deductions ?? {};
  const payment = data.payment ?? {};

  const incomeItems = Array.isArray(income.items)
    ? income.items.map(mapSalaryItem)
    : [];

  const deductionItems = Array.isArray(
    deductions.items,
  )
    ? deductions.items.map(mapSalaryItem)
    : [];

  const calculatedGrossIncome =
    incomeItems.reduce(
      (total, item) =>
        total + item.amount,
      0,
    );

  const calculatedDeductions =
    deductionItems.reduce(
      (total, item) =>
        total + item.amount,
      0,
    );

  const grossIncome = toNumber(
    income.grossIncome,
    calculatedGrossIncome,
  );

  const totalDeductions = toNumber(
    deductions.totalDeductions,
    calculatedDeductions,
  );

  const netSalary = toNumber(
    payment.netSalary,
    grossIncome - totalDeductions,
  );

  const status = data.status ?? "published";

  return {
    id: toNumber(
      data.id ??
        data.payslipId ??
        data.payslip_id,
      null,
    ),

    period: {
      code:
        period.code ??
        data.periodCode ??
        data.period_code ??
        "",

      name:
        period.name ??
        data.periodName ??
        data.period_name ??
        "",

      startDate:
        period.startDate ??
        period.start_date ??
        null,

      endDate:
        period.endDate ??
        period.end_date ??
        null,

      paymentDate:
        period.paymentDate ??
        period.payment_date ??
        null,
    },

    employee: {
      staffId:
        employee.staffId ??
        employee.staff_id ??
        "",

      fullName:
        employee.fullName ??
        employee.full_name ??
        "",

      department:
        employee.department ?? "",

      jobTitle:
        employee.jobTitle ??
        employee.job_title ??
        "",

      hireDate:
        employee.hireDate ??
        employee.hire_date ??
        null,

      tenure:
        employee.tenure ?? null,

      salaryCoefficient:
        employee.salaryCoefficient ??
        employee.salary_coefficient ??
        null,
    },

    attendance: {
      actualWorkDays: toNumber(
        attendance.actualWorkDays ??
          attendance.actual_work_days ??
          attendance.workDays ??
          attendance.work_days,
      ),

      standardWorkDays: toNumber(
        attendance.standardWorkDays ??
          attendance.standard_work_days ??
          attendance.totalWorkDays ??
          attendance.total_work_days,
      ),
      workDays: toNumber(
        attendance.workDays ??
          attendance.work_days,
      ),

      totalWorkDays: toNumber(
        attendance.totalWorkDays ??
          attendance.total_work_days,
      ),

      seniority:
        attendance.seniority ?? null,

      source: attendance.source ?? null,
    },

    coefficients: {
      baseCoefficient:
        coefficients.baseCoefficient ??
        coefficients.base_coefficient ??
        null,
    },

    confirmation: data.confirmation ?? {
      confirmed: Boolean(data.signedAt ?? data.signed_at),
      confirmedAt: data.signedAt ?? data.signed_at ?? null,
      confirmedBy: data.confirmedBy ?? data.confirmed_by ?? null,
    },

    feedbackSummary:
      data.feedbackSummary ??
      data.feedback_summary ??
      { openCount: 0, latestStatus: null, latest: null },

    income: {
      baseSalary: toNumber(
        income.baseSalary ??
          income.base_salary,
      ),

      attendanceSalary: toNumber(
        income.attendanceSalary ??
          income.attendance_salary,
      ),

      overtimeSalary: toNumber(
        income.overtimeSalary ??
          income.overtime_salary,
      ),

      totalAllowance: toNumber(
        income.totalAllowance ??
          income.total_allowance,
      ),

      totalBonus: toNumber(
        income.totalBonus ??
          income.total_bonus,
      ),

      grossIncome,

      taxableIncome: toNumber(
        income.taxableIncome ??
          income.taxable_income,
      ),

      items: incomeItems,
    },

    deductions: {
      socialInsurance: toNumber(
        deductions.socialInsurance ??
          deductions.social_insurance,
      ),

      healthInsurance: toNumber(
        deductions.healthInsurance ??
          deductions.health_insurance,
      ),

      unemploymentInsurance: toNumber(
        deductions.unemploymentInsurance ??
          deductions.unemployment_insurance,
      ),

      personalIncomeTax: toNumber(
        deductions.personalIncomeTax ??
          deductions.personal_income_tax,
      ),

      totalDeductions,
      items: deductionItems,
    },

    payment: {
      netSalary,

      reference:
        payment.reference ??
        payment.paymentReference ??
        payment.payment_reference ??
        null,

      paidAt:
        payment.paidAt ??
        payment.paid_at ??
        null,
    },

    status,
    statusLabel: getPayrollStatusLabel(status),
    statusTone: getPayrollStatusTone(status),

    currentVersion: toNumber(
      data.currentVersion ??
        data.current_version,
      1,
    ),

    employeeComment:
      data.employeeComment ??
      data.employee_comment ??
      null,

    calculatedAt:
      data.calculatedAt ??
      data.calculated_at ??
      null,

    publishedAt:
      data.publishedAt ??
      data.published_at ??
      null,

    signedAt:
      data.signedAt ??
      data.signed_at ??
      null,

    createdAt:
      data.createdAt ??
      data.created_at ??
      null,

    updatedAt:
      data.updatedAt ??
      data.updated_at ??
      null,
  };
}

function mapReportMonth(month = {}) {
  const periodCode =
    month.periodCode ??
    month.period_code ??
    "";

  return {
    payslipId: toNumber(
      month.payslipId ??
        month.payslip_id ??
        month.id,
      null,
    ),

    periodCode,
    month: formatPayrollMonth(periodCode),

    grossIncome: toNumber(
      month.grossIncome ??
        month.gross_income,
    ),

    taxableIncome: toNumber(
      month.taxableIncome ??
        month.taxable_income,
    ),

    totalDeductions: toNumber(
      month.totalDeductions ??
        month.total_deductions,
    ),

    netSalary: toNumber(
      month.netSalary ??
        month.net_salary,
    ),

    status: month.status,

    statusLabel: getPayrollStatusLabel(
      month.status,
    ),

    paymentDate:
      month.paymentDate ??
      month.payment_date ??
      null,

    publishedAt:
      month.publishedAt ??
      month.published_at ??
      null,

    paidAt:
      month.paidAt ??
      month.paid_at ??
      null,
  };
}

/**
 * Chuẩn hóa dữ liệu từ API:
 * GET /api/payroll/me/12-month
 */
export function mapPayroll12MonthReport(
  data,
) {
  if (!data) {
    return null;
  }

  const months = Array.isArray(data.months)
    ? data.months
        .map(mapReportMonth)
        .sort((first, second) =>
          String(first.periodCode).localeCompare(
            String(second.periodCode),
          ),
        )
    : [];

  const calculatedTotals = months.reduce(
    (result, month) => ({
      grossIncome:
        result.grossIncome +
        month.grossIncome,

      taxableIncome:
        result.taxableIncome +
        month.taxableIncome,

      totalDeductions:
        result.totalDeductions +
        month.totalDeductions,

      netSalary:
        result.netSalary +
        month.netSalary,
    }),
    {
      grossIncome: 0,
      taxableIncome: 0,
      totalDeductions: 0,
      netSalary: 0,
    },
  );

  const numberOfMonths = toNumber(
    data.releasedPeriodCount ??
      data.released_period_count ??
      data.numberOfMonths ??
      data.number_of_months,
    months.length,
  );

  const backendTotals = data.totals ?? {};
  const backendAverages = data.averages ?? {};

  const totals = {
    grossIncome: toNumber(
      backendTotals.grossIncome,
      calculatedTotals.grossIncome,
    ),

    taxableIncome: toNumber(
      backendTotals.taxableIncome,
      calculatedTotals.taxableIncome,
    ),

    totalDeductions: toNumber(
      backendTotals.totalDeductions,
      calculatedTotals.totalDeductions,
    ),

    netSalary: toNumber(
      backendTotals.netSalary,
      calculatedTotals.netSalary,
    ),
  };

  return {
    staffId:
      data.staffId ??
      data.staff_id ??
      "",

    endMonth:
      data.endMonth ??
      data.end_month ??
      "",

    year: toNumber(
      data.year,
      getPayrollYear(months[0]?.periodCode),
    ),

    releasedPeriodCount: numberOfMonths,
    numberOfMonths,
    months,
    totals,

    thirteenthMonth: {
      configured: Boolean(data.thirteenthMonth?.configured),
      year: toNumber(data.thirteenthMonth?.year, data.year),
      coefficient: data.thirteenthMonth?.coefficient === null || data.thirteenthMonth?.coefficient === undefined
        ? null
        : toNumber(data.thirteenthMonth.coefficient, null),
      source: data.thirteenthMonth?.source ?? null,
      estimatedAmount: data.thirteenthMonth?.estimatedAmount === null || data.thirteenthMonth?.estimatedAmount === undefined
        ? null
        : toNumber(data.thirteenthMonth.estimatedAmount, null),
      publishedAt: data.thirteenthMonth?.publishedAt ?? null,
    },

    latestPayslip: data.latestPayslip
      ? mapPayslipSummary({
          id: data.latestPayslip.payslipId,
          periodCode: data.latestPayslip.periodCode,
          paymentDate: data.latestPayslip.paymentDate,
          status: data.latestPayslip.status,
          publishedAt: data.latestPayslip.publishedAt,
          paidAt: data.latestPayslip.paidAt,
        })
      : null,

    averages: {
      grossIncome: toNumber(
        backendAverages.grossIncome,
        numberOfMonths
          ? totals.grossIncome /
              numberOfMonths
          : 0,
      ),

      taxableIncome: toNumber(
        backendAverages.taxableIncome,
        numberOfMonths
          ? totals.taxableIncome /
              numberOfMonths
          : 0,
      ),

      totalDeductions: toNumber(
        backendAverages.totalDeductions,
        numberOfMonths
          ? totals.totalDeductions /
              numberOfMonths
          : 0,
      ),

      netSalary: toNumber(
        backendAverages.netSalary,
        numberOfMonths
          ? totals.netSalary /
              numberOfMonths
          : 0,
      ),
    },
  };
}

export function mapPayslipVersion(data = {}) {
  return {
    id: toNumber(data.id, null),

    versionNumber: toNumber(
      data.versionNumber ??
        data.version_number,
    ),

    changeReason:
      data.changeReason ??
      data.change_reason ??
      "",

    createdBy:
      data.createdBy ??
      data.created_by ??
      null,

    createdByName:
      data.createdByName ??
      data.created_by_name ??
      "Bộ phận Nhân sự",

    createdAt:
      data.createdAt ??
      data.created_at ??
      null,

    publishedAt:
      data.publishedAt ??
      data.published_at ??
      null,

    isCurrent: Boolean(
      data.isCurrent ??
        data.is_current,
    ),
  };
}

export function mapPayslipVersions(data) {
  const versions = Array.isArray(data)
    ? data
    : data?.versions ?? [];

  return {
    payslipId: toNumber(
      data?.payslipId ??
        data?.payslip_id,
      null,
    ),

    periodCode:
      data?.periodCode ??
      data?.period_code ??
      "",

    currentVersion: toNumber(
      data?.currentVersion ??
        data?.current_version,
      1,
    ),

    versions: versions
      .map(mapPayslipVersion)
      .sort(
        (first, second) =>
          second.versionNumber -
          first.versionNumber,
      ),
  };
}
