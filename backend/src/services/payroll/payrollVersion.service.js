import pool from "../../config/db.js";

import { ErrorHandler } from "../../middleware/errorMiddleware.js";

import * as payrollVersionRepository from "../../repositories/payroll/payrollVersion.repository.js";

import {
  compareSnapshotItems,
  compareSnapshotSummary,
} from "./payrollVersionComparison.service.js";

function validatePositiveInteger(
  value,
  fieldName,
) {
  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new ErrorHandler(
      `${fieldName} không hợp lệ`,
      400,
    );
  }
}

function validateOptionalStaffId(
  staffId,
  fieldName,
) {
  if (
    staffId !== null &&
    staffId !== undefined &&
    (
      typeof staffId !== "string" ||
      !staffId.trim() ||
      staffId.trim().length > 30
    )
  ) {
    throw new ErrorHandler(
      `${fieldName} không hợp lệ`,
      400,
    );
  }
}

function normalizeOptionalText(
  value,
  fieldName,
  maxLength,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (typeof value !== "string") {
    throw new ErrorHandler(
      `${fieldName} không hợp lệ`,
      400,
    );
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  if (
    maxLength &&
    normalizedValue.length > maxLength
  ) {
    throw new ErrorHandler(
      `${fieldName} không được vượt quá ${maxLength} ký tự`,
      400,
    );
  }

  return normalizedValue;
}

function validateSnapshot(snapshot) {
  if (
    !snapshot ||
    typeof snapshot !== "object" ||
    Array.isArray(snapshot)
  ) {
    throw new ErrorHandler(
      "Snapshot phiếu lương phải là một object",
      400,
    );
  }
}

function mapVersionSummary(row) {
  return {
    id: Number(row.id),
    payslipId: Number(row.payslip_id),
    versionNumber: Number(
      row.version_number,
    ),
    changeReason: row.change_reason,
    feedbackId:
      row.feedback_id === null ||
      row.feedback_id === undefined
        ? null
        : Number(row.feedback_id),
    createdBy: row.created_by,
    createdByName:
      row.created_by_name ?? null,
    createdAt: row.created_at,
    publishedAt: row.published_at,

    publishStatus:
      row.publish_status ??
      (
        row.published_at
          ? "published"
          : "draft"
      ),
  };
}
function mapVersionDetail(row) {
  return {
    ...mapVersionSummary(row),
    snapshot: row.snapshot,
  };
}

/**
 * Lấy toàn bộ lịch sử phiên bản dành cho HR/Admin.
 *
 * Bao gồm cả phiên bản chưa phát hành.
 */
export async function getPayslipVersionsForAdmin(
  payslipId,
) {
  validatePositiveInteger(
    payslipId,
    "Mã phiếu lương",
  );

  const versions =
    await payrollVersionRepository.findAllVersions(
      {
        payslipId,
      },
    );

  return versions.map(mapVersionSummary);
}

/**
 * Lấy lịch sử phiên bản đã phát hành cho nhân viên.
 */
export async function getPublishedPayslipVersions(
  payslipId,
) {
  validatePositiveInteger(
    payslipId,
    "Mã phiếu lương",
  );

  const versions =
    await payrollVersionRepository.findPublishedVersions(
      {
        payslipId,
      },
    );

  return versions.map(mapVersionSummary);
}

/**
 * Lấy chi tiết một phiên bản dành cho HR/Admin.
 */
export async function getPayslipVersionForAdmin({
  payslipId,
  versionNumber,
}) {
  validatePositiveInteger(
    payslipId,
    "Mã phiếu lương",
  );

  validatePositiveInteger(
    versionNumber,
    "Số phiên bản",
  );

  const version =
    await payrollVersionRepository.findVersion(
      {
        payslipId,
        versionNumber,
      },
    );

  if (!version) {
    throw new ErrorHandler(
      `Không tìm thấy phiên bản ${versionNumber}`,
      404,
    );
  }

  return mapVersionDetail(version);
}

/**
 * Lấy một phiên bản đã phát hành dành cho nhân viên.
 */
export async function getPublishedPayslipVersion({
  payslipId,
  versionNumber,
}) {
  validatePositiveInteger(
    payslipId,
    "Mã phiếu lương",
  );

  validatePositiveInteger(
    versionNumber,
    "Số phiên bản",
  );

  const version =
    await payrollVersionRepository.findPublishedVersion(
      {
        payslipId,
        versionNumber,
      },
    );

  if (!version) {
    throw new ErrorHandler(
      "Không tìm thấy phiên bản hoặc phiên bản chưa được phát hành",
      404,
    );
  }

  return mapVersionDetail(version);
}

/**
 * Lấy phiên bản mới nhất.
 */
export async function getLatestPayslipVersion(
  payslipId,
) {
  validatePositiveInteger(
    payslipId,
    "Mã phiếu lương",
  );

  const version =
    await payrollVersionRepository.findLatestVersion(
      payslipId,
    );

  return version
    ? mapVersionDetail(version)
    : null;
}

/**
 * Tạo phiên bản từ snapshot đã được chuẩn bị sẵn.
 *
 * Dùng trong trường hợp:
 * - Import Excel đã tạo cấu trúc snapshot.
 * - Khôi phục dữ liệu từ hệ thống khác.
 * - Service điều chỉnh đã tự xây dựng dữ liệu.
 */
export async function createVersionFromSnapshot({
  payslipId,
  versionNumber,
  snapshot,
  changeReason = null,
  feedbackId = null,
  createdBy = null,
  publishImmediately = false,
}) {
  validatePositiveInteger(
    payslipId,
    "Mã phiếu lương",
  );

  validatePositiveInteger(
    versionNumber,
    "Số phiên bản",
  );

  if (
    feedbackId !== null &&
    feedbackId !== undefined
  ) {
    validatePositiveInteger(
      feedbackId,
      "Mã phản hồi",
    );
  }

  validateOptionalStaffId(
    createdBy,
    "Người tạo phiên bản",
  );

  validateSnapshot(snapshot);

  const normalizedReason =
    normalizeOptionalText(
      changeReason,
      "Lý do thay đổi",
      2000,
    );

  const exists =
    await payrollVersionRepository.versionExists(
      {
        payslipId,
        versionNumber,
      },
    );

  if (exists) {
    throw new ErrorHandler(
      `Phiên bản ${versionNumber} đã tồn tại`,
      409,
    );
  }

  try {
    const created =
      await payrollVersionRepository.createVersion(
        {
          payslipId,
          versionNumber,
          snapshot,
          changeReason:
            normalizedReason,
          feedbackId,
          createdBy:
            createdBy?.trim() ?? null,

          publishedAt:
            publishImmediately
              ? new Date()
              : null,
        },
      );

    return mapVersionDetail(created);
  } catch (error) {
    if (error.code === "23505") {
      throw new ErrorHandler(
        `Phiên bản ${versionNumber} đã tồn tại`,
        409,
      );
    }

    if (error.code === "23503") {
      throw new ErrorHandler(
        "Phiếu lương, phản hồi hoặc người tạo không tồn tại",
        400,
      );
    }

    if (error.code === "23514") {
      throw new ErrorHandler(
        "Dữ liệu snapshot phiên bản không hợp lệ",
        400,
      );
    }

    throw error;
  }
}

/**
 * Chụp trạng thái hiện tại của phiếu lương.
 *
 * Hàm này đọc trực tiếp:
 * - employee_payslips
 * - payroll_periods
 * - employees
 * - payslip_details
 * - salary_master_items
 *
 * rồi lưu toàn bộ vào payslip_versions.snapshot.
 */
export async function captureCurrentPayslipVersion({
  payslipId,
  versionNumber,
  changeReason = null,
  feedbackId = null,
  createdBy = null,
  publishImmediately = false,
}) {
  validatePositiveInteger(
    payslipId,
    "Mã phiếu lương",
  );

  validatePositiveInteger(
    versionNumber,
    "Số phiên bản",
  );

  if (
    feedbackId !== null &&
    feedbackId !== undefined
  ) {
    validatePositiveInteger(
      feedbackId,
      "Mã phản hồi",
    );
  }

  validateOptionalStaffId(
    createdBy,
    "Người tạo phiên bản",
  );

  const normalizedReason =
    normalizeOptionalText(
      changeReason,
      "Lý do thay đổi",
      2000,
    );

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const exists =
      await payrollVersionRepository.versionExists(
        {
          payslipId,
          versionNumber,
        },
        client,
      );

    if (exists) {
      throw new ErrorHandler(
        `Phiên bản ${versionNumber} đã tồn tại`,
        409,
      );
    }

    const created =
      await payrollVersionRepository.createSnapshotFromCurrentPayslip(
        {
          payslipId,
          versionNumber,
          changeReason:
            normalizedReason,
          feedbackId,
          createdBy:
            createdBy?.trim() ?? null,

          publishedAt:
            publishImmediately
              ? new Date()
              : null,
        },
        client,
      );

    if (!created) {
      throw new ErrorHandler(
        "Không tìm thấy phiếu lương để tạo phiên bản",
        404,
      );
    }

    await client.query("COMMIT");

    return mapVersionDetail(created);
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      throw new ErrorHandler(
        `Phiên bản ${versionNumber} đã tồn tại`,
        409,
      );
    }

    if (error.code === "23503") {
      throw new ErrorHandler(
        "Phiếu lương, phản hồi hoặc người tạo không tồn tại",
        400,
      );
    }

    throw error;
  } finally {
    client.release();
  }
}

/**
 * Tự xác định số phiên bản tiếp theo rồi tạo snapshot.
 *
 * Ví dụ:
 * - Chưa có phiên bản → tạo V1.
 * - Mới nhất là V1 → tạo V2.
 * - Mới nhất là V2 → tạo V3.
 */
export async function captureNextPayslipVersion({
  payslipId,
  changeReason = null,
  feedbackId = null,
  createdBy = null,
  publishImmediately = false,
}) {
  validatePositiveInteger(
    payslipId,
    "Mã phiếu lương",
  );

  if (
    feedbackId !== null &&
    feedbackId !== undefined
  ) {
    validatePositiveInteger(
      feedbackId,
      "Mã phản hồi",
    );
  }

  validateOptionalStaffId(
    createdBy,
    "Người tạo phiên bản",
  );

  const normalizedReason =
    normalizeOptionalText(
      changeReason,
      "Lý do thay đổi",
      2000,
    );

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /*
     * Transaction advisory lock ngăn hai request đồng thời
     * cùng tính ra một versionNumber.
     *
     * Khóa chỉ tồn tại trong transaction hiện tại.
     */
    await client.query(
      `
      SELECT PG_ADVISORY_XACT_LOCK($1::INT);
      `,
      [payslipId],
    );

    const latestVersion =
      await payrollVersionRepository.findLatestVersion(
        payslipId,
        client,
      );

    const nextVersionNumber =
      latestVersion
        ? Number(
            latestVersion.version_number,
          ) + 1
        : 1;

    const created =
      await payrollVersionRepository.createSnapshotFromCurrentPayslip(
        {
          payslipId,
          versionNumber:
            nextVersionNumber,
          changeReason:
            normalizedReason,
          feedbackId,
          createdBy:
            createdBy?.trim() ?? null,

          publishedAt:
            publishImmediately
              ? new Date()
              : null,
        },
        client,
      );

    if (!created) {
      throw new ErrorHandler(
        "Không tìm thấy phiếu lương để tạo phiên bản",
        404,
      );
    }

    await client.query("COMMIT");

    return mapVersionDetail(created);
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      throw new ErrorHandler(
        "Xung đột số phiên bản, vui lòng thử lại",
        409,
      );
    }

    if (error.code === "23503") {
      throw new ErrorHandler(
        "Phiếu lương, phản hồi hoặc người tạo không tồn tại",
        400,
      );
    }

    throw error;
  } finally {
    client.release();
  }
}

/**
 * Phát hành một phiên bản.
 *
 * Nếu đã phát hành, repository giữ nguyên published_at
 * và trả lại dữ liệu hiện tại.
 */
export async function publishPayslipVersion({
  payslipId,
  versionNumber,
}) {
  validatePositiveInteger(
    payslipId,
    "Mã phiếu lương",
  );

  validatePositiveInteger(
    versionNumber,
    "Số phiên bản",
  );

  const existingVersion =
    await payrollVersionRepository.findVersion(
      {
        payslipId,
        versionNumber,
      },
    );

  if (!existingVersion) {
    throw new ErrorHandler(
      `Không tìm thấy phiên bản ${versionNumber}`,
      404,
    );
  }

  const published =
    await payrollVersionRepository.markVersionPublished(
      {
        payslipId,
        versionNumber,
      },
    );

  if (!published) {
    throw new ErrorHandler(
      "Không thể phát hành phiên bản phiếu lương",
      409,
    );
  }

  return mapVersionSummary(published);
}

/**
 * HR/Admin đối chiếu hai phiên bản bất kỳ
 * của cùng một phiếu lương.
 *
 * Admin có thể xem cả version draft
 * và version đã phát hành.
 */
export async function comparePayslipVersionsForAdmin({
  payslipId,
  fromVersion,
  toVersion,
}) {
  validatePositiveInteger(
    payslipId,
    "Mã phiếu lương",
  );

  validatePositiveInteger(
    fromVersion,
    "Phiên bản cũ",
  );

  validatePositiveInteger(
    toVersion,
    "Phiên bản mới",
  );

  if (fromVersion === toVersion) {
    throw new ErrorHandler(
      "Hai phiên bản đối chiếu phải khác nhau",
      400,
    );
  }

  if (fromVersion > toVersion) {
    throw new ErrorHandler(
      "Phiên bản cũ phải nhỏ hơn phiên bản mới",
      400,
    );
  }

  const [fromRecord, toRecord] =
    await Promise.all([
      payrollVersionRepository.findVersion({
        payslipId,
        versionNumber: fromVersion,
      }),

      payrollVersionRepository.findVersion({
        payslipId,
        versionNumber: toVersion,
      }),
    ]);

  if (!fromRecord) {
    throw new ErrorHandler(
      `Không tìm thấy phiên bản ${fromVersion}`,
      404,
    );
  }

  if (!toRecord) {
    throw new ErrorHandler(
      `Không tìm thấy phiên bản ${toVersion}`,
      404,
    );
  }

  const itemChanges =
    compareSnapshotItems(
      fromRecord.snapshot,
      toRecord.snapshot,
    );

  const periodCode =
    toRecord.snapshot?.periodCode ??
    toRecord.snapshot?.period?.code ??
    fromRecord.snapshot?.periodCode ??
    fromRecord.snapshot?.period?.code ??
    null;

  return {
    payslipId,
    periodCode,

    fromVersion: {
      versionNumber: Number(
        fromRecord.version_number,
      ),

      createdAt:
        fromRecord.created_at,

      publishedAt:
        fromRecord.published_at,

      publishStatus:
        fromRecord.published_at
          ? "published"
          : "draft",

      changeReason:
        fromRecord.change_reason,
    },

    toVersion: {
      versionNumber: Number(
        toRecord.version_number,
      ),

      createdAt:
        toRecord.created_at,

      publishedAt:
        toRecord.published_at,

      publishStatus:
        toRecord.published_at
          ? "published"
          : "draft",

      changeReason:
        toRecord.change_reason,
    },

    summaryChanges:
      compareSnapshotSummary(
        fromRecord.snapshot,
        toRecord.snapshot,
      ),

    itemChanges,

    increasedItems:
      itemChanges.filter(
        (item) =>
          item.difference > 0,
      ),

    decreasedItems:
      itemChanges.filter(
        (item) =>
          item.difference < 0,
      ),

    unchangedItems:
      itemChanges.filter(
        (item) =>
          item.difference === 0,
      ),
  };
}
