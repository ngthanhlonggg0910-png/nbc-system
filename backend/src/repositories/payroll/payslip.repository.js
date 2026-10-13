import pool from "../../config/db.js";

/**
 * Lấy danh sách phiếu lương của nhân viên theo năm.
 *
 * Chỉ lấy các trạng thái mà service truyền xuống.
 */
export async function findEmployeePayslips(
  {
    staffId,
    year,
    statuses,
    limit,
    offset,
  },
  client = pool,
) {
  const query = `
    SELECT
      summary.id,
      summary.period_code,
      summary.staff_id,
      summary.employee_name,
      summary.department,
      summary.job_title,
      summary.work_days,
      summary.total_work_days,
      summary.taxable_income,
      summary.gross_income,
      summary.total_deductions,
      summary.net_salary,
      summary.current_version,
      summary.status,
      summary.payment_date,
      summary.published_at,
      summary.published_by,
      summary.signed_at,
      summary.paid_at
    FROM vw_employee_payslip_summary AS summary
    WHERE summary.staff_id = $1
      AND SUBSTRING(summary.period_code FROM 1 FOR 4)::INT = $2
      AND summary.status = ANY($3::VARCHAR[])
    ORDER BY summary.period_code DESC, summary.id DESC
    LIMIT $4
    OFFSET $5;
  `;

  const values = [
    staffId,
    year,
    statuses,
    limit,
    offset,
  ];

  const { rows } = await client.query(query, values);

  return rows;
}

/**
 * Đếm tổng số phiếu lương của nhân viên theo năm.
 *
 * Dùng cho pagination.
 */
export async function countEmployeePayslips(
  {
    staffId,
    year,
    statuses,
  },
  client = pool,
) {
  const query = `
    SELECT COUNT(*)::INT AS total
    FROM employee_payslips AS payslip
    INNER JOIN payroll_periods AS period
      ON period.id = payslip.payroll_period_id
    WHERE payslip.staff_id = $1
      AND SUBSTRING(period.period_code FROM 1 FOR 4)::INT = $2
      AND payslip.status = ANY($3::VARCHAR[]);
  `;

  const values = [
    staffId,
    year,
    statuses,
  ];

  const { rows } = await client.query(query, values);

  return rows[0]?.total ?? 0;
}

/**
 * Lấy chi tiết một phiếu lương thuộc nhân viên.
 *
 * Điều kiện quan trọng:
 * - Đúng payslipId.
 * - Đúng staffId.
 * - Đúng trạng thái được phép xem.
 *
 * Việc kiểm tra đồng thời payslipId + staffId giúp ngăn nhân viên
 * thay đổi ID trên URL để xem phiếu lương người khác.
 */
export async function findEmployeePayslipById(
  {
    payslipId,
    staffId,
    visibleStatuses,
  },
  client = pool,
) {
  const query = `
    SELECT
      payslip.id,
      payslip.payroll_period_id,
      payslip.staff_id,
      payslip.source_import_id,
      payslip.current_version,

      period.period_code,
      period.period_name,
      period.start_date,
      period.end_date,
      period.payment_date,

      CONCAT_WS(
        ' ',
        employee.last_name,
        employee.first_name
      ) AS employee_name,

      recruitment.recruitment_date AS hire_date,

      department.name AS department,
      job_title.name AS job_title,

      COALESCE(
        CASE
          WHEN attendance.attendance_rows > 0
            THEN attendance.actual_work_days
        END,
        payslip.work_days
      ) AS work_days,
      COALESCE(
        NULLIF(payslip.total_work_days, 0),
        calendar.standard_work_days
      ) AS total_work_days,
      payslip.seniority AS imported_seniority,
      payslip.base_coefficient,

      attendance.attendance_rows,
      calendar.standard_work_days,

      payslip.base_salary,
      payslip.attendance_salary,
      payslip.overtime_salary,
      payslip.total_allowance,
      payslip.total_bonus,
      payslip.gross_income,
      payslip.taxable_income,

      payslip.social_insurance,
      payslip.health_insurance,
      payslip.unemployment_insurance,
      payslip.personal_income_tax,
      payslip.total_deductions,
      payslip.net_salary,

      payslip.status,
      payslip.employee_comment,
      payslip.payment_reference,

      payslip.calculated_at,
      payslip.published_at,
      payslip.published_by,
      payslip.signed_at,
      payslip.confirmed_by,
      payslip.paid_at,
      payslip.created_at,
      payslip.updated_at

    FROM employee_payslips AS payslip

    INNER JOIN payroll_periods AS period
      ON period.id = payslip.payroll_period_id

    INNER JOIN employees AS employee
      ON employee.staff_id = payslip.staff_id

    LEFT JOIN employee_recruitment_resignation AS recruitment
      ON recruitment.staff_id = employee.staff_id

    LEFT JOIN departments AS department
      ON department.id = employee.department_id

    LEFT JOIN job_titles AS job_title
      ON job_title.id = employee.job_title_id

    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::INT AS attendance_rows,
        COALESCE(SUM(entry.workday_units), 0)::NUMERIC
          AS actual_work_days
      FROM attendance_entries AS entry
      WHERE entry.staff_id = payslip.staff_id
        AND entry.date BETWEEN period.start_date AND period.end_date
    ) AS attendance ON TRUE

    LEFT JOIN LATERAL (
      SELECT COUNT(*)::INT AS standard_work_days
      FROM GENERATE_SERIES(
        period.start_date,
        period.end_date,
        INTERVAL '1 day'
      ) AS work_date
      WHERE EXTRACT(ISODOW FROM work_date) BETWEEN 1 AND 5
    ) AS calendar ON TRUE

    WHERE payslip.id = $1
      AND payslip.staff_id = $2
      AND payslip.status = ANY($3::VARCHAR[])

    LIMIT 1;
  `;

  const values = [
    payslipId,
    staffId,
    visibleStatuses,
  ];

  const { rows } = await client.query(query, values);

  return rows[0] ?? null;
}

/**
 * Lấy context một phiếu lương cho HR/Admin.
 *
 * Không kiểm tra ownership theo staffId vì HR/Admin
 * được phép xử lý phiếu lương của nhân viên.
 *
 * READ ONLY.
 */
export async function findAdminPayslipById(
  payslipId,
  client = pool,
) {
  const query = `
    SELECT
      payslip.id,
      payslip.payroll_period_id,
      payslip.staff_id,
      payslip.source_import_id,
      payslip.current_version,

      period.period_code,
      period.period_name,
      period.start_date,
      period.end_date,
      period.payment_date,
      period.status AS period_status,

      CONCAT_WS(
        ' ',
        employee.last_name,
        employee.first_name
      ) AS employee_name,

      department.name AS department,
      job_title.name AS job_title,

      payslip.work_days,
      payslip.total_work_days,
      payslip.seniority,
      payslip.base_coefficient,

      payslip.base_salary,
      payslip.attendance_salary,
      payslip.overtime_salary,
      payslip.total_allowance,
      payslip.total_bonus,
      payslip.gross_income,
      payslip.taxable_income,

      payslip.social_insurance,
      payslip.health_insurance,
      payslip.unemployment_insurance,
      payslip.personal_income_tax,
      payslip.total_deductions,
      payslip.net_salary,

      payslip.status,
      payslip.employee_comment,
      payslip.payment_reference,

      payslip.calculated_at,
      payslip.published_at,
      payslip.published_by,
      payslip.signed_at,
      payslip.confirmed_by,
      payslip.paid_at,
      payslip.created_at,
      payslip.updated_at

    FROM employee_payslips AS payslip

    INNER JOIN payroll_periods AS period
      ON period.id =
        payslip.payroll_period_id

    INNER JOIN employees AS employee
      ON employee.staff_id =
        payslip.staff_id

    LEFT JOIN departments AS department
      ON department.id =
        employee.department_id

    LEFT JOIN job_titles AS job_title
      ON job_title.id =
        employee.job_title_id

    WHERE payslip.id = $1

    LIMIT 1;
  `;

  const { rows } = await client.query(
    query,
    [payslipId],
  );

  return rows[0] ?? null;
}

/**
 * Nhân viên xác nhận phiếu lương.
 *
 * Hàm này cập nhật có điều kiện để chống trường hợp:
 * - Hai request xác nhận gửi cùng lúc.
 * - HR vừa điều chỉnh phiếu trong lúc nhân viên xác nhận.
 * - Phiếu đã chuyển sang trạng thái khác.
 *
 * Nếu không còn đúng trạng thái expectedStatuses,
 * UPDATE sẽ không cập nhật dòng nào và trả về null.
 */
export async function confirmEmployeePayslip(
  {
    payslipId,
    staffId,
    expectedStatuses,
  },
  client = pool,
) {
  const query = `
    WITH confirmed_payslip AS (
      UPDATE employee_payslips
      SET
        status = 'confirmed',
        signed_at = CURRENT_TIMESTAMP,
        confirmed_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND staff_id = $2
        AND status = ANY($3::VARCHAR[])
      RETURNING
        id,
        payroll_period_id,
        staff_id,
        current_version,
        status,
        signed_at,
        confirmed_by,
        updated_at
    )
    SELECT
      confirmed_payslip.id,
      confirmed_payslip.staff_id,
      confirmed_payslip.current_version,
      confirmed_payslip.status,
      confirmed_payslip.signed_at,
      confirmed_payslip.confirmed_by,
      confirmed_payslip.updated_at,
      period.period_code
    FROM confirmed_payslip
    INNER JOIN payroll_periods AS period
      ON period.id =
         confirmed_payslip.payroll_period_id;
  `;

  const values = [
    payslipId,
    staffId,
    expectedStatuses,
  ];

  const { rows } = await client.query(query, values);

  return rows[0] ?? null;
}

/**
 * Lấy dữ liệu báo cáo lương trong khoảng tối đa 12 tháng.
 *
 * Ví dụ endMonth = 2026-07:
 * khoảng dữ liệu từ 2025-08 đến 2026-07.
 */
export async function findEmployee12MonthReport(
  {
    staffId,
    endMonth,
    statuses,
  },
  client = pool,
) {
  const query = `
    WITH report_period AS (
      SELECT
        TO_DATE($2 || '-01', 'YYYY-MM-DD')
          AS end_month_date,

        TO_DATE($2 || '-01', 'YYYY-MM-DD')
          - INTERVAL '11 months'
          AS start_month_date
    )
    SELECT
      payslip.id,
      period.period_code,
      period.payment_date,

      payslip.gross_income,
      payslip.taxable_income,
      payslip.total_deductions,
      payslip.net_salary,

      payslip.current_version,
      payslip.status,
      payslip.published_at,
      payslip.signed_at,
      payslip.paid_at

    FROM employee_payslips AS payslip

    INNER JOIN payroll_periods AS period
      ON period.id = payslip.payroll_period_id

    CROSS JOIN report_period

    WHERE payslip.staff_id = $1
      AND payslip.status = ANY($3::VARCHAR[])

      AND TO_DATE(
        period.period_code || '-01',
        'YYYY-MM-DD'
      ) BETWEEN
        report_period.start_month_date
        AND report_period.end_month_date

    ORDER BY period.period_code ASC;
  `;

  const values = [
    staffId,
    endMonth,
    statuses,
  ];

  const { rows } = await client.query(query, values);

  return rows;
}

/**
 * Tổng hợp báo cáo lương theo một năm dương lịch của nhân viên.
 *
 * Mỗi period_code chỉ được chọn một lần. Điều này bảo vệ báo cáo khỏi việc
 * cộng trùng khi dữ liệu cũ có nhiều bản ghi/phát hành lại trong cùng kỳ.
 * Toàn bộ SUM/AVG/COUNT được thực hiện tại PostgreSQL.
 */
export async function findEmployeeAnnualSummary(
  {
    staffId,
    year,
    statuses,
  },
  client = pool,
) {
  const query = `
    WITH ranked_payslips AS (
      SELECT
        payslip.id,
        period.period_code,
        period.payment_date,
        payslip.gross_income,
        payslip.taxable_income,
        payslip.total_deductions,
        payslip.net_salary,
        payslip.current_version,
        payslip.status,
        payslip.published_at,
        payslip.signed_at,
        payslip.paid_at,
        ROW_NUMBER() OVER (
          PARTITION BY period.period_code
          ORDER BY
            payslip.current_version DESC,
            COALESCE(
              payslip.published_at,
              payslip.paid_at,
              payslip.updated_at,
              payslip.created_at
            ) DESC,
            payslip.id DESC
        ) AS period_rank
      FROM employee_payslips AS payslip
      INNER JOIN payroll_periods AS period
        ON period.id = payslip.payroll_period_id
      WHERE payslip.staff_id = $1
        AND SUBSTRING(period.period_code FROM 1 FOR 4)::INT = $2
        AND payslip.status = ANY($3::VARCHAR[])
        AND (
          payslip.status IN ('published', 'paid')
          OR payslip.published_at IS NOT NULL
          OR payslip.paid_at IS NOT NULL
        )
    ),
    current_payslips AS (
      SELECT *
      FROM ranked_payslips
      WHERE period_rank = 1
    ),
    annual_totals AS (
      SELECT
        COUNT(*)::INT AS released_period_count,
        COALESCE(SUM(gross_income), 0) AS total_income,
        COALESCE(SUM(taxable_income), 0) AS total_taxable_income,
        COALESCE(SUM(total_deductions), 0) AS total_deductions,
        COALESCE(SUM(net_salary), 0) AS total_net_salary,
        COALESCE(ROUND(AVG(net_salary)), 0) AS average_net_salary
      FROM current_payslips
    )
    SELECT
      $2::INT AS year,
      totals.released_period_count,
      totals.total_income,
      totals.total_taxable_income,
      totals.total_deductions,
      totals.total_net_salary,
      totals.average_net_salary,
      COALESCE(
        (
          SELECT JSONB_AGG(
            JSONB_BUILD_OBJECT(
              'id', current.id,
              'periodCode', current.period_code,
              'paymentDate', current.payment_date,
              'grossIncome', current.gross_income,
              'taxableIncome', current.taxable_income,
              'totalDeductions', current.total_deductions,
              'netSalary', current.net_salary,
              'currentVersion', current.current_version,
              'status', current.status,
              'publishedAt', current.published_at,
              'signedAt', current.signed_at,
              'paidAt', current.paid_at
            )
            ORDER BY current.period_code ASC
          )
          FROM current_payslips AS current
        ),
        '[]'::JSONB
      ) AS monthly,
      (
        SELECT JSONB_BUILD_OBJECT(
          'id', latest.id,
          'periodCode', latest.period_code,
          'paymentDate', latest.payment_date,
          'status', latest.status,
          'publishedAt', latest.published_at,
          'paidAt', latest.paid_at
        )
        FROM current_payslips AS latest
        ORDER BY latest.period_code DESC, latest.id DESC
        LIMIT 1
      ) AS latest_payslip
    FROM annual_totals AS totals;
  `;

  const { rows } = await client.query(query, [
    staffId,
    year,
    statuses,
  ]);

  return rows[0];
}
