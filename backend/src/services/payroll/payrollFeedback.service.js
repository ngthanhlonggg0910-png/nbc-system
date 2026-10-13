import pool from "../../config/db.js";
import { ErrorHandler } from "../../middleware/errorMiddleware.js";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileTypeFromBuffer } from "file-type";

import * as payrollFeedbackRepository from "../../repositories/payroll/payrollFeedback.repository.js";

const EMPLOYEE_FEEDBACK_VISIBLE_PAYSLIP_STATUSES = [
  "published",
  "employee_feedback",
  "confirmed",
];

const FEEDBACK_STATUSES = [
  "pending",
  "reviewing",
  "accepted",
  "rejected",
  "adjusted",
  "resolved",
];

const FEEDBACK_CATEGORIES = [
  "income",
  "deduction",
  "attendance",
  "personal_information",
  "other",
];

const FEEDBACK_ISSUE_TYPES = {
  attendance: "attendance",
  base_salary: "income",
  overtime: "income",
  allowance: "income",
  bonus_kpi: "income",
  insurance: "deduction",
  personal_income_tax: "deduction",
  deduction: "deduction",
  gross_income: "income",
  net_salary: "income",
  other: "other",
};

const FEEDBACK_CATEGORY_BY_ITEM_CODE = [
  { pattern: /(BHXH|BHYT|BHTN|INSURANCE)/i, issueType: "insurance" },
  { pattern: /(TNCN|PIT|TAX)/i, issueType: "personal_income_tax" },
  { pattern: /(OVERTIME|TANG_CA|OT_)/i, issueType: "overtime" },
  { pattern: /(ALLOW|PHU_CAP)/i, issueType: "allowance" },
  { pattern: /(BONUS|KPI|THUONG)/i, issueType: "bonus_kpi" },
  { pattern: /(BASE|LUONG_CO_BAN)/i, issueType: "base_salary" },
  { pattern: /ATTENDANCE/i, issueType: "attendance" },
];

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_PAGE_SIZE = 100;
const ATTACHMENT_DIRECTORY = path.resolve("uploads", "payroll-feedbacks");
const FEEDBACK_ATTACHMENT_TYPES = new Map([
  ["image/png", ["png"]],
  ["image/jpeg", ["jpg", "jpeg"]],
  ["application/pdf", ["pdf"]],
]);

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

function normalizePagination({
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
}) {
  const normalizedPage = Number(page);
  const normalizedLimit = Number(limit);

  if (
    !Number.isInteger(normalizedPage) ||
    normalizedPage <= 0
  ) {
    throw new ErrorHandler(
      "Trang phải là số nguyên dương",
      400,
    );
  }

  if (
    !Number.isInteger(normalizedLimit) ||
    normalizedLimit <= 0 ||
    normalizedLimit > MAX_PAGE_SIZE
  ) {
    throw new ErrorHandler(
      `Số bản ghi mỗi trang phải từ 1 đến ${MAX_PAGE_SIZE}`,
      400,
    );
  }

  return {
    page: normalizedPage,
    limit: normalizedLimit,
    offset:
      (normalizedPage - 1) *
      normalizedLimit,
  };
}

function normalizeNullableString(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const normalized =
    String(value).trim();

  return normalized || null;
}

function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function mapFeedback(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    payslipId: Number(row.payslip_id),
    staffId: row.staff_id,

    category: row.category,
    code: row.feedback_code ?? null,
    issueType: row.issue_type ?? null,
    salaryItemId: row.salary_item_id
      ? Number(row.salary_item_id)
      : null,
    payslipVersion: row.payslip_version
      ? Number(row.payslip_version)
      : null,
    salaryItemLabel: row.salary_item_label ?? null,
    salaryItemCode: row.salary_item_code ?? null,
    proposedValue: row.proposed_value ?? null,
    priority: row.priority ?? "normal",
    content: row.content,
    attachmentUrl:
      row.attachment_url ?? null,
    attachment: row.attachment_stored_name
      ? {
          originalName: row.attachment_original_name,
          mimeType: row.attachment_mime_type,
          sizeBytes: Number(row.attachment_size_bytes ?? 0),
          downloadUrl: `/api/payroll/feedbacks/${row.id}/attachment`,
        }
      : null,

    status: row.status,
    hrReply: row.hr_reply ?? null,

    handledBy:
      row.handled_by ?? null,
    handledByName:
      row.handled_by_name ?? null,
    handledAt:
      row.handled_at ?? null,
    resolvedAt:
      row.resolved_at ?? null,

    createdAt: row.created_at,
    updatedAt: row.updated_at,

    employee:
      row.employee_name !== undefined
        ? {
            staffId: row.staff_id,
            name:
              row.employee_name ?? null,
            departmentId:
              row.department_id
                ? Number(
                    row.department_id,
                  )
                : null,
            departmentName:
              row.department_name ??
              null,
            email: row.email ?? null,
            phone: row.phone ?? null,
            employeeType: row.employee_type ?? null,
            workLocationId: row.work_location_id ? Number(row.work_location_id) : null,
            workLocationName: row.work_location_name ?? null,
          }
        : undefined,

    payslip:
      row.period_code !== undefined
        ? {
            id: Number(
              row.payslip_id,
            ),
            payrollPeriodId:
              row.payroll_period_id
                ? Number(
                    row.payroll_period_id,
                  )
                : null,
            periodCode:
              row.period_code,
            periodName:
              row.period_name ?? null,
            paymentDate:
              row.payment_date ?? null,
            currentVersion:
              row.current_version
                ? Number(
                    row.current_version,
                  )
                : null,
            status:
              row.payslip_status ??
              null,
            periodStatus:
              row.period_status ??
              null,
            grossIncome:
              row.gross_income !==
              undefined
                ? toNumber(
                    row.gross_income,
                  )
                : undefined,
            totalDeductions:
              row.total_deductions !==
              undefined
                ? toNumber(
                    row.total_deductions,
                  )
                : undefined,
            netSalary:
              row.net_salary !==
              undefined
                ? toNumber(
                    row.net_salary,
                  )
                : undefined,
          }
        : undefined,
  };
}

async function findEmployeePayslipForFeedback(
  {
    payslipId,
    staffId,
  },
  client,
) {
  const result = await client.query(
    `
      SELECT
        payslip.id,
        payslip.payroll_period_id,
        payslip.staff_id,
        payslip.current_version,
        payslip.status,
        payslip.gross_income,
        payslip.total_deductions,
        payslip.net_salary,
        payslip.published_at,

        period.period_code,
        period.period_name,
        period.status AS period_status

      FROM employee_payslips AS payslip

      INNER JOIN payroll_periods AS period
        ON period.id =
          payslip.payroll_period_id

      WHERE payslip.id = $1
        AND payslip.staff_id = $2

      FOR UPDATE OF payslip;
    `,
    [
      payslipId,
      staffId,
    ],
  );

  return result.rows[0] ?? null;
}

async function createEmployeeNotification(
  {
    staffId,
    title,
    description,
    payslipId,
    feedbackId,
    createdBy,
    tone = "blue",
    isUrgent = false,
  },
  client,
) {
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
          $3,
          'message-square',
          $4,
          'employee',
          $5,
          'payroll_feedback',
          $6,
          $7,
          $8,
          CURRENT_TIMESTAMP
        )
        RETURNING
          id,
          title,
          description,
          notification_type,
          tone,
          action_url,
          target_staff_id,
          reference_type,
          reference_id,
          published_at;
      `,
      [
        title,
        description,
        tone,
        `/payroll/${payslipId}?feedback=${feedbackId}`,
        staffId,
        String(feedbackId),
        isUrgent,
        createdBy,
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
      staffId,
    ],
  );

  return notification;
}

/**
 * Nhân viên gửi phản hồi phiếu lương.
 */
export async function createEmployeePayrollFeedback({
  payslipId,
  staffId,
  category,
  issueType,
  salaryItemId = null,
  proposedValue = null,
  priority = "normal",
  content,
  attachmentFile = null,
}) {
  const normalizedPayslipId =
    validatePositiveInteger(
      payslipId,
      "Mã phiếu lương",
    );

  const normalizedStaffId =
    validateStaffId(staffId);

  const normalizedIssueType = String(issueType || "other")
    .trim()
    .toLowerCase();

  if (!Object.hasOwn(FEEDBACK_ISSUE_TYPES, normalizedIssueType)) {
    throw new ErrorHandler("Loại vấn đề không hợp lệ", 400, "INVALID_FEEDBACK_TYPE");
  }

  const normalizedCategory = String(
    category || FEEDBACK_ISSUE_TYPES[normalizedIssueType],
  ).trim().toLowerCase();

  if (
    !FEEDBACK_CATEGORIES.includes(
      normalizedCategory,
    )
  ) {
    throw new ErrorHandler(
      "Loại phản hồi không hợp lệ",
      400,
    );
  }

  const normalizedContent =
    String(content || "").trim();

  if (!normalizedContent) {
    throw new ErrorHandler(
      "Vui lòng nhập nội dung phản hồi",
      400,
    );
  }

  if (normalizedContent.length < 10 || normalizedContent.length > 5000) {
    throw new ErrorHandler(
      "Nội dung phản hồi phải có từ 10 đến 5000 ký tự",
      400,
    );
  }

  const normalizedSalaryItemId =
    salaryItemId === null || salaryItemId === undefined || salaryItemId === ""
      ? null
      : validatePositiveInteger(salaryItemId, "Khoản mục lương");

  const normalizedProposedValue = normalizeNullableString(proposedValue);
  const normalizedPriority = ["low", "normal", "high", "urgent"].includes(priority)
    ? priority
    : "normal";

  let storedAttachment = null;
  if (attachmentFile?.buffer?.length) {
    const detected = await fileTypeFromBuffer(attachmentFile.buffer);
    const extension = path.extname(attachmentFile.originalname).slice(1).toLowerCase();
    if (!detected || !FEEDBACK_ATTACHMENT_TYPES.get(detected.mime)?.includes(extension)) {
      throw new ErrorHandler("Chỉ hỗ trợ tệp PNG, JPG hoặc PDF hợp lệ", 400);
    }

    storedAttachment = {
      originalName: path.basename(attachmentFile.originalname).slice(0, 255),
      storedName: `${randomUUID()}.${extension}`,
      mimeType: detected.mime,
      sizeBytes: attachmentFile.size,
    };
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const payslip =
      await findEmployeePayslipForFeedback(
        {
          payslipId:
            normalizedPayslipId,
          staffId:
            normalizedStaffId,
        },
        client,
      );

    if (!payslip) {
      throw new ErrorHandler(
        "Không tìm thấy phiếu lương hoặc bạn không có quyền phản hồi",
        404,
        "PAYSLIP_NOT_OWNED",
      );
    }

    if (
      !EMPLOYEE_FEEDBACK_VISIBLE_PAYSLIP_STATUSES.includes(
        payslip.status,
      )
    ) {
      throw new ErrorHandler(
        "Phiếu lương chưa được phát hành hoặc không còn nhận phản hồi",
        409,
      );
    }

    if (
      !["published", "locked"].includes(
        payslip.period_status,
      )
    ) {
      throw new ErrorHandler(
        "Kỳ lương chưa được phát hành",
        409,
      );
    }

    if (normalizedSalaryItemId !== null) {
      const salaryItemResult = await client.query(
        `
          SELECT detail.salary_item_id, item.code, item.category
          FROM payslip_details AS detail
          INNER JOIN salary_master_items AS item ON item.id = detail.salary_item_id
          WHERE detail.payslip_id = $1
            AND detail.salary_item_id = $2
          LIMIT 1;
        `,
        [normalizedPayslipId, normalizedSalaryItemId],
      );

      if (!salaryItemResult.rows[0]) {
        throw new ErrorHandler(
          "Khoản mục không thuộc phiếu lương này",
          400,
          "PAYSLIP_CRITERION_NOT_FOUND",
          {
            payslipId: normalizedPayslipId,
            salaryItemId: normalizedSalaryItemId,
            currentVersion: Number(payslip.current_version),
          },
        );
      }

      const item = salaryItemResult.rows[0];
      const expectedIssueType = FEEDBACK_CATEGORY_BY_ITEM_CODE.find(({ pattern }) =>
        pattern.test(String(item.code || "")),
      )?.issueType;
      if (expectedIssueType && expectedIssueType !== normalizedIssueType) {
        throw new ErrorHandler("Loại vấn đề không phù hợp với khoản mục lương đã chọn", 400);
      }

      if (item.category === "income" && normalizedCategory !== "income") {
        throw new ErrorHandler("Khoản mục thu nhập phải dùng loại phản hồi thu nhập", 400);
      }
      if (item.category === "deduction" && normalizedCategory !== "deduction") {
        throw new ErrorHandler("Khoản mục khấu trừ phải dùng loại phản hồi khấu trừ", 400);
      }
    }

    const existingFeedback =
      await payrollFeedbackRepository.findOpenFeedback(
        {
          payslipId:
            normalizedPayslipId,
          staffId:
            normalizedStaffId,
          issueType: normalizedIssueType,
          salaryItemId: normalizedSalaryItemId,
        },
        client,
      );

    if (existingFeedback) {
      throw new ErrorHandler(
        "Bạn đang có phản hồi cùng loại và khoản mục chưa được HR xử lý",
        409,
      );
    }

    if (storedAttachment) {
      await mkdir(ATTACHMENT_DIRECTORY, { recursive: true });
      await writeFile(
        path.join(ATTACHMENT_DIRECTORY, storedAttachment.storedName),
        attachmentFile.buffer,
        { flag: "wx" },
      );
    }

    const feedback =
      await payrollFeedbackRepository.createPayrollFeedback(
        {
          payslipId:
            normalizedPayslipId,
          staffId:
            normalizedStaffId,
          category:
            normalizedCategory,
          issueType: normalizedIssueType,
          salaryItemId: normalizedSalaryItemId,
          payslipVersion: Number(payslip.current_version),
          proposedValue: normalizedProposedValue,
          priority: normalizedPriority,
          content:
            normalizedContent,
          attachmentUrl: null,
          attachmentOriginalName: storedAttachment?.originalName ?? null,
          attachmentStoredName: storedAttachment?.storedName ?? null,
          attachmentMimeType: storedAttachment?.mimeType ?? null,
          attachmentSizeBytes: storedAttachment?.sizeBytes ?? null,
        },
        client,
      );

    const codedFeedback =
      await payrollFeedbackRepository.assignFeedbackCode(
        feedback.id,
        client,
      );

    await client.query(
      `
        UPDATE employee_payslips
        SET
          status = 'employee_feedback',
          employee_comment = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND staff_id = $2
          AND status IN ('published', 'confirmed');
      `,
      [
        normalizedPayslipId,
        normalizedStaffId,
        normalizedContent,
      ],
    );

    await client.query("COMMIT");
    storedAttachment = null;

    return mapFeedback(codedFeedback ?? feedback);
  } catch (error) {
    await client.query("ROLLBACK");
    if (storedAttachment) {
      await unlink(path.join(ATTACHMENT_DIRECTORY, storedAttachment.storedName)).catch(() => undefined);
    }

    if (
      error.code === "23505" &&
      error.constraint ===
        "uq_payroll_feedbacks_open_issue"
    ) {
      throw new ErrorHandler(
        "Phiếu lương đã có phản hồi đang chờ xử lý",
        409,
      );
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function getPayrollFeedbackAttachment({ feedbackId, staffId, role }) {
  const normalizedFeedbackId = validatePositiveInteger(feedbackId, "Mã phản hồi");
  const normalizedStaffId = validateStaffId(staffId);
  const normalizedRole = String(role || "").trim().toLowerCase();
  const canAdministerFeedback = normalizedRole === "admin" || normalizedRole === "hr" || normalizedRole.startsWith("hr_");
  const feedback = canAdministerFeedback
    ? await payrollFeedbackRepository.findFeedbackById(normalizedFeedbackId)
    : await payrollFeedbackRepository.findEmployeeFeedbackById({
        feedbackId: normalizedFeedbackId,
        staffId: normalizedStaffId,
      });

  if (!feedback || !feedback.attachment_stored_name) {
    throw new ErrorHandler("Không tìm thấy tệp minh chứng hoặc bạn không có quyền truy cập", 404);
  }

  return {
    path: path.join(ATTACHMENT_DIRECTORY, feedback.attachment_stored_name),
    originalName: feedback.attachment_original_name || "minh-chung",
    mimeType: feedback.attachment_mime_type || "application/octet-stream",
  };
}

/**
 * Nhân viên lấy danh sách phản hồi của mình.
 */
export async function getEmployeePayrollFeedbacks({
  staffId,
  status = null,
  year = null,
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
}) {
  const normalizedStaffId =
    validateStaffId(staffId);

  const pagination =
    normalizePagination({
      page,
      limit,
    });

  const normalizedStatus =
    normalizeNullableString(status);

  if (
    normalizedStatus &&
    !FEEDBACK_STATUSES.includes(
      normalizedStatus,
    )
  ) {
    throw new ErrorHandler(
      "Trạng thái phản hồi không hợp lệ",
      400,
    );
  }

  const normalizedYear =
    year === null ||
    year === undefined
      ? null
      : Number(year);

  if (
    normalizedYear !== null &&
    (
      !Number.isInteger(normalizedYear) ||
      normalizedYear < 2000 ||
      normalizedYear > 2100
    )
  ) {
    throw new ErrorHandler(
      "Năm tra cứu không hợp lệ",
      400,
    );
  }

  const [rows, total] =
    await Promise.all([
      payrollFeedbackRepository.findEmployeeFeedbacks(
        {
          staffId:
            normalizedStaffId,
          status:
            normalizedStatus,
          year:
            normalizedYear,
          limit:
            pagination.limit,
          offset:
            pagination.offset,
        },
      ),

      payrollFeedbackRepository.countEmployeeFeedbacks(
        {
          staffId:
            normalizedStaffId,
          status:
            normalizedStatus,
          year:
            normalizedYear,
        },
      ),
    ]);

  return {
    data: rows.map(mapFeedback),

    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: Number(total),
      totalPages: Math.ceil(
        Number(total) /
          pagination.limit,
      ),
    },
  };
}

/**
 * Nhân viên lấy chi tiết một phản hồi.
 */
export async function getEmployeePayrollFeedbackDetail({
  feedbackId,
  staffId,
}) {
  const normalizedFeedbackId =
    validatePositiveInteger(
      feedbackId,
      "Mã phản hồi",
    );

  const normalizedStaffId =
    validateStaffId(staffId);

  const feedback =
    await payrollFeedbackRepository.findEmployeeFeedbackById(
      {
        feedbackId:
          normalizedFeedbackId,
        staffId:
          normalizedStaffId,
      },
    );

  if (!feedback) {
    throw new ErrorHandler(
      "Không tìm thấy phản hồi hoặc bạn không có quyền truy cập",
      404,
    );
  }

  return mapFeedback(feedback);
}

/**
 * Nhân viên xóa phản hồi khi HR chưa tiếp nhận.
 */
export async function deleteEmployeePayrollFeedback({
  feedbackId,
  staffId,
}) {
  const normalizedFeedbackId =
    validatePositiveInteger(
      feedbackId,
      "Mã phản hồi",
    );

  const normalizedStaffId =
    validateStaffId(staffId);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const feedback =
      await payrollFeedbackRepository.findEmployeeFeedbackById(
        {
          feedbackId:
            normalizedFeedbackId,
          staffId:
            normalizedStaffId,
        },
        client,
      );

    if (!feedback) {
      throw new ErrorHandler(
        "Không tìm thấy phản hồi",
        404,
      );
    }

    if (feedback.status !== "pending") {
      throw new ErrorHandler(
        "Không thể xóa phản hồi đã được HR tiếp nhận",
        409,
      );
    }

    const deleted =
      await payrollFeedbackRepository.deletePendingFeedback(
        {
          feedbackId:
            normalizedFeedbackId,
          staffId:
            normalizedStaffId,
        },
        client,
      );

    if (!deleted) {
      throw new ErrorHandler(
        "Không thể xóa phản hồi",
        409,
      );
    }

    if (deleted.attachment_stored_name) {
      await unlink(path.join(ATTACHMENT_DIRECTORY, deleted.attachment_stored_name)).catch(() => undefined);
    }

    const remainingOpen = await client.query(
      `SELECT 1 FROM payroll_feedbacks WHERE payslip_id = $1 AND status IN ('pending', 'reviewing', 'accepted', 'adjusted') LIMIT 1;`,
      [deleted.payslip_id],
    );

    if (!remainingOpen.rows[0]) {
      await client.query(
        `
          UPDATE employee_payslips
          SET
            status = CASE WHEN signed_at IS NULL THEN 'published' ELSE 'confirmed' END,
            employee_comment = NULL,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
            AND staff_id = $2
            AND status = 'employee_feedback';
        `,
        [deleted.payslip_id, normalizedStaffId],
      );
    }

    await client.query("COMMIT");

    return mapFeedback(deleted);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * HR lấy danh sách phản hồi.
 */
export async function getAdminPayrollFeedbacks({
  status = null,
  category = null,
  periodId = null,
  staffId = null,
  keyword = null,
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
}) {
  const pagination =
    normalizePagination({
      page,
      limit,
    });

  const normalizedStatus =
    normalizeNullableString(status);

  const normalizedCategory =
    normalizeNullableString(category);

  if (
    normalizedStatus &&
    !FEEDBACK_STATUSES.includes(
      normalizedStatus,
    )
  ) {
    throw new ErrorHandler(
      "Trạng thái phản hồi không hợp lệ",
      400,
    );
  }

  if (
    normalizedCategory &&
    !FEEDBACK_CATEGORIES.includes(
      normalizedCategory,
    )
  ) {
    throw new ErrorHandler(
      "Loại phản hồi không hợp lệ",
      400,
    );
  }

  const normalizedPeriodId =
    periodId === null ||
    periodId === undefined
      ? null
      : validatePositiveInteger(
          periodId,
          "Mã kỳ lương",
        );

  const filters = {
    status: normalizedStatus,
    category: normalizedCategory,
    periodId: normalizedPeriodId,
    staffId:
      normalizeNullableString(staffId),
    keyword:
      normalizeNullableString(keyword),
  };

  const [rows, total] =
    await Promise.all([
      payrollFeedbackRepository.findAdminFeedbacks(
        {
          ...filters,
          limit:
            pagination.limit,
          offset:
            pagination.offset,
        },
      ),

      payrollFeedbackRepository.countAdminFeedbacks(
        filters,
      ),
    ]);

  return {
    data: rows.map(mapFeedback),

    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: Number(total),
      totalPages: Math.ceil(
        Number(total) /
          pagination.limit,
      ),
    },
  };
}

/**
 * HR lấy chi tiết phản hồi.
 */
export async function getAdminPayrollFeedbackDetail(
  feedbackId,
) {
  const normalizedFeedbackId =
    validatePositiveInteger(
      feedbackId,
      "Mã phản hồi",
    );

  const feedback =
    await payrollFeedbackRepository.findFeedbackById(
      normalizedFeedbackId,
    );

  if (!feedback) {
    throw new ErrorHandler(
      "Không tìm thấy phản hồi lương",
      404,
    );
  }

  return mapFeedback(feedback);
}

/**
 * HR nhận xử lý phản hồi.
 */
export async function startPayrollFeedbackReview({
  feedbackId,
  handledBy,
}) {
  const normalizedFeedbackId =
    validatePositiveInteger(
      feedbackId,
      "Mã phản hồi",
    );

  const normalizedHandler =
    validateStaffId(
      handledBy,
      "Người xử lý",
    );

  const current =
    await payrollFeedbackRepository.findFeedbackById(
      normalizedFeedbackId,
    );

  if (!current) {
    throw new ErrorHandler(
      "Không tìm thấy phản hồi",
      404,
    );
  }

  if (current.status === "reviewing") {
    if (
      current.handled_by ===
      normalizedHandler
    ) {
      return mapFeedback(current);
    }

    throw new ErrorHandler(
      "Phản hồi đang được một nhân sự HR khác xử lý",
      409,
    );
  }

  if (current.status !== "pending") {
    throw new ErrorHandler(
      "Phản hồi không còn ở trạng thái chờ xử lý",
      409,
    );
  }

  const updated =
    await payrollFeedbackRepository.startReviewFeedback(
      {
        feedbackId:
          normalizedFeedbackId,
        handledBy:
          normalizedHandler,
      },
    );

  if (!updated) {
    throw new ErrorHandler(
      "Phản hồi vừa được người khác tiếp nhận",
      409,
    );
  }

  return mapFeedback(updated);
}

/**
 * HR xác nhận phản hồi là đúng.
 *
 * Sau bước này frontend chuyển HR sang màn hình
 * điều chỉnh chi tiết các khoản lương.
 */
export async function acceptPayrollFeedback({
  feedbackId,
  handledBy,
  hrReply,
}) {
  const normalizedFeedbackId =
    validatePositiveInteger(
      feedbackId,
      "Mã phản hồi",
    );

  const normalizedHandler =
    validateStaffId(
      handledBy,
      "Người xử lý",
    );

  const normalizedReply =
    String(hrReply || "").trim();

  if (!normalizedReply) {
    throw new ErrorHandler(
      "Vui lòng nhập nội dung trả lời",
      400,
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const feedback =
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
      ![
        "pending",
        "reviewing",
      ].includes(feedback.status)
    ) {
      throw new ErrorHandler(
        "Phản hồi đã được xử lý trước đó",
        409,
      );
    }

    if (
      feedback.status === "reviewing" &&
      feedback.handled_by &&
      feedback.handled_by !==
        normalizedHandler
    ) {
      throw new ErrorHandler(
        "Phản hồi đang được một nhân sự HR khác xử lý",
        409,
      );
    }

    const accepted =
      await payrollFeedbackRepository.acceptFeedback(
        {
          feedbackId:
            normalizedFeedbackId,
          handledBy:
            normalizedHandler,
          hrReply:
            normalizedReply,
        },
        client,
      );

    if (!accepted) {
      throw new ErrorHandler(
        "Không thể xác nhận phản hồi",
        409,
      );
    }

    const notification =
      await createEmployeeNotification(
        {
          staffId:
            accepted.staff_id,
          title:
            "HR đã xác nhận phản hồi phiếu lương",
          description:
            `${normalizedReply} HR sẽ thực hiện điều chỉnh và gửi lại phiếu lương sau khi hoàn tất.`,
          payslipId:
            accepted.payslip_id,
          feedbackId:
            accepted.id,
          createdBy:
            normalizedHandler,
          tone: "orange",
          isUrgent: false,
        },
        client,
      );

    await client.query("COMMIT");

    return {
      feedback:
        mapFeedback(accepted),

      nextAction: {
        type:
          "adjust_payslip",
        payslipId: Number(
          accepted.payslip_id,
        ),
        feedbackId: Number(
          accepted.id,
        ),
      },

      notificationId:
        Number(notification.id),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * HR từ chối phản hồi.
 *
 * Phiếu lương được trả về published vì số liệu
 * hiện tại được xác định là đúng.
 */
export async function rejectPayrollFeedback({
  feedbackId,
  handledBy,
  hrReply,
}) {
  const normalizedFeedbackId =
    validatePositiveInteger(
      feedbackId,
      "Mã phản hồi",
    );

  const normalizedHandler =
    validateStaffId(
      handledBy,
      "Người xử lý",
    );

  const normalizedReply =
    String(hrReply || "").trim();

  if (!normalizedReply) {
    throw new ErrorHandler(
      "Phải nhập lý do từ chối phản hồi",
      400,
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const feedback =
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
      ![
        "pending",
        "reviewing",
      ].includes(feedback.status)
    ) {
      throw new ErrorHandler(
        "Phản hồi đã được xử lý trước đó",
        409,
      );
    }

    if (
      feedback.status === "reviewing" &&
      feedback.handled_by &&
      feedback.handled_by !==
        normalizedHandler
    ) {
      throw new ErrorHandler(
        "Phản hồi đang được một nhân sự HR khác xử lý",
        409,
      );
    }

    const rejected =
      await payrollFeedbackRepository.rejectFeedback(
        {
          feedbackId:
            normalizedFeedbackId,
          handledBy:
            normalizedHandler,
          hrReply:
            normalizedReply,
        },
        client,
      );

    if (!rejected) {
      throw new ErrorHandler(
        "Không thể từ chối phản hồi",
        409,
      );
    }

    const remainingOpen = await client.query(
      `SELECT 1 FROM payroll_feedbacks WHERE payslip_id = $1 AND id <> $2 AND status IN ('pending', 'reviewing', 'accepted', 'adjusted') LIMIT 1;`,
      [rejected.payslip_id, rejected.id],
    );
    if (!remainingOpen.rows[0]) {
      await client.query(
        `
          UPDATE employee_payslips
          SET
            status = CASE WHEN signed_at IS NULL THEN 'published' ELSE 'confirmed' END,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
            AND status = 'employee_feedback';
        `,
        [rejected.payslip_id],
      );
    }

    const notification =
      await createEmployeeNotification(
        {
          staffId:
            rejected.staff_id,
          title:
            "HR đã trả lời phản hồi phiếu lương",
          description:
            normalizedReply,
          payslipId:
            rejected.payslip_id,
          feedbackId:
            rejected.id,
          createdBy:
            normalizedHandler,
          tone: "red",
          isUrgent: false,
        },
        client,
      );

    await client.query("COMMIT");

    return {
      feedback:
        mapFeedback(rejected),
      notificationId:
        Number(notification.id),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Đánh dấu phản hồi đã điều chỉnh.
 *
 * Hàm này được payrollAdjustment.service.js gọi trong
 * cùng transaction sau khi:
 * - Tạo version cũ.
 * - Lưu khoản điều chỉnh.
 * - Cập nhật payslip_details.
 * - Tăng current_version.
 */
export async function markPayrollFeedbackAdjusted(
  {
    feedbackId,
    handledBy,
    hrReply = null,
  },
  client = pool,
) {
  const normalizedFeedbackId =
    validatePositiveInteger(
      feedbackId,
      "Mã phản hồi",
    );

  const normalizedHandler =
    validateStaffId(
      handledBy,
      "Người điều chỉnh",
    );

  const updated =
    await payrollFeedbackRepository.markFeedbackAdjusted(
      {
        feedbackId:
          normalizedFeedbackId,
        handledBy:
          normalizedHandler,
        hrReply:
          normalizeNullableString(
            hrReply,
          ),
      },
      client,
    );

  if (!updated) {
    throw new ErrorHandler(
      "Phản hồi chưa được chấp nhận hoặc đã được điều chỉnh",
      409,
    );
  }

  return mapFeedback(updated);
}

/**
 * Hoàn tất phản hồi.
 *
 * Chỉ hoàn tất khi:
 * - Phản hồi đã adjusted.
 * - Phiếu lương đã được phát hành lại.
 */
export async function resolvePayrollFeedback({
  feedbackId,
  handledBy,
  hrReply = null,
}) {
  const normalizedFeedbackId =
    validatePositiveInteger(
      feedbackId,
      "Mã phản hồi",
    );

  const normalizedHandler =
    validateStaffId(
      handledBy,
      "Người xử lý",
    );

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const feedback =
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

    if (feedback.status !== "adjusted") {
      throw new ErrorHandler(
        "Phản hồi chưa hoàn tất bước điều chỉnh lương",
        409,
      );
    }

    if (
      feedback.payslip_status !==
      "published"
    ) {
      throw new ErrorHandler(
        "Phiếu lương điều chỉnh chưa được phát hành lại",
        409,
      );
    }

    const resolved =
      await payrollFeedbackRepository.resolveFeedback(
        {
          feedbackId:
            normalizedFeedbackId,
          handledBy:
            normalizedHandler,
          hrReply:
            normalizeNullableString(
              hrReply,
            ),
        },
        client,
      );

    if (!resolved) {
      throw new ErrorHandler(
        "Không thể hoàn tất phản hồi",
        409,
      );
    }

    const notification =
      await createEmployeeNotification(
        {
          staffId:
            resolved.staff_id,
          title:
            "Phản hồi lương đã được xử lý",
          description:
            normalizeNullableString(
              hrReply,
            ) ||
            "Phiếu lương đã được điều chỉnh và phát hành lại. Bạn có thể mở lịch sử phiên bản để đối chiếu dữ liệu cũ và mới.",
          payslipId:
            resolved.payslip_id,
          feedbackId:
            resolved.id,
          createdBy:
            normalizedHandler,
          tone: "green",
          isUrgent: true,
        },
        client,
      );

    await client.query("COMMIT");

    return {
      feedback:
        mapFeedback(resolved),

      comparisonUrl:
        `/payroll/${resolved.payslip_id}/comparison`,

      notificationId:
        Number(notification.id),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Thống kê phản hồi cho dashboard HR.
 */
export async function getPayrollFeedbackStatistics({
  periodId = null,
} = {}) {
  const normalizedPeriodId =
    periodId === null ||
    periodId === undefined
      ? null
      : validatePositiveInteger(
          periodId,
          "Mã kỳ lương",
        );

  const row =
    await payrollFeedbackRepository.getFeedbackStatistics(
      {
        periodId:
          normalizedPeriodId,
      },
    );

  return {
    total: Number(row.total),
    pending: Number(row.pending),
    reviewing:
      Number(row.reviewing),
    accepted:
      Number(row.accepted),
    rejected:
      Number(row.rejected),
    adjusted:
      Number(row.adjusted),
    resolved:
      Number(row.resolved),

    waitingForHr:
      Number(row.pending) +
      Number(row.reviewing),

    waitingForAdjustment:
      Number(row.accepted),

    waitingForRepublish:
      Number(row.adjusted),
    slaDueSoon: Number(row.sla_due_soon),
    slaOverdue: Number(row.sla_overdue),
  };
}
