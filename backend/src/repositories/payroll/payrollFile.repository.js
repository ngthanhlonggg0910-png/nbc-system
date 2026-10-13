import pool from "../../config/db.js";

/**
 * Tạo metadata cho file phiếu lương.
 *
 * Repository chỉ lưu thông tin file.
 * Nội dung thật của file được lưu bởi payrollFile.service.js.
 */
export async function createPayslipFile(
  {
    payslipId,
    payrollImportId = null,
    fileType,
    fileName,
    mimeType = null,
    storageKey,
    fileChecksum = null,
    uploadedBy = null,
  },
  client = pool,
) {
  const query = `
    INSERT INTO payslip_files (
      payslip_id,
      payroll_import_id,
      file_type,
      file_name,
      mime_type,
      storage_key,
      file_checksum,
      uploaded_by
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8
    )
    RETURNING
      id,
      payslip_id,
      payroll_import_id,
      file_type,
      file_name,
      mime_type,
      storage_key,
      file_checksum,
      uploaded_by,
      created_at;
  `;

  const values = [
    payslipId,
    payrollImportId,
    fileType,
    fileName,
    mimeType,
    storageKey,
    fileChecksum,
    uploadedBy,
  ];

  const { rows } =
    await client.query(query, values);

  return rows[0];
}

/**
 * Tìm file bằng ID.
 *
 * Dùng cho HR/Admin.
 */
export async function findById(
  fileId,
  client = pool,
) {
  const query = `
    SELECT
      payslip_file.id,
      payslip_file.payslip_id,
      payslip_file.payroll_import_id,
      payslip_file.file_type,
      payslip_file.file_name,
      payslip_file.mime_type,
      payslip_file.storage_key,
      payslip_file.file_checksum,
      payslip_file.uploaded_by,

      CONCAT_WS(
        ' ',
        uploader.last_name,
        uploader.first_name
      ) AS uploaded_by_name,

      payslip_file.created_at,

      payslip.staff_id,
      payslip.status AS payslip_status,
      payslip.current_version,

      period.id AS payroll_period_id,
      period.period_code,
      period.period_name

    FROM payslip_files AS payslip_file

    INNER JOIN employee_payslips AS payslip
      ON payslip.id =
         payslip_file.payslip_id

    INNER JOIN payroll_periods AS period
      ON period.id =
         payslip.payroll_period_id

    LEFT JOIN employees AS uploader
      ON uploader.staff_id =
         payslip_file.uploaded_by

    WHERE payslip_file.id = $1

    LIMIT 1;
  `;

  const { rows } =
    await client.query(query, [
      fileId,
    ]);

  return rows[0] ?? null;
}

/**
 * Tìm file bằng storage_key.
 */
export async function findByStorageKey(
  storageKey,
  client = pool,
) {
  const query = `
    SELECT
      id,
      payslip_id,
      payroll_import_id,
      file_type,
      file_name,
      mime_type,
      storage_key,
      file_checksum,
      uploaded_by,
      created_at
    FROM payslip_files
    WHERE storage_key = $1
    LIMIT 1;
  `;

  const { rows } =
    await client.query(query, [
      storageKey,
    ]);

  return rows[0] ?? null;
}

/**
 * Tìm file trùng bằng checksum.
 *
 * Chỉ kiểm tra trong cùng một phiếu lương và cùng loại file.
 */
export async function findByChecksum(
  {
    payslipId,
    fileType,
    fileChecksum,
  },
  client = pool,
) {
  const query = `
    SELECT
      id,
      payslip_id,
      payroll_import_id,
      file_type,
      file_name,
      mime_type,
      storage_key,
      file_checksum,
      uploaded_by,
      created_at
    FROM payslip_files
    WHERE payslip_id = $1
      AND file_type = $2
      AND file_checksum = $3
    ORDER BY created_at DESC, id DESC
    LIMIT 1;
  `;

  const values = [
    payslipId,
    fileType,
    fileChecksum,
  ];

  const { rows } =
    await client.query(query, values);

  return rows[0] ?? null;
}

/**
 * Lấy toàn bộ lịch sử file của một phiếu lương.
 *
 * File mới nhất đứng đầu.
 */
export async function findFilesByPayslipId(
  {
    payslipId,
    fileType = null,
  },
  client = pool,
) {
  const query = `
    SELECT
      payslip_file.id,
      payslip_file.payslip_id,
      payslip_file.payroll_import_id,
      payslip_file.file_type,
      payslip_file.file_name,
      payslip_file.mime_type,
      payslip_file.storage_key,
      payslip_file.file_checksum,
      payslip_file.uploaded_by,

      CONCAT_WS(
        ' ',
        uploader.last_name,
        uploader.first_name
      ) AS uploaded_by_name,

      payslip_file.created_at

    FROM payslip_files AS payslip_file

    LEFT JOIN employees AS uploader
      ON uploader.staff_id =
         payslip_file.uploaded_by

    WHERE payslip_file.payslip_id = $1
      AND (
        $2::VARCHAR IS NULL
        OR payslip_file.file_type = $2
      )

    ORDER BY
      payslip_file.created_at DESC,
      payslip_file.id DESC;
  `;

  const values = [
    payslipId,
    fileType,
  ];

  const { rows } =
    await client.query(query, values);

  return rows;
}

/**
 * Lấy file mới nhất của phiếu lương.
 *
 * Với HTML, file mới nhất được xem là file hiện hành.
 * Các file cũ vẫn được giữ lại để đối chiếu.
 */
export async function findLatestFileByPayslipId(
  {
    payslipId,
    fileType,
  },
  client = pool,
) {
  const query = `
    SELECT
      payslip_file.id,
      payslip_file.payslip_id,
      payslip_file.payroll_import_id,
      payslip_file.file_type,
      payslip_file.file_name,
      payslip_file.mime_type,
      payslip_file.storage_key,
      payslip_file.file_checksum,
      payslip_file.uploaded_by,
      payslip_file.created_at
    FROM payslip_files AS payslip_file
    WHERE payslip_file.payslip_id = $1
      AND payslip_file.file_type = $2
    ORDER BY
      payslip_file.created_at DESC,
      payslip_file.id DESC
    LIMIT 1;
  `;

  const values = [
    payslipId,
    fileType,
  ];

  const { rows } =
    await client.query(query, values);

  return rows[0] ?? null;
}

/**
 * Nhân viên lấy một file thuộc phiếu lương của chính mình.
 *
 * Điều kiện:
 * - Đúng fileId.
 * - Đúng staffId.
 * - Phiếu thuộc trạng thái được phép xem.
 */
export async function findEmployeePayslipFile(
  {
    fileId,
    staffId,
    visibleStatuses,
  },
  client = pool,
) {
  const query = `
    SELECT
      payslip_file.id,
      payslip_file.payslip_id,
      payslip_file.payroll_import_id,
      payslip_file.file_type,
      payslip_file.file_name,
      payslip_file.mime_type,
      payslip_file.storage_key,
      payslip_file.file_checksum,
      payslip_file.created_at,

      payslip.staff_id,
      payslip.current_version,
      payslip.status AS payslip_status,

      period.period_code,
      period.period_name

    FROM payslip_files AS payslip_file

    INNER JOIN employee_payslips AS payslip
      ON payslip.id =
         payslip_file.payslip_id

    INNER JOIN payroll_periods AS period
      ON period.id =
         payslip.payroll_period_id

    WHERE payslip_file.id = $1
      AND payslip.staff_id = $2
      AND payslip.status =
          ANY($3::VARCHAR[])

    LIMIT 1;
  `;

  const values = [
    fileId,
    staffId,
    visibleStatuses,
  ];

  const { rows } =
    await client.query(query, values);

  return rows[0] ?? null;
}

/**
 * Nhân viên lấy file mới nhất thuộc phiếu lương của mình.
 */
export async function findEmployeeLatestPayslipFile(
  {
    payslipId,
    staffId,
    fileType,
    visibleStatuses,
  },
  client = pool,
) {
  const query = `
    SELECT
      payslip_file.id,
      payslip_file.payslip_id,
      payslip_file.payroll_import_id,
      payslip_file.file_type,
      payslip_file.file_name,
      payslip_file.mime_type,
      payslip_file.storage_key,
      payslip_file.file_checksum,
      payslip_file.created_at,

      payslip.staff_id,
      payslip.current_version,
      payslip.status AS payslip_status,

      period.period_code,
      period.period_name

    FROM payslip_files AS payslip_file

    INNER JOIN employee_payslips AS payslip
      ON payslip.id =
         payslip_file.payslip_id

    INNER JOIN payroll_periods AS period
      ON period.id =
         payslip.payroll_period_id

    WHERE payslip_file.payslip_id = $1
      AND payslip.staff_id = $2
      AND payslip_file.file_type = $3
      AND payslip.status =
          ANY($4::VARCHAR[])

    ORDER BY
      payslip_file.created_at DESC,
      payslip_file.id DESC

    LIMIT 1;
  `;

  const values = [
    payslipId,
    staffId,
    fileType,
    visibleStatuses,
  ];

  const { rows } =
    await client.query(query, values);

  return rows[0] ?? null;
}

/**
 * Lấy các file được tạo từ một lần import.
 */
export async function findFilesByImportId(
  payrollImportId,
  client = pool,
) {
  const query = `
    SELECT
      payslip_file.id,
      payslip_file.payslip_id,
      payslip_file.payroll_import_id,
      payslip_file.file_type,
      payslip_file.file_name,
      payslip_file.mime_type,
      payslip_file.storage_key,
      payslip_file.file_checksum,
      payslip_file.uploaded_by,
      payslip_file.created_at,

      payslip.staff_id,
      period.period_code

    FROM payslip_files AS payslip_file

    INNER JOIN employee_payslips AS payslip
      ON payslip.id =
         payslip_file.payslip_id

    INNER JOIN payroll_periods AS period
      ON period.id =
         payslip.payroll_period_id

    WHERE payslip_file.payroll_import_id = $1

    ORDER BY
      payslip.staff_id ASC,
      payslip_file.created_at DESC;
  `;

  const { rows } =
    await client.query(query, [
      payrollImportId,
    ]);

  return rows;
}

/**
 * Đếm file của một phiếu lương.
 */
export async function countFilesByPayslipId(
  {
    payslipId,
    fileType = null,
  },
  client = pool,
) {
  const query = `
    SELECT COUNT(*)::INT AS total
    FROM payslip_files
    WHERE payslip_id = $1
      AND (
        $2::VARCHAR IS NULL
        OR file_type = $2
      );
  `;

  const values = [
    payslipId,
    fileType,
  ];

  const { rows } =
    await client.query(query, values);

  return rows[0]?.total ?? 0;
}

/**
 * Xóa metadata file khi phiếu vẫn còn là bản nháp.
 *
 * Service phải xóa file vật lý/object storage trước hoặc
 * trong quy trình bù trừ phù hợp.
 *
 * Không được xóa file của phiếu đã phát hành.
 */
export async function deleteDraftPayslipFile(
  {
    fileId,
  },
  client = pool,
) {
  const query = `
    DELETE FROM payslip_files
    USING employee_payslips AS payslip
    WHERE payslip_files.id = $1
      AND payslip.id =
          payslip_files.payslip_id
      AND payslip.status = 'draft'
    RETURNING
      payslip_files.id,
      payslip_files.payslip_id,
      payslip_files.file_type,
      payslip_files.file_name,
      payslip_files.storage_key,
      payslip_files.file_checksum;
  `;

  const { rows } =
    await client.query(query, [
      fileId,
    ]);

  return rows[0] ?? null;
}