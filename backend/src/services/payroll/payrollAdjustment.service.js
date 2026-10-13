import pool from "../../config/db.js";
import { ErrorHandler } from "../../middleware/errorMiddleware.js";

import * as payrollAdjustmentRepository from "../../repositories/payroll/payrollAdjustment.repository.js";
import * as payrollFeedbackRepository from "../../repositories/payroll/payrollFeedback.repository.js";
import * as payrollVersionRepository from "../../repositories/payroll/payrollVersion.repository.js";
import * as payslipDetailRepository from "../../repositories/payroll/payslipDetail.repository.js";
import * as payslipRepository from "../../repositories/payroll/payslip.repository.js";

const MAX_ADJUSTMENTS_PER_REQUEST = 100;
const MAX_AMOUNT = 99999999999999999.99;

function validatePositiveInteger(
  value,
  fieldName,
) {
  const number = Number(value);

  if (
    !Number.isInteger(number) ||
    number <= 0
  ) {
    throw new ErrorHandler(
      `${fieldName} không hợp lệ`,
      400,
    );
  }

  return number;
}

function validateStaffId(
  value,
  fieldName = "Mã nhân viên",
) {
  const staffId =
    String(value || "").trim();

  if (!staffId) {
    throw new ErrorHandler(
      `${fieldName} không hợp lệ`,
      400,
    );
  }

  return staffId;
}

function normalizeMoney(
  value,
  fieldName,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    throw new ErrorHandler(
      `${fieldName} không được để trống`,
      400,
    );
  }

  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0 ||
    number > MAX_AMOUNT
  ) {
    throw new ErrorHandler(
      `${fieldName} không hợp lệ`,
      400,
    );
  }

  return Math.round(
    (number + Number.EPSILON) * 100,
  ) / 100;
}

function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function normalizeNullableNumber(
  value,
  fieldName,
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    throw new ErrorHandler(
      `${fieldName} không hợp lệ`,
      400,
    );
  }

  return number;
}

function normalizeAdjustments(
  adjustments,
) {
  if (
    !Array.isArray(adjustments) ||
    adjustments.length === 0
  ) {
    throw new ErrorHandler(
      "Vui lòng nhập ít nhất một khoản cần điều chỉnh",
      400,
    );
  }

  if (
    adjustments.length >
    MAX_ADJUSTMENTS_PER_REQUEST
  ) {
    throw new ErrorHandler(
      `Mỗi lần chỉ được điều chỉnh tối đa ${MAX_ADJUSTMENTS_PER_REQUEST} khoản`,
      400,
    );
  }

  const salaryItemIds =
    new Set();

  return adjustments.map(
    (adjustment, index) => {
      if (
        !adjustment ||
        typeof adjustment !==
          "object" ||
        Array.isArray(adjustment)
      ) {
        throw new ErrorHandler(
          `Khoản điều chỉnh ở vị trí ${index + 1} không hợp lệ`,
          400,
        );
      }

      const salaryItemId =
        validatePositiveInteger(
          adjustment.salaryItemId,
          `Mã khoản lương ở vị trí ${index + 1}`,
        );

      if (
        salaryItemIds.has(
          salaryItemId,
        )
      ) {
        throw new ErrorHandler(
          `Khoản lương ${salaryItemId} bị lặp lại`,
          400,
        );
      }

      salaryItemIds.add(
        salaryItemId,
      );

      const newAmount =
        normalizeMoney(
          adjustment.newAmount,
          `Số tiền mới ở vị trí ${index + 1}`,
        );

      const reason =
        String(
          adjustment.reason || "",
        ).trim();

      if (reason.length < 5) {
        throw new ErrorHandler(
          `Lý do điều chỉnh ở vị trí ${index + 1} phải có ít nhất 5 ký tự`,
          400,
        );
      }

      if (reason.length > 2000) {
        throw new ErrorHandler(
          `Lý do điều chỉnh ở vị trí ${index + 1} không được vượt quá 2000 ký tự`,
          400,
        );
      }

      return {
        salaryItemId,
        newAmount,

        quantity:
          normalizeNullableNumber(
            adjustment.quantity,
            `Số lượng ở vị trí ${index + 1}`,
          ),

        rate:
          normalizeNullableNumber(
            adjustment.rate,
            `Đơn giá ở vị trí ${index + 1}`,
          ),

        description:
          adjustment.description ===
            undefined ||
          adjustment.description ===
            null
            ? null
            : String(
                adjustment.description,
              )
                .trim()
                .slice(0, 1000),

        reason,
      };
    },
  );
}

function mapAdjustment(row) {
  return {
    id: Number(row.id),
    feedbackId:
      row.feedback_id
        ? Number(row.feedback_id)
        : null,
    payslipId: Number(
      row.payslip_id,
    ),
    salaryItemId: Number(
      row.salary_item_id,
    ),

    itemCode:
      row.item_code ?? null,
    itemLabel:
      row.item_label ?? null,
    category:
      row.category ?? null,

    oldAmount: toNumber(
      row.old_amount,
    ),
    newAmount: toNumber(
      row.new_amount,
    ),
    differenceAmount: toNumber(
      row.difference_amount,
    ),

    direction:
      toNumber(
        row.difference_amount,
      ) > 0
        ? "increase"
        : "decrease",

    reason: row.reason,
    adjustedBy:
      row.adjusted_by ?? null,
    adjustedByName:
      row.adjusted_by_name ??
      null,
    createdAt: row.created_at,
  };
}

function mapAdjustmentSummary(row) {
  if (!row) {
    return {
      totalAdjustments: 0,
      increasedItems: 0,
      decreasedItems: 0,
      incomeDifference: 0,
      deductionDifference: 0,
      estimatedNetDifference: 0,
      firstAdjustedAt: null,
      lastAdjustedAt: null,
    };
  }

  return {
    totalAdjustments: Number(
      row.total_adjustments || 0,
    ),
    increasedItems: Number(
      row.increased_items || 0,
    ),
    decreasedItems: Number(
      row.decreased_items || 0,
    ),
    incomeDifference: toNumber(
      row.income_difference,
    ),
    deductionDifference: toNumber(
      row.deduction_difference,
    ),
    estimatedNetDifference:
      toNumber(
        row.estimated_net_difference,
      ),
    firstAdjustedAt:
      row.first_adjusted_at ?? null,
    lastAdjustedAt:
      row.last_adjusted_at ?? null,
  };
}

/**
 * Tính lại toàn bộ các cột tổng từ payslip_details.
 *
 * Không tin tổng số do frontend gửi lên.
 */
async function calculatePayslipSummary(
  payslipId,
  client,
) {
  const result = await client.query(
    `
      SELECT
        COALESCE(
          SUM(detail.amount) FILTER (
            WHERE salary_item.category =
              'income'
          ),
          0
        ) AS gross_income,

        COALESCE(
          SUM(detail.amount) FILTER (
            WHERE
              salary_item.category =
                'income'
              AND salary_item.taxable = TRUE
          ),
          0
        ) AS taxable_income,

        COALESCE(
          SUM(detail.amount) FILTER (
            WHERE salary_item.category =
              'deduction'
          ),
          0
        ) AS total_deductions,

        COALESCE(
          MAX(detail.amount) FILTER (
            WHERE salary_item.code =
              'BASE_SALARY'
          ),
          0
        ) AS base_salary,

        COALESCE(
          MAX(detail.amount) FILTER (
            WHERE salary_item.code =
              'ATTENDANCE_SALARY'
          ),
          0
        ) AS attendance_salary,

        COALESCE(
          MAX(detail.amount) FILTER (
            WHERE salary_item.code =
              'OVERTIME'
          ),
          0
        ) AS overtime_salary,

        COALESCE(
          SUM(detail.amount) FILTER (
            WHERE salary_item.code IN (
              'RESPONSIBILITY_ALLOWANCE',
              'ATTENDANCE_ALLOWANCE',
              'HOUSING_ALLOWANCE',
              'FUEL_ALLOWANCE',
              'PHONE_ALLOWANCE'
            )
          ),
          0
        ) AS total_allowance,

        COALESCE(
          SUM(detail.amount) FILTER (
            WHERE salary_item.code =
              'PERFORMANCE_BONUS'
          ),
          0
        ) AS total_bonus,

        COALESCE(
          MAX(detail.amount) FILTER (
            WHERE salary_item.code =
              'SOCIAL_INSURANCE'
          ),
          0
        ) AS social_insurance,

        COALESCE(
          MAX(detail.amount) FILTER (
            WHERE salary_item.code =
              'HEALTH_INSURANCE'
          ),
          0
        ) AS health_insurance,

        COALESCE(
          MAX(detail.amount) FILTER (
            WHERE salary_item.code =
              'UNEMPLOYMENT_INSURANCE'
          ),
          0
        ) AS unemployment_insurance,

        COALESCE(
          MAX(detail.amount) FILTER (
            WHERE salary_item.code =
              'PIT'
          ),
          0
        ) AS personal_income_tax

      FROM payslip_details AS detail

      INNER JOIN salary_master_items AS salary_item
        ON salary_item.id =
          detail.salary_item_id

      WHERE detail.payslip_id = $1;
    `,
    [payslipId],
  );

  const row = result.rows[0];

  const grossIncome =
    toNumber(row.gross_income);

  const totalDeductions =
    toNumber(
      row.total_deductions,
    );

  return {
    baseSalary:
      toNumber(row.base_salary),
    attendanceSalary:
      toNumber(
        row.attendance_salary,
      ),
    overtimeSalary:
      toNumber(
        row.overtime_salary,
      ),
    totalAllowance:
      toNumber(
        row.total_allowance,
      ),
    totalBonus:
      toNumber(row.total_bonus),

    grossIncome,
    taxableIncome:
      toNumber(
        row.taxable_income,
      ),

    socialInsurance:
      toNumber(
        row.social_insurance,
      ),
    healthInsurance:
      toNumber(
        row.health_insurance,
      ),
    unemploymentInsurance:
      toNumber(
        row.unemployment_insurance,
      ),
    personalIncomeTax:
      toNumber(
        row.personal_income_tax,
      ),

    totalDeductions,

    netSalary: Math.max(
      0,
      grossIncome -
        totalDeductions,
    ),
  };
}

async function updatePayslipSummary(
  {
    payslipId,
    expectedVersion,
    summary,
  },
  client,
) {
  const result = await client.query(
    `
      UPDATE employee_payslips
      SET
        current_version =
          current_version + 1,

        base_salary = $3,
        attendance_salary = $4,
        overtime_salary = $5,
        total_allowance = $6,
        total_bonus = $7,

        gross_income = $8,
        taxable_income = $9,

        social_insurance = $10,
        health_insurance = $11,
        unemployment_insurance = $12,
        personal_income_tax = $13,

        total_deductions = $14,
        net_salary = $15,

        status = 'adjusted',

        /*
         * Phiếu đã thay đổi nên lần xác nhận cũ
         * không còn hiệu lực.
         */
        signed_at = NULL,

        calculated_at =
          CURRENT_TIMESTAMP,

        updated_at =
          CURRENT_TIMESTAMP

      WHERE id = $1
        AND current_version = $2
        AND status IN (
          'employee_feedback',
          'published'
        )

      RETURNING
        id,
        payroll_period_id,
        staff_id,
        current_version,

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
        calculated_at,
        published_at,
        published_by,
        updated_at;
    `,
    [
      payslipId,
      expectedVersion,

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
    ],
  );

  return result.rows[0] ?? null;
}

/**
 * Lấy dữ liệu cần thiết để HR/Admin
 * mở màn hình điều chỉnh phiếu lương.
 *
 * READ ONLY:
 * - Không transaction.
 * - Không FOR UPDATE.
 * - Không ghi database.
 */
export async function getAdminPayrollAdjustmentContext(
  payslipId,
) {
  const normalizedPayslipId =
    validatePositiveInteger(
      payslipId,
      "Mã phiếu lương",
    );

  const [payslip, detailRows] =
    await Promise.all([
      payslipRepository.findAdminPayslipById(
        normalizedPayslipId,
      ),

      payslipDetailRepository.findAllDetailsByPayslipId(
        normalizedPayslipId,
      ),
    ]);

  if (!payslip) {
    throw new ErrorHandler(
      "Không tìm thấy phiếu lương",
      404,
    );
  }

  const items = detailRows.map(
    (row) => ({
      id: Number(row.id),

      salaryItemId: Number(
        row.salary_item_id,
      ),

      code: row.item_code,
      label: row.item_label,
      category: row.category,

      taxable: Boolean(
        row.taxable,
      ),

      includeIn12MonthAverage:
        Boolean(
          row.include_in_12month_average,
        ),

      visibleToEmployee:
        Boolean(
          row.visible_to_employee,
        ),

      displayOrder: Number(
        row.display_order ?? 0,
      ),

      amount: toNumber(
        row.amount,
      ),

      quantity:
        row.quantity === null ||
        row.quantity === undefined
          ? null
          : toNumber(
              row.quantity,
            ),

      rate:
        row.rate === null ||
        row.rate === undefined
          ? null
          : toNumber(
              row.rate,
            ),

      description:
        row.description ?? "",
    }),
  );

  return {
    payslip: {
      id: Number(
        payslip.id,
      ),

      payrollPeriodId: Number(
        payslip.payroll_period_id,
      ),

      staffId:
        payslip.staff_id,

      employeeName:
        payslip.employee_name,

      department:
        payslip.department,

      jobTitle:
        payslip.job_title,

      periodCode:
        payslip.period_code,

      periodName:
        payslip.period_name,

      periodStatus:
        payslip.period_status,

      status:
        payslip.status,

      currentVersion: Number(
        payslip.current_version,
      ),

      grossIncome: toNumber(
        payslip.gross_income,
      ),

      taxableIncome: toNumber(
        payslip.taxable_income,
      ),

      totalDeductions: toNumber(
        payslip.total_deductions,
      ),

      netSalary: toNumber(
        payslip.net_salary,
      ),

      publishedAt:
        payslip.published_at,

      publishedBy:
        payslip.published_by,
    },

    items,
  };
}

/**
 * Xem trước thay đổi, chưa ghi database.
 */
export async function previewPayrollAdjustment({
  payslipId,
  adjustments,
}) {
  const normalizedPayslipId =
    validatePositiveInteger(
      payslipId,
      "Mã phiếu lương",
    );

  const normalizedAdjustments =
    normalizeAdjustments(
      adjustments,
    );

  const salaryItemIds =
    normalizedAdjustments.map(
      (item) =>
        item.salaryItemId,
    );

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const currentItems =
      await payrollAdjustmentRepository.lockPayslipSalaryItems(
        {
          payslipId:
            normalizedPayslipId,
          salaryItemIds,
        },
        client,
      );

    if (
      currentItems.length !==
      salaryItemIds.length
    ) {
      throw new ErrorHandler(
        "Có khoản lương không tồn tại trong phiếu",
        404,
      );
    }

    const currentMap = new Map(
      currentItems.map(
        (item) => [
          Number(
            item.salary_item_id,
          ),
          item,
        ],
      ),
    );

    const preview =
      normalizedAdjustments.map(
        (requested) => {
          const current =
            currentMap.get(
              requested.salaryItemId,
            );

          const oldAmount =
            toNumber(
              current.amount,
            );

          const difference =
            requested.newAmount -
            oldAmount;

          return {
            salaryItemId:
              requested.salaryItemId,
            itemCode:
              current.item_code,
            itemLabel:
              current.item_label,
            category:
              current.category,
            oldAmount,
            newAmount:
              requested.newAmount,
            differenceAmount:
              difference,
            direction:
              difference > 0
                ? "increase"
                : difference < 0
                  ? "decrease"
                  : "unchanged",
            reason:
              requested.reason,
          };
        },
      );

    await client.query("ROLLBACK");

    return {
      payslipId:
        normalizedPayslipId,
      adjustments: preview,
      changedItems:
        preview.filter(
          (item) =>
            item.differenceAmount !==
            0,
        ).length,
      incomeDifference:
        preview
          .filter(
            (item) =>
              item.category ===
              "income",
          )
          .reduce(
            (total, item) =>
              total +
              item.differenceAmount,
            0,
          ),
      deductionDifference:
        preview
          .filter(
            (item) =>
              item.category ===
              "deduction",
          )
          .reduce(
            (total, item) =>
              total +
              item.differenceAmount,
            0,
          ),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Điều chỉnh phiếu lương trong một transaction.
 *
 * Quy trình:
 * 1. Khóa feedback.
 * 2. Khóa các khoản lương.
 * 3. Chụp phiên bản cũ.
 * 4. Ghi nhật ký điều chỉnh.
 * 5. Cập nhật payslip_details.
 * 6. Tính lại toàn bộ tổng lương.
 * 7. Tăng version.
 * 8. Chụp phiên bản mới.
 * 9. Đánh dấu feedback adjusted.
 */
export async function adjustPayrollPayslip({
  payslipId,
  feedbackId = null,
  adjustments,
  adjustedBy,
  changeReason,
}) {
  const normalizedPayslipId =
    validatePositiveInteger(
      payslipId,
      "Mã phiếu lương",
    );

  const normalizedFeedbackId =
    feedbackId === null ||
    feedbackId === undefined
      ? null
      : validatePositiveInteger(
          feedbackId,
          "Mã phản hồi",
        );

  const normalizedAdjustedBy =
    validateStaffId(
      adjustedBy,
      "Người điều chỉnh",
    );

  const normalizedChangeReason =
    String(changeReason || "")
      .trim();

  if (
    normalizedChangeReason.length <
    5
  ) {
    throw new ErrorHandler(
      "Lý do điều chỉnh phải có ít nhất 5 ký tự",
      400,
    );
  }

  if (
    normalizedChangeReason.length >
    2000
  ) {
    throw new ErrorHandler(
      "Lý do điều chỉnh không được vượt quá 2000 ký tự",
      400,
    );
  }

  const normalizedAdjustments =
    normalizeAdjustments(
      adjustments,
    );

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let feedback = null;

    if (
      normalizedFeedbackId !== null
    ) {
      feedback =
        await payrollFeedbackRepository.lockFeedbackById(
          normalizedFeedbackId,
          client,
        );

      if (!feedback) {
        throw new ErrorHandler(
          "Không tìm thấy phản hồi",
          404,
        );
      }

      if (
        Number(feedback.payslip_id) !==
        normalizedPayslipId
      ) {
        throw new ErrorHandler(
          "Phản hồi không thuộc phiếu lương cần điều chỉnh",
          409,
        );
      }

      if (
        feedback.status !==
        "accepted"
      ) {
        throw new ErrorHandler(
          "Phản hồi chưa được HR xác nhận hoặc đã được xử lý",
          409,
        );
      }

      if (
        feedback.handled_by &&
        feedback.handled_by !==
          normalizedAdjustedBy
      ) {
        throw new ErrorHandler(
          "Phản hồi đang thuộc người xử lý khác",
          409,
        );
      }
    }

    const salaryItemIds =
      normalizedAdjustments.map(
        (item) =>
          item.salaryItemId,
      );

    const currentItems =
      await payrollAdjustmentRepository.lockPayslipSalaryItems(
        {
          payslipId:
            normalizedPayslipId,
          salaryItemIds,
        },
        client,
      );

    if (
      currentItems.length !==
      salaryItemIds.length
    ) {
      throw new ErrorHandler(
        "Có khoản lương không tồn tại trong phiếu",
        404,
      );
    }

    const firstItem =
      currentItems[0];

    if (
      firstItem.period_status !==
      "published"
    ) {
      throw new ErrorHandler(
        "Chỉ được điều chỉnh phiếu thuộc kỳ lương đã phát hành và chưa khóa",
        409,
      );
    }

    if (
      ![
        "employee_feedback",
        "published",
      ].includes(
        firstItem.payslip_status,
      )
    ) {
      throw new ErrorHandler(
        "Trạng thái phiếu lương không cho phép điều chỉnh",
        409,
      );
    }

    if (
      normalizedFeedbackId !== null &&
      firstItem.payslip_status !==
        "employee_feedback"
    ) {
      throw new ErrorHandler(
        "Phiếu lương không ở trạng thái đang xử lý phản hồi",
        409,
      );
    }

    const currentVersion =
      Number(
        firstItem.current_version,
      );

    const oldVersionExists =
      await payrollVersionRepository.versionExists(
        {
          payslipId:
            normalizedPayslipId,
          versionNumber:
            currentVersion,
        },
        client,
      );

    /*
     * Nếu version hiện tại chưa có snapshot,
     * chụp lại trước khi sửa.
     */
    if (!oldVersionExists) {
      const oldSnapshot =
        await payrollVersionRepository.createSnapshotFromCurrentPayslip(
          {
            payslipId:
              normalizedPayslipId,
            versionNumber:
              currentVersion,
            changeReason:
              "Phiên bản trước khi điều chỉnh",
            feedbackId:
              normalizedFeedbackId,
            createdBy:
              normalizedAdjustedBy,
            publishedAt:
              new Date(),
          },
          client,
        );

      if (!oldSnapshot) {
        throw new ErrorHandler(
          "Không thể lưu phiên bản phiếu lương cũ",
          500,
        );
      }
    }

    const currentItemMap =
      new Map(
        currentItems.map(
          (item) => [
            Number(
              item.salary_item_id,
            ),
            item,
          ],
        ),
      );

    const changedItems = [];

    for (
      const requested of
      normalizedAdjustments
    ) {
      const current =
        currentItemMap.get(
          requested.salaryItemId,
        );

      if (!current.enabled) {
        throw new ErrorHandler(
          `Khoản lương ${current.item_label} đã bị vô hiệu hóa`,
          409,
        );
      }

      const oldAmount =
        toNumber(current.amount);

      if (
        oldAmount ===
        requested.newAmount
      ) {
        continue;
      }

      changedItems.push({
        salaryItemId:
          requested.salaryItemId,
        oldAmount,
        newAmount:
          requested.newAmount,
        reason:
          requested.reason,

        quantity:
          requested.quantity ??
          (
            current.quantity !==
              null
              ? toNumber(
                  current.quantity,
                )
              : null
          ),

        rate:
          requested.rate ??
          (
            current.rate !== null
              ? toNumber(
                  current.rate,
                )
              : null
          ),

        description:
          requested.description ??
          current.description ??
          null,

        itemCode:
          current.item_code,
        itemLabel:
          current.item_label,
        category:
          current.category,
      });
    }

    if (changedItems.length === 0) {
      throw new ErrorHandler(
        "Không có khoản lương nào thay đổi",
        409,
      );
    }

    const adjustmentRows =
      await payrollAdjustmentRepository.createManyPayrollAdjustments(
        {
          feedbackId:
            normalizedFeedbackId,
          payslipId:
            normalizedPayslipId,
          adjustments:
            changedItems,
          adjustedBy:
            normalizedAdjustedBy,
        },
        client,
      );

    await payslipDetailRepository.upsertManyPayslipDetails(
      {
        payslipId:
          normalizedPayslipId,

        details:
          changedItems.map(
            (item) => ({
              salaryItemId:
                item.salaryItemId,
              amount:
                item.newAmount,
              quantity:
                item.quantity,
              rate:
                item.rate,
              description:
                item.description,
            }),
          ),
      },
      client,
    );

    const summary =
      await calculatePayslipSummary(
        normalizedPayslipId,
        client,
      );

    const updatedPayslip =
      await updatePayslipSummary(
        {
          payslipId:
            normalizedPayslipId,
          expectedVersion:
            currentVersion,
          summary,
        },
        client,
      );

    if (!updatedPayslip) {
      throw new ErrorHandler(
        "Phiếu lương vừa được thay đổi bởi một thao tác khác",
        409,
      );
    }

    const newVersion =
      Number(
        updatedPayslip.current_version,
      );

    const newSnapshot =
      await payrollVersionRepository.createSnapshotFromCurrentPayslip(
        {
          payslipId:
            normalizedPayslipId,
          versionNumber:
            newVersion,
          changeReason:
            normalizedChangeReason,
          feedbackId:
            normalizedFeedbackId,
          createdBy:
            normalizedAdjustedBy,
          publishedAt: null,
        },
        client,
      );

    if (!newSnapshot) {
      throw new ErrorHandler(
        "Không thể lưu phiên bản phiếu lương mới",
        500,
      );
    }

    if (
      normalizedFeedbackId !== null
    ) {
      const adjustedFeedback =
        await payrollFeedbackRepository.markFeedbackAdjusted(
          {
            feedbackId:
              normalizedFeedbackId,
            handledBy:
              normalizedAdjustedBy,
            hrReply:
              "Phiếu lương đã được điều chỉnh, đang chờ phát hành lại.",
          },
          client,
        );

      if (!adjustedFeedback) {
        throw new ErrorHandler(
          "Không thể cập nhật trạng thái phản hồi",
          409,
        );
      }
    }

    await client.query("COMMIT");

    return {
      payslip: {
        id: Number(
          updatedPayslip.id,
        ),
        staffId:
          updatedPayslip.staff_id,
        status:
          updatedPayslip.status,

        previousVersion:
          currentVersion,
        currentVersion:
          newVersion,

        grossIncome:
          toNumber(
            updatedPayslip.gross_income,
          ),
        taxableIncome:
          toNumber(
            updatedPayslip.taxable_income,
          ),
        totalDeductions:
          toNumber(
            updatedPayslip.total_deductions,
          ),
        netSalary:
          toNumber(
            updatedPayslip.net_salary,
          ),

        calculatedAt:
          updatedPayslip.calculated_at,
      },

      feedbackId:
        normalizedFeedbackId,

      adjustments:
        adjustmentRows.map(
          (row) => {
            const item =
              changedItems.find(
                (changed) =>
                  changed.salaryItemId ===
                  Number(
                    row.salary_item_id,
                  ),
              );

            return {
              ...mapAdjustment({
                ...row,
                item_code:
                  item?.itemCode,
                item_label:
                  item?.itemLabel,
                category:
                  item?.category,
              }),
            };
          },
        ),

      comparison: {
        fromVersion:
          currentVersion,
        toVersion:
          newVersion,
        changedItems:
          changedItems.length,

        incomeDifference:
          changedItems
            .filter(
              (item) =>
                item.category ===
                "income",
            )
            .reduce(
              (total, item) =>
                total +
                (
                  item.newAmount -
                  item.oldAmount
                ),
              0,
            ),

        deductionDifference:
          changedItems
            .filter(
              (item) =>
                item.category ===
                "deduction",
            )
            .reduce(
              (total, item) =>
                total +
                (
                  item.newAmount -
                  item.oldAmount
                ),
              0,
            ),
      },

      nextAction: {
        type:
          "republish_payslip",
        payslipId:
          normalizedPayslipId,
        feedbackId:
          normalizedFeedbackId,
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * HR xem lịch sử điều chỉnh của phiếu.
 */
export async function getAdminPayslipAdjustments(
  payslipId,
) {
  const normalizedPayslipId =
    validatePositiveInteger(
      payslipId,
      "Mã phiếu lương",
    );

  const [
    adjustments,
    summary,
  ] = await Promise.all([
    payrollAdjustmentRepository.findAdjustmentsByPayslipId(
      normalizedPayslipId,
    ),

    payrollAdjustmentRepository.getPayslipAdjustmentSummary(
      normalizedPayslipId,
    ),
  ]);

  return {
    payslipId:
      normalizedPayslipId,
    adjustments:
      adjustments.map(
        mapAdjustment,
      ),
    summary:
      mapAdjustmentSummary(
        summary,
      ),
  };
}

/**
 * Nhân viên xem chi tiết các khoản đã thay đổi.
 */
export async function getEmployeePayslipAdjustments({
  payslipId,
  staffId,
}) {
  const normalizedPayslipId =
    validatePositiveInteger(
      payslipId,
      "Mã phiếu lương",
    );

  const normalizedStaffId =
    validateStaffId(staffId);

  const adjustments =
    await payrollAdjustmentRepository.findEmployeePayslipAdjustments(
      {
        payslipId:
          normalizedPayslipId,
        staffId:
          normalizedStaffId,
      },
    );

  if (adjustments.length === 0) {
    const payslipResult =
      await pool.query(
        `
          SELECT id
          FROM employee_payslips
          WHERE id = $1
            AND staff_id = $2
          LIMIT 1;
        `,
        [
          normalizedPayslipId,
          normalizedStaffId,
        ],
      );

    if (!payslipResult.rows[0]) {
      throw new ErrorHandler(
        "Không tìm thấy phiếu lương hoặc bạn không có quyền truy cập",
        404,
      );
    }
  }

  return {
    payslipId:
      normalizedPayslipId,
    adjustments:
      adjustments.map(
        mapAdjustment,
      ),
  };
}

/**
 * Xem điều chỉnh phát sinh từ một phản hồi.
 */
export async function getFeedbackAdjustments(
  feedbackId,
) {
  const normalizedFeedbackId =
    validatePositiveInteger(
      feedbackId,
      "Mã phản hồi",
    );

  const [
    feedback,
    adjustments,
    summary,
  ] = await Promise.all([
    payrollFeedbackRepository.findFeedbackById(
      normalizedFeedbackId,
    ),

    payrollAdjustmentRepository.findAdjustmentsByFeedbackId(
      normalizedFeedbackId,
    ),

    payrollAdjustmentRepository.getFeedbackAdjustmentSummary(
      normalizedFeedbackId,
    ),
  ]);

  if (!feedback) {
    throw new ErrorHandler(
      "Không tìm thấy phản hồi",
      404,
    );
  }

  return {
    feedbackId:
      normalizedFeedbackId,
    payslipId:
      Number(
        feedback.payslip_id,
      ),
    feedbackStatus:
      feedback.status,
    adjustments:
      adjustments.map(
        mapAdjustment,
      ),
    summary:
      mapAdjustmentSummary(
        summary,
      ),
  };
}