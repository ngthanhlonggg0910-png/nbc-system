import pool from "../../config/db.js";
import { ErrorHandler } from "../../middleware/errorMiddleware.js";

import * as payrollPeriodRepository from "../../repositories/payroll/payrollPeriod.repository.js";

const PUBLISHABLE_PAYSLIP_STATUSES = [
  "draft",
  "waiting_confirmation",
  "confirmed",
  "adjusted",
];

const RELEASE_READY_STATUSES = ["draft", "waiting_confirmation", "adjusted"];
const RELEASED_PAYSLIP_STATUSES = ["published", "confirmed", "paid", "employee_feedback"];

const percent = (value, total) => total > 0 ? Math.round((Number(value) / Number(total)) * 10000) / 100 : 0;

/**
 * Read-only operational view for the release control center. All aggregates are
 * calculated in PostgreSQL; no employee-level salary data is returned here.
 */
export async function getPayrollReleaseControlCenter({ periodId, unitId, status, search, page = 1, limit = 20 } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const periodsResult = await pool.query(`
    SELECT id, TRIM(period_code) AS period_code, period_name, status, start_date, end_date,
      payment_date, published_at, published_by, closed_at
    FROM payroll_periods WHERE status <> 'cancelled' ORDER BY start_date DESC, id DESC
  `);
  const periods = periodsResult.rows;
  const selectedId = Number(periodId) || Number(periods[0]?.id || 0);
  if (!selectedId) return { periods: [], period: null, summary: {}, readiness: [], queue: [], risks: [], activities: [], pagination: { page: 1, limit: safeLimit, total: 0, totalPages: 0 } };

  const [summaryResult, importResult, unitsResult, activitiesResult, sampleResult, unitOptionsResult] = await Promise.all([
    pool.query(`
      SELECT p.id, TRIM(p.period_code) period_code, p.period_name, p.status period_status,
        p.start_date, p.end_date, p.payment_date, p.published_at, p.published_by,
        COALESCE(pay.total_slips,0)::int total_slips,
        COALESCE(pay.ready_slips,0)::int ready_slips,
        COALESCE(pay.released_slips,0)::int released_slips,
        COALESCE(pay.feedback_slips,0)::int feedback_slips,
        COALESCE(pay.invalid_slips,0)::int invalid_slips,
        COALESCE(pay.gross,0) gross, COALESCE(pay.deductions,0) deductions,
        COALESCE(pay.net,0) net,
        COALESCE(notify.recipients,0)::int notification_recipients,
        COALESCE(notify.delivered,0)::int notification_delivered,
        COALESCE(notify.read_count,0)::int notification_read
      FROM payroll_periods p
      LEFT JOIN LATERAL (
        SELECT COUNT(s.id)::int total_slips,
          COUNT(s.id) FILTER (WHERE s.status = ANY($2::varchar[]))::int ready_slips,
          COUNT(s.id) FILTER (WHERE s.status = ANY($3::varchar[]))::int released_slips,
          COUNT(s.id) FILTER (WHERE s.status = 'employee_feedback')::int feedback_slips,
          COUNT(s.id) FILTER (WHERE s.net_salary < 0 OR s.gross_income < 0 OR s.total_deductions < 0 OR s.net_salary > s.gross_income)::int invalid_slips,
          COALESCE(SUM(s.gross_income),0) gross,
          COALESCE(SUM(s.total_deductions),0) deductions,
          COALESCE(SUM(s.net_salary),0) net
        FROM employee_payslips s WHERE s.payroll_period_id=p.id
      ) pay ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(DISTINCT nr.id)::int recipients,
          COUNT(DISTINCT nr.id) FILTER (WHERE nr.delivered_at IS NOT NULL)::int delivered,
          COUNT(DISTINCT nr.id) FILTER (WHERE nr.read_at IS NOT NULL)::int read_count
        FROM notifications n JOIN notification_recipients nr ON nr.notification_id=n.id
        WHERE n.reference_type='payroll_period' AND n.reference_id=p.id::text
      ) notify ON TRUE
      WHERE p.id=$1
    `, [selectedId, RELEASE_READY_STATUSES, RELEASED_PAYSLIP_STATUSES]),
    pool.query(`SELECT COUNT(*)::int total,
      COUNT(*) FILTER (WHERE status='committed')::int committed,
      COUNT(*) FILTER (WHERE status='failed')::int failed,
      COALESCE(SUM(invalid_rows) FILTER (WHERE status='committed'),0)::int invalid_rows
      FROM payroll_imports WHERE payroll_period_id=$1`, [selectedId]),
    pool.query(`WITH grouped AS (
      SELECT COALESCE(w.id,0) unit_id, COALESCE(w.code,'N/A') unit_code,
        COALESCE(w.name,'Chưa phân đơn vị') unit_name, COUNT(s.id)::int slip_count,
        COUNT(DISTINCT s.staff_id)::int employee_count,
        COUNT(s.id) FILTER (WHERE s.status = ANY($2::varchar[]))::int ready_count,
        COUNT(s.id) FILTER (WHERE s.status = ANY($8::varchar[]))::int released_count,
        COUNT(s.id) FILTER (WHERE s.status='employee_feedback' OR s.net_salary < 0 OR s.gross_income < 0 OR s.total_deductions < 0 OR s.net_salary > s.gross_income)::int issue_count,
        COALESCE(SUM(s.gross_income),0) gross, COALESCE(SUM(s.net_salary),0) net,
        MAX(s.updated_at) updated_at
      FROM employee_payslips s JOIN employees e ON e.staff_id=s.staff_id
      LEFT JOIN work_locations w ON w.id=e.work_location_id
      WHERE s.payroll_period_id=$1
        AND ($3::bigint IS NULL OR w.id=$3)
        AND ($4::text IS NULL OR CONCAT_WS(' ',w.code,w.name,s.staff_id,e.last_name,e.first_name) ILIKE '%'||$4||'%')
      GROUP BY w.id,w.code,w.name
    ) SELECT *, COUNT(*) OVER()::int total_units FROM grouped
      WHERE ($5::text IS NULL
        OR ($5='ready' AND ready_count>0)
        OR ($5='released' AND released_count=slip_count AND slip_count>0)
        OR ($5='warning' AND issue_count>0))
      ORDER BY issue_count DESC, unit_name LIMIT $6 OFFSET $7
    `, [selectedId, RELEASE_READY_STATUSES, Number(unitId)||null, search?.trim()||null, status||null, safeLimit, (safePage-1)*safeLimit, RELEASED_PAYSLIP_STATUSES]),
    pool.query(`
      SELECT COALESCE(s.published_at,s.updated_at,s.created_at) event_at,
        CASE WHEN s.status = ANY($2::varchar[]) THEN 'Phát hành phiếu lương' ELSE 'Cập nhật phiếu lương' END event,
        s.status result, s.published_by actor, CONCAT_WS(' ',a.last_name,a.first_name) actor_name, s.staff_id
      FROM employee_payslips s LEFT JOIN employees a ON a.staff_id=s.published_by
      WHERE s.payroll_period_id=$1
      ORDER BY event_at DESC NULLS LAST LIMIT 8
    `,[selectedId, RELEASED_PAYSLIP_STATUSES]),
    pool.query(`SELECT s.id,s.staff_id,CONCAT_WS(' ',e.last_name,e.first_name) employee_name,
      COALESCE(w.name,'Chưa phân đơn vị') unit_name,s.gross_income,s.total_deductions,s.net_salary,s.status
      FROM employee_payslips s JOIN employees e ON e.staff_id=s.staff_id LEFT JOIN work_locations w ON w.id=e.work_location_id
      WHERE s.payroll_period_id=$1 ORDER BY s.updated_at DESC LIMIT 1`,[selectedId]),
    pool.query(`SELECT DISTINCT COALESCE(w.id,0)::int id, COALESCE(w.code,'N/A') code,
      COALESCE(w.name,'Chưa phân đơn vị') name
      FROM employee_payslips s JOIN employees e ON e.staff_id=s.staff_id
      LEFT JOIN work_locations w ON w.id=e.work_location_id
      WHERE s.payroll_period_id=$1 ORDER BY name`, [selectedId])
  ]);
  const row = summaryResult.rows[0];
  if (!row) throw new ErrorHandler("Không tìm thấy kỳ lương", 404);
  const imp = importResult.rows[0];
  const total = Number(row.total_slips);
  const invalid = Number(row.invalid_slips);
  const pendingAdjustments = Number(row.feedback_slips);
  const hasCommittedImport = Number(imp.committed) > 0;
  const blockers = [
    ...(!["draft","published","locked"].includes(row.period_status) ? [{ code:"PERIOD_STATE", label:"Trạng thái kỳ không cho phép phát hành", count:1 }] : []),
    ...(!hasCommittedImport && row.period_status === "draft" ? [{ code:"MISSING_IMPORT", label:"Chưa có import đã ghi nhận", count:1 }] : []),
    ...(invalid ? [{ code:"INVALID_PAYSLIP", label:"Phiếu lương có số liệu không hợp lệ", count:invalid }] : []),
    ...(pendingAdjustments ? [{ code:"PENDING_FEEDBACK", label:"Phản hồi/điều chỉnh chưa xử lý", count:pendingAdjustments }] : []),
  ];
  const warnings = [
    ...(Number(imp.failed) ? [{ code:"FAILED_IMPORT_HISTORY", label:"Có lịch sử import thất bại", count:Number(imp.failed) }] : []),
    ...(Number(imp.invalid_rows) ? [{ code:"IMPORT_WARNINGS", label:"Dòng import cần rà soát", count:Number(imp.invalid_rows) }] : []),
  ];
  const gate = row.period_status === "locked" ? "LOCKED" : row.period_status === "published" ? "RELEASED" : blockers.length ? "BLOCKED" : warnings.length ? "READY_WITH_WARNINGS" : "READY";
  const queue = unitsResult.rows.map(u => ({ id:Number(u.unit_id), code:u.unit_code, name:u.unit_name, employees:Number(u.employee_count), slips:Number(u.slip_count), ready:Number(u.ready_count), released:Number(u.released_count), issues:Number(u.issue_count), gross:toNumber(u.gross), net:toNumber(u.net), readiness:percent(Number(u.ready_count)+Number(u.released_count),Number(u.slip_count)), updatedAt:u.updated_at }));
  return {
    periods: periods.map(p=>({ id:Number(p.id), code:p.period_code, name:p.period_name, status:p.status })),
    period: { id:Number(row.id), code:row.period_code, name:row.period_name, status:row.period_status, startDate:row.start_date, endDate:row.end_date, paymentDate:row.payment_date, publishedAt:row.published_at, publishedBy:row.published_by },
    summary: { totalSlips:total, readySlips:Number(row.ready_slips), processingSlips:0, failedSlips:invalid, releasedSlips:Number(row.released_slips), feedbackSlips:Number(row.feedback_slips), gross:toNumber(row.gross), deductions:toNumber(row.deductions), net:toNumber(row.net) },
    gate: { status:gate, canRelease:["READY","READY_WITH_WARNINGS"].includes(gate), blockers, warnings },
    readiness: [
      { code:"IMPORT", label:"Dữ liệu lương đã import", completed:hasCommittedImport?total:0, total, status:hasCommittedImport?"complete":"blocked" },
      { code:"EMPLOYEE", label:"Dữ liệu nhân sự đồng bộ", completed:total, total, status:total?"complete":"blocked" },
      { code:"VALIDATION", label:"Số liệu phiếu lương hợp lệ", completed:Math.max(0,total-invalid), total, status:!total?"blocked":invalid?"blocked":"complete" },
      { code:"ADJUSTMENT", label:"Phản hồi & điều chỉnh đã xử lý", completed:Math.max(0,total-pendingAdjustments), total, status:!total?"blocked":pendingAdjustments?"warning":"complete" },
      { code:"APPROVAL", label:"Phiếu đủ trạng thái phát hành", completed:Number(row.ready_slips)+Number(row.released_slips), total, status:!total?"blocked":(Number(row.ready_slips)+Number(row.released_slips)===total)?"complete":"warning" },
    ].map(x=>({...x,percentage:percent(x.completed,x.total)})),
    notifications: { total:Number(row.notification_recipients), delivered:Number(row.notification_delivered), read:Number(row.notification_read), pending:Math.max(0,Number(row.notification_recipients)-Number(row.notification_delivered)), channels:["Ứng dụng"] },
    units: unitOptionsResult.rows, queue, risks:[...blockers,...warnings], activities:activitiesResult.rows, samplePayslip:sampleResult.rows[0]||null,
    pagination:{ page:safePage,limit:safeLimit,total:Number(unitsResult.rows[0]?.total_units||0),totalPages:Math.ceil(Number(unitsResult.rows[0]?.total_units||0)/safeLimit) }, updatedAt:new Date().toISOString()
  };
}

function validatePositiveInteger(value, fieldName) {
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    throw new ErrorHandler(
      `${fieldName} không hợp lệ`,
      400,
    );
  }

  return number;
}

function validateStaffId(value, fieldName = "Mã nhân viên") {
  const staffId = String(value || "").trim();

  if (!staffId) {
    throw new ErrorHandler(
      `${fieldName} không hợp lệ`,
      400,
    );
  }

  return staffId;
}

function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function mapPublishPreview(row) {
  return {
    periodId: Number(row.period_id),
    periodCode: row.period_code,
    periodName: row.period_name,
    periodStatus: row.period_status,
    paymentDate: row.payment_date,

    totalPayslips: Number(row.total_payslips),
    publishablePayslips: Number(
      row.publishable_payslips,
    ),
    publishedPayslips: Number(
      row.published_payslips,
    ),
    paidPayslips: Number(row.paid_payslips),
    feedbackPayslips: Number(
      row.feedback_payslips,
    ),
    invalidPayslips: Number(row.invalid_payslips),

    totalGrossIncome: toNumber(
      row.total_gross_income,
    ),
    totalDeductions: toNumber(
      row.total_deductions,
    ),
    totalNetSalary: toNumber(
      row.total_net_salary,
    ),

  canPublish:
  row.period_status === "draft" &&
  Number(row.total_payslips) > 0 &&
  Number(row.invalid_payslips) === 0 &&
  Number(row.feedback_payslips) === 0,
  };
}

/**
 * Kiểm tra toàn bộ kỳ lương trước khi phát hành.
 */
export async function previewPayrollPublish(periodId) {
  const normalizedPeriodId = validatePositiveInteger(
    periodId,
    "Mã kỳ lương",
  );

  const result = await pool.query(
    `
      SELECT
        period.id AS period_id,
        period.period_code,
        period.period_name,
        period.status AS period_status,
        period.payment_date,

        COUNT(payslip.id)::INT
          AS total_payslips,

        COUNT(payslip.id) FILTER (
          WHERE payslip.status =
            ANY($2::VARCHAR[])
        )::INT AS publishable_payslips,

        COUNT(payslip.id) FILTER (
          WHERE payslip.status = 'published'
        )::INT AS published_payslips,

        COUNT(payslip.id) FILTER (
          WHERE payslip.status = 'paid'
        )::INT AS paid_payslips,

        COUNT(payslip.id) FILTER (
          WHERE payslip.status =
            'employee_feedback'
        )::INT AS feedback_payslips,

        COUNT(payslip.id) FILTER (
          WHERE
            payslip.gross_income < 0
            OR payslip.taxable_income < 0
            OR payslip.total_deductions < 0
            OR payslip.net_salary < 0
            OR payslip.net_salary >
              payslip.gross_income
        )::INT AS invalid_payslips,

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

      LEFT JOIN employee_payslips AS payslip
        ON payslip.payroll_period_id = period.id

      WHERE period.id = $1

      GROUP BY
        period.id,
        period.period_code,
        period.period_name,
        period.status,
        period.payment_date;
    `,
    [
      normalizedPeriodId,
      PUBLISHABLE_PAYSLIP_STATUSES,
    ],
  );

  const preview = result.rows[0];

  if (!preview) {
    throw new ErrorHandler(
      "Không tìm thấy kỳ lương",
      404,
    );
  }

  return mapPublishPreview(preview);
}

/**
 * Khóa kỳ lương trong transaction để ngăn hai HR cùng phát hành.
 */
async function lockPayrollPeriod(periodId, client) {
  const result = await client.query(
    `
      SELECT
        id,
        period_code,
        period_name,
        payment_date,
        status,
        published_at,
        published_by
      FROM payroll_periods
      WHERE id = $1
      FOR UPDATE;
    `,
    [periodId],
  );

  return result.rows[0] ?? null;
}

/**
 * Kiểm tra các phiếu chưa đủ điều kiện phát hành.
 */
async function findBlockingPayslips(periodId, client) {
  const result = await client.query(
    `
      SELECT
        payslip.id,
        payslip.staff_id,
        CONCAT_WS(
          ' ',
          employee.last_name,
          employee.first_name
        ) AS employee_name,
        payslip.status,
        payslip.gross_income,
        payslip.total_deductions,
        payslip.net_salary,

        CASE
          WHEN payslip.status =
            'employee_feedback'
            THEN
              'Phiếu lương đang có phản hồi chưa xử lý'

          WHEN payslip.gross_income < 0
            THEN
              'Tổng thu nhập không hợp lệ'

          WHEN payslip.total_deductions < 0
            THEN
              'Tổng khấu trừ không hợp lệ'

          WHEN payslip.net_salary < 0
            THEN
              'Thực lĩnh không hợp lệ'

          WHEN payslip.net_salary >
            payslip.gross_income
            THEN
              'Thực lĩnh lớn hơn tổng thu nhập'

          ELSE NULL
        END AS blocking_reason

      FROM employee_payslips AS payslip

      INNER JOIN employees AS employee
        ON employee.staff_id = payslip.staff_id

      WHERE payslip.payroll_period_id = $1
        AND (
          payslip.status = 'employee_feedback'
          OR payslip.gross_income < 0
          OR payslip.total_deductions < 0
          OR payslip.net_salary < 0
          OR payslip.net_salary >
            payslip.gross_income
        )

      ORDER BY payslip.staff_id;
    `,
    [periodId],
  );

  return result.rows;
}

/**
 * Tạo một thông báo chung và gán đúng danh sách người nhận.
 */
async function createPayrollNotification({
  period,
  publishedBy,
  recipients,
  client,
}) {
  if (!recipients.length) {
    return null;
  }

  const notificationResult = await client.query(
    `
      INSERT INTO notifications (
        title,
        description,
        notification_type,
        tone,
        icon,
        action_url,
        audience_type,
        reference_type,
        reference_id,
        is_urgent,
        created_by,
        published_at
      )
      VALUES (
        $1,
        $2,
        'payroll',
        'green',
        'wallet',
        $3,
        'custom',
        'payroll_period',
        $4,
        FALSE,
        $5,
        CURRENT_TIMESTAMP
      )
      RETURNING
        id,
        title,
        description,
        notification_type,
        action_url,
        reference_type,
        reference_id,
        published_at;
    `,
    [
      `Phiếu lương ${period.period_code} đã được phát hành`,
      `Phiếu lương kỳ ${period.period_code} đã được phát hành. Vui lòng kiểm tra, xác nhận hoặc gửi phản hồi nếu có sai lệch.`,
      `/payroll?period=${period.period_code}`,
      String(period.id),
      publishedBy,
    ],
  );

  const notification =
    notificationResult.rows[0];

  await client.query(
    `
      INSERT INTO notification_recipients (
        notification_id,
        staff_id,
        delivered_at
      )
      SELECT
        $1,
        recipient.staff_id,
        CURRENT_TIMESTAMP
      FROM UNNEST(
        $2::VARCHAR[]
      ) AS recipient(staff_id)
      ON CONFLICT (
        notification_id,
        staff_id
      )
      DO NOTHING;
    `,
    [
      notification.id,
      recipients.map(
        (recipient) => recipient.staff_id,
      ),
    ],
  );

  return notification;
}

/**
 * Phát hành toàn bộ phiếu lương của một kỳ.
 *
 * Transaction đảm bảo:
 * - Cập nhật phiếu lương
 * - Đánh dấu version hiện tại đã phát hành
 * - Đánh dấu kỳ lương đã phát hành
 * - Tạo thông báo
 *
 * Nếu một bước lỗi thì toàn bộ được rollback.
 */
export async function publishPayrollPeriod({
  periodId,
  publishedBy,
}) {
  const normalizedPeriodId = validatePositiveInteger(
    periodId,
    "Mã kỳ lương",
  );

  const normalizedPublisher = validateStaffId(
    publishedBy,
    "Người phát hành",
  );

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const period = await lockPayrollPeriod(
      normalizedPeriodId,
      client,
    );

    if (!period) {
      throw new ErrorHandler(
        "Không tìm thấy kỳ lương",
        404,
      );
    }

    if (period.status === "published") {
      throw new ErrorHandler(
        "Kỳ lương này đã được phát hành",
        409,
      );
    }

    if (period.status === "locked") {
      throw new ErrorHandler(
        "Kỳ lương đã khóa, không thể phát hành lại",
        409,
      );
    }

    if (period.status === "cancelled") {
      throw new ErrorHandler(
        "Kỳ lương đã bị hủy",
        409,
      );
    }

 if (period.status !== "draft") {
  throw new ErrorHandler(
    "Chỉ được phát hành kỳ lương ở trạng thái bản nháp",
    409,
  );
}

    const payslipCountResult =
      await client.query(
        `
          SELECT COUNT(*)::INT AS total
          FROM employee_payslips
          WHERE payroll_period_id = $1;
        `,
        [normalizedPeriodId],
      );

    const totalPayslips = Number(
      payslipCountResult.rows[0].total,
    );

    if (totalPayslips === 0) {
      throw new ErrorHandler(
        "Kỳ lương chưa có phiếu lương để phát hành",
        409,
      );
    }

    const blockingPayslips =
      await findBlockingPayslips(
        normalizedPeriodId,
        client,
      );

    if (blockingPayslips.length > 0) {
      throw new ErrorHandler(
        `Có ${blockingPayslips.length} phiếu lương chưa đủ điều kiện phát hành`,
        409,
      );
    }

    const payslipResult = await client.query(
      `
        UPDATE employee_payslips
        SET
          status = 'published',
          published_at = CURRENT_TIMESTAMP,
          published_by = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE payroll_period_id = $1
          AND status =
            ANY($3::VARCHAR[])
        RETURNING
          id,
          staff_id,
          current_version,
          gross_income,
          total_deductions,
          net_salary,
          status,
          published_at,
          published_by;
      `,
      [
        normalizedPeriodId,
        normalizedPublisher,
        PUBLISHABLE_PAYSLIP_STATUSES,
      ],
    );

    if (payslipResult.rows.length === 0) {
      throw new ErrorHandler(
        "Không có phiếu lương nào đủ điều kiện phát hành",
        409,
      );
    }

    /*
     * Đánh dấu đúng phiên bản đang có hiệu lực là đã phát hành.
     */
    await client.query(
      `
        UPDATE payslip_versions AS version
        SET
          published_at = COALESCE(
            version.published_at,
            CURRENT_TIMESTAMP
          )
        FROM employee_payslips AS payslip
        WHERE version.payslip_id = payslip.id
          AND version.version_number =
            payslip.current_version
          AND payslip.payroll_period_id = $1
          AND payslip.status = 'published';
      `,
      [normalizedPeriodId],
    );

    const publishedPeriod =
      await payrollPeriodRepository.markPeriodPublished(
        {
          periodId: normalizedPeriodId,
          publishedBy: normalizedPublisher,
        },
        client,
      );

    if (!publishedPeriod) {
      throw new ErrorHandler(
        "Không thể cập nhật trạng thái kỳ lương",
        409,
      );
    }

    const notification =
      await createPayrollNotification({
        period: publishedPeriod,
        publishedBy: normalizedPublisher,
        recipients: payslipResult.rows,
        client,
      });

    await client.query("COMMIT");

    const totalGrossIncome =
      payslipResult.rows.reduce(
        (total, payslip) =>
          total +
          toNumber(payslip.gross_income),
        0,
      );

    const totalDeductions =
      payslipResult.rows.reduce(
        (total, payslip) =>
          total +
          toNumber(
            payslip.total_deductions,
          ),
        0,
      );

    const totalNetSalary =
      payslipResult.rows.reduce(
        (total, payslip) =>
          total +
          toNumber(payslip.net_salary),
        0,
      );

    return {
      period: {
        id: Number(publishedPeriod.id),
        periodCode:
          publishedPeriod.period_code,
        periodName:
          publishedPeriod.period_name,
        status: publishedPeriod.status,
        publishedAt:
          publishedPeriod.published_at,
        publishedBy:
          publishedPeriod.published_by,
      },

      summary: {
        publishedPayslips:
          payslipResult.rows.length,
        totalGrossIncome,
        totalDeductions,
        totalNetSalary,
        notificationRecipients:
          payslipResult.rows.length,
      },

      notification: notification
        ? {
            id: Number(notification.id),
            title: notification.title,
            publishedAt:
              notification.published_at,
          }
        : null,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Phát hành lại một phiếu lương sau khi HR điều chỉnh.
 *
 * Không thay đổi trạng thái toàn bộ kỳ lương.
 */
export async function republishAdjustedPayslip({
  payslipId,
  publishedBy,
  message = null,
}) {
  const normalizedPayslipId =
    validatePositiveInteger(
      payslipId,
      "Mã phiếu lương",
    );

  const normalizedPublisher = validateStaffId(
    publishedBy,
    "Người phát hành",
  );

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const payslipResult = await client.query(
      `
        SELECT
          payslip.id,
          payslip.staff_id,
          payslip.payroll_period_id,
          payslip.current_version,
          payslip.status,
          payslip.gross_income,
          payslip.total_deductions,
          payslip.net_salary,
          period.period_code,
          period.status AS period_status
        FROM employee_payslips AS payslip

        INNER JOIN payroll_periods AS period
          ON period.id =
            payslip.payroll_period_id

        WHERE payslip.id = $1
        FOR UPDATE OF payslip;
      `,
      [normalizedPayslipId],
    );

    const payslip = payslipResult.rows[0];

    if (!payslip) {
      throw new ErrorHandler(
        "Không tìm thấy phiếu lương",
        404,
      );
    }

    if (payslip.status !== "adjusted") {
      throw new ErrorHandler(
        "Chỉ được gửi lại phiếu lương đã điều chỉnh",
        409,
      );
    }

if (payslip.period_status !== "published") {
  throw new ErrorHandler(
    "Chỉ được phát hành lại phiếu khi kỳ lương đang ở trạng thái đã phát hành",
    409,
  );
}

    const updatedResult = await client.query(
      `
        UPDATE employee_payslips
        SET
          status = 'published',
          published_at = CURRENT_TIMESTAMP,
          published_by = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND status = 'adjusted'
        RETURNING
          id,
          staff_id,
          payroll_period_id,
          current_version,
          status,
          gross_income,
          total_deductions,
          net_salary,
          published_at,
          published_by;
      `,
      [
        normalizedPayslipId,
        normalizedPublisher,
      ],
    );

    const updatedPayslip =
      updatedResult.rows[0];

    if (!updatedPayslip) {
      throw new ErrorHandler(
        "Không thể gửi lại phiếu lương",
        409,
      );
    }

    await client.query(
      `
        UPDATE payslip_versions
        SET
          published_at = COALESCE(
            published_at,
            CURRENT_TIMESTAMP
          )
        WHERE payslip_id = $1
          AND version_number = $2;
      `,
      [
        updatedPayslip.id,
        updatedPayslip.current_version,
      ],
    );

    const notificationResult =
      await client.query(
        `
          INSERT INTO notifications (
            title,
            description,
            notification_type,
            tone,
            icon,
            action_url,
            audience_type,
            target_staff_id,
            reference_type,
            reference_id,
            is_urgent,
            created_by,
            published_at
          )
          VALUES (
            $1,
            $2,
            'payroll',
            'orange',
            'wallet',
            $3,
            'employee',
            $4,
            'payslip',
            $5,
            TRUE,
            $6,
            CURRENT_TIMESTAMP
          )
          RETURNING
            id,
            title,
            description,
            published_at;
        `,
        [
          `Phiếu lương ${payslip.period_code} đã được điều chỉnh`,
          message?.trim() ||
            `HR đã điều chỉnh và phát hành lại phiếu lương kỳ ${payslip.period_code}. Vui lòng kiểm tra lại phiên bản mới.`,
          `/payroll/${updatedPayslip.id}`,
          updatedPayslip.staff_id,
          String(updatedPayslip.id),
          normalizedPublisher,
        ],
      );

    const notification =
      notificationResult.rows[0];

    await client.query(
      `
        INSERT INTO notification_recipients (
          notification_id,
          staff_id,
          delivered_at
        )
        VALUES (
          $1,
          $2,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT (
          notification_id,
          staff_id
        )
        DO NOTHING;
      `,
      [
        notification.id,
        updatedPayslip.staff_id,
      ],
    );

    await client.query("COMMIT");

    return {
      payslip: {
        id: Number(updatedPayslip.id),
        staffId: updatedPayslip.staff_id,
        periodCode: payslip.period_code,
        currentVersion: Number(
          updatedPayslip.current_version,
        ),
        status: updatedPayslip.status,
        grossIncome: toNumber(
          updatedPayslip.gross_income,
        ),
        totalDeductions: toNumber(
          updatedPayslip.total_deductions,
        ),
        netSalary: toNumber(
          updatedPayslip.net_salary,
        ),
        publishedAt:
          updatedPayslip.published_at,
        publishedBy:
          updatedPayslip.published_by,
      },

      notification: {
        id: Number(notification.id),
        title: notification.title,
        publishedAt:
          notification.published_at,
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
