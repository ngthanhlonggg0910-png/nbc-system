/**
 * Các mã khoản phụ cấp được cộng vào tổng phụ cấp.
 */
const ALLOWANCE_CODES = [
  "RESPONSIBILITY_ALLOWANCE",
  "ATTENDANCE_ALLOWANCE",
  "HOUSING_ALLOWANCE",
  "FUEL_ALLOWANCE",
  "PHONE_ALLOWANCE",
];

/**
 * Các mã khoản thưởng được cộng vào tổng thưởng.
 */
const BONUS_CODES = [
  "PERFORMANCE_BONUS",
];

/**
 * Chuẩn hóa mã tiêu chí lương.
 */
function normalizeSalaryCode(code) {
  if (typeof code !== "string") {
    return "";
  }

  return code.trim().toUpperCase();
}

/**
 * Chuẩn hóa giá trị tiền.
 *
 * Các giá trị không hợp lệ được xem là 0 tại tầng tính toán.
 * Việc báo lỗi dữ liệu được thực hiện ở validation service.
 */
function normalizeAmount(value) {
  const amount = Number(value ?? 0);

  return Number.isFinite(amount)
    ? amount
    : 0;
}

/**
 * Tạo Map tra cứu tiêu chí lương theo code.
 *
 * Input:
 * [
 *   {
 *     id: 1,
 *     code: "BASE_SALARY",
 *     name: "Lương cơ bản"
 *   }
 * ]
 *
 * Output:
 * {
 *   byCode: Map
 * }
 */
export function calculatePayrollColumns(
  salaryItems = [],
) {
  const byCode = new Map();

  for (const item of salaryItems) {
    const normalizedCode =
      normalizeSalaryCode(item?.code);

    if (!normalizedCode) {
      continue;
    }

    byCode.set(
      normalizedCode,
      item,
    );
  }

  return {
    byCode,
  };
}

/**
 * Lấy số tiền của một tiêu chí lương.
 */
export function getSalaryAmount(
  salaryAmounts,
  code,
) {
  const normalizedCode =
    normalizeSalaryCode(code);

  if (!normalizedCode) {
    return 0;
  }

  return normalizeAmount(
    salaryAmounts?.[normalizedCode],
  );
}

/**
 * Tính tổng tiền theo danh sách mã tiêu chí.
 */
export function sumSalaryAmounts(
  salaryAmounts,
  codes = [],
) {
  return codes.reduce(
    (total, code) =>
      total +
      getSalaryAmount(
        salaryAmounts,
        code,
      ),
    0,
  );
}

/**
 * Tính tổng phụ cấp.
 */
export function calculateTotalAllowance(
  salaryAmounts,
) {
  return sumSalaryAmounts(
    salaryAmounts,
    ALLOWANCE_CODES,
  );
}

/**
 * Tính tổng thưởng.
 */
export function calculateTotalBonus(
  salaryAmounts,
) {
  return sumSalaryAmounts(
    salaryAmounts,
    BONUS_CODES,
  );
}

/**
 * Tính và chuẩn hóa phần tổng kết phiếu lương.
 *
 * Các tổng chính:
 * - grossIncome
 * - taxableIncome
 * - totalDeductions
 * - netSalary
 *
 * được lấy từ những cột tổng trong Excel.
 *
 * Các khoản chi tiết:
 * - lương cơ bản
 * - tăng ca
 * - bảo hiểm
 * - thuế
 *
 * được lấy từ salaryAmounts theo code.
 */
export function calculatePayslipSummary({
  salaryAmounts = {},
  grossIncome = 0,
  taxableIncome = 0,
  totalDeductions = 0,
  netSalary = 0,
}) {
  return {
    baseSalary: getSalaryAmount(
      salaryAmounts,
      "BASE_SALARY",
    ),

    /**
     * Hiện file Excel chưa có mã riêng cho
     * tiền lương theo ngày công.
     */
    attendanceSalary: 0,

    overtimeSalary: getSalaryAmount(
      salaryAmounts,
      "OVERTIME",
    ),

    totalAllowance:
      calculateTotalAllowance(
        salaryAmounts,
      ),

    totalBonus:
      calculateTotalBonus(
        salaryAmounts,
      ),

    grossIncome:
      normalizeAmount(grossIncome),

    taxableIncome:
      normalizeAmount(taxableIncome),

    socialInsurance:
      getSalaryAmount(
        salaryAmounts,
        "SOCIAL_INSURANCE",
      ),

    healthInsurance:
      getSalaryAmount(
        salaryAmounts,
        "HEALTH_INSURANCE",
      ),

    unemploymentInsurance:
      getSalaryAmount(
        salaryAmounts,
        "UNEMPLOYMENT_INSURANCE",
      ),

    personalIncomeTax:
      getSalaryAmount(
        salaryAmounts,
        "PERSONAL_INCOME_TAX",
      ),

    totalDeductions:
      normalizeAmount(totalDeductions),

    netSalary:
      normalizeAmount(netSalary),
  };
}

/**
 * Kiểm tra nhanh công thức thực lĩnh.
 *
 * Trả về:
 * {
 *   expectedNetSalary,
 *   actualNetSalary,
 *   difference,
 *   isMatched
 * }
 */
export function compareNetSalary({
  grossIncome = 0,
  totalDeductions = 0,
  netSalary = 0,
  tolerance = 1,
}) {
  const normalizedGrossIncome =
    normalizeAmount(grossIncome);

  const normalizedTotalDeductions =
    normalizeAmount(totalDeductions);

  const normalizedNetSalary =
    normalizeAmount(netSalary);

  const expectedNetSalary =
    normalizedGrossIncome -
    normalizedTotalDeductions;

  const difference = Math.abs(
    expectedNetSalary -
    normalizedNetSalary,
  );

  return {
    expectedNetSalary,
    actualNetSalary:
      normalizedNetSalary,
    difference,
    isMatched:
      difference <= tolerance,
  };
}