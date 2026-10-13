import pool from "../../config/db.js";

/**
 * Các trạng thái phản hồi lương:
 *
 * pending   -> Nhân viên vừa gửi
 * reviewing -> HR đang kiểm tra
 * accepted  -> HR xác nhận phản hồi là đúng
 * rejected  -> HR từ chối phản hồi
 * adjusted  -> HR đã điều chỉnh phiếu lương
 * resolved  -> Hoàn tất xử lý
 */

/**
 * Tạo phản hồi phiếu lương.
 */
export async function createPayrollFeedback(
  {
    payslipId,
    staffId,
    category,
    issueType,
    salaryItemId = null,
    payslipVersion = null,
    proposedValue = null,
    priority = "normal",
    content,
    attachmentUrl = null,
    attachmentOriginalName = null,
    attachmentStoredName = null,
    attachmentMimeType = null,
    attachmentSizeBytes = null,
  },
  client = pool,
) {
  const query = `
    INSERT INTO payroll_feedbacks (
      payslip_id,
      staff_id,
      category,
      issue_type,
      salary_item_id,
      payslip_version,
      proposed_value,
      priority,
      content,
      attachment_url,
      attachment_original_name,
      attachment_stored_name,
      attachment_mime_type,
      attachment_size_bytes,
      status
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      $10,
      $11,
      $12,
      $13,
      $14,
      'pending'
    )
    RETURNING
      id,
      payslip_id,
      staff_id,
      category,
      issue_type,
      salary_item_id,
      payslip_version,
      proposed_value,
      priority,
      content,
      attachment_url,
      attachment_original_name,
      attachment_stored_name,
      attachment_mime_type,
      attachment_size_bytes,
      status,
      hr_reply,
      handled_by,
      handled_at,
      resolved_at,
      created_at,
      updated_at;
  `;

  const values = [
    payslipId,
    staffId,
    category,
    issueType,
    salaryItemId,
    payslipVersion,
    proposedValue,
    priority,
    content,
    attachmentUrl,
    attachmentOriginalName,
    attachmentStoredName,
    attachmentMimeType,
    attachmentSizeBytes,
  ];

  const { rows } = await client.query(
    query,
    values,
  );

  return rows[0] ?? null;
}

export async function assignFeedbackCode(
  feedbackId,
  client = pool,
) {
  const { rows } = await client.query(
    `
      UPDATE payroll_feedbacks AS feedback
      SET feedback_code = CONCAT(
        'FB-',
        REPLACE(period.period_code, '-', ''),
        '-',
        LPAD(feedback.id::TEXT, 5, '0')
      )
      FROM employee_payslips AS payslip
      INNER JOIN payroll_periods AS period
        ON period.id = payslip.payroll_period_id
      WHERE feedback.id = $1
        AND payslip.id = feedback.payslip_id
      RETURNING feedback.*;
    `,
    [feedbackId],
  );

  return rows[0] ?? null;
}

export async function findEmployeeFeedbacksByPayslip(
  {
    payslipId,
    staffId,
  },
  client = pool,
) {
  const { rows } = await client.query(
    `
      SELECT
        feedback.*,
        salary_item.label AS salary_item_label,
        salary_item.code AS salary_item_code
      FROM payroll_feedbacks AS feedback
      LEFT JOIN salary_master_items AS salary_item
        ON salary_item.id = feedback.salary_item_id
      WHERE feedback.payslip_id = $1
        AND feedback.staff_id = $2
      ORDER BY feedback.created_at DESC, feedback.id DESC;
    `,
    [payslipId, staffId],
  );

  return rows;
}

/**
 * Lấy phản hồi theo ID.
 *
 * Dùng cho HR/Admin.
 */
export async function findFeedbackById(
  feedbackId,
  client = pool,
) {
  const query = `
    SELECT
      feedback.id,
      feedback.payslip_id,
      feedback.staff_id,
      feedback.category,
      feedback.feedback_code,
      feedback.issue_type,
      feedback.salary_item_id,
      feedback.payslip_version,
      feedback.proposed_value,
      feedback.priority,
      feedback.content,
      feedback.attachment_url,
      feedback.attachment_original_name,
      feedback.attachment_stored_name,
      feedback.attachment_mime_type,
      feedback.attachment_size_bytes,
      feedback.status,
      feedback.hr_reply,
      feedback.handled_by,
      feedback.handled_at,
      feedback.resolved_at,
      feedback.created_at,
      feedback.updated_at,

      payslip.payroll_period_id,
      payslip.current_version,
      payslip.gross_income,
      payslip.total_deductions,
      payslip.net_salary,
      payslip.status AS payslip_status,
      payslip.published_at AS payslip_published_at,

      period.period_code,
      period.period_name,
      period.payment_date,
      period.status AS period_status,

      CONCAT_WS(
        ' ',
        employee.last_name,
        employee.first_name
      ) AS employee_name,

      employee.department_id,
      employee.email,
      employee.phone,
      employee.employee_type,
      employee.work_location_id,

      department.name AS department_name,
      salary_item.label AS salary_item_label,
      salary_item.code AS salary_item_code,

      work_location.name AS work_location_name,

      CONCAT_WS(
        ' ',
        handler.last_name,
        handler.first_name
      ) AS handled_by_name

    FROM payroll_feedbacks AS feedback

    INNER JOIN employee_payslips AS payslip
      ON payslip.id = feedback.payslip_id

    INNER JOIN payroll_periods AS period
      ON period.id =
        payslip.payroll_period_id

    INNER JOIN employees AS employee
      ON employee.staff_id =
        feedback.staff_id

    LEFT JOIN departments AS department
      ON department.id =
        employee.department_id

    LEFT JOIN work_locations AS work_location
      ON work_location.id = employee.work_location_id

    LEFT JOIN salary_master_items AS salary_item
      ON salary_item.id = feedback.salary_item_id

    LEFT JOIN employees AS handler
      ON handler.staff_id =
        feedback.handled_by

    WHERE feedback.id = $1

    LIMIT 1;
  `;

  const { rows } = await client.query(
    query,
    [feedbackId],
  );

  return rows[0] ?? null;
}

/**
 * Nhân viên lấy một phản hồi của chính mình.
 *
 * Điều kiện staff_id ngăn người dùng đổi ID trên URL
 * để xem phản hồi của nhân viên khác.
 */
export async function findEmployeeFeedbackById(
  {
    feedbackId,
    staffId,
  },
  client = pool,
) {
  const query = `
    SELECT
      feedback.id,
      feedback.payslip_id,
      feedback.staff_id,
      feedback.category,
      feedback.feedback_code,
      feedback.issue_type,
      feedback.salary_item_id,
      feedback.payslip_version,
      feedback.proposed_value,
      feedback.priority,
      feedback.content,
      feedback.attachment_url,
      feedback.attachment_original_name,
      feedback.attachment_stored_name,
      feedback.attachment_mime_type,
      feedback.attachment_size_bytes,
      feedback.status,
      feedback.hr_reply,
      feedback.handled_by,
      feedback.handled_at,
      feedback.resolved_at,
      feedback.created_at,
      feedback.updated_at,

payslip.current_version,
payslip.gross_income,
payslip.total_deductions,
payslip.net_salary,
payslip.status AS payslip_status,

period.id AS payroll_period_id,
period.status AS period_status,
period.period_code,
period.period_name,
period.payment_date,

      CONCAT_WS(
        ' ',
        handler.last_name,
        handler.first_name
      ) AS handled_by_name

    FROM payroll_feedbacks AS feedback

    INNER JOIN employee_payslips AS payslip
      ON payslip.id = feedback.payslip_id

    INNER JOIN payroll_periods AS period
      ON period.id =
        payslip.payroll_period_id

    LEFT JOIN employees AS handler
      ON handler.staff_id =
        feedback.handled_by

    WHERE feedback.id = $1
      AND feedback.staff_id = $2

    LIMIT 1;
  `;

  const values = [
    feedbackId,
    staffId,
  ];

  const { rows } = await client.query(
    query,
    values,
  );

  return rows[0] ?? null;
}

/**
 * Kiểm tra nhân viên có phản hồi đang mở cho
 * phiếu lương này hay chưa.
 *
 * Database cũng có unique partial index:
 * uq_payroll_feedbacks_open
 */
export async function findOpenFeedback(
  {
    payslipId,
    staffId,
    issueType,
    salaryItemId = null,
  },
  client = pool,
) {
  const query = `
    SELECT
      id,
      payslip_id,
      staff_id,
      category,
      content,
      attachment_url,
      attachment_stored_name,
      status,
      hr_reply,
      handled_by,
      handled_at,
      resolved_at,
      created_at,
      updated_at
    FROM payroll_feedbacks
    WHERE payslip_id = $1
      AND staff_id = $2
      AND issue_type = $3
      AND salary_item_id IS NOT DISTINCT FROM $4::BIGINT
      AND status IN (
        'pending',
        'reviewing',
        'accepted',
        'adjusted'
      )
    ORDER BY created_at DESC
    LIMIT 1;
  `;

  const values = [
    payslipId,
    staffId,
    issueType,
    salaryItemId,
  ];

  const { rows } = await client.query(
    query,
    values,
  );

  return rows[0] ?? null;
}

/**
 * Danh sách phản hồi của nhân viên.
 */
export async function findEmployeeFeedbacks(
  {
    staffId,
    status = null,
    year = null,
    limit,
    offset,
  },
  client = pool,
) {
  const query = `
    SELECT
      feedback.id,
      feedback.payslip_id,
      feedback.staff_id,
      feedback.category,
      feedback.feedback_code,
      feedback.issue_type,
      feedback.salary_item_id,
      feedback.payslip_version,
      feedback.proposed_value,
      feedback.priority,
      feedback.content,
      feedback.attachment_url,
      feedback.attachment_original_name,
      feedback.attachment_stored_name,
      feedback.attachment_mime_type,
      feedback.attachment_size_bytes,
      feedback.status,
      feedback.hr_reply,
      feedback.handled_by,
      feedback.handled_at,
      feedback.resolved_at,
      feedback.created_at,
      feedback.updated_at,

payslip.current_version,
payslip.status AS payslip_status,
payslip.net_salary,

period.id AS payroll_period_id,
period.status AS period_status,
period.period_code,
period.period_name,
period.payment_date,

      CONCAT_WS(
        ' ',
        handler.last_name,
        handler.first_name
      ) AS handled_by_name

    FROM payroll_feedbacks AS feedback

    INNER JOIN employee_payslips AS payslip
      ON payslip.id = feedback.payslip_id

    INNER JOIN payroll_periods AS period
      ON period.id =
        payslip.payroll_period_id

    LEFT JOIN employees AS handler
      ON handler.staff_id =
        feedback.handled_by

    WHERE feedback.staff_id = $1

      AND (
        $2::VARCHAR IS NULL
        OR feedback.status = $2
      )

      AND (
        $3::INT IS NULL
        OR SUBSTRING(
          period.period_code
          FROM 1 FOR 4
        )::INT = $3
      )

    ORDER BY
      feedback.created_at DESC,
      feedback.id DESC

    LIMIT $4
    OFFSET $5;
  `;

  const values = [
    staffId,
    status,
    year,
    limit,
    offset,
  ];

  const { rows } = await client.query(
    query,
    values,
  );

  return rows;
}

/**
 * Đếm phản hồi của nhân viên để phân trang.
 */
export async function countEmployeeFeedbacks(
  {
    staffId,
    status = null,
    year = null,
  },
  client = pool,
) {
  const query = `
    SELECT COUNT(*)::INT AS total

    FROM payroll_feedbacks AS feedback

    INNER JOIN employee_payslips AS payslip
      ON payslip.id = feedback.payslip_id

    INNER JOIN payroll_periods AS period
      ON period.id =
        payslip.payroll_period_id

    WHERE feedback.staff_id = $1

      AND (
        $2::VARCHAR IS NULL
        OR feedback.status = $2
      )

      AND (
        $3::INT IS NULL
        OR SUBSTRING(
          period.period_code
          FROM 1 FOR 4
        )::INT = $3
      );
  `;

  const values = [
    staffId,
    status,
    year,
  ];

  const { rows } = await client.query(
    query,
    values,
  );

  return rows[0]?.total ?? 0;
}

/**
 * Danh sách phản hồi dành cho HR/Admin.
 *
 * Bộ lọc:
 * - status
 * - category
 * - periodId
 * - staffId
 * - keyword
 */
export async function findAdminFeedbacks(
  {
    status = null,
    category = null,
    periodId = null,
    staffId = null,
    keyword = null,
    limit,
    offset,
  },
  client = pool,
) {
  const normalizedKeyword =
    keyword?.trim() || null;

  const query = `
    SELECT
      feedback.id,
      feedback.payslip_id,
      feedback.staff_id,
      feedback.category,
      feedback.feedback_code,
      feedback.issue_type,
      feedback.salary_item_id,
      feedback.payslip_version,
      feedback.proposed_value,
      feedback.priority,
      feedback.content,
      feedback.attachment_url,
      feedback.attachment_original_name,
      feedback.attachment_stored_name,
      feedback.attachment_mime_type,
      feedback.attachment_size_bytes,
      feedback.status,
      feedback.hr_reply,
      feedback.handled_by,
      feedback.handled_at,
      feedback.resolved_at,
      feedback.created_at,
      feedback.updated_at,

      payslip.payroll_period_id,
      payslip.current_version,
      payslip.status AS payslip_status,
      payslip.gross_income,
      payslip.total_deductions,
      payslip.net_salary,

      period.period_code,
      period.period_name,
      period.payment_date,

      CONCAT_WS(
        ' ',
        employee.last_name,
        employee.first_name
      ) AS employee_name,

      department.name AS department_name,

      employee.email,
      employee.phone,
      employee.employee_type,
      employee.work_location_id,
      work_location.name AS work_location_name,
      salary_item.label AS salary_item_label,
      salary_item.code AS salary_item_code,

      CONCAT_WS(
        ' ',
        handler.last_name,
        handler.first_name
      ) AS handled_by_name

    FROM payroll_feedbacks AS feedback

    INNER JOIN employee_payslips AS payslip
      ON payslip.id = feedback.payslip_id

    INNER JOIN payroll_periods AS period
      ON period.id =
        payslip.payroll_period_id

    INNER JOIN employees AS employee
      ON employee.staff_id =
        feedback.staff_id

    LEFT JOIN departments AS department
      ON department.id =
        employee.department_id

    LEFT JOIN work_locations AS work_location
      ON work_location.id = employee.work_location_id

    LEFT JOIN salary_master_items AS salary_item
      ON salary_item.id = feedback.salary_item_id

    LEFT JOIN employees AS handler
      ON handler.staff_id =
        feedback.handled_by

    WHERE (
        $1::VARCHAR IS NULL
        OR feedback.status = $1
      )

      AND (
        $2::VARCHAR IS NULL
        OR feedback.category = $2
      )

      AND (
        $3::BIGINT IS NULL
        OR payslip.payroll_period_id = $3
      )

      AND (
        $4::VARCHAR IS NULL
        OR feedback.staff_id = $4
      )

      AND (
        $5::VARCHAR IS NULL
        OR feedback.staff_id
          ILIKE '%' || $5 || '%'
        OR CONCAT_WS(
          ' ',
          employee.last_name,
          employee.first_name
        ) ILIKE '%' || $5 || '%'
        OR feedback.content
          ILIKE '%' || $5 || '%'
      )

    ORDER BY
      CASE feedback.status
        WHEN 'pending' THEN 1
        WHEN 'reviewing' THEN 2
        WHEN 'accepted' THEN 3
        WHEN 'adjusted' THEN 4
        WHEN 'rejected' THEN 5
        WHEN 'resolved' THEN 6
        ELSE 7
      END,
      feedback.created_at ASC,
      feedback.id ASC

    LIMIT $6
    OFFSET $7;
  `;

  const values = [
    status,
    category,
    periodId,
    staffId,
    normalizedKeyword,
    limit,
    offset,
  ];

  const { rows } = await client.query(
    query,
    values,
  );

  return rows;
}

/**
 * Đếm danh sách phản hồi của HR/Admin.
 */
export async function countAdminFeedbacks(
  {
    status = null,
    category = null,
    periodId = null,
    staffId = null,
    keyword = null,
  },
  client = pool,
) {
  const normalizedKeyword =
    keyword?.trim() || null;

  const query = `
    SELECT COUNT(*)::INT AS total

    FROM payroll_feedbacks AS feedback

    INNER JOIN employee_payslips AS payslip
      ON payslip.id = feedback.payslip_id

    INNER JOIN employees AS employee
      ON employee.staff_id =
        feedback.staff_id

    WHERE (
        $1::VARCHAR IS NULL
        OR feedback.status = $1
      )

      AND (
        $2::VARCHAR IS NULL
        OR feedback.category = $2
      )

      AND (
        $3::BIGINT IS NULL
        OR payslip.payroll_period_id = $3
      )

      AND (
        $4::VARCHAR IS NULL
        OR feedback.staff_id = $4
      )

      AND (
        $5::VARCHAR IS NULL
        OR feedback.staff_id
          ILIKE '%' || $5 || '%'
        OR CONCAT_WS(
          ' ',
          employee.last_name,
          employee.first_name
        ) ILIKE '%' || $5 || '%'
        OR feedback.content
          ILIKE '%' || $5 || '%'
      );
  `;

  const values = [
    status,
    category,
    periodId,
    staffId,
    normalizedKeyword,
  ];

  const { rows } = await client.query(
    query,
    values,
  );

  return rows[0]?.total ?? 0;
}

/**
 * HR nhận xử lý phản hồi.
 *
 * Chỉ chuyển:
 * pending -> reviewing
 *
 * UPDATE có điều kiện giúp ngăn hai HR đồng thời
 * nhận cùng một phản hồi.
 */
export async function startReviewFeedback(
  {
    feedbackId,
    handledBy,
  },
  client = pool,
) {
  const query = `
  UPDATE payroll_feedbacks
  SET
    status = 'reviewing',
    handled_by = $2,
    handled_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
      AND status = 'pending'
    RETURNING
      id,
      payslip_id,
      staff_id,
      category,
      content,
      attachment_url,
      status,
      hr_reply,
      handled_by,
      handled_at,
      resolved_at,
      created_at,
      updated_at;
  `;

  const values = [
    feedbackId,
    handledBy,
  ];

  const { rows } = await client.query(
    query,
    values,
  );

  return rows[0] ?? null;
}

/**
 * HR xác nhận phản hồi của nhân viên là đúng.
 *
 * reviewing -> accepted
 */
export async function acceptFeedback(
  {
    feedbackId,
    handledBy,
    hrReply,
  },
  client = pool,
) {
  const query = `
    UPDATE payroll_feedbacks
    SET
      status = 'accepted',
      hr_reply = $3,
      handled_by = COALESCE(handled_by, $2),
      handled_at = COALESCE(handled_at, CURRENT_TIMESTAMP),
      resolved_at = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
      AND status IN (
        'pending',
        'reviewing'
      )
    RETURNING
      id,
      payslip_id,
      staff_id,
      category,
      content,
      attachment_url,
      status,
      hr_reply,
      handled_by,
      handled_at,
      resolved_at,
      created_at,
      updated_at;
  `;

  const values = [
    feedbackId,
    handledBy,
    hrReply,
  ];

  const { rows } = await client.query(
    query,
    values,
  );

  return rows[0] ?? null;
}

/**
 * HR từ chối phản hồi.
 *
 * pending/reviewing -> rejected
 */
export async function rejectFeedback(
  {
    feedbackId,
    handledBy,
    hrReply,
  },
  client = pool,
) {
  const query = `
    UPDATE payroll_feedbacks
   SET
  status = 'rejected',
  hr_reply = $3,
  handled_by = COALESCE(handled_by, $2),
  handled_at = COALESCE(handled_at, CURRENT_TIMESTAMP),
  resolved_at = CURRENT_TIMESTAMP,
  updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
      AND status IN (
        'pending',
        'reviewing'
      )
    RETURNING
      id,
      payslip_id,
      staff_id,
      category,
      content,
      attachment_url,
      status,
      hr_reply,
      handled_by,
      handled_at,
      resolved_at,
      created_at,
      updated_at;
  `;

  const values = [
    feedbackId,
    handledBy,
    hrReply,
  ];

  const { rows } = await client.query(
    query,
    values,
  );

  return rows[0] ?? null;
}

/**
 * Đánh dấu phản hồi đã được dùng để điều chỉnh lương.
 *
 * accepted -> adjusted
 */
export async function markFeedbackAdjusted(
  {
    feedbackId,
    handledBy,
    hrReply = null,
  },
  client = pool,
) {
  const query = `
    UPDATE payroll_feedbacks
    SET
      status = 'adjusted',

      hr_reply = COALESCE(
        $3,
        hr_reply
      ),

      handled_by = COALESCE(
        handled_by,
        $2
      ),

      handled_at = COALESCE(
        handled_at,
        CURRENT_TIMESTAMP
      ),

      updated_at = CURRENT_TIMESTAMP

    WHERE id = $1
      AND status = 'accepted'

    RETURNING
      id,
      payslip_id,
      staff_id,
      category,
      content,
      attachment_url,
      status,
      hr_reply,
      handled_by,
      handled_at,
      resolved_at,
      created_at,
      updated_at;
  `;

  const values = [
    feedbackId,
    handledBy,
    hrReply,
  ];

  const { rows } = await client.query(
    query,
    values,
  );

  return rows[0] ?? null;
}

/**
 * Hoàn tất phản hồi sau khi:
 * - HR đã điều chỉnh.
 * - Phiếu lương mới đã phát hành lại.
 *
 * adjusted -> resolved
 */
export async function resolveFeedback(
  {
    feedbackId,
    handledBy,
    hrReply = null,
  },
  client = pool,
) {
  const query = `
    UPDATE payroll_feedbacks
    SET
      status = 'resolved',

      hr_reply = COALESCE(
        $3,
        hr_reply
      ),

      handled_by = COALESCE(
        handled_by,
        $2
      ),

      handled_at = COALESCE(
        handled_at,
        CURRENT_TIMESTAMP
      ),

resolved_at = CURRENT_TIMESTAMP,
updated_at = CURRENT_TIMESTAMP

WHERE id = $1
  AND status = 'adjusted'

RETURNING
      id,
      payslip_id,
      staff_id,
      category,
      content,
      attachment_url,
      status,
      hr_reply,
      handled_by,
      handled_at,
      resolved_at,
      created_at,
      updated_at;
  `;

  const values = [
    feedbackId,
    handledBy,
    hrReply,
  ];

  const { rows } = await client.query(
    query,
    values,
  );

  return rows[0] ?? null;
}

/**
 * Hủy phản hồi chưa được HR xử lý bằng cách xóa dòng.
 *
 * Chỉ cho phép xóa khi phản hồi vẫn còn pending.
 * Service phải kiểm tra đúng staffId của nhân viên.
 */
export async function deletePendingFeedback(
  {
    feedbackId,
    staffId,
  },
  client = pool,
) {
  const query = `
    DELETE FROM payroll_feedbacks
    WHERE id = $1
      AND staff_id = $2
      AND status = 'pending'
    RETURNING
      id,
      payslip_id,
      staff_id,
      category,
      content,
      attachment_url,
      attachment_stored_name,
      status,
      created_at;
  `;

  const values = [
    feedbackId,
    staffId,
  ];

  const { rows } = await client.query(
    query,
    values,
  );

  return rows[0] ?? null;
}

/**
 * Thống kê phản hồi theo trạng thái.
 */
export async function getFeedbackStatistics(
  {
    periodId = null,
  } = {},
  client = pool,
) {
  const query = `
    SELECT
      COUNT(*)::INT AS total,

      COUNT(*) FILTER (
        WHERE feedback.status = 'pending'
      )::INT AS pending,

      COUNT(*) FILTER (
        WHERE feedback.status = 'reviewing'
      )::INT AS reviewing,

      COUNT(*) FILTER (
        WHERE feedback.status = 'accepted'
      )::INT AS accepted,

      COUNT(*) FILTER (
        WHERE feedback.status = 'rejected'
      )::INT AS rejected,

      COUNT(*) FILTER (
        WHERE feedback.status = 'adjusted'
      )::INT AS adjusted,

      COUNT(*) FILTER (
        WHERE feedback.status = 'resolved'
      )::INT AS resolved,

      COUNT(*) FILTER (
        WHERE feedback.status IN ('pending','reviewing','accepted','adjusted')
          AND feedback.created_at + INTERVAL '24 hours' <= CURRENT_TIMESTAMP + INTERVAL '4 hours'
          AND feedback.created_at + INTERVAL '24 hours' > CURRENT_TIMESTAMP
      )::INT AS sla_due_soon,

      COUNT(*) FILTER (
        WHERE feedback.status IN ('pending','reviewing','accepted','adjusted')
          AND feedback.created_at + INTERVAL '24 hours' <= CURRENT_TIMESTAMP
      )::INT AS sla_overdue

    FROM payroll_feedbacks AS feedback

    INNER JOIN employee_payslips AS payslip
      ON payslip.id = feedback.payslip_id

    WHERE (
      $1::BIGINT IS NULL
      OR payslip.payroll_period_id = $1
    );
  `;

  const { rows } = await client.query(
    query,
    [periodId],
  );

  return rows[0];
}

/**
 * Khóa phản hồi trong transaction.
 *
 * Sử dụng trước khi điều chỉnh lương để tránh:
 * - Hai HR cùng điều chỉnh.
 * - Trạng thái bị thay đổi giữa lúc xử lý.
 */
export async function lockFeedbackById(
  feedbackId,
  client,
) {
  const query = `
    SELECT
      feedback.id,
      feedback.payslip_id,
      feedback.staff_id,
      feedback.category,
      feedback.content,
      feedback.attachment_url,
      feedback.attachment_original_name,
      feedback.attachment_stored_name,
      feedback.attachment_mime_type,
      feedback.attachment_size_bytes,
      feedback.status,
      feedback.hr_reply,
      feedback.handled_by,
      feedback.handled_at,
      feedback.resolved_at,
      feedback.created_at,
      feedback.updated_at,

      payslip.payroll_period_id,
      payslip.current_version,
      payslip.status AS payslip_status,
      payslip.gross_income,
      payslip.total_deductions,
      payslip.net_salary,

      period.period_code,
      period.status AS period_status

    FROM payroll_feedbacks AS feedback

    INNER JOIN employee_payslips AS payslip
      ON payslip.id = feedback.payslip_id

    INNER JOIN payroll_periods AS period
      ON period.id =
        payslip.payroll_period_id

    WHERE feedback.id = $1

    FOR UPDATE OF feedback;

  `;

  const { rows } = await client.query(
    query,
    [feedbackId],
  );

  return rows[0] ?? null;
}
