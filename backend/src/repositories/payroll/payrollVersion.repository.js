import pool from "../../config/db.js";

/**
 * Lấy danh sách phiên bản đã phát hành.
 *
 * Hàm này dùng cho nhân viên xem lịch sử điều chỉnh.
 * Không trả snapshot để giảm dung lượng response danh sách.
 */
export async function findPublishedVersions(
  {
    payslipId,
  },
  client = pool,
) {
  const query = `
    SELECT
      version.id,
      version.payslip_id,
      version.version_number,
      version.change_reason,
      version.feedback_id,
      version.created_by,

      CONCAT_WS(
        ' ',
        creator.last_name,
        creator.first_name
      ) AS created_by_name,

      version.created_at,
      version.published_at

    FROM payslip_versions AS version

    LEFT JOIN employees AS creator
      ON creator.staff_id = version.created_by

    WHERE version.payslip_id = $1
      AND version.published_at IS NOT NULL

    ORDER BY version.version_number DESC;
  `;

  const { rows } = await client.query(query, [
    payslipId,
  ]);

  return rows;
}

/**
 * Lấy một phiên bản đã phát hành.
 *
 * Hàm này trả cả snapshot để phục vụ đối chiếu
 * phiên bản cũ và phiên bản mới.
 */
export async function findPublishedVersion(
  {
    payslipId,
    versionNumber,
  },
  client = pool,
) {
  const query = `
    SELECT
      version.id,
      version.payslip_id,
      version.version_number,
      version.snapshot,
      version.change_reason,
      version.feedback_id,
      version.created_by,

      CONCAT_WS(
        ' ',
        creator.last_name,
        creator.first_name
      ) AS created_by_name,

      version.created_at,
      version.published_at

    FROM payslip_versions AS version

    LEFT JOIN employees AS creator
      ON creator.staff_id = version.created_by

    WHERE version.payslip_id = $1
      AND version.version_number = $2
      AND version.published_at IS NOT NULL

    LIMIT 1;
  `;

  const values = [
    payslipId,
    versionNumber,
  ];

  const { rows } = await client.query(query, values);

  return rows[0] ?? null;
}

/**
 * Lấy tất cả phiên bản, bao gồm phiên bản chưa phát hành.
 *
 * Chỉ dùng cho HR/Admin.
 */
export async function findAllVersions(
  {
    payslipId,
  },
  client = pool,
) {
  const query = `
    SELECT
      version.id,
      version.payslip_id,
      version.version_number,
      version.change_reason,
      version.feedback_id,
      version.created_by,

      CONCAT_WS(
        ' ',
        creator.last_name,
        creator.first_name
      ) AS created_by_name,

      version.created_at,
      version.published_at,

      CASE
        WHEN version.published_at IS NULL
          THEN 'draft'
        ELSE 'published'
      END AS publish_status

    FROM payslip_versions AS version

    LEFT JOIN employees AS creator
      ON creator.staff_id = version.created_by

    WHERE version.payslip_id = $1

    ORDER BY version.version_number DESC;
  `;

  const { rows } = await client.query(query, [
    payslipId,
  ]);

  return rows;
}

/**
 * Lấy phiên bản bất kỳ dành cho HR/Admin.
 *
 * Có thể lấy cả phiên bản chưa phát hành.
 */
export async function findVersion(
  {
    payslipId,
    versionNumber,
  },
  client = pool,
) {
  const query = `
    SELECT
      version.id,
      version.payslip_id,
      version.version_number,
      version.snapshot,
      version.change_reason,
      version.feedback_id,
      version.created_by,

      CONCAT_WS(
        ' ',
        creator.last_name,
        creator.first_name
      ) AS created_by_name,

      version.created_at,
      version.published_at

    FROM payslip_versions AS version

    LEFT JOIN employees AS creator
      ON creator.staff_id = version.created_by

    WHERE version.payslip_id = $1
      AND version.version_number = $2

    LIMIT 1;
  `;

  const values = [
    payslipId,
    versionNumber,
  ];

  const { rows } = await client.query(query, values);

  return rows[0] ?? null;
}

/**
 * Lấy phiên bản mới nhất của một phiếu lương.
 */
export async function findLatestVersion(
  payslipId,
  client = pool,
) {
  const query = `
    SELECT
      id,
      payslip_id,
      version_number,
      snapshot,
      change_reason,
      feedback_id,
      created_by,
      created_at,
      published_at
    FROM payslip_versions
    WHERE payslip_id = $1
    ORDER BY version_number DESC
    LIMIT 1;
  `;

  const { rows } = await client.query(query, [
    payslipId,
  ]);

  return rows[0] ?? null;
}

/**
 * Kiểm tra một phiên bản đã tồn tại hay chưa.
 */
export async function versionExists(
  {
    payslipId,
    versionNumber,
  },
  client = pool,
) {
  const query = `
    SELECT EXISTS (
      SELECT 1
      FROM payslip_versions
      WHERE payslip_id = $1
        AND version_number = $2
    ) AS exists;
  `;

  const values = [
    payslipId,
    versionNumber,
  ];

  const { rows } = await client.query(query, values);

  return rows[0]?.exists === true;
}

/**
 * Tạo phiên bản từ snapshot đã được service chuẩn bị.
 *
 * Hàm này hữu ích khi service cần tự xây dựng snapshot
 * từ dữ liệu import hoặc dữ liệu điều chỉnh.
 */
export async function createVersion(
  {
    payslipId,
    versionNumber,
    snapshot,
    changeReason = null,
    feedbackId = null,
    createdBy = null,
    publishedAt = null,
  },
  client = pool,
) {
  const query = `
    INSERT INTO payslip_versions (
      payslip_id,
      version_number,
      snapshot,
      change_reason,
      feedback_id,
      created_by,
      published_at
    )
    VALUES (
      $1,
      $2,
      $3::JSONB,
      $4,
      $5,
      $6,
      $7
    )
    RETURNING
      id,
      payslip_id,
      version_number,
      snapshot,
      change_reason,
      feedback_id,
      created_by,
      created_at,
      published_at;
  `;

  const values = [
    payslipId,
    versionNumber,
    JSON.stringify(snapshot),
    changeReason,
    feedbackId,
    createdBy,
    publishedAt,
  ];

  const { rows } = await client.query(query, values);

  return rows[0];
}

/**
 * Chụp trực tiếp trạng thái hiện tại của phiếu lương
 * từ PostgreSQL và lưu vào payslip_versions.
 *
 * Snapshot bao gồm:
 * - Thông tin kỳ lương.
 * - Thông tin nhân viên.
 * - Ngày công.
 * - Các tổng lương.
 * - Tất cả khoản thu nhập.
 * - Tất cả khoản khấu trừ.
 *
 * Hàm này phải được gọi trước khi HR chỉnh sửa phiếu lương.
 */
export async function createSnapshotFromCurrentPayslip(
  {
    payslipId,
    versionNumber,
    changeReason = null,
    feedbackId = null,
    createdBy = null,
    publishedAt = null,
  },
  client = pool,
) {
  const query = `
    INSERT INTO payslip_versions (
      payslip_id,
      version_number,
      snapshot,
      change_reason,
      feedback_id,
      created_by,
      published_at
    )
    SELECT
      payslip.id,
 $2::INTEGER,

      JSONB_BUILD_OBJECT(
        'payslipId',
        payslip.id,

        'staffId',
        payslip.staff_id,

        'periodCode',
        period.period_code,

        'versionNumber',
 $2::INTEGER,
        'capturedAt',
        CURRENT_TIMESTAMP,

        'employee',
        JSONB_BUILD_OBJECT(
          'staffId',
          employee.staff_id,

          'fullName',
          CONCAT_WS(
            ' ',
            employee.last_name,
            employee.first_name
          ),

          'department',
          department.name,

          'jobTitle',
          job_title.name
        ),

        'period',
        JSONB_BUILD_OBJECT(
          'code',
          period.period_code,

          'name',
          period.period_name,

          'startDate',
          period.start_date,

          'endDate',
          period.end_date,

          'paymentDate',
          period.payment_date
        ),

        'attendance',
        JSONB_BUILD_OBJECT(
          'workDays',
          payslip.work_days,

          'totalWorkDays',
          payslip.total_work_days,

          'seniority',
          payslip.seniority,

          'baseCoefficient',
          payslip.base_coefficient
        ),

        'summary',
        JSONB_BUILD_OBJECT(
          'baseSalary',
          payslip.base_salary,

          'attendanceSalary',
          payslip.attendance_salary,

          'overtimeSalary',
          payslip.overtime_salary,

          'totalAllowance',
          payslip.total_allowance,

          'totalBonus',
          payslip.total_bonus,

          'grossIncome',
          payslip.gross_income,

          'taxableIncome',
          payslip.taxable_income,

          'socialInsurance',
          payslip.social_insurance,

          'healthInsurance',
          payslip.health_insurance,

          'unemploymentInsurance',
          payslip.unemployment_insurance,

          'personalIncomeTax',
          payslip.personal_income_tax,

          'totalDeductions',
          payslip.total_deductions,

          'netSalary',
          payslip.net_salary
        ),

        'status',
        payslip.status,

        'paymentReference',
        payslip.payment_reference,

        'publishedAt',
        payslip.published_at,

        'signedAt',
        payslip.signed_at,

        'paidAt',
        payslip.paid_at,

        'details',
        COALESCE(
          (
            SELECT JSONB_AGG(
              JSONB_BUILD_OBJECT(
                'id',
                detail.id,

                'salaryItemId',
                salary_item.id,

                'code',
                salary_item.code,

                'label',
                salary_item.label,

                'category',
                salary_item.category,

                'taxable',
                salary_item.taxable,

                'visibleToEmployee',
                salary_item.visible_to_employee,

                'displayOrder',
                salary_item.display_order,

                'amount',
                detail.amount,

                'quantity',
                detail.quantity,

                'rate',
                detail.rate,

                'description',
                detail.description
              )
              ORDER BY
                CASE
                  WHEN salary_item.category = 'income'
                    THEN 1
                  WHEN salary_item.category = 'deduction'
                    THEN 2
                  ELSE 3
                END,
                salary_item.display_order,
                salary_item.id
            )
            FROM payslip_details AS detail

            INNER JOIN salary_master_items AS salary_item
              ON salary_item.id =
                 detail.salary_item_id

            WHERE detail.payslip_id =
                  payslip.id
          ),
          '[]'::JSONB
        )
      ),

      $3,
      $4,
      $5,
      $6

    FROM employee_payslips AS payslip

    INNER JOIN payroll_periods AS period
      ON period.id = payslip.payroll_period_id

    INNER JOIN employees AS employee
      ON employee.staff_id = payslip.staff_id

    LEFT JOIN departments AS department
      ON department.id = employee.department_id

    LEFT JOIN job_titles AS job_title
      ON job_title.id = employee.job_title_id

    WHERE payslip.id = $1

    RETURNING
      id,
      payslip_id,
      version_number,
      snapshot,
      change_reason,
      feedback_id,
      created_by,
      created_at,
      published_at;
  `;

  const values = [
    payslipId,
    versionNumber,
    changeReason,
    feedbackId,
    createdBy,
    publishedAt,
  ];

  const { rows } = await client.query(query, values);

  return rows[0] ?? null;
}

/**
 * Đánh dấu một phiên bản đã được phát hành.
 *
 * Sau thao tác này nhân viên mới có thể nhìn thấy phiên bản.
 */
export async function markVersionPublished(
  {
    payslipId,
    versionNumber,
  },
  client = pool,
) {
  const query = `
    UPDATE payslip_versions
    SET published_at =
      COALESCE(
        published_at,
        CURRENT_TIMESTAMP
      )
    WHERE payslip_id = $1
      AND version_number = $2
    RETURNING
      id,
      payslip_id,
      version_number,
      change_reason,
      feedback_id,
      created_by,
      created_at,
      published_at;
  `;

  const values = [
    payslipId,
    versionNumber,
  ];

  const { rows } = await client.query(query, values);

  return rows[0] ?? null;
}