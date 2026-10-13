import pool from "../../../config/db.js";

import { ErrorHandler } from
  "../../../middleware/errorMiddleware.js";

import * as payrollImportRepository from
  "../../../repositories/payroll/payrollImport.repository.js";

import * as payslipDetailRepository from
  "../../../repositories/payroll/payslipDetail.repository.js";

import {
  normalizeStaffId as normalizeStaffIdValue,
  normalizePeriodCode,
} from "../../../shared/payroll/payrollNormalizer.js";

const IMPORT_ROW_BATCH_SIZE = 500;

/**
 * Kiểm tra số nguyên dương.
 */
function validatePositiveInteger(
  value,
  fieldName,
  statusCode = 400,
) {
  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new ErrorHandler(
      `${fieldName} không hợp lệ`,
      statusCode,
    );
  }

  return value;
}

/**
 * Chuyển và kiểm tra số nguyên không âm.
 */
function normalizeNonNegativeInteger(
  value,
  fieldName,
) {
  const normalizedValue = Number(value);

  if (
    !Number.isInteger(normalizedValue) ||
    normalizedValue < 0
  ) {
    throw new ErrorHandler(
      `${fieldName} không hợp lệ`,
      409,
    );
  }

  return normalizedValue;
}

/**
 * Chuẩn hóa và kiểm tra mã nhân viên.
 */
function normalizeRequiredStaffId(
  staffId,
  fieldName = "Mã người thực hiện",
  statusCode = 400,
) {
  const normalizedStaffId =
    normalizeStaffIdValue(staffId);

  if (
    !normalizedStaffId ||
    normalizedStaffId.length > 30
  ) {
    throw new ErrorHandler(
      `${fieldName} không hợp lệ`,
      statusCode,
    );
  }

  return normalizedStaffId;
}

/**
 * Chuyển giá trị thành số tiền không âm.
 *
 * Dữ liệu đã được validator kiểm tra trước đó,
 * nhưng commit vẫn kiểm tra lại để bảo vệ
 * dữ liệu chính thức.
 */
function normalizeMoney(
  value,
  fieldName,
) {
  const amount = Number(value);

  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    throw new ErrorHandler(
      `${fieldName} không hợp lệ`,
      409,
    );
  }

  return amount;
}

/**
 * Chuẩn hóa một trường số tùy chọn.
 *
 * null hoặc chuỗi trống được giữ thành null.
 */
function normalizeOptionalNumber(
  value,
  fieldName,
) {
  if (
    value === null ||
    value === undefined ||
    (
      typeof value === "string" &&
      !value.trim()
    )
  ) {
    return null;
  }

  const normalizedValue = Number(value);

  if (
    !Number.isFinite(normalizedValue) ||
    normalizedValue < 0
  ) {
    throw new ErrorHandler(
      `${fieldName} không hợp lệ`,
      409,
    );
  }

  return normalizedValue;
}

/**
 * Kiểm tra thống kê của phiên import.
 */
function normalizeImportCounters(
  payrollImport,
) {
  const totalRows =
    normalizeNonNegativeInteger(
      payrollImport.total_rows,
      "Tổng số dòng import",
    );

  const validRows =
    normalizeNonNegativeInteger(
      payrollImport.valid_rows,
      "Số dòng hợp lệ",
    );

  const invalidRows =
    normalizeNonNegativeInteger(
      payrollImport.invalid_rows,
      "Số dòng lỗi",
    );

  if (
    totalRows !==
    validRows + invalidRows
  ) {
    throw new ErrorHandler(
      "Thống kê phiên import không khớp dữ liệu",
      409,
    );
  }

  if (invalidRows > 0) {
    throw new ErrorHandler(
      "File vẫn còn dòng lỗi, không thể lưu",
      409,
    );
  }

  if (validRows === 0) {
    throw new ErrorHandler(
      "Không có dòng hợp lệ để lưu",
      409,
    );
  }

  return {
    totalRows,
    validRows,
    invalidRows,
  };
}

/**
 * Kiểm tra dữ liệu đã chuẩn hóa
 * của một dòng staging.
 */
function normalizeStagingData(
  stagingRow,
) {
  const data =
    stagingRow?.normalized_data;

  const rowNumber =
    stagingRow?.row_number ??
    "không xác định";

  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    throw new ErrorHandler(
      `Dữ liệu dòng ${rowNumber} không hợp lệ`,
      409,
    );
  }

  const staffId =
    normalizeRequiredStaffId(
      data.staffId,
      "Mã nhân viên",
      409,
    );

  const periodCode =
    normalizePeriodCode(
      data.periodCode,
    );

  if (!periodCode) {
    throw new ErrorHandler(
      `Kỳ lương tại dòng ${rowNumber} không hợp lệ`,
      409,
    );
  }

  const summary = data.summary;

  if (
    !summary ||
    typeof summary !== "object" ||
    Array.isArray(summary)
  ) {
    throw new ErrorHandler(
      `Dữ liệu tổng lương của nhân viên ${staffId} không hợp lệ`,
      409,
    );
  }

  const salaryDetails =
    Array.isArray(data.salaryDetails)
      ? data.salaryDetails
      : [];

  const observedSalaryItemIds =
    new Set();

  const normalizedDetails =
    salaryDetails.map((detail) => {
      const salaryItemId =
        Number(detail?.salaryItemId);

      if (
        !Number.isInteger(
          salaryItemId,
        ) ||
        salaryItemId <= 0
      ) {
        throw new ErrorHandler(
          `Tiêu chí lương của nhân viên ${staffId} không hợp lệ`,
          409,
        );
      }

      if (
        observedSalaryItemIds.has(
          salaryItemId,
        )
      ) {
        throw new ErrorHandler(
          `Tiêu chí lương ${salaryItemId} của nhân viên ${staffId} bị trùng`,
          409,
        );
      }

      observedSalaryItemIds.add(
        salaryItemId,
      );

      return {
        salaryItemId,

        amount: normalizeMoney(
          detail.amount,
          `Số tiền tiêu chí ${
            detail.code ??
            salaryItemId
          }`,
        ),

        quantity:
          normalizeOptionalNumber(
            detail.quantity,
            `Số lượng tiêu chí ${
              detail.code ??
              salaryItemId
            }`,
          ),

        rate:
          normalizeOptionalNumber(
            detail.rate,
            `Đơn giá tiêu chí ${
              detail.code ??
              salaryItemId
            }`,
          ),

        /*
         * Import Excel hiện không có trường
         * mô tả nghiệp vụ riêng.
         *
         * Không đưa chuỗi kỹ thuật như
         * "Nhập từ dòng 2" vào phiếu lương.
         */
        description: null,
      };
    });

  const workDays =
    normalizeOptionalNumber(
      data.workDays ??
      data.work_days ??
      summary.workDays ??
      summary.work_days ??
      null,
      "Số ngày công",
    );

  const totalWorkDays =
    normalizeOptionalNumber(
      data.totalWorkDays ??
      data.total_work_days ??
      summary.totalWorkDays ??
      summary.total_work_days ??
      null,
      "Tổng ngày công",
    );

  if (
    workDays !== null &&
    totalWorkDays !== null &&
    workDays > totalWorkDays
  ) {
    throw new ErrorHandler(
      `Số ngày công của nhân viên ${staffId} không được vượt tổng ngày công`,
      409,
    );
  }

  return {
    staffId,
    periodCode,
    workDays,
    totalWorkDays,

    summary: {
      baseSalary:
        normalizeMoney(
          summary.baseSalary ?? 0,
          "Lương cơ bản",
        ),

      attendanceSalary:
        normalizeMoney(
          summary.attendanceSalary ?? 0,
          "Lương chấm công",
        ),

      overtimeSalary:
        normalizeMoney(
          summary.overtimeSalary ?? 0,
          "Lương làm thêm",
        ),

      totalAllowance:
        normalizeMoney(
          summary.totalAllowance ?? 0,
          "Tổng phụ cấp",
        ),

      totalBonus:
        normalizeMoney(
          summary.totalBonus ?? 0,
          "Tổng tiền thưởng",
        ),

      grossIncome:
        normalizeMoney(
          summary.grossIncome ?? 0,
          "Tổng thu nhập",
        ),

      taxableIncome:
        normalizeMoney(
          summary.taxableIncome ?? 0,
          "Thu nhập chịu thuế",
        ),

      socialInsurance:
        normalizeMoney(
          summary.socialInsurance ?? 0,
          "Bảo hiểm xã hội",
        ),

      healthInsurance:
        normalizeMoney(
          summary.healthInsurance ?? 0,
          "Bảo hiểm y tế",
        ),

      unemploymentInsurance:
        normalizeMoney(
          summary.unemploymentInsurance ?? 0,
          "Bảo hiểm thất nghiệp",
        ),

      personalIncomeTax:
        normalizeMoney(
          summary.personalIncomeTax ?? 0,
          "Thuế thu nhập cá nhân",
        ),

      totalDeductions:
        normalizeMoney(
          summary.totalDeductions ?? 0,
          "Tổng khấu trừ",
        ),

      netSalary:
        normalizeMoney(
          summary.netSalary ?? 0,
          "Thực lĩnh",
        ),
    },

    salaryDetails:
      normalizedDetails,
  };
}

/**
 * Khóa bản ghi import trong transaction.
 *
 * Ngăn hai request commit cùng một import.
 */
async function lockPayrollImport(
  importId,
  client,
) {
  const { rows } = await client.query(
    `
      SELECT
        id,
        payroll_period_id,
        file_type,
        status,
        total_rows,
        valid_rows,
        invalid_rows,
        committed_by,
        committed_at
      FROM payroll_imports
      WHERE id = $1
      FOR UPDATE;
    `,
    [importId],
  );

  return rows[0] ?? null;
}

/**
 * Khóa kỳ lương trong transaction.
 */
async function lockPayrollPeriod(
  payrollPeriodId,
  client,
) {
  const { rows } = await client.query(
    `
      SELECT
        id,
        period_code,
        period_name,
        status
      FROM payroll_periods
      WHERE id = $1
      FOR UPDATE;
    `,
    [payrollPeriodId],
  );

  return rows[0] ?? null;
}

/**
 * Đếm số dòng staging theo trạng thái.
 */
async function countImportRows({
  importId,
  isValid,
  client,
}) {
  const count =
    await payrollImportRepository
      .countImportRows(
        {
          importId,
          isValid,
        },
        client,
      );

  return normalizeNonNegativeInteger(
    Number(count),
    isValid
      ? "Số staging row hợp lệ"
      : "Số staging row lỗi",
  );
}

/**
 * Đọc toàn bộ dòng staging hợp lệ
 * theo từng batch.
 */
async function loadAllValidImportRows({
  importId,
  client,
}) {
  const totalRows =
    await countImportRows({
      importId,
      isValid: true,
      client,
    });

  if (totalRows === 0) {
    return {
      totalRows: 0,
      rows: [],
    };
  }

  const totalPages = Math.ceil(
    totalRows /
    IMPORT_ROW_BATCH_SIZE,
  );

  const validRows = [];

  for (
    let page = 1;
    page <= totalPages;
    page += 1
  ) {
    const rows =
      await payrollImportRepository
        .findImportRows(
          {
            importId,
            isValid: true,
            page,
            limit:
              IMPORT_ROW_BATCH_SIZE,
          },
          client,
        );

    validRows.push(...rows);
  }

  if (
    validRows.length !== totalRows
  ) {
    throw new ErrorHandler(
      "Không thể đọc đầy đủ dữ liệu staging hợp lệ",
      409,
    );
  }

  return {
    totalRows,
    rows: validRows,
  };
}

/**
 * Tạo mới hoặc cập nhật phiếu lương draft.
 *
 * Nếu Excel chưa có ngày công:
 * - Phiếu mới dùng 0.
 * - Phiếu draft cũ giữ nguyên ngày công hiện tại.
 */
async function upsertDraftPayslip({
  payrollPeriodId,
  importId,
  data,
  allowReplace = false,
  client,
}) {
  const {
    summary,
    workDays,
    totalWorkDays,
  } = data;

  const { rows } = await client.query(
    `
      INSERT INTO employee_payslips (
        payroll_period_id,
        staff_id,
        source_import_id,
        current_version,

        work_days,
        total_work_days,

        base_salary,
        attendance_salary,
        overtime_salary,
        total_allowance,
        total_bonus,

        gross_income,
        taxable_income,

        social_insurance,
        health_insurance,
        unemployment_insurance,
        personal_income_tax,

        total_deductions,
        net_salary,

        status,
        calculated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        1,

        COALESCE($4, 0),
        COALESCE($5, 0),

        $6,
        $7,
        $8,
        $9,
        $10,

        $11,
        $12,

        $13,
        $14,
        $15,
        $16,

        $17,
        $18,

        'draft',
        CURRENT_TIMESTAMP
      )

      ON CONFLICT (
        payroll_period_id,
        staff_id
      )
      DO UPDATE SET
        source_import_id =
          EXCLUDED.source_import_id,

        work_days =
          COALESCE(
            $4,
            employee_payslips.work_days
          ),

        total_work_days =
          COALESCE(
            $5,
            employee_payslips.total_work_days
          ),

        base_salary =
          EXCLUDED.base_salary,

        attendance_salary =
          EXCLUDED.attendance_salary,

        overtime_salary =
          EXCLUDED.overtime_salary,

        total_allowance =
          EXCLUDED.total_allowance,

        total_bonus =
          EXCLUDED.total_bonus,

        gross_income =
          EXCLUDED.gross_income,

        taxable_income =
          EXCLUDED.taxable_income,

        social_insurance =
          EXCLUDED.social_insurance,

        health_insurance =
          EXCLUDED.health_insurance,

        unemployment_insurance =
          EXCLUDED.unemployment_insurance,

        personal_income_tax =
          EXCLUDED.personal_income_tax,

        total_deductions =
          EXCLUDED.total_deductions,

        net_salary =
          EXCLUDED.net_salary,

        calculated_at =
          CURRENT_TIMESTAMP,

        updated_at =
          CURRENT_TIMESTAMP

      WHERE employee_payslips.status = 'draft'
        AND (
          employee_payslips.source_import_id = EXCLUDED.source_import_id
          OR $19 = TRUE
        )

      RETURNING
        id,
        payroll_period_id,
        staff_id,
        source_import_id,
        current_version,
        work_days,
        total_work_days,
        status,
        net_salary,
        calculated_at,
        created_at,
        updated_at;
    `,
    [
      payrollPeriodId,
      data.staffId,
      importId,

      workDays,
      totalWorkDays,

      summary.baseSalary,
      summary.attendanceSalary,
      summary.overtimeSalary,
      summary.totalAllowance,
      summary.totalBonus,

      summary.grossIncome,
      summary.taxableIncome,

      summary.socialInsurance,
      summary.healthInsurance,
      summary.unemploymentInsurance,
      summary.personalIncomeTax,

      summary.totalDeductions,
      summary.netSalary,
      allowReplace,
    ],
  );

  const payslip = rows[0];

  if (!payslip) {
    throw new ErrorHandler(
      `Phiếu lương của ${data.staffId} đã tồn tại trong kỳ và thuộc một lần import khác`,
      409,
    );
  }

  return payslip;
}

/**
 * Thay thế toàn bộ chi tiết phiếu lương.
 */
async function replacePayslipDetails({
  payslipId,
  salaryDetails,
  client,
}) {
  await payslipDetailRepository
    .deleteAllByPayslipId(
      payslipId,
      client,
    );

  if (salaryDetails.length === 0) {
    return [];
  }

  return payslipDetailRepository
    .upsertManyPayslipDetails(
      {
        payslipId,
        details: salaryDetails,
      },
      client,
    );
}

/**
 * Commit dữ liệu staging vào phiếu lương.
 *
 * Điều kiện:
 * - Import tồn tại.
 * - Import có trạng thái validated.
 * - Không còn dòng lỗi.
 * - Thống kê import khớp staging.
 * - Có ít nhất một dòng hợp lệ.
 * - Kỳ lương vẫn ở trạng thái draft.
 * - Không có nhân viên trùng trong staging.
 *
 * Toàn bộ thao tác chạy trong một transaction.
 */
export async function commitPayrollImport({
  importId,
  committedBy,
}) {
  const normalizedImportId =
    Number(importId);

  validatePositiveInteger(
    normalizedImportId,
    "Mã lần import",
  );

  const normalizedCommittedBy =
    normalizeRequiredStaffId(
      committedBy,
      "Mã người thực hiện",
      400,
    );

  const client =
    await pool.connect();

  try {
    await client.query("BEGIN");

    /*
     * Khóa import trước để chống hai request
     * commit đồng thời.
     */
    const payrollImport =
      await lockPayrollImport(
        normalizedImportId,
        client,
      );

    if (!payrollImport) {
      throw new ErrorHandler(
        "Không tìm thấy lần import",
        404,
      );
    }

    if (
      payrollImport.status ===
      "committed"
    ) {
      throw new ErrorHandler(
        "Lần import này đã được lưu trước đó",
        409,
      );
    }

    if (
      payrollImport.status !==
      "validated"
    ) {
      throw new ErrorHandler(
        "Chỉ có thể lưu file đã kiểm tra hợp lệ",
        409,
      );
    }

    const importCounters =
      normalizeImportCounters(
        payrollImport,
      );

    /*
     * Khóa kỳ lương để ngăn kỳ bị publish,
     * cancel hoặc lock trong lúc commit.
     */
    const period =
      await lockPayrollPeriod(
        payrollImport.payroll_period_id,
        client,
      );

    if (!period) {
      throw new ErrorHandler(
        "Không tìm thấy kỳ lương",
        404,
      );
    }

    if (period.status !== "draft") {
      throw new ErrorHandler(
        "Kỳ lương không còn ở trạng thái bản nháp",
        409,
      );
    }

    /*
     * Kiểm tra trực tiếp staging thay vì chỉ
     * tin vào cột invalid_rows.
     */
    const actualInvalidRows =
      await countImportRows({
        importId:
          normalizedImportId,
        isValid: false,
        client,
      });

    if (actualInvalidRows > 0) {
      throw new ErrorHandler(
        "Dữ liệu staging vẫn còn dòng lỗi, không thể lưu",
        409,
      );
    }

    const {
      totalRows:
        actualValidRows,

      rows: validRows,
    } = await loadAllValidImportRows({
      importId:
        normalizedImportId,
      client,
    });

    if (
      actualValidRows !==
      importCounters.validRows
    ) {
      throw new ErrorHandler(
        "Số dòng staging hợp lệ không khớp kết quả validation",
        409,
      );
    }

    if (
      actualValidRows +
      actualInvalidRows !==
      importCounters.totalRows
    ) {
      throw new ErrorHandler(
        "Tổng số staging row không khớp phiên import",
        409,
      );
    }

    const committedPayslips = [];
    const committedStaffIds = new Set();

    for (const stagingRow of validRows) {
      const data =
        normalizeStagingData(
          stagingRow,
        );

      if (
        data.periodCode !==
        period.period_code
      ) {
        throw new ErrorHandler(
          `Dòng ${stagingRow.row_number} không thuộc kỳ lương ${period.period_code}`,
          409,
        );
      }

      if (
        committedStaffIds.has(
          data.staffId,
        )
      ) {
        throw new ErrorHandler(
          `Nhân viên ${data.staffId} xuất hiện nhiều lần trong dữ liệu staging`,
          409,
        );
      }

      committedStaffIds.add(
        data.staffId,
      );

      const payslip =
        await upsertDraftPayslip({
          payrollPeriodId:
            period.id,

          importId:
            normalizedImportId,

          data,
          allowReplace: payrollImport.file_type === "manual",
          client,
        });

      await replacePayslipDetails({
        payslipId: payslip.id,
        salaryDetails: data.salaryDetails,
        client,
      });

      committedPayslips.push({
        id:
          Number(payslip.id),

        staffId:
          payslip.staff_id,

        status:
          payslip.status,

        workDays:
          Number(
            payslip.work_days ?? 0,
          ),

        totalWorkDays:
          Number(
            payslip.total_work_days ??
            0,
          ),

        netSalary:
          Number(
            payslip.net_salary ?? 0,
          ),
      });
    }

    /*
     * Đánh dấu import committed trong cùng
     * transaction với các phiếu lương.
     */
    const committedImport =
      await payrollImportRepository
        .markCommitted(
          {
            importId:
              normalizedImportId,

            committedBy:
              normalizedCommittedBy,
          },
          client,
        );

    if (!committedImport) {
      throw new ErrorHandler(
        "Không thể hoàn tất lần import",
        409,
      );
    }

    await client.query("COMMIT");

    return {
      importId:
        normalizedImportId,

      payrollPeriodId:
        Number(period.id),

      periodCode:
        period.period_code,

      status:
        committedImport.status,

      committedRows:
        committedPayslips.length,

      committedBy:
        committedImport.committed_by,

      committedAt:
        committedImport.committed_at,

      payslips:
        committedPayslips,
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /*
       * Giữ lại lỗi nghiệp vụ hoặc database
       * ban đầu, không ghi đè bằng lỗi rollback.
       */
    }

    throw error;
  } finally {
    client.release();
  }
}

export default {
  commitPayrollImport,
};
