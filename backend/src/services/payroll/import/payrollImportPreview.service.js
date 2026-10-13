import pool from "../../../config/db.js";

import { ErrorHandler } from
  "../../../middleware/errorMiddleware.js";

import * as payrollImportRepository from
  "../../../repositories/payroll/payrollImport.repository.js";

import {
  mapPayrollImport,
  mapPayrollImportErrors,
  mapPayrollImportErrorSummaries,
  mapPayrollImportPreview,
} from "./payrollImport.mapper.js";

/**
 * Kiểm tra một giá trị có phải số nguyên dương.
 */
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

/**
 * Chuẩn hóa tham số phân trang.
 */
function normalizePagination({
  page = 1,
  limit = 50,
} = {}) {
  const normalizedPage =
    Number(page);

  const normalizedLimit =
    Number(limit);

  validatePositiveInteger(
    normalizedPage,
    "Trang",
  );

  validatePositiveInteger(
    normalizedLimit,
    "Số bản ghi",
  );

  if (normalizedLimit > 200) {
    throw new ErrorHandler(
      "Số bản ghi mỗi trang không được vượt quá 200",
      400,
    );
  }

  return {
    page: normalizedPage,
    limit: normalizedLimit,
  };
}

/**
 * Kiểm tra và chuẩn hóa mã lần import.
 */
function normalizeImportId(importId) {
  const normalizedImportId =
    Number(importId);

  validatePositiveInteger(
    normalizedImportId,
    "Mã lần import",
  );

  return normalizedImportId;
}

/**
 * Kiểm tra lần import có tồn tại.
 */
export async function getPayrollImportOrFail(
  importId,
  client = pool,
) {
  const normalizedImportId =
    normalizeImportId(importId);

  const payrollImport =
    await payrollImportRepository.findById(
      normalizedImportId,
      client,
    );

  if (!payrollImport) {
    throw new ErrorHandler(
      "Không tìm thấy lần import",
      404,
    );
  }

  return payrollImport;
}

/**
 * Lấy bản xem trước của một lần import Excel.
 *
 * Dùng cho API:
 * GET /api/payroll/imports/:importId/preview
 *
 * Kết quả gồm:
 * - Thông tin file import.
 * - Thông tin kỳ lương.
 * - Danh sách dòng Excel đã chuẩn hóa.
 * - Danh sách lỗi.
 * - Thống kê lỗi.
 * - Phân trang.
 */
export async function getPayrollImportPreview({
  importId,
  page = 1,
  limit = 50,
  isValid = null,
  client = pool,
}) {
  const normalizedImportId =
    normalizeImportId(importId);

  const pagination =
    normalizePagination({
      page,
      limit,
    });

  if (
    isValid !== null &&
    typeof isValid !== "boolean"
  ) {
    throw new ErrorHandler(
      "Trạng thái hợp lệ của dòng import không hợp lệ",
      400,
    );
  }

  const payrollImport =
    await getPayrollImportOrFail(
      normalizedImportId,
      client,
    );

  /*
   * Không dùng Promise.all với cùng một PostgreSQL client
   * để bảo đảm các truy vấn tuần tự và dễ kiểm soát.
   */
  const rows =
    await payrollImportRepository
      .findImportRows(
        {
          importId:
            normalizedImportId,

          isValid,

          page:
            pagination.page,

          limit:
            pagination.limit,
        },
        client,
      );

  const totalRows =
    await payrollImportRepository
      .countImportRows(
        {
          importId:
            normalizedImportId,

          isValid,
        },
        client,
      );

  const errors =
    await payrollImportRepository
      .findImportErrors(
        {
          importId:
            normalizedImportId,

          page:
            pagination.page,

          limit:
            pagination.limit,
        },
        client,
      );

  const totalErrors =
    await payrollImportRepository
      .countImportErrors(
        normalizedImportId,
        client,
      );

  const errorSummary =
    await payrollImportRepository
      .summarizeImportErrors(
        normalizedImportId,
        client,
      );

  return mapPayrollImportPreview({
    payrollImport,
    rows,
    errors,
    errorSummary,

    page:
      pagination.page,

    limit:
      pagination.limit,

    totalRows,
    totalErrors,
  });
}

/**
 * Lấy riêng các dòng hợp lệ.
 *
 * Dùng trước khi commit dữ liệu vào phiếu lương.
 */
export async function getValidImportRows({
  importId,
  page = 1,
  limit = 200,
  client = pool,
}) {
  return getPayrollImportPreview({
    importId,
    page,
    limit,
    isValid: true,
    client,
  });
}

/**
 * Lấy riêng các dòng không hợp lệ.
 *
 * Dùng cho màn hình HR kiểm tra lỗi Excel.
 */
export async function getInvalidImportRows({
  importId,
  page = 1,
  limit = 50,
  client = pool,
}) {
  return getPayrollImportPreview({
    importId,
    page,
    limit,
    isValid: false,
    client,
  });
}

/**
 * Lấy tổng quan nhanh của một lần import.
 *
 * Không trả toàn bộ dòng staging.
 */
export async function getPayrollImportSummary({
  importId,
  client = pool,
}) {
  const normalizedImportId =
    normalizeImportId(importId);

  const payrollImport =
    await getPayrollImportOrFail(
      normalizedImportId,
      client,
    );

  const totalRows =
    await payrollImportRepository
      .countImportRows(
        {
          importId:
            normalizedImportId,

          isValid: null,
        },
        client,
      );

  const validRows =
    await payrollImportRepository
      .countImportRows(
        {
          importId:
            normalizedImportId,

          isValid: true,
        },
        client,
      );

  const invalidRows =
    await payrollImportRepository
      .countImportRows(
        {
          importId:
            normalizedImportId,

          isValid: false,
        },
        client,
      );

  const totalErrors =
    await payrollImportRepository
      .countImportErrors(
        normalizedImportId,
        client,
      );

  const errorSummary =
    await payrollImportRepository
      .summarizeImportErrors(
        normalizedImportId,
        client,
      );

  const preview =
    mapPayrollImportPreview({
      payrollImport,
      rows: [],
      errors: [],
      errorSummary,
      page: 1,
      limit: 1,
      totalRows,
      totalErrors,
    });

  return {
    import: preview.import,

    counts: {
      total: Number(totalRows ?? 0),
      valid: Number(validRows ?? 0),
      invalid:
        Number(invalidRows ?? 0),
      errors:
        Number(totalErrors ?? 0),
    },

    errorSummary:
      preview.errorSummary,
  };
}

/**
 * GET /api/payroll/imports
 */
export async function getPayrollImports({
  payrollPeriodId = null,
  status = null,
  uploadedBy = null,
  fileType = null,
  page = 1,
  limit = 20,
  client = pool,
} = {}) {
  const pagination =
    normalizePagination({
      page,
      limit,
    });

  const normalizedPayrollPeriodId =
    payrollPeriodId === null ||
    payrollPeriodId === undefined
      ? null
      : Number(payrollPeriodId);

  if (normalizedPayrollPeriodId !== null) {
    validatePositiveInteger(
      normalizedPayrollPeriodId,
      "Mã kỳ lương",
    );
  }

  const normalizedUploadedBy =
    typeof uploadedBy === "string"
      ? uploadedBy.trim() || null
      : null;

  const offset =
    (pagination.page - 1) *
    pagination.limit;

  const rows =
    await payrollImportRepository
      .findPayrollImports(
        {
          payrollPeriodId:
            normalizedPayrollPeriodId,

          status:
            status ?? null,

          uploadedBy:
            normalizedUploadedBy,

          fileType:
            fileType ?? null,

          limit:
            pagination.limit,

          offset,
        },
        client,
      );

  const total =
    await payrollImportRepository
      .countPayrollImports(
        {
          payrollPeriodId:
            normalizedPayrollPeriodId,

          status:
            status ?? null,

          uploadedBy:
            normalizedUploadedBy,

          fileType:
            fileType ?? null,
        },
        client,
      );

  const normalizedTotal =
    Number(total ?? 0);

  return {
    items:
      rows.map(
        (row) =>
          mapPayrollImport(row),
      ),

    pagination: {
      page:
        pagination.page,

      limit:
        pagination.limit,

      total:
        normalizedTotal,

      totalPages:
        normalizedTotal === 0
          ? 0
          : Math.ceil(
              normalizedTotal /
                pagination.limit,
            ),
    },
  };
}

/**
 * GET /api/payroll/imports/:importId
 */
export async function getPayrollImportDetail({
  importId,
  client = pool,
}) {
  const payrollImport =
    await getPayrollImportOrFail(
      importId,
      client,
    );

  return mapPayrollImport(
    payrollImport,
  );
}

/**
 * GET /api/payroll/imports/:importId/errors
 */
export async function getPayrollImportErrors({
  importId,
  page = 1,
  limit = 50,
  client = pool,
}) {
  const normalizedImportId =
    normalizeImportId(importId);

  const pagination =
    normalizePagination({
      page,
      limit,
    });

  const payrollImport =
    await getPayrollImportOrFail(
      normalizedImportId,
      client,
    );

  const errors =
    await payrollImportRepository
      .findImportErrors(
        {
          importId:
            normalizedImportId,

          page:
            pagination.page,

          limit:
            pagination.limit,
        },
        client,
      );

  const total =
    await payrollImportRepository
      .countImportErrors(
        normalizedImportId,
        client,
      );

  const summary =
    await payrollImportRepository
      .summarizeImportErrors(
        normalizedImportId,
        client,
      );

  const normalizedTotal =
    Number(total ?? 0);

  return {
    import:
      mapPayrollImport(
        payrollImport,
      ),

    errors:
      mapPayrollImportErrors(
        errors,
      ),

    summary:
      mapPayrollImportErrorSummaries(
        summary,
      ),

    pagination: {
      page:
        pagination.page,

      limit:
        pagination.limit,

      total:
        normalizedTotal,

      totalPages:
        normalizedTotal === 0
          ? 0
          : Math.ceil(
              normalizedTotal /
                pagination.limit,
            ),
    },
  };
}

export default {
  getPayrollImportOrFail,

  getPayrollImports,
  getPayrollImportDetail,
  getPayrollImportErrors,

  getPayrollImportPreview,
  getValidImportRows,
  getInvalidImportRows,
  getPayrollImportSummary,
};