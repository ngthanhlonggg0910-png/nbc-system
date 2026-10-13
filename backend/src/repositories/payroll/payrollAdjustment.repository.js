import pool from "../../config/db.js";

/**
 * Lưu một khoản điều chỉnh lương.
 *
 * Bảng payroll_adjustments là nhật ký bất biến:
 * - Không update.
 * - Không delete.
 * - Mỗi lần thay đổi tạo một bản ghi mới.
 */
export async function createPayrollAdjustment(
  {
    feedbackId = null,
    payslipId,
    salaryItemId,
    oldAmount,
    newAmount,
    reason,
    adjustedBy,
  },
  client = pool,
) {
  const query = `
    INSERT INTO payroll_adjustments (
      feedback_id,
      payslip_id,
      salary_item_id,
      old_amount,
      new_amount,
      reason,
      adjusted_by
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7
    )
    RETURNING
      id,
      feedback_id,
      payslip_id,
      salary_item_id,
      old_amount,
      new_amount,
      difference_amount,
      reason,
      adjusted_by,
      created_at;
  `;

  const values = [
    feedbackId,
    payslipId,
    salaryItemId,
    oldAmount,
    newAmount,
    reason,
    adjustedBy,
  ];

  const { rows } = await client.query(
    query,
    values,
  );

  return rows[0] ?? null;
}

/**
 * Lưu nhiều khoản điều chỉnh cùng lúc.
 *
 * adjustments:
 * [
 *   {
 *     salaryItemId: 1,
 *     oldAmount: 8904000,
 *     newAmount: 9904000,
 *     reason: "Bổ sung ngày công bị thiếu"
 *   }
 * ]
 */
export async function createManyPayrollAdjustments(
  {
    feedbackId = null,
    payslipId,
    adjustments,
    adjustedBy,
  },
  client = pool,
) {
  if (
    !Array.isArray(adjustments) ||
    adjustments.length === 0
  ) {
    return [];
  }

  const normalizedAdjustments =
    adjustments.map(
      (adjustment) => ({
        salary_item_id:
          adjustment.salaryItemId,
        old_amount:
          adjustment.oldAmount,
        new_amount:
          adjustment.newAmount,
        reason:
          adjustment.reason,
      }),
    );

  const query = `
    INSERT INTO payroll_adjustments (
      feedback_id,
      payslip_id,
      salary_item_id,
      old_amount,
      new_amount,
      reason,
      adjusted_by
    )

SELECT
  $1::BIGINT,
  $2::BIGINT,
  adjustment.salary_item_id,
  adjustment.old_amount,
  adjustment.new_amount,
  adjustment.reason,
  $4::VARCHAR

    FROM JSONB_TO_RECORDSET(
      $3::JSONB
    ) AS adjustment (
      salary_item_id BIGINT,
      old_amount NUMERIC(19,2),
      new_amount NUMERIC(19,2),
      reason TEXT
    )

    WHERE adjustment.old_amount <>
      adjustment.new_amount

    RETURNING
      id,
      feedback_id,
      payslip_id,
      salary_item_id,
      old_amount,
      new_amount,
      difference_amount,
      reason,
      adjusted_by,
      created_at;
  `;

  const values = [
    feedbackId,
    payslipId,
    JSON.stringify(
      normalizedAdjustments,
    ),
    adjustedBy,
  ];

  const { rows } = await client.query(
    query,
    values,
  );

  return rows;
}

/**
 * Lấy một bản ghi điều chỉnh theo ID.
 */
export async function findAdjustmentById(
  adjustmentId,
  client = pool,
) {
  const query = `
    SELECT
      adjustment.id,
      adjustment.feedback_id,
      adjustment.payslip_id,
      adjustment.salary_item_id,
      adjustment.old_amount,
      adjustment.new_amount,
      adjustment.difference_amount,
      adjustment.reason,
      adjustment.adjusted_by,
      adjustment.created_at,

      salary_item.code AS item_code,
      salary_item.label AS item_label,
      salary_item.category,
      salary_item.taxable,
      salary_item.visible_to_employee,
      salary_item.display_order,

      payslip.staff_id,
      payslip.current_version,
      payslip.status AS payslip_status,

      period.id AS payroll_period_id,
      period.period_code,
      period.period_name,

      CONCAT_WS(
        ' ',
        employee.last_name,
        employee.first_name
      ) AS employee_name,

      CONCAT_WS(
        ' ',
        actor.last_name,
        actor.first_name
      ) AS adjusted_by_name,

      feedback.category
        AS feedback_category,

      feedback.content
        AS feedback_content,

      feedback.status
        AS feedback_status

    FROM payroll_adjustments AS adjustment

    INNER JOIN salary_master_items AS salary_item
      ON salary_item.id =
        adjustment.salary_item_id

    INNER JOIN employee_payslips AS payslip
      ON payslip.id =
        adjustment.payslip_id

    INNER JOIN payroll_periods AS period
      ON period.id =
        payslip.payroll_period_id

    INNER JOIN employees AS employee
      ON employee.staff_id =
        payslip.staff_id

    LEFT JOIN employees AS actor
      ON actor.staff_id =
        adjustment.adjusted_by

    LEFT JOIN payroll_feedbacks AS feedback
      ON feedback.id =
        adjustment.feedback_id

    WHERE adjustment.id = $1

    LIMIT 1;
  `;

  const { rows } = await client.query(
    query,
    [adjustmentId],
  );

  return rows[0] ?? null;
}

/**
 * Lấy toàn bộ lịch sử điều chỉnh của một phiếu lương.
 *
 * Dùng cho HR/Admin.
 */
export async function findAdjustmentsByPayslipId(
  payslipId,
  client = pool,
) {
  const query = `
    SELECT
      adjustment.id,
      adjustment.feedback_id,
      adjustment.payslip_id,
      adjustment.salary_item_id,
      adjustment.old_amount,
      adjustment.new_amount,
      adjustment.difference_amount,
      adjustment.reason,
      adjustment.adjusted_by,
      adjustment.created_at,

      salary_item.code AS item_code,
      salary_item.label AS item_label,
      salary_item.category,
      salary_item.taxable,
      salary_item.visible_to_employee,
      salary_item.display_order,

      feedback.category
        AS feedback_category,

      feedback.content
        AS feedback_content,

      feedback.status
        AS feedback_status,

      CONCAT_WS(
        ' ',
        actor.last_name,
        actor.first_name
      ) AS adjusted_by_name

    FROM payroll_adjustments AS adjustment

    INNER JOIN salary_master_items AS salary_item
      ON salary_item.id =
        adjustment.salary_item_id

    LEFT JOIN payroll_feedbacks AS feedback
      ON feedback.id =
        adjustment.feedback_id

    LEFT JOIN employees AS actor
      ON actor.staff_id =
        adjustment.adjusted_by

    WHERE adjustment.payslip_id = $1

    ORDER BY
      adjustment.created_at DESC,
      adjustment.id DESC;
  `;

  const { rows } = await client.query(
    query,
    [payslipId],
  );

  return rows;
}

/**
 * Nhân viên xem lịch sử điều chỉnh phiếu lương.
 *
 * Điều kiện:
 * - Phiếu phải thuộc nhân viên.
 * - Chỉ hiện salary item được phép hiển thị.
 */
export async function findEmployeePayslipAdjustments(
  {
    payslipId,
    staffId,
  },
  client = pool,
) {
  const query = `
    SELECT
      adjustment.id,
      adjustment.feedback_id,
      adjustment.payslip_id,
      adjustment.salary_item_id,
      adjustment.old_amount,
      adjustment.new_amount,
      adjustment.difference_amount,
      adjustment.reason,
      adjustment.created_at,

      salary_item.code AS item_code,
      salary_item.label AS item_label,
      salary_item.category,
      salary_item.display_order,

      feedback.category
        AS feedback_category,

      feedback.status
        AS feedback_status

    FROM payroll_adjustments AS adjustment

    INNER JOIN employee_payslips AS payslip
      ON payslip.id =
        adjustment.payslip_id

    INNER JOIN salary_master_items AS salary_item
      ON salary_item.id =
        adjustment.salary_item_id

    LEFT JOIN payroll_feedbacks AS feedback
      ON feedback.id =
        adjustment.feedback_id

    WHERE adjustment.payslip_id = $1
      AND payslip.staff_id = $2
      AND salary_item.visible_to_employee = TRUE
      AND payslip.status IN (
        'published',
        'confirmed',
        'adjusted',
        'paid'
      )

    ORDER BY
      adjustment.created_at DESC,
      salary_item.category ASC,
      salary_item.display_order ASC,
      adjustment.id DESC;
  `;

  const values = [
    payslipId,
    staffId,
  ];

  const { rows } = await client.query(
    query,
    values,
  );

  return rows;
}

/**
 * Lấy các khoản điều chỉnh phát sinh từ một phản hồi.
 */
export async function findAdjustmentsByFeedbackId(
  feedbackId,
  client = pool,
) {
  const query = `
    SELECT
      adjustment.id,
      adjustment.feedback_id,
      adjustment.payslip_id,
      adjustment.salary_item_id,
      adjustment.old_amount,
      adjustment.new_amount,
      adjustment.difference_amount,
      adjustment.reason,
      adjustment.adjusted_by,
      adjustment.created_at,

      salary_item.code AS item_code,
      salary_item.label AS item_label,
      salary_item.category,
      salary_item.taxable,
      salary_item.visible_to_employee,
      salary_item.display_order,

      CONCAT_WS(
        ' ',
        actor.last_name,
        actor.first_name
      ) AS adjusted_by_name

    FROM payroll_adjustments AS adjustment

    INNER JOIN salary_master_items AS salary_item
      ON salary_item.id =
        adjustment.salary_item_id

    LEFT JOIN employees AS actor
      ON actor.staff_id =
        adjustment.adjusted_by

    WHERE adjustment.feedback_id = $1

    ORDER BY
      salary_item.category ASC,
      salary_item.display_order ASC,
      adjustment.id ASC;
  `;

  const { rows } = await client.query(
    query,
    [feedbackId],
  );

  return rows;
}

/**
 * Khóa một khoản lương trước khi điều chỉnh.
 *
 * Service phải gọi trong transaction.
 * FOR UPDATE ngăn hai HR chỉnh cùng một khoản đồng thời.
 */
export async function lockPayslipSalaryItem(
  {
    payslipId,
    salaryItemId,
  },
  client,
) {
  const query = `
    SELECT
      detail.id,
      detail.payslip_id,
      detail.salary_item_id,
      detail.amount,
      detail.quantity,
      detail.rate,
      detail.description,
      detail.created_at,

      salary_item.code AS item_code,
      salary_item.label AS item_label,
      salary_item.category,
      salary_item.taxable,
      salary_item.visible_to_employee,
      salary_item.display_order,
      salary_item.enabled,

      payslip.staff_id,
      payslip.payroll_period_id,
      payslip.current_version,
      payslip.status AS payslip_status,

      period.period_code,
      period.status AS period_status

    FROM payslip_details AS detail

    INNER JOIN salary_master_items AS salary_item
      ON salary_item.id =
        detail.salary_item_id

    INNER JOIN employee_payslips AS payslip
      ON payslip.id =
        detail.payslip_id

    INNER JOIN payroll_periods AS period
      ON period.id =
        payslip.payroll_period_id

    WHERE detail.payslip_id = $1
      AND detail.salary_item_id = $2

    FOR UPDATE OF detail, payslip;
  `;

  const values = [
    payslipId,
    salaryItemId,
  ];

  const { rows } = await client.query(
    query,
    values,
  );

  return rows[0] ?? null;
}

/**
 * Khóa nhiều khoản lương cần điều chỉnh.
 *
 * Trả theo đúng display_order để giao diện hiển thị ổn định.
 */
export async function lockPayslipSalaryItems(
  {
    payslipId,
    salaryItemIds,
  },
  client,
) {
  if (
    !Array.isArray(salaryItemIds) ||
    salaryItemIds.length === 0
  ) {
    return [];
  }

  const query = `
    SELECT
      detail.id,
      detail.payslip_id,
      detail.salary_item_id,
      detail.amount,
      detail.quantity,
      detail.rate,
      detail.description,

      salary_item.code AS item_code,
      salary_item.label AS item_label,
      salary_item.category,
      salary_item.taxable,
      salary_item.visible_to_employee,
      salary_item.display_order,
      salary_item.enabled,

      payslip.staff_id,
      payslip.payroll_period_id,
      payslip.current_version,
      payslip.status AS payslip_status,

      period.period_code,
      period.status AS period_status

    FROM payslip_details AS detail

    INNER JOIN salary_master_items AS salary_item
      ON salary_item.id =
        detail.salary_item_id

    INNER JOIN employee_payslips AS payslip
      ON payslip.id =
        detail.payslip_id

    INNER JOIN payroll_periods AS period
      ON period.id =
        payslip.payroll_period_id

    WHERE detail.payslip_id = $1
      AND detail.salary_item_id =
        ANY($2::BIGINT[])

    ORDER BY
      salary_item.category ASC,
      salary_item.display_order ASC,
      detail.salary_item_id ASC

    FOR UPDATE OF detail, payslip;
  `;

  const values = [
    payslipId,
    salaryItemIds,
  ];

  const { rows } = await client.query(
    query,
    values,
  );

  return rows;
}

/**
 * Thống kê tăng/giảm của một phiếu lương.
 */
export async function getPayslipAdjustmentSummary(
  payslipId,
  client = pool,
) {
  const query = `
    SELECT
      COUNT(*)::INT
        AS total_adjustments,

      COUNT(*) FILTER (
        WHERE difference_amount > 0
      )::INT AS increased_items,

      COUNT(*) FILTER (
        WHERE difference_amount < 0
      )::INT AS decreased_items,

      COALESCE(
        SUM(
          difference_amount
        ) FILTER (
          WHERE salary_item.category =
            'income'
        ),
        0
      ) AS income_difference,

      COALESCE(
        SUM(
          difference_amount
        ) FILTER (
          WHERE salary_item.category =
            'deduction'
        ),
        0
      ) AS deduction_difference,

      COALESCE(
        SUM(
          CASE
            WHEN salary_item.category =
              'income'
              THEN difference_amount

            WHEN salary_item.category =
              'deduction'
              THEN -difference_amount

            ELSE 0
          END
        ),
        0
      ) AS estimated_net_difference,

      MIN(adjustment.created_at)
        AS first_adjusted_at,

      MAX(adjustment.created_at)
        AS last_adjusted_at

    FROM payroll_adjustments AS adjustment

    INNER JOIN salary_master_items AS salary_item
      ON salary_item.id =
        adjustment.salary_item_id

    WHERE adjustment.payslip_id = $1;
  `;

  const { rows } = await client.query(
    query,
    [payslipId],
  );

  return rows[0];
}

/**
 * Thống kê tăng/giảm theo một phản hồi.
 *
 * Dùng ở màn hình:
 * "Khoản cũ - khoản mới - chênh lệch".
 */
export async function getFeedbackAdjustmentSummary(
  feedbackId,
  client = pool,
) {
  const query = `
    SELECT
      adjustment.feedback_id,
      adjustment.payslip_id,

      COUNT(*)::INT
        AS total_adjustments,

      COUNT(*) FILTER (
        WHERE adjustment.difference_amount > 0
      )::INT AS increased_items,

      COUNT(*) FILTER (
        WHERE adjustment.difference_amount < 0
      )::INT AS decreased_items,

      COALESCE(
        SUM(
          adjustment.difference_amount
        ) FILTER (
          WHERE salary_item.category =
            'income'
        ),
        0
      ) AS income_difference,

      COALESCE(
        SUM(
          adjustment.difference_amount
        ) FILTER (
          WHERE salary_item.category =
            'deduction'
        ),
        0
      ) AS deduction_difference,

      COALESCE(
        SUM(
          CASE
            WHEN salary_item.category =
              'income'
              THEN adjustment.difference_amount

            WHEN salary_item.category =
              'deduction'
              THEN -adjustment.difference_amount

            ELSE 0
          END
        ),
        0
      ) AS estimated_net_difference,

      MIN(adjustment.created_at)
        AS first_adjusted_at,

      MAX(adjustment.created_at)
        AS last_adjusted_at

    FROM payroll_adjustments AS adjustment

    INNER JOIN salary_master_items AS salary_item
      ON salary_item.id =
        adjustment.salary_item_id

    WHERE adjustment.feedback_id = $1

    GROUP BY
      adjustment.feedback_id,
      adjustment.payslip_id;
  `;

  const { rows } = await client.query(
    query,
    [feedbackId],
  );

  return rows[0] ?? null;
}

/**
 * Đếm số lần khoản lương đã bị thay đổi.
 *
 * Hữu ích để cảnh báo HR khi cùng một khoản
 * đã được điều chỉnh nhiều lần.
 */
export async function countSalaryItemAdjustments(
  {
    payslipId,
    salaryItemId,
  },
  client = pool,
) {
  const query = `
    SELECT COUNT(*)::INT AS total
    FROM payroll_adjustments
    WHERE payslip_id = $1
      AND salary_item_id = $2;
  `;

  const values = [
    payslipId,
    salaryItemId,
  ];

  const { rows } = await client.query(
    query,
    values,
  );

  return rows[0]?.total ?? 0;
}
