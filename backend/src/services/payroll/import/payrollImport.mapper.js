/**
 * Chuyển giá trị thành Number.
 *
 * Nếu giá trị null hoặc undefined thì trả về null,
 * tránh trường hợp Number(null) thành 0.
 */
function toNullableNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

/**
 * Chuyển giá trị thành Number.
 *
 * Dùng cho các trường thống kê:
 * - totalRows
 * - validRows
 * - invalidRows
 * - errorCount
 */
function toNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

/**
 * Chuyển giá trị về boolean.
 *
 * PostgreSQL thường trả boolean thật, nhưng hàm này
 * cũng hỗ trợ 1, 0, "true" và "false".
 */
function toBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === 1 || value === "1") {
    return true;
  }

  if (value === 0 || value === "0") {
    return false;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return Boolean(value);
}

/**
 * Mapping thông tin một lần import lương.
 *
 * Input là row trả về từ PostgreSQL.
 */
export function mapPayrollImport(row) {
  if (!row) {
    return null;
  }

  return {
    id: toNullableNumber(row.id),

    period: {
      id: toNullableNumber(
        row.payroll_period_id,
      ),

      code:
        row.period_code ?? null,

      name:
        row.period_name ?? null,

      status:
        row.period_status ?? null,
    },

    file: {
      name:
        row.file_name ?? null,

      type:
        row.file_type ?? null,

      mimeType:
        row.mime_type ?? null,

      storageKey:
        row.storage_key ?? null,

      checksum:
        row.file_checksum ?? null,
    },

    counts: {
      total: toNumber(
        row.total_rows,
      ),

      valid: toNumber(
        row.valid_rows,
      ),

      invalid: toNumber(
        row.invalid_rows,
      ),

      errors: toNumber(
        row.error_count,
      ),
    },

    status:
      row.status ?? null,

    uploadedBy: {
      staffId:
        row.uploaded_by ?? null,

      fullName:
        row.uploaded_by_name ?? null,
    },

    committedBy: {
      staffId:
        row.committed_by ?? null,

      fullName:
        row.committed_by_name ?? null,
    },

    committedAt:
      row.committed_at ?? null,

    createdAt:
      row.created_at ?? null,

    updatedAt:
      row.updated_at ?? null,
  };
}

/**
 * Alias giữ tương thích với service cũ.
 *
 * Service cũ đang gọi:
 * mapImport(payrollImport)
 */
export const mapImport =
  mapPayrollImport;

/**
 * Mapping một dòng dữ liệu staging.
 *
 * Bảng tương ứng:
 * payroll_import_rows
 */
export function mapPayrollImportRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: toNullableNumber(row.id),

    payrollImportId:
      toNullableNumber(
        row.payroll_import_id,
      ),

    rowNumber:
      toNumber(row.row_number),

    staffId:
      row.staff_id ?? null,

    periodCode:
      row.period_code ?? null,

    data:
      row.normalized_data ?? null,

    isValid:
      toBoolean(row.is_valid),

    createdAt:
      row.created_at ?? null,

    updatedAt:
      row.updated_at ?? null,
  };
}

/**
 * Mapping danh sách dòng staging.
 */
export function mapPayrollImportRows(
  rows = [],
) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map(mapPayrollImportRow)
    .filter(Boolean);
}

/**
 * Mapping một lỗi import.
 *
 * Bảng tương ứng:
 * payroll_import_errors
 */
export function mapPayrollImportError(
  row,
) {
  if (!row) {
    return null;
  }

  return {
    id: toNullableNumber(row.id),

    payrollImportId:
      toNullableNumber(
        row.payroll_import_id,
      ),

    rowNumber:
      toNullableNumber(
        row.row_number,
      ),

    staffId:
      row.staff_id ?? null,

    columnName:
      row.column_name ?? null,

    code:
      row.error_code ?? null,

    message:
      row.error_message ?? null,

    rowData:
      row.row_data ?? null,

    createdAt:
      row.created_at ?? null,
  };
}

/**
 * Mapping danh sách lỗi import.
 */
export function mapPayrollImportErrors(
  rows = [],
) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map(mapPayrollImportError)
    .filter(Boolean);
}

/**
 * Mapping một dòng thống kê lỗi.
 *
 * Repository trả về:
 * {
 *   error_code,
 *   column_name,
 *   total
 * }
 */
export function mapPayrollImportErrorSummary(
  row,
) {
  if (!row) {
    return null;
  }

  return {
    code:
      row.error_code ?? null,

    columnName:
      row.column_name ?? null,

    total:
      toNumber(row.total),
  };
}

/**
 * Mapping toàn bộ thống kê lỗi.
 */
export function mapPayrollImportErrorSummaries(
  rows = [],
) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map(
      mapPayrollImportErrorSummary,
    )
    .filter(Boolean);
}

/**
 * Mapping pagination của màn hình preview.
 */
export function mapPayrollImportPagination({
  page = 1,
  limit = 50,
  totalRows = 0,
  totalErrors = 0,
} = {}) {
  const normalizedPage =
    Math.max(1, toNumber(page, 1));

  const normalizedLimit =
    Math.max(1, toNumber(limit, 50));

  const normalizedTotalRows =
    Math.max(
      0,
      toNumber(totalRows),
    );

  const normalizedTotalErrors =
    Math.max(
      0,
      toNumber(totalErrors),
    );

  return {
    page: normalizedPage,
    limit: normalizedLimit,

    totalRows:
      normalizedTotalRows,

    totalPages:
      normalizedTotalRows === 0
        ? 0
        : Math.ceil(
            normalizedTotalRows /
              normalizedLimit,
          ),

    totalErrors:
      normalizedTotalErrors,
  };
}

/**
 * Mapping toàn bộ response preview import.
 *
 * Dùng cho API:
 * GET /api/payroll/imports/:importId/preview
 */
export function mapPayrollImportPreview({
  payrollImport,
  rows = [],
  errors = [],
  errorSummary = [],
  page = 1,
  limit = 50,
  totalRows = 0,
  totalErrors = 0,
} = {}) {
  return {
    import:
      mapPayrollImport(
        payrollImport,
      ),

    rows:
      mapPayrollImportRows(rows),

    errors:
      mapPayrollImportErrors(
        errors,
      ),

    errorSummary:
      mapPayrollImportErrorSummaries(
        errorSummary,
      ),

    pagination:
      mapPayrollImportPagination({
        page,
        limit,
        totalRows,
        totalErrors,
      }),
  };
}

/**
 * Mapping kết quả validation ngay sau khi đọc Excel.
 */
export function mapPayrollValidationResult({
  stagingRows = [],
  errors = [],
  totalRows = 0,
  validRows = 0,
  invalidRows = 0,
} = {}) {
  return {
    rows: Array.isArray(stagingRows)
      ? stagingRows
      : [],

    errors: Array.isArray(errors)
      ? errors
      : [],

    counts: {
      total: toNumber(totalRows),
      valid: toNumber(validRows),
      invalid: toNumber(
        invalidRows,
      ),
      errors: Array.isArray(errors)
        ? errors.length
        : 0,
    },
  };
}

export default {
  mapImport,
  mapPayrollImport,
  mapPayrollImportRow,
  mapPayrollImportRows,
  mapPayrollImportError,
  mapPayrollImportErrors,
  mapPayrollImportErrorSummary,
  mapPayrollImportErrorSummaries,
  mapPayrollImportPagination,
  mapPayrollImportPreview,
  mapPayrollValidationResult,
};