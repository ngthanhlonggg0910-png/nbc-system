import pool from "../../config/db.js";

/**
 * Lấy danh sách kỳ lương.
 *
 * Filter:
 * - status: draft, published, locked, cancelled
 * - year: 2026
 * - limit/offset: phân trang
 */
export async function findPayrollPeriods(
  {
    status = null,
    year = null,
    limit = 20,
    offset = 0,
  },
  client = pool,
) {
  const query = `
    SELECT
      period.id,
      period.period_code,
      period.period_name,
      period.start_date,
      period.end_date,
      period.payment_date,
      period.status,

      period.published_at,
      period.published_by,

      CONCAT_WS(
        ' ',
        publisher.last_name,
        publisher.first_name
      ) AS published_by_name,

      period.closed_at,
      period.locked_by,

      CONCAT_WS(
        ' ',
        locker.last_name,
        locker.first_name
      ) AS locked_by_name,

      period.created_by,

      CONCAT_WS(
        ' ',
        creator.last_name,
        creator.first_name
      ) AS created_by_name,

      period.created_at,
      period.updated_at,

      COUNT(payslip.id)::INT
        AS total_payslips,

      COUNT(payslip.id)
        FILTER (
          WHERE payslip.status = 'confirmed'
        )::INT
        AS confirmed_payslips,

      COUNT(payslip.id)
        FILTER (
          WHERE payslip.status = 'employee_feedback'
        )::INT
        AS feedback_payslips,

      COUNT(payslip.id)
        FILTER (
          WHERE payslip.status = 'paid'
        )::INT
        AS paid_payslips,

      COALESCE(
        SUM(payslip.gross_income),
        0
      ) AS total_gross_income,

      COALESCE(
        SUM(payslip.total_deductions),
        0
      ) AS total_deductions,

      COALESCE(
        SUM(payslip.net_salary),
        0
      ) AS total_net_salary

    FROM payroll_periods AS period

    LEFT JOIN employees AS publisher
      ON publisher.staff_id =
         period.published_by

    LEFT JOIN employees AS locker
      ON locker.staff_id =
         period.locked_by

    LEFT JOIN employees AS creator
      ON creator.staff_id =
         period.created_by

    LEFT JOIN employee_payslips AS payslip
      ON payslip.payroll_period_id =
         period.id

    WHERE (
      $1::VARCHAR IS NULL
      OR period.status = $1
    )
    AND (
      $2::INT IS NULL
      OR SUBSTRING(
        period.period_code FROM 1 FOR 4
      )::INT = $2
    )

    GROUP BY
      period.id,
      publisher.last_name,
      publisher.first_name,
      locker.last_name,
      locker.first_name,
      creator.last_name,
      creator.first_name

    ORDER BY period.period_code DESC

    LIMIT $3
    OFFSET $4;
  `;

  const values = [
    status,
    year,
    limit,
    offset,
  ];

  const { rows } =
    await client.query(
      query,
      values,
    );

  return rows;
}

/**
 * Đếm số kỳ lương để phân trang.
 */
export async function countPayrollPeriods(
  {
    status = null,
    year = null,
  },
  client = pool,
) {
  const query = `
    SELECT COUNT(*)::INT AS total
    FROM payroll_periods AS period
    WHERE (
      $1::VARCHAR IS NULL
      OR period.status = $1
    )
    AND (
      $2::INT IS NULL
      OR SUBSTRING(
        period.period_code FROM 1 FOR 4
      )::INT = $2
    );
  `;

  const values = [
    status,
    year,
  ];

  const { rows } =
    await client.query(
      query,
      values,
    );

  return rows[0]?.total ?? 0;
}

/**
 * Tìm kỳ lương bằng ID.
 */
export async function findById(
  periodId,
  client = pool,
) {
  const query = `
    SELECT
      period.id,
      period.period_code,
      period.period_name,
      period.start_date,
      period.end_date,
      period.payment_date,
      period.status,
      period.published_at,
      period.published_by,
      period.closed_at,
      period.locked_by,
      period.created_by,
      period.created_at,
      period.updated_at
    FROM payroll_periods AS period
    WHERE period.id = $1
    LIMIT 1;
  `;

  const { rows } =
    await client.query(
      query,
      [periodId],
    );

  return rows[0] ?? null;
}

/**
 * Tìm kỳ lương bằng mã YYYY-MM.
 *
 * Ví dụ:
 * 2026-06
 * 2026-07
 */
export async function findByCode(
  periodCode,
  client = pool,
) {
  const query = `
    SELECT
      period.id,
      period.period_code,
      period.period_name,
      period.start_date,
      period.end_date,
      period.payment_date,
      period.status,
      period.published_at,
      period.published_by,
      period.closed_at,
      period.locked_by,
      period.created_by,
      period.created_at,
      period.updated_at
    FROM payroll_periods AS period
    WHERE period.period_code = $1
    LIMIT 1;
  `;

  const { rows } =
    await client.query(
      query,
      [periodCode],
    );

  return rows[0] ?? null;
}

/**
 * Kiểm tra mã kỳ lương đã tồn tại hay chưa.
 */
export async function periodCodeExists(
  periodCode,
  client = pool,
) {
  const query = `
    SELECT EXISTS (
      SELECT 1
      FROM payroll_periods
      WHERE period_code = $1
    ) AS exists;
  `;

  const { rows } =
    await client.query(
      query,
      [periodCode],
    );

  return rows[0]?.exists === true;
}

/**
 * Tạo kỳ lương mới.
 *
 * periodCode phải có định dạng YYYY-MM.
 */
export async function createPayrollPeriod(
  {
    periodCode,
    periodName,
    startDate,
    endDate,
    paymentDate = null,
    createdBy = null,
    managerId = null,
    approverId = null,
    description = null,
    scopeType = "enterprise",
    unitIds = [],
  },
  client = pool,
) {
  const query = `
    INSERT INTO payroll_periods (
      period_code,
      period_name,
      start_date,
      end_date,
      payment_date,
      status,
      created_by
      ,manager_id
      ,approver_id
      ,description
      ,scope_type
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      'draft',
      $6
      ,$7
      ,$8
      ,$9
      ,$10
    )
    RETURNING
      id,
      period_code,
      period_name,
      start_date,
      end_date,
      payment_date,
      status,
      published_at,
      published_by,
      closed_at,
      locked_by,
      created_by,
      created_at,
      updated_at;
  `;

  const values = [
    periodCode,
    periodName,
    startDate,
    endDate,
    paymentDate,
    createdBy,
    managerId,
    approverId,
    description,
    scopeType,
  ];

  const { rows } =
    await client.query(
      query,
      values,
    );

  if (scopeType === "selected_units" && Array.isArray(unitIds) && unitIds.length) {
    await client.query(
      `INSERT INTO payroll_period_units (payroll_period_id, work_location_id)
       SELECT $1, UNNEST($2::bigint[]) ON CONFLICT DO NOTHING`,
      [rows[0].id, unitIds],
    );
  }

  return rows[0];
}

/**
 * Cập nhật thông tin kỳ lương.
 *
 * Chỉ cho cập nhật khi kỳ đang ở trạng thái draft.
 * Khi đã published hoặc locked thì UPDATE trả về null.
 */
export async function updateDraftPayrollPeriod(
  {
    periodId,
    periodName,
    startDate,
    endDate,
    paymentDate = null,
  },
  client = pool,
) {
  const query = `
    UPDATE payroll_periods
    SET
      period_name = $2,
      start_date = $3,
      end_date = $4,
      payment_date = $5,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
      AND status = 'draft'
    RETURNING
      id,
      period_code,
      period_name,
      start_date,
      end_date,
      payment_date,
      status,
      published_at,
      published_by,
      closed_at,
      locked_by,
      created_by,
      created_at,
      updated_at;
  `;

  const values = [
    periodId,
    periodName,
    startDate,
    endDate,
    paymentDate,
  ];

  const { rows } =
    await client.query(
      query,
      values,
    );

  return rows[0] ?? null;
}

/**
 * Đánh dấu kỳ lương là đã phát hành.
 *
 * Chỉ chuyển được:
 * draft → published
 *
 * Việc cập nhật toàn bộ phiếu lương trong kỳ phải được
 * payrollPublish.service.js thực hiện trong cùng transaction.
 */
export async function markPeriodPublished(
  {
    periodId,
    publishedBy,
  },
  client = pool,
) {
  const query = `
    UPDATE payroll_periods
    SET
      status = 'published',
      published_at = CURRENT_TIMESTAMP,
      published_by = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
      AND status = 'draft'
    RETURNING
      id,
      period_code,
      period_name,
      start_date,
      end_date,
      payment_date,
      status,
      published_at,
      published_by,
      closed_at,
      locked_by,
      created_by,
      created_at,
      updated_at;
  `;

  const values = [
    periodId,
    publishedBy,
  ];

  const { rows } =
    await client.query(
      query,
      values,
    );

  return rows[0] ?? null;
}

/**
 * Khóa kỳ lương.
 *
 * Chỉ chuyển được:
 * published → locked
 *
 * Sau khi locked:
 * - Không import lại.
 * - Không sửa phiếu.
 * - Không thêm chi tiết.
 * - Không điều chỉnh nếu chưa mở khóa theo quy trình.
 */
export async function lockPayrollPeriod(
  {
    periodId,
    lockedBy,
  },
  client = pool,
) {
  const query = `
    UPDATE payroll_periods
    SET
      status = 'locked',
      closed_at = CURRENT_TIMESTAMP,
      locked_by = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
      AND status = 'published'
    RETURNING
      id,
      period_code,
      period_name,
      start_date,
      end_date,
      payment_date,
      status,
      published_at,
      published_by,
      closed_at,
      locked_by,
      created_by,
      created_at,
      updated_at;
  `;

  const values = [
    periodId,
    lockedBy,
  ];

  const { rows } =
    await client.query(
      query,
      values,
    );

  return rows[0] ?? null;
}

/**
 * Hủy kỳ lương.
 *
 * Chỉ cho phép:
 * draft → cancelled
 *
 * Không xóa vật lý kỳ lương để giữ audit log.
 */
export async function cancelDraftPayrollPeriod(
  {
    periodId,
  },
  client = pool,
) {
  const query = `
    UPDATE payroll_periods
    SET
      status = 'cancelled',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
      AND status = 'draft'
    RETURNING
      id,
      period_code,
      period_name,
      start_date,
      end_date,
      payment_date,
      status,
      published_at,
      published_by,
      closed_at,
      locked_by,
      created_by,
      created_at,
      updated_at;
  `;

  const { rows } =
    await client.query(
      query,
      [periodId],
    );

  return rows[0] ?? null;
}

/**
 * Kiểm tra kỳ lương đã có phiếu lương hay chưa.
 */
export async function hasPayslips(
  periodId,
  client = pool,
) {
  const query = `
    SELECT EXISTS (
      SELECT 1
      FROM employee_payslips
      WHERE payroll_period_id = $1
    ) AS exists;
  `;

  const { rows } =
    await client.query(
      query,
      [periodId],
    );

  return rows[0]?.exists === true;
}

/**
 * Thống kê trạng thái phiếu lương trong một kỳ.
 */
export async function getPeriodPayslipStatistics(
  periodId,
  client = pool,
) {
  const query = `
    SELECT
      COUNT(*)::INT AS total_payslips,

      COUNT(*)
        FILTER (
          WHERE status = 'draft'
        )::INT AS draft_count,

      COUNT(*)
        FILTER (
          WHERE status = 'waiting_confirmation'
        )::INT AS waiting_confirmation_count,

      COUNT(*)
        FILTER (
          WHERE status = 'confirmed'
        )::INT AS confirmed_count,

      COUNT(*)
        FILTER (
          WHERE status = 'employee_feedback'
        )::INT AS employee_feedback_count,

      COUNT(*)
        FILTER (
          WHERE status = 'adjusted'
        )::INT AS adjusted_count,

      COUNT(*)
        FILTER (
          WHERE status = 'published'
        )::INT AS published_count,

      COUNT(*)
        FILTER (
          WHERE status = 'paid'
        )::INT AS paid_count,

      COUNT(*)
        FILTER (
          WHERE net_salary < 0
        )::INT AS negative_net_count,

      COALESCE(
        SUM(gross_income),
        0
      ) AS total_gross_income,

      COALESCE(
        SUM(total_deductions),
        0
      ) AS total_deductions,

      COALESCE(
        SUM(net_salary),
        0
      ) AS total_net_salary

    FROM employee_payslips
    WHERE payroll_period_id = $1;
  `;

  const { rows } =
    await client.query(
      query,
      [periodId],
    );

  return rows[0];
}
