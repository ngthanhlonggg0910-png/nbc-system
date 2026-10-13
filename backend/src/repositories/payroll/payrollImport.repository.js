import pool from "../../config/db.js";

export async function getImportControlCenter(payrollPeriodId = null, client = pool) {
  const [kpis, queue, errors, periods, units] = await Promise.all([
    client.query(`SELECT COUNT(*) FILTER(WHERE created_at::date=CURRENT_DATE)::int files_today,
      COALESCE(SUM(valid_rows) FILTER(WHERE status='committed'),0)::int imported_rows,
      COALESCE(SUM(invalid_rows),0)::int error_rows,
      COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at-created_at))) FILTER(WHERE status IN ('committed','failed','cancelled')),0) avg_seconds
      FROM payroll_imports WHERE ($1::bigint IS NULL OR payroll_period_id=$1)`,[payrollPeriodId]),
    client.query(`SELECT pi.id,pi.file_name,pi.status,pi.total_rows,pi.valid_rows,pi.invalid_rows,pi.uploaded_by,pi.created_at,pi.updated_at,
      TRIM(pp.period_code) period_code,CONCAT_WS(' ',e.last_name,e.first_name) creator_name
      FROM payroll_imports pi JOIN payroll_periods pp ON pp.id=pi.payroll_period_id LEFT JOIN employees e ON e.staff_id=pi.uploaded_by
      WHERE ($1::bigint IS NULL OR pi.payroll_period_id=$1) ORDER BY pi.updated_at DESC LIMIT 12`,[payrollPeriodId]),
    client.query(`SELECT pie.error_code,COUNT(*)::int count,MIN(pie.error_message) message,MIN(pie.column_name) column_name,
      MIN(pie.row_data::text) example FROM payroll_import_errors pie JOIN payroll_imports pi ON pi.id=pie.payroll_import_id
      WHERE ($1::bigint IS NULL OR pi.payroll_period_id=$1) GROUP BY pie.error_code ORDER BY count DESC LIMIT 8`,[payrollPeriodId]),
    client.query(`SELECT id,TRIM(period_code) code,period_name name,status FROM payroll_periods WHERE status<>'cancelled' ORDER BY start_date DESC LIMIT 24`),
    client.query(`SELECT id,code,name FROM work_locations WHERE is_active=TRUE ORDER BY code`),
  ]);
  return {kpis:kpis.rows[0],queue:queue.rows,errors:errors.rows,periods:periods.rows,units:units.rows};
}

export async function getImportAuditCenter(filters={},client=pool){
 const page=Number(filters.page)||1,limit=Number(filters.limit)||20,offset=(page-1)*limit;
 const rawSearch=String(filters.jobCode||"").trim();
 const exactJob=/^IMP-\d+$/i.test(rawSearch);
 const search=(exactJob?rawSearch.replace(/^IMP-0*/i,""):rawSearch)||null;
 const base=[filters.from||null,filters.to||null,filters.status||null,filters.uploaderId||null,search,filters.payrollPeriodId||null,filters.fileType||null,exactJob];
 const p=[...base,limit,offset];
 const where=`WHERE ($1::date IS NULL OR pi.created_at::date >= $1) AND ($2::date IS NULL OR pi.created_at::date <= $2)
  AND ($3::text IS NULL OR pi.status=$3) AND ($4::text IS NULL OR pi.uploaded_by=$4)
  AND ($5::text IS NULL OR ($8::boolean=TRUE AND pi.id::text=$5) OR ($8::boolean=FALSE AND (pi.file_name ILIKE '%'||$5||'%' OR pi.file_checksum ILIKE '%'||$5||'%')))
  AND ($6::bigint IS NULL OR pi.payroll_period_id=$6)
  AND ($7::text IS NULL OR pi.file_type=$7)`;
 const [rows,count,kpis,days,errors,sources,uploaders,periods]=await Promise.all([
  client.query(`SELECT pi.id,pi.file_name,pi.file_type,pi.mime_type,pi.file_checksum,pi.total_rows,pi.valid_rows,pi.invalid_rows,pi.status,pi.uploaded_by,pi.committed_by,pi.committed_at,pi.created_at,pi.updated_at,TRIM(pp.period_code) period_code,CONCAT_WS(' ',e.last_name,e.first_name) uploader_name,CONCAT_WS(' ',ce.last_name,ce.first_name) committer_name,
   COUNT(pie.id)::int error_count FROM payroll_imports pi JOIN payroll_periods pp ON pp.id=pi.payroll_period_id LEFT JOIN employees e ON e.staff_id=pi.uploaded_by LEFT JOIN employees ce ON ce.staff_id=pi.committed_by LEFT JOIN payroll_import_errors pie ON pie.payroll_import_id=pi.id ${where}
   GROUP BY pi.id,pp.period_code,e.last_name,e.first_name,ce.last_name,ce.first_name ORDER BY pi.created_at DESC LIMIT $9 OFFSET $10`,p),
  client.query(`SELECT COUNT(*)::int total FROM payroll_imports pi ${where}`,base),
  client.query(`SELECT COUNT(*)::int total,COUNT(*) FILTER(WHERE status='committed')::int committed,COUNT(*) FILTER(WHERE status='validated')::int validated,COUNT(*) FILTER(WHERE status='failed')::int failed,COUNT(*) FILTER(WHERE status='cancelled')::int cancelled,COALESCE(SUM(valid_rows),0)::int valid_rows,COALESCE(SUM(invalid_rows),0)::int invalid_rows FROM payroll_imports pi ${where}`,base),
  client.query(`SELECT import_day,success,validated,failed FROM (SELECT pi.created_at::date AS import_day,COUNT(*) FILTER(WHERE pi.status='committed')::int success,COUNT(*) FILTER(WHERE pi.status='validated')::int validated,COUNT(*) FILTER(WHERE pi.status='failed')::int failed FROM payroll_imports pi ${where} GROUP BY pi.created_at::date ORDER BY import_day DESC LIMIT 14) d ORDER BY import_day`,base),
  client.query(`SELECT pie.error_code,COUNT(*)::int count,MIN(pie.error_message) message FROM payroll_import_errors pie JOIN payroll_imports pi ON pi.id=pie.payroll_import_id ${where} GROUP BY pie.error_code ORDER BY count DESC LIMIT 6`,base),
  client.query(`SELECT pi.file_type,COUNT(*)::int count FROM payroll_imports pi ${where} GROUP BY pi.file_type ORDER BY count DESC`,base),
  client.query(`SELECT DISTINCT e.staff_id id,CONCAT_WS(' ',e.last_name,e.first_name) name FROM payroll_imports pi JOIN employees e ON e.staff_id=pi.uploaded_by ORDER BY name`),
  client.query(`SELECT id,TRIM(period_code) code FROM payroll_periods WHERE status<>'cancelled' ORDER BY start_date DESC`)
 ]);
 return {rows:rows.rows,total:count.rows[0].total,kpis:kpis.rows[0],days:days.rows,errors:errors.rows,sources:sources.rows,uploaders:uploaders.rows,periods:periods.rows,page,limit};
}

/**
 * Tạo bản ghi khi người dùng upload file.
 *
 * File chưa được lưu vào phiếu lương ở bước này.
 * Trạng thái ban đầu là uploaded.
 */
export async function createPayrollImport(
  {
    payrollPeriodId,
    fileName,
    fileType,
    mimeType = null,
    storageKey = null,
    fileChecksum = null,
    uploadedBy = null,
  },
  client = pool,
) {
  const query = `
    INSERT INTO payroll_imports (
      payroll_period_id,
      file_name,
      file_type,
      mime_type,
      storage_key,
      file_checksum,
      status,
      uploaded_by
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      'uploaded',
      $7
    )
    RETURNING
      id,
      payroll_period_id,
      file_name,
      file_type,
      mime_type,
      storage_key,
      file_checksum,
      total_rows,
      valid_rows,
      invalid_rows,
      status,
      uploaded_by,
      committed_by,
      committed_at,
      created_at,
      updated_at;
  `;

  const values = [
    payrollPeriodId,
    fileName,
    fileType,
    mimeType,
    storageKey,
    fileChecksum,
    uploadedBy,
  ];

  const { rows } = await client.query(query, values);

  return rows[0];
}

/**
 * Lấy một lần import bằng ID.
 */
export async function findById(
  importId,
  client = pool,
) {
  const query = `
    SELECT
      payroll_import.id,
      payroll_import.payroll_period_id,

      period.period_code,
      period.period_name,
      period.status AS period_status,

      payroll_import.file_name,
      payroll_import.file_type,
      payroll_import.mime_type,
      payroll_import.storage_key,
      payroll_import.file_checksum,

      payroll_import.total_rows,
      payroll_import.valid_rows,
      payroll_import.invalid_rows,
      payroll_import.status,

      payroll_import.uploaded_by,

      CONCAT_WS(
        ' ',
        uploader.last_name,
        uploader.first_name
      ) AS uploaded_by_name,

      payroll_import.committed_by,

      CONCAT_WS(
        ' ',
        committer.last_name,
        committer.first_name
      ) AS committed_by_name,

      payroll_import.committed_at,
      payroll_import.created_at,
      payroll_import.updated_at,

      COUNT(import_error.id)::INT
        AS error_count

    FROM payroll_imports AS payroll_import

    INNER JOIN payroll_periods AS period
      ON period.id =
         payroll_import.payroll_period_id

    LEFT JOIN employees AS uploader
      ON uploader.staff_id =
         payroll_import.uploaded_by

    LEFT JOIN employees AS committer
      ON committer.staff_id =
         payroll_import.committed_by

    LEFT JOIN payroll_import_errors AS import_error
      ON import_error.payroll_import_id =
         payroll_import.id

    WHERE payroll_import.id = $1

    GROUP BY
      payroll_import.id,
      period.id,
      uploader.last_name,
      uploader.first_name,
      committer.last_name,
      committer.first_name

    LIMIT 1;
  `;

  const { rows } = await client.query(query, [
    importId,
  ]);

  return rows[0] ?? null;
}

/**
 * Tìm file trùng trong cùng kỳ lương bằng checksum.
 *
 * Các import failed hoặc cancelled
 * được phép upload lại.
 */
export async function findActiveByChecksum(
  {
    payrollPeriodId,
    fileChecksum,
  },
  client = pool,
) {
  const query = `
    SELECT
      id,
      payroll_period_id,
      file_name,
      file_type,
      mime_type,
      storage_key,
      file_checksum,
      total_rows,
      valid_rows,
      invalid_rows,
      status,
      uploaded_by,
      committed_by,
      committed_at,
      created_at,
      updated_at
    FROM payroll_imports
    WHERE payroll_period_id = $1
      AND file_checksum = $2
      AND status IN (
        'uploaded',
        'validating',
        'validated',
        'committed'
      )
    ORDER BY created_at DESC
    LIMIT 1;
  `;

  const values = [
    payrollPeriodId,
    fileChecksum,
  ];

  const { rows } =
    await client.query(
      query,
      values,
    );

  return rows[0] ?? null;
}

/**
 * Lấy lịch sử import.
 *
 * Có thể lọc theo:
 * - payrollPeriodId
 * - status
 * - uploadedBy
 * - fileType
 */
export async function findPayrollImports(
  {
    payrollPeriodId = null,
    status = null,
    uploadedBy = null,
    fileType = null,
    limit = 20,
    offset = 0,
  } = {},
  client = pool,
) {
  const query = `
    SELECT
      payroll_import.id,
      payroll_import.payroll_period_id,

      period.period_code,
      period.period_name,
      period.status AS period_status,


      payroll_import.file_name,
      payroll_import.file_type,
      payroll_import.mime_type,
      payroll_import.storage_key,
      payroll_import.file_checksum,

      payroll_import.total_rows,
      payroll_import.valid_rows,
      payroll_import.invalid_rows,
      payroll_import.status,

      payroll_import.uploaded_by,

      CONCAT_WS(
        ' ',
        uploader.last_name,
        uploader.first_name
      ) AS uploaded_by_name,

      payroll_import.committed_by,

      CONCAT_WS(
        ' ',
        committer.last_name,
        committer.first_name
      ) AS committed_by_name,

      payroll_import.committed_at,
      payroll_import.created_at,
      payroll_import.updated_at,

      COUNT(import_error.id)::INT
        AS error_count

    FROM payroll_imports AS payroll_import

    INNER JOIN payroll_periods AS period
      ON period.id =
         payroll_import.payroll_period_id

    LEFT JOIN employees AS uploader
      ON uploader.staff_id =
         payroll_import.uploaded_by

    LEFT JOIN employees AS committer
      ON committer.staff_id =
         payroll_import.committed_by

    LEFT JOIN payroll_import_errors AS import_error
      ON import_error.payroll_import_id =
         payroll_import.id

    WHERE (
      $1::BIGINT IS NULL
      OR payroll_import.payroll_period_id = $1
    )
    AND (
      $2::VARCHAR IS NULL
      OR payroll_import.status = $2
    )
    AND (
      $3::VARCHAR IS NULL
      OR payroll_import.uploaded_by = $3
    )
    AND (
      $4::VARCHAR IS NULL
      OR payroll_import.file_type = $4
    )

    GROUP BY
      payroll_import.id,
      period.id,
      uploader.last_name,
      uploader.first_name,
      committer.last_name,
      committer.first_name

    ORDER BY payroll_import.created_at DESC

    LIMIT $5
    OFFSET $6;
  `;

  const values = [
    payrollPeriodId,
    status,
    uploadedBy,
    fileType,
    limit,
    offset,
  ];

  const { rows } = await client.query(query, values);

  return rows;
}

/**
 * Đếm lịch sử import để phân trang.
 */
export async function countPayrollImports(
  {
    payrollPeriodId = null,
    status = null,
    uploadedBy = null,
    fileType = null,
  } = {},
  client = pool,
) {
  const query = `
    SELECT COUNT(*)::INT AS total
    FROM payroll_imports AS payroll_import
    WHERE (
      $1::BIGINT IS NULL
      OR payroll_import.payroll_period_id = $1
    )
    AND (
      $2::VARCHAR IS NULL
      OR payroll_import.status = $2
    )
    AND (
      $3::VARCHAR IS NULL
      OR payroll_import.uploaded_by = $3
    )
    AND (
      $4::VARCHAR IS NULL
      OR payroll_import.file_type = $4
    );
  `;

  const values = [
    payrollPeriodId,
    status,
    uploadedBy,
    fileType,
  ];

  const { rows } = await client.query(query, values);

  return rows[0]?.total ?? 0;
}

/**
 * Chuyển trạng thái import có điều kiện.
 *
 * Ví dụ:
 * uploaded → validating
 * validating → validated
 * validating → failed
 */
export async function transitionStatus(
  {
    importId,
    fromStatuses,
    toStatus,
  },
  client = pool,
) {
  const query = `
    UPDATE payroll_imports
    SET
      status = $3,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
      AND status = ANY($2::VARCHAR[])
    RETURNING
      id,
      payroll_period_id,
      file_name,
      file_type,
      mime_type,
      storage_key,
      file_checksum,
      total_rows,
      valid_rows,
      invalid_rows,
      status,
      uploaded_by,
      committed_by,
      committed_at,
      created_at,
      updated_at;
  `;

  const values = [
    importId,
    fromStatuses,
    toStatus,
  ];

  const { rows } = await client.query(query, values);

  return rows[0] ?? null;
}

/**
 * Lưu kết quả kiểm tra file.
 *
 * Nếu invalidRows = 0:
 * status = validated
 *
 * Nếu invalidRows > 0:
 * status = failed
 */
export async function saveValidationResult(
  {
    importId,
    totalRows,
    validRows,
    invalidRows,
  },
  client = pool,
) {
  const validationStatus =
    invalidRows === 0
      ? "validated"
      : "failed";

  const query = `
    UPDATE payroll_imports
    SET
      total_rows = $2,
      valid_rows = $3,
      invalid_rows = $4,
      status = $5,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
      AND status = 'validating'
    RETURNING
      id,
      payroll_period_id,
      file_name,
      file_type,
      mime_type,
      storage_key,
      file_checksum,
      total_rows,
      valid_rows,
      invalid_rows,
      status,
      uploaded_by,
      committed_by,
      committed_at,
      created_at,
      updated_at;
  `;

  const values = [
    importId,
    totalRows,
    validRows,
    invalidRows,
    validationStatus,
  ];

  const { rows } = await client.query(query, values);

  return rows[0] ?? null;
}

/**
 * Đánh dấu import đã được lưu chính thức.
 *
 * Chỉ cho:
 * validated → committed
 *
 * Và phải không có dòng lỗi.
 */
export async function markCommitted(
  {
    importId,
    committedBy,
  },
  client = pool,
) {
  const query = `
    UPDATE payroll_imports
    SET
      status = 'committed',
      committed_by = $2,
      committed_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
      AND status = 'validated'
      AND invalid_rows = 0
    RETURNING
      id,
      payroll_period_id,
      file_name,
      file_type,
      mime_type,
      storage_key,
      file_checksum,
      total_rows,
      valid_rows,
      invalid_rows,
      status,
      uploaded_by,
      committed_by,
      committed_at,
      created_at,
      updated_at;
  `;

  const values = [
    importId,
    committedBy,
  ];

  const { rows } = await client.query(query, values);

  return rows[0] ?? null;
}

/**
 * Hủy lần import.
 *
 * Không được hủy import đã committed.
 */
export async function markCancelled(
  importId,
  client = pool,
) {
  const query = `
    UPDATE payroll_imports
    SET
      status = 'cancelled',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
      AND status IN (
        'uploaded',
        'validating',
        'validated',
        'failed'
      )
    RETURNING
      id,
      payroll_period_id,
      file_name,
      file_type,
      mime_type,
      storage_key,
      file_checksum,
      total_rows,
      valid_rows,
      invalid_rows,
      status,
      uploaded_by,
      committed_by,
      committed_at,
      created_at,
      updated_at;
  `;

  const { rows } = await client.query(query, [
    importId,
  ]);

  return rows[0] ?? null;
}

/**
 * Xóa danh sách lỗi cũ trước khi kiểm tra lại file.
 */
export async function deleteImportErrors(
  importId,
  client = pool,
) {
  const query = `
    DELETE FROM payroll_import_errors
    WHERE payroll_import_id = $1
    RETURNING id;
  `;

  const { rows } = await client.query(query, [
    importId,
  ]);

  return {
    deletedCount: rows.length,
  };
}

/**
 * Lưu nhiều lỗi import cùng lúc.
 *
 * errors:
 * [
 *   {
 *     rowNumber: 2,
 *     staffId: "NBC012345",
 *     columnName: "base_salary",
 *     errorCode: "INVALID_AMOUNT",
 *     errorMessage: "Lương cơ bản không hợp lệ",
 *     rowData: {}
 *   }
 * ]
 */
export async function insertImportErrors(
  {
    importId,
    errors,
  },
  client = pool,
) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return [];
  }

  const normalizedErrors = errors.map(
    (error) => ({
      row_number:
        error.rowNumber ?? null,

      staff_id:
        error.staffId ?? null,

      column_name:
        error.columnName ?? null,

      error_code:
        error.errorCode,

      error_message:
        error.errorMessage,

      row_data:
        error.rowData ?? null,
    }),
  );

  const query = `
    INSERT INTO payroll_import_errors (
      payroll_import_id,
      row_number,
      staff_id,
      column_name,
      error_code,
      error_message,
      row_data
    )
    SELECT
      $1,
      imported_error.row_number,
      imported_error.staff_id,
      imported_error.column_name,
      imported_error.error_code,
      imported_error.error_message,
      imported_error.row_data
    FROM JSONB_TO_RECORDSET($2::JSONB)
      AS imported_error (
        row_number INT,
        staff_id VARCHAR(30),
        column_name VARCHAR(150),
        error_code VARCHAR(100),
        error_message VARCHAR(1000),
        row_data JSONB
      )
    RETURNING
      id,
      payroll_import_id,
      row_number,
      staff_id,
      column_name,
      error_code,
      error_message,
      row_data,
      created_at;
  `;

  const values = [
    importId,
    JSON.stringify(normalizedErrors),
  ];

  const { rows } = await client.query(query, values);

  return rows;
}

/**
 * Lấy danh sách lỗi import.
 */
export async function findImportErrors(
  {
    importId,
    page = 1,
    limit = 50,
  },
  client = pool,
) {
  const offset = (page - 1) * limit;

  const query = `
    SELECT
      id,
      payroll_import_id,
      row_number,
      staff_id,
      column_name,
      error_code,
      error_message,
      row_data,
      created_at
    FROM payroll_import_errors
    WHERE payroll_import_id = $1
    ORDER BY
      row_number ASC NULLS FIRST,
      id ASC
    LIMIT $2
    OFFSET $3;
  `;

  const values = [
    importId,
    limit,
    offset,
  ];

  const { rows } = await client.query(query, values);

  return rows;
}

/**
 * Đếm số lỗi của một lần import.
 */
export async function countImportErrors(
  importId,
  client = pool,
) {
  const query = `
    SELECT COUNT(*)::INT AS total
    FROM payroll_import_errors
    WHERE payroll_import_id = $1;
  `;

  const { rows } = await client.query(query, [
    importId,
  ]);

  return rows[0]?.total ?? 0;
}

/**
 * Thống kê lỗi theo mã lỗi và cột.
 */
export async function summarizeImportErrors(
  importId,
  client = pool,
) {
  const query = `
    SELECT
      error_code,
      column_name,
      COUNT(*)::INT AS total
    FROM payroll_import_errors
    WHERE payroll_import_id = $1
    GROUP BY
      error_code,
      column_name
    ORDER BY
      total DESC,
      error_code ASC,
      column_name ASC NULLS FIRST;
  `;

  const { rows } = await client.query(query, [
    importId,
  ]);

  return rows;
}
/**
 * Lưu các dòng Excel đã được chuẩn hóa vào bảng staging.
 *
 * rows:
 * [
 *   {
 *     rowNumber: 2,
 *     staffId: "NBC012345",
 *     periodCode: "2026-07",
 *     normalizedData: {
 *       staffId: "NBC012345",
 *       periodCode: "2026-07",
 *       grossIncome: 15000000,
 *       totalDeductions: 2000000,
 *       netSalary: 13000000,
 *       salaryItems: {}
 *     },
 *     isValid: true
 *   }
 * ]
 *
 * Nếu cùng importId + rowNumber đã tồn tại,
 * dữ liệu staging sẽ được cập nhật.
 */
export async function insertImportRows(
  {
    importId,
    rows,
  },
  client = pool,
) {
  if (
    !Array.isArray(rows) ||
    rows.length === 0
  ) {
    return [];
  }

  const normalizedRows = rows.map(
    (row) => ({
      row_number: row.rowNumber,

      staff_id:
        row.staffId ?? null,

      period_code:
        row.periodCode ?? null,

      normalized_data:
        row.normalizedData ?? {},

      is_valid:
        row.isValid === true,
    }),
  );

  const query = `
    INSERT INTO payroll_import_rows (
      payroll_import_id,
      row_number,
      staff_id,
      period_code,
      normalized_data,
      is_valid
    )
    SELECT
      $1,
      staging_row.row_number,
      staging_row.staff_id,
      staging_row.period_code,
      staging_row.normalized_data,
      staging_row.is_valid
    FROM JSONB_TO_RECORDSET($2::JSONB)
      AS staging_row (
        row_number INT,
        staff_id VARCHAR(30),
        period_code CHAR(7),
        normalized_data JSONB,
        is_valid BOOLEAN
      )

    ON CONFLICT (
      payroll_import_id,
      row_number
    )
    DO UPDATE SET
      staff_id =
        EXCLUDED.staff_id,

      period_code =
        EXCLUDED.period_code,

      normalized_data =
        EXCLUDED.normalized_data,

      is_valid =
        EXCLUDED.is_valid

    RETURNING
      id,
      payroll_import_id,
      row_number,
      staff_id,
      period_code,
      normalized_data,
      is_valid,
      created_at;
  `;

  const values = [
    importId,
    JSON.stringify(normalizedRows),
  ];

  const { rows: insertedRows } =
    await client.query(query, values);

  return insertedRows;
}

/**
 * Lấy các dòng staging của một lần import.
 *
 * Filter:
 * - isValid = true: chỉ lấy dòng hợp lệ.
 * - isValid = false: chỉ lấy dòng lỗi.
 * - isValid = null: lấy tất cả.
 */
export async function findImportRows(
  {
    importId,
    isValid = null,
    page = 1,
    limit = 50,
  },
  client = pool,
) {
  const offset = (page - 1) * limit;

  const query = `
    SELECT
      import_row.id,
      import_row.payroll_import_id,
      import_row.row_number,
      import_row.staff_id,
      import_row.period_code,
      import_row.normalized_data,
      import_row.is_valid,
      import_row.created_at

    FROM payroll_import_rows
      AS import_row

    WHERE import_row.payroll_import_id = $1
      AND (
        $2::BOOLEAN IS NULL
        OR import_row.is_valid = $2
      )

    ORDER BY
      import_row.row_number ASC,
      import_row.id ASC

    LIMIT $3
    OFFSET $4;
  `;

  const values = [
    importId,
    isValid,
    limit,
    offset,
  ];

  const { rows } =
    await client.query(query, values);

  return rows;
}

/**
 * Đếm các dòng staging.
 *
 * Dùng để:
 * - Phân trang bản xem trước.
 * - Kiểm tra số dòng hợp lệ.
 * - Kiểm tra số dòng lỗi.
 */
export async function countImportRows(
  {
    importId,
    isValid = null,
  },
  client = pool,
) {
  const query = `
    SELECT COUNT(*)::INT AS total
    FROM payroll_import_rows
    WHERE payroll_import_id = $1
      AND (
        $2::BOOLEAN IS NULL
        OR is_valid = $2
      );
  `;

  const values = [
    importId,
    isValid,
  ];

  const { rows } =
    await client.query(query, values);

  return rows[0]?.total ?? 0;
}

/**
 * Xóa dữ liệu staging cũ trước khi kiểm tra lại file.
 *
 * Không dùng hàm này sau khi import đã committed.
 * Việc kiểm tra trạng thái phải thực hiện ở service.
 */
export async function deleteImportRows(
  importId,
  client = pool,
) {
  const query = `
    DELETE FROM payroll_import_rows
    WHERE payroll_import_id = $1
    RETURNING id;
  `;

  const { rows } =
    await client.query(query, [
      importId,
    ]);

  return {
    deletedCount: rows.length,
    deletedIds: rows.map(
      (row) => Number(row.id),
    ),
  };
}
