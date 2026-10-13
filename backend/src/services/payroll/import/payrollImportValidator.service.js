import pool from "../../../config/db.js";

import * as salaryMasterRepository from
  "../../../repositories/payroll/salaryMaster.repository.js";

import {
  PAYROLL_EXCEL_COLUMNS,
} from "../../../shared/payroll/payrollExcelColumns.js";

import {
  cellText,
  toNumber,
  normalizeStaffId,
  normalizePeriodCode,
  normalizeSalaryItemCode,
  normalizeText,
} from "../../../shared/payroll/payrollNormalizer.js";

import {
  calculatePayrollColumns,
  calculatePayslipSummary,
  compareNetSalary,
} from "./payrollImportCalculation.service.js";

/**
 * Định dạng kỳ lương hợp lệ:
 *
 * YYYY-MM
 *
 * Ví dụ:
 * 2026-08
 * 2026-12
 */
const PERIOD_CODE_PATTERN =
  /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Sai số cho phép khi so sánh tiền.
 *
 * Ví dụ:
 * 14.000.000 và 13.999.999
 * vẫn có thể được xem là khớp.
 */
const MONEY_TOLERANCE = 1;

/**
 * Các category tiêu chí lương đang dùng.
 */
const SALARY_CATEGORY = Object.freeze({
  INCOME: "income",
  DEDUCTION: "deduction",
});

/**
 * Tạo object lỗi cho một dòng Excel.
 *
 * @param {object} params
 * @param {number} params.rowNumber
 * @param {string|null} [params.staffId]
 * @param {string|null} [params.columnName]
 * @param {string} params.errorCode
 * @param {string} params.errorMessage
 * @param {object|null} [params.rowData]
 *
 * @returns {{
 *   rowNumber: number,
 *   staffId: string|null,
 *   columnName: string|null,
 *   errorCode: string,
 *   errorMessage: string,
 *   rowData: object|null
 * }}
 */
export function createRowError({
  rowNumber,
  staffId = null,
  columnName = null,
  errorCode,
  errorMessage,
  rowData = null,
}) {
  return {
    rowNumber,
    staffId,
    columnName,
    errorCode,
    errorMessage,
    rowData,
  };
}

/**
 * Kiểm tra một trường tiền.
 *
 * Quy tắc:
 * - Ô trống được xem là 0.
 * - Phải chuyển được thành số.
 * - Không được là số âm.
 *
 * @param {object} params
 * @param {unknown} params.value
 * @param {number} params.rowNumber
 * @param {string|null} params.staffId
 * @param {string} params.columnName
 * @param {Array<object>} params.errors
 *
 * @returns {number}
 */
export function validateMoneyField({
  value,
  rowNumber,
  staffId,
  columnName,
  errors,
}) {
  const amount = toNumber(value);

  if (!Number.isFinite(amount)) {
    errors.push(
      createRowError({
        rowNumber,
        staffId,
        columnName,
        errorCode: "INVALID_AMOUNT",
        errorMessage:
          `${columnName} phải là một số hợp lệ`,
      }),
    );

    return 0;
  }

  if (amount < 0) {
    errors.push(
      createRowError({
        rowNumber,
        staffId,
        columnName,
        errorCode: "NEGATIVE_AMOUNT",
        errorMessage:
          `${columnName} không được là số âm`,
      }),
    );

    return 0;
  }

  return amount;
}

/**
 * Tìm các mã nhân viên đang hoạt động.
 *
 * @param {unknown[]} staffIds
 * @param {import("pg").Pool|import("pg").PoolClient} client
 *
 * @returns {Promise<Set<string>>}
 */
export async function findExistingStaffIds(
  staffIds,
  client = pool,
) {
  const normalizedStaffIds = [
    ...new Set(
      staffIds
        .map(normalizeStaffId)
        .filter(Boolean),
    ),
  ];

  if (normalizedStaffIds.length === 0) {
    return new Set();
  }

  const { rows } = await client.query(
    `
      SELECT staff_id
      FROM employees
      WHERE staff_id = ANY($1::VARCHAR[])
        AND is_active_staff = TRUE;
    `,
    [normalizedStaffIds],
  );

  return new Set(
    rows.map((row) =>
      normalizeStaffId(row.staff_id),
    ),
  );
}

/**
 * Tìm các mã nhân viên bị lặp trong cùng file.
 *
 * @param {unknown[]} staffIds
 * @returns {Set<string>}
 */
export function findDuplicatedStaffIds(
  staffIds,
) {
  const observedStaffIds = new Set();
  const duplicatedStaffIds = new Set();

  for (const rawStaffId of staffIds) {
    const staffId =
      normalizeStaffId(rawStaffId);

    if (!staffId) {
      continue;
    }

    if (observedStaffIds.has(staffId)) {
      duplicatedStaffIds.add(staffId);
    }

    observedStaffIds.add(staffId);
  }

  return duplicatedStaffIds;
}

/**
 * Kiểm tra mã kỳ lương của một dòng.
 *
 * @param {object} params
 */
export function validatePeriodCode({
  periodCode,
  expectedPeriodCode,
  rowNumber,
  staffId,
  errors,
}) {
  if (!PERIOD_CODE_PATTERN.test(periodCode)) {
    errors.push(
      createRowError({
        rowNumber,
        staffId,
        columnName:
          PAYROLL_EXCEL_COLUMNS.PERIOD_CODE,
        errorCode:
          "INVALID_PERIOD_CODE",
        errorMessage:
          "Tháng phải có định dạng YYYY-MM",
      }),
    );

    return;
  }

  if (periodCode !== expectedPeriodCode) {
    errors.push(
      createRowError({
        rowNumber,
        staffId,
        columnName:
          PAYROLL_EXCEL_COLUMNS.PERIOD_CODE,
        errorCode:
          "PERIOD_MISMATCH",
        errorMessage:
          `Dòng thuộc kỳ ${periodCode}, nhưng kỳ được chọn là ${expectedPeriodCode}`,
      }),
    );
  }
}

/**
 * Kiểm tra nhân viên của một dòng.
 *
 * @param {object} params
 */
export function validateEmployee({
  staffId,
  existingStaffIds,
  duplicatedStaffIds,
  rowNumber,
  errors,
}) {
  if (!staffId) {
    errors.push(
      createRowError({
        rowNumber,
        columnName:
          PAYROLL_EXCEL_COLUMNS.STAFF_ID,
        errorCode:
          "STAFF_ID_REQUIRED",
        errorMessage:
          "Mã nhân viên là bắt buộc",
      }),
    );

    return;
  }

  if (!existingStaffIds.has(staffId)) {
    errors.push(
      createRowError({
        rowNumber,
        staffId,
        columnName:
          PAYROLL_EXCEL_COLUMNS.STAFF_ID,
        errorCode:
          "STAFF_NOT_FOUND",
        errorMessage:
          "Không tìm thấy nhân viên đang hoạt động",
      }),
    );
  }

  if (duplicatedStaffIds.has(staffId)) {
    errors.push(
      createRowError({
        rowNumber,
        staffId,
        columnName:
          PAYROLL_EXCEL_COLUMNS.STAFF_ID,
        errorCode:
          "DUPLICATE_STAFF_IN_FILE",
        errorMessage:
          "Mã nhân viên bị trùng trong file",
      }),
    );
  }
}

/**
 * Kiểm tra mã tiêu chí lương không tồn tại.
 *
 * @param {object} params
 */
export function validateSalaryItemCodes({
  invalidSalaryCodes,
  salaryColumns,
  rowNumber,
  staffId,
  errors,
}) {
  for (
    const invalidCode
    of invalidSalaryCodes
  ) {
    const salaryColumn =
      salaryColumns.find(
        (column) =>
          normalizeSalaryItemCode(
            column.code,
          ) === invalidCode,
      );

    errors.push(
      createRowError({
        rowNumber,
        staffId,
        columnName:
          salaryColumn?.header ?? null,
        errorCode:
          "SALARY_ITEM_NOT_FOUND",
        errorMessage:
          `Không tìm thấy tiêu chí lương ${invalidCode}`,
      }),
    );
  }
}

/**
 * Tính tổng tiền của các chi tiết lương.
 *
 * @param {Array<object>} salaryDetails
 * @param {string} category
 * @returns {number}
 */
export function calculateDetailTotal(
  salaryDetails,
  category,
) {
  return salaryDetails
    .filter(
      (item) =>
        item.category === category,
    )
    .reduce(
      (total, item) =>
        total +
        Number(item.amount ?? 0),
      0,
    );
}

/**
 * Kiểm tra tổng thu nhập, tổng khấu trừ,
 * thu nhập chịu thuế và thực lĩnh.
 *
 * @param {object} params
 */
export function validatePayrollTotals({
  rowNumber,
  staffId,
  salaryDetails,
  grossIncome,
  taxableIncome,
  totalDeductions,
  netSalary,
  errors,
}) {
  const incomeDetails =
    salaryDetails.filter(
      (item) =>
        item.category ===
        SALARY_CATEGORY.INCOME,
    );

  const deductionDetails =
    salaryDetails.filter(
      (item) =>
        item.category ===
        SALARY_CATEGORY.DEDUCTION,
    );

  const calculatedIncome =
    calculateDetailTotal(
      salaryDetails,
      SALARY_CATEGORY.INCOME,
    );

  const calculatedDeductions =
    calculateDetailTotal(
      salaryDetails,
      SALARY_CATEGORY.DEDUCTION,
    );

  /*
   * Chỉ so sánh khi file có ít nhất một
   * tiêu chí thuộc nhóm thu nhập.
   */
  if (
    incomeDetails.length > 0 &&
    Math.abs(
      calculatedIncome - grossIncome,
    ) > MONEY_TOLERANCE
  ) {
    errors.push(
      createRowError({
        rowNumber,
        staffId,
        columnName:
          PAYROLL_EXCEL_COLUMNS.GROSS_INCOME,
        errorCode:
          "GROSS_INCOME_MISMATCH",
        errorMessage:
          "Tổng các khoản thu nhập không khớp Tổng thu nhập",
      }),
    );
  }

  /*
   * Chỉ so sánh khi file có ít nhất một
   * tiêu chí thuộc nhóm khấu trừ.
   */
  if (
    deductionDetails.length > 0 &&
    Math.abs(
      calculatedDeductions -
      totalDeductions,
    ) > MONEY_TOLERANCE
  ) {
    errors.push(
      createRowError({
        rowNumber,
        staffId,
        columnName:
          PAYROLL_EXCEL_COLUMNS
            .TOTAL_DEDUCTIONS,
        errorCode:
          "TOTAL_DEDUCTIONS_MISMATCH",
        errorMessage:
          "Tổng các khoản khấu trừ không khớp Tổng khấu trừ",
      }),
    );
  }

  if (taxableIncome > grossIncome) {
    errors.push(
      createRowError({
        rowNumber,
        staffId,
        columnName:
          PAYROLL_EXCEL_COLUMNS
            .TAXABLE_INCOME,
        errorCode:
          "TAXABLE_EXCEEDS_GROSS",
        errorMessage:
          "Thu nhập chịu thuế không được vượt quá Tổng thu nhập",
      }),
    );
  }

  const netSalaryComparison =
    compareNetSalary({
      grossIncome,
      totalDeductions,
      netSalary,
      tolerance:
        MONEY_TOLERANCE,
    });

  if (!netSalaryComparison.isMatched) {
    errors.push(
      createRowError({
        rowNumber,
        staffId,
        columnName:
          PAYROLL_EXCEL_COLUMNS.NET_SALARY,
        errorCode:
          "NET_SALARY_MISMATCH",
        errorMessage:
          "Thực lĩnh phải bằng Tổng thu nhập trừ Tổng khấu trừ",
      }),
    );
  }
}

/**
 * Chuyển map tiêu chí lương về mã đã chuẩn hóa.
 *
 * @param {Map<string, object>} sourceMap
 * @returns {Map<string, object>}
 */
function normalizeSalaryItemMap(
  sourceMap,
) {
  const normalizedMap = new Map();

  for (
    const [rawCode, salaryItem]
    of sourceMap.entries()
  ) {
    const code =
      normalizeSalaryItemCode(rawCode);

    if (!code) {
      continue;
    }

    normalizedMap.set(
      code,
      salaryItem,
    );
  }

  return normalizedMap;
}

/**
 * Kiểm tra toàn bộ dữ liệu Excel.
 *
 * Reader đã chịu trách nhiệm:
 * - Đọc workbook.
 * - Đọc header.
 * - Kiểm tra cột bắt buộc.
 * - Trả rows và salaryColumns.
 *
 * Validator chịu trách nhiệm:
 * - Kiểm tra nhân viên.
 * - Kiểm tra kỳ lương.
 * - Kiểm tra tiêu chí lương.
 * - Kiểm tra số tiền.
 * - Tạo stagingRows.
 * - Tạo danh sách lỗi.
 *
 * @param {object} params
 * @param {object} params.parsedExcel
 * @param {string} params.expectedPeriodCode
 * @param {import("pg").Pool|import("pg").PoolClient} [params.client]
 *
 * @returns {Promise<{
 *   stagingRows: Array<object>,
 *   errors: Array<object>,
 *   totalRows: number,
 *   validRows: number,
 *   invalidRows: number
 * }>}
 */
export async function validatePayrollImport({
  parsedExcel,
  expectedPeriodCode,
  client = pool,
}) {
  const rows =
    Array.isArray(parsedExcel?.rows)
      ? parsedExcel.rows
      : [];

  const salaryColumns =
    Array.isArray(
      parsedExcel?.salaryColumns,
    )
      ? parsedExcel.salaryColumns
      : [];

  const normalizedExpectedPeriodCode =
    normalizePeriodCode(
      expectedPeriodCode,
    );

  const salaryCodes = [
    ...new Set(
      salaryColumns
        .map((column) =>
          normalizeSalaryItemCode(
            column.code,
          ),
        )
        .filter(Boolean),
    ),
  ];

  /*
   * Lấy các tiêu chí lương có trong database.
   */
  const salaryItems =
    salaryCodes.length > 0
      ? await salaryMasterRepository
        .findByCodes(
          salaryCodes,
          client,
        )
      : [];

  const {
    byCode: rawSalaryItemsByCode,
  } = calculatePayrollColumns(
    salaryItems,
  );

  const salaryItemsByCode =
    normalizeSalaryItemMap(
      rawSalaryItemsByCode,
    );

  const invalidSalaryCodes =
    salaryCodes.filter(
      (code) =>
        !salaryItemsByCode.has(code),
    );

  /*
   * Thu thập mã nhân viên trong file.
   */
  const rawStaffIds = rows
    .map(({ rowData }) =>
      normalizeStaffId(
        rowData?.[
          PAYROLL_EXCEL_COLUMNS.STAFF_ID
        ],
      ),
    )
    .filter(Boolean);

  const existingStaffIds =
    await findExistingStaffIds(
      rawStaffIds,
      client,
    );

  const duplicatedStaffIds =
    findDuplicatedStaffIds(
      rawStaffIds,
    );

  const stagingRows = [];
  const errors = [];

  for (const excelRow of rows) {
    const {
      rowNumber,
      rowData = {},
    } = excelRow;

    const rowErrors = [];

    const staffId =
      normalizeStaffId(
        rowData[
          PAYROLL_EXCEL_COLUMNS.STAFF_ID
        ],
      );

    const periodCode =
      normalizePeriodCode(
        rowData[
          PAYROLL_EXCEL_COLUMNS.PERIOD_CODE
        ],
      );

    validateEmployee({
      staffId,
      existingStaffIds,
      duplicatedStaffIds,
      rowNumber,
      errors: rowErrors,
    });

    validatePeriodCode({
      periodCode,
      expectedPeriodCode:
        normalizedExpectedPeriodCode,
      rowNumber,
      staffId,
      errors: rowErrors,
    });

    validateSalaryItemCodes({
      invalidSalaryCodes,
      salaryColumns,
      rowNumber,
      staffId,
      errors: rowErrors,
    });

    const salaryAmounts = {};
    const salaryDetails = [];

    /*
     * Đọc và kiểm tra từng tiêu chí lương.
     */
    for (
      const salaryColumn
      of salaryColumns
    ) {
      const salaryCode =
        normalizeSalaryItemCode(
          salaryColumn.code,
        );

      if (!salaryCode) {
        continue;
      }

      const amount =
        validateMoneyField({
          value:
            rowData[
              salaryColumn.header
            ],
          rowNumber,
          staffId,
          columnName:
            salaryColumn.header,
          errors: rowErrors,
        });

      salaryAmounts[salaryCode] =
        amount;

      const salaryItem =
        salaryItemsByCode.get(
          salaryCode,
        );

      if (!salaryItem) {
        continue;
      }

      salaryDetails.push({
        salaryItemId:
          Number(salaryItem.id),

        code:
          normalizeSalaryItemCode(
            salaryItem.code ??
            salaryCode,
          ),

        label:
          normalizeText(
            salaryItem.label ??
            salaryColumn.label,
          ),

        category:
          normalizeText(
            salaryItem.category,
          ).toLowerCase(),

        amount,

        quantity: null,
        rate: null,

        /*
         * Không lưu mô tả kỹ thuật kiểu
         * "Nhập từ dòng 2" vào phiếu lương.
         */
        description: null,
      });
    }

    const grossIncome =
      validateMoneyField({
        value:
          rowData[
            PAYROLL_EXCEL_COLUMNS
              .GROSS_INCOME
          ],
        rowNumber,
        staffId,
        columnName:
          PAYROLL_EXCEL_COLUMNS
            .GROSS_INCOME,
        errors: rowErrors,
      });

    const taxableIncome =
      validateMoneyField({
        value:
          rowData[
            PAYROLL_EXCEL_COLUMNS
              .TAXABLE_INCOME
          ],
        rowNumber,
        staffId,
        columnName:
          PAYROLL_EXCEL_COLUMNS
            .TAXABLE_INCOME,
        errors: rowErrors,
      });

    const totalDeductions =
      validateMoneyField({
        value:
          rowData[
            PAYROLL_EXCEL_COLUMNS
              .TOTAL_DEDUCTIONS
          ],
        rowNumber,
        staffId,
        columnName:
          PAYROLL_EXCEL_COLUMNS
            .TOTAL_DEDUCTIONS,
        errors: rowErrors,
      });

    const netSalary =
      validateMoneyField({
        value:
          rowData[
            PAYROLL_EXCEL_COLUMNS
              .NET_SALARY
          ],
        rowNumber,
        staffId,
        columnName:
          PAYROLL_EXCEL_COLUMNS
            .NET_SALARY,
        errors: rowErrors,
      });

    validatePayrollTotals({
      rowNumber,
      staffId,
      salaryDetails,
      grossIncome,
      taxableIncome,
      totalDeductions,
      netSalary,
      errors: rowErrors,
    });

    const summary =
      calculatePayslipSummary({
        salaryAmounts,
        grossIncome,
        taxableIncome,
        totalDeductions,
        netSalary,
      });

    const normalizedData = {
      staffId,
      periodCode,

      employeeName:
        normalizeText(
          rowData[
            PAYROLL_EXCEL_COLUMNS
              .EMPLOYEE_NAME
          ],
        ),

      departmentName:
        normalizeText(
          rowData[
            PAYROLL_EXCEL_COLUMNS
              .DEPARTMENT_NAME
          ],
        ),

      summary,
      salaryDetails,

      sourceStatus:
        normalizeText(
          rowData[
            PAYROLL_EXCEL_COLUMNS.STATUS
          ],
        ),
    };

    const isValid =
      rowErrors.length === 0;

    stagingRows.push({
      rowNumber,

      staffId:
        staffId || null,

      periodCode:
        periodCode || null,

      normalizedData,

      isValid,
    });

    /*
     * Gắn dữ liệu đã chuẩn hóa vào từng lỗi
     * để frontend hiển thị preview.
     */
    for (const error of rowErrors) {
      errors.push({
        ...error,
        rowData: normalizedData,
      });
    }
  }

  const validRows =
    stagingRows.filter(
      (row) => row.isValid,
    ).length;

  return {
    stagingRows,
    errors,

    totalRows:
      stagingRows.length,

    validRows,

    invalidRows:
      stagingRows.length -
      validRows,
  };
}

/**
 * Alias tạm thời giúp các file cũ vẫn hoạt động.
 *
 * Sau khi payrollImport.service.js chuyển hoàn toàn
 * sang validatePayrollImport(), alias này có thể xóa.
 */
export const validateExcelRows =
  validatePayrollImport;

export default {
  createRowError,
  validateMoneyField,
  findExistingStaffIds,
  findDuplicatedStaffIds,
  validatePeriodCode,
  validateEmployee,
  validateSalaryItemCodes,
  calculateDetailTotal,
  validatePayrollTotals,
  validatePayrollImport,
  validateExcelRows,
};