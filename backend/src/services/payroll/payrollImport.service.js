import pool from "../../config/db.js";

import { ErrorHandler } from
  "../../middleware/errorMiddleware.js";

import * as payrollImportRepository from
  "../../repositories/payroll/payrollImport.repository.js";

import * as payrollPeriodRepository from
  "../../repositories/payroll/payrollPeriod.repository.js";

import {
  calculateChecksum,
  readPayrollExcel,
} from "./import/payrollExcelReader.service.js";

import { readPayrollHtml } from "./import/payrollHtmlReader.service.js";

import {
  PAYROLL_EXCEL_COLUMNS,
  PAYROLL_EXCEL_HEADER_ROW_NUMBER,
  REQUIRED_COLUMNS,
} from "../../shared/payroll/payrollExcelColumns.js";

import {
  validatePayrollImport,
} from "./import/payrollImportValidator.service.js";

import {
  getPayrollImportPreview as getPayrollImportPreviewService,
} from "./import/payrollImportPreview.service.js";

import {
  commitPayrollImport as commitPayrollImportService,
} from "./import/payrollImportCommit.service.js";

/**
 * Kiểm tra số nguyên dương.
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

  return value;
}

/**
 * Chuẩn hóa mã người thực hiện.
 */
function normalizeStaffId(
  staffId,
) {
  if (
    typeof staffId !== "string" ||
    !staffId.trim() ||
    staffId.trim().length > 30
  ) {
    throw new ErrorHandler(
      "Mã người thực hiện không hợp lệ",
      400,
    );
  }

  return staffId.trim();
}

/**
 * Kiểm tra file upload.
 */
function validateUploadFile(
  file,
) {
  if (
    !file ||
    !Buffer.isBuffer(file.buffer) ||
    file.buffer.length === 0
  ) {
    throw new ErrorHandler(
      "Không tìm thấy nội dung file Excel",
      400,
    );
  }

  return file;
}

/**
 * Lấy kỳ lương và bảo đảm kỳ vẫn là draft.
 */
async function getDraftPayrollPeriod(
  payrollPeriodId,
) {
  const period =
    await payrollPeriodRepository
      .findById(
        payrollPeriodId,
      );

  if (!period) {
    throw new ErrorHandler(
      "Không tìm thấy kỳ lương",
      404,
    );
  }

  if (period.status !== "draft") {
    throw new ErrorHandler(
      "Chỉ có thể import vào kỳ lương bản nháp",
      409,
    );
  }

  return period;
}

/**
 * Kiểm tra checksum file trong cùng kỳ.
 */
async function ensureFileNotDuplicated({
  payrollPeriodId,
  fileBuffer,
}) {
  const checksum =
    calculateChecksum(
      fileBuffer,
    );

  const duplicated =
    await payrollImportRepository
      .findActiveByChecksum({
        payrollPeriodId,
        fileChecksum:
          checksum,
      });

  if (duplicated) {
    throw new ErrorHandler(
      "Dữ liệu này đã được nhập vào kỳ lương",
      409,
    );
  }

  return checksum;
}

/**
 * Tạo phiên import và chuyển:
 *
 * uploaded -> validating
 */
async function createImportSession({
  payrollPeriodId,
  file,
  checksum,
  uploadedBy,
  fileType = "excel",
}) {
  const payrollImport =
    await payrollImportRepository
      .createPayrollImport({
        payrollPeriodId,

        fileName:
          file.originalname,

        fileType,

        mimeType:
          file.mimetype,

        storageKey:
          null,

        fileChecksum:
          checksum,

        uploadedBy,
      });

  const importId =
    Number(
      payrollImport?.id,
    );

  if (
    !Number.isInteger(importId) ||
    importId <= 0
  ) {
    throw new ErrorHandler(
      "Không thể tạo phiên import bảng lương",
      500,
    );
  }

  const validatingImport =
    await payrollImportRepository
      .transitionStatus({
        importId,

        fromStatuses: [
          "uploaded",
        ],

        toStatus:
          "validating",
      });

  if (!validatingImport) {
    throw new ErrorHandler(
      "Không thể bắt đầu kiểm tra file import",
      409,
    );
  }

  return importId;
}

/**
 * Lưu staging rows, lỗi và thống kê validation.
 */
async function saveValidationData({
  importId,
  validation,
}) {
  const client =
    await pool.connect();

  try {
    await client.query("BEGIN");

    await payrollImportRepository
      .deleteImportErrors(
        importId,
        client,
      );

    await payrollImportRepository
      .deleteImportRows(
        importId,
        client,
      );

    await payrollImportRepository
      .insertImportRows(
        {
          importId,

          rows:
            validation.stagingRows,
        },
        client,
      );

    await payrollImportRepository
      .insertImportErrors(
        {
          importId,

          errors:
            validation.errors,
        },
        client,
      );

    const savedImport =
      await payrollImportRepository
        .saveValidationResult(
          {
            importId,

            totalRows:
              validation.totalRows,

            validRows:
              validation.validRows,

            invalidRows:
              validation.invalidRows,
          },
          client,
        );

    if (!savedImport) {
      throw new ErrorHandler(
        "Không thể lưu kết quả kiểm tra file",
        409,
      );
    }

    await client.query("COMMIT");

    return savedImport;
  } catch (error) {
    try {
      await client.query(
        "ROLLBACK",
      );
    } catch {
      // Giữ lại lỗi ban đầu.
    }

    throw error;
  } finally {
    client.release();
  }
}

/**
 * Đánh dấu phiên import thất bại.
 *
 * Không ghi đè lỗi xử lý Excel ban đầu.
 */
async function markImportFailed(
  importId,
) {
  try {
    await payrollImportRepository
      .transitionStatus({
        importId,

        fromStatuses: [
          "uploaded",
          "validating",
        ],

        toStatus:
          "failed",
      });
  } catch {
    // Giữ nguyên lỗi gốc.
  }
}

/**
 * Upload Excel
 * -> Reader
 * -> Validator
 * -> Staging
 * -> Preview
 */
async function validateAndStageImport({ importId, parsedData, periodCode }) {
  const validation = await validatePayrollImport({
    parsedExcel: parsedData,
    expectedPeriodCode: periodCode,
  });
  await saveValidationData({ importId, validation });
}

export async function uploadAndValidatePayrollFile({
  payrollPeriodId,
  file,
  uploadedBy,
  fileType = "excel",
}) {
  validatePositiveInteger(
    payrollPeriodId,
    "Mã kỳ lương",
  );

  validateUploadFile(
    file,
  );

  const normalizedUploadedBy =
    normalizeStaffId(
      uploadedBy,
    );

  const period =
    await getDraftPayrollPeriod(
      payrollPeriodId,
    );

  const checksum =
    await ensureFileNotDuplicated({
      payrollPeriodId,

      fileBuffer:
        file.buffer,
    });

  const importId =
    await createImportSession({
      payrollPeriodId,
      file,
      checksum,

      uploadedBy:
        normalizedUploadedBy,
      fileType,
    });

  try {
    const parsedData = fileType === "html"
      ? readPayrollHtml(file.buffer)
      : await readPayrollExcel(file.buffer);
    await validateAndStageImport({ importId, parsedData, periodCode: period.period_code });
  } catch (error) {
    await markImportFailed(
      importId,
    );

    throw error;
  }

  /*
   * Preview nằm ngoài try/catch phía trên.
   *
   * Nếu preview lỗi thì không được biến một import
   * đã validate thành failed.
   */
  return getPayrollImportPreviewService({
    importId,
    page: 1,
    limit: 50,
  });
}

export const uploadAndValidatePayrollExcel = uploadAndValidatePayrollFile;

function buildManualParsedData(rows, periodCode) {
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 200) {
    throw new ErrorHandler("Cần nhập từ 1 đến 200 nhân viên cho mỗi lần cập nhật thủ công", 400);
  }
  return {
    worksheetName: "Cập nhật thủ công",
    headerRowNumber: PAYROLL_EXCEL_HEADER_ROW_NUMBER,
    headers: [...REQUIRED_COLUMNS],
    salaryColumns: [],
    rows: rows.map((row, index) => ({
      rowNumber: index + PAYROLL_EXCEL_HEADER_ROW_NUMBER + 1,
      rowData: {
        [PAYROLL_EXCEL_COLUMNS.PERIOD_CODE]: periodCode,
        [PAYROLL_EXCEL_COLUMNS.STAFF_ID]: String(row?.staffId ?? "").trim(),
        [PAYROLL_EXCEL_COLUMNS.EMPLOYEE_NAME]: String(row?.employeeName ?? "").trim(),
        [PAYROLL_EXCEL_COLUMNS.DEPARTMENT_NAME]: String(row?.departmentName ?? "").trim(),
        [PAYROLL_EXCEL_COLUMNS.GROSS_INCOME]: row?.grossIncome,
        [PAYROLL_EXCEL_COLUMNS.TAXABLE_INCOME]: row?.taxableIncome,
        [PAYROLL_EXCEL_COLUMNS.TOTAL_DEDUCTIONS]: row?.totalDeductions,
        [PAYROLL_EXCEL_COLUMNS.NET_SALARY]: row?.netSalary,
        [PAYROLL_EXCEL_COLUMNS.STATUS]: "Cập nhật thủ công",
      },
    })),
  };
}

export async function createAndValidatePayrollManual({ payrollPeriodId, rows, uploadedBy }) {
  validatePositiveInteger(payrollPeriodId, "Mã kỳ lương");
  const normalizedUploadedBy = normalizeStaffId(uploadedBy);
  const period = await getDraftPayrollPeriod(payrollPeriodId);
  const parsedData = buildManualParsedData(rows, period.period_code);
  const buffer = Buffer.from(JSON.stringify(parsedData.rows), "utf8");
  const checksum = await ensureFileNotDuplicated({ payrollPeriodId, fileBuffer: buffer });
  const file = {
    originalname: `cap-nhat-thu-cong-${period.period_code}.json`,
    mimetype: "application/json",
    buffer,
  };
  const importId = await createImportSession({
    payrollPeriodId, file, checksum, uploadedBy: normalizedUploadedBy, fileType: "manual",
  });
  try {
    await validateAndStageImport({ importId, parsedData, periodCode: period.period_code });
  } catch (error) {
    await markImportFailed(importId);
    throw error;
  }
  return getPayrollImportPreviewService({ importId, page: 1, limit: 50 });
}

/**
 * Preview phiên import.
 */
export async function getPayrollImportPreview({
  importId,
  page = 1,
  limit = 50,
  isValid = null,
}) {
  return getPayrollImportPreviewService({
    importId,
    page,
    limit,
    isValid,
  });
}

/**
 * Commit staging -> employee_payslips.
 */
export async function commitPayrollImport({
  importId,
  committedBy,
}) {
  return commitPayrollImportService({
    importId,
    committedBy,
  });
}

/**
 * Hủy phiên import chưa commit.
 */
export async function cancelPayrollImport(
  importId,
) {
  validatePositiveInteger(
    importId,
    "Mã lần import",
  );

  const payrollImport =
    await payrollImportRepository
      .findById(
        importId,
      );

  if (!payrollImport) {
    throw new ErrorHandler(
      "Không tìm thấy lần import",
      404,
    );
  }

  if (
    payrollImport.status ===
    "committed"
  ) {
    throw new ErrorHandler(
      "Không thể hủy dữ liệu đã được lưu chính thức",
      409,
    );
  }

  if (
    payrollImport.status ===
    "cancelled"
  ) {
    throw new ErrorHandler(
      "Lần import đã được hủy trước đó",
      409,
    );
  }

  const cancelled =
    await payrollImportRepository
      .markCancelled(
        importId,
      );

  if (!cancelled) {
    throw new ErrorHandler(
      "Không thể hủy lần import",
      409,
    );
  }

  return {
    id:
      Number(cancelled.id),

    status:
      cancelled.status,

    updatedAt:
      cancelled.updated_at,
  };
}

export async function getPayrollImportControlCenter({payrollPeriodId=null}={}) {
  const id=payrollPeriodId?Number(payrollPeriodId):null;
  if(id!==null) validatePositiveInteger(id,"Kỳ lương");
  const raw=await payrollImportRepository.getImportControlCenter(id);
  const sec=Number(raw.kpis.avg_seconds||0),duration=[Math.floor(sec/3600),Math.floor(sec%3600/60),Math.floor(sec%60)].map(x=>String(x).padStart(2,"0")).join(":");
  return {kpis:{filesToday:Number(raw.kpis.files_today||0),importedRows:Number(raw.kpis.imported_rows||0),errorRows:Number(raw.kpis.error_rows||0),pendingUnits:raw.units.length,duration},periods:raw.periods,units:raw.units,
    queue:raw.queue.map(r=>({id:Number(r.id),fileName:r.file_name,status:r.status,totalRows:Number(r.total_rows||0),validRows:Number(r.valid_rows||0),invalidRows:Number(r.invalid_rows||0),progress:r.status==='committed'||r.status==='failed'||r.status==='cancelled'?100:r.status==='validated'?80:35,periodCode:r.period_code,creator:r.creator_name||r.uploaded_by,createdAt:r.created_at,updatedAt:r.updated_at})),
    errorSummary:raw.errors.map(e=>({code:e.error_code,count:Number(e.count),message:e.message,column:e.column_name,example:e.example})),
    mapping:[{source:"Tháng",target:"PERIOD_CODE",rule:"Bắt buộc, đúng kỳ lương"},{source:"Mã nhân viên",target:"STAFF_ID",rule:"Bắt buộc, tồn tại, duy nhất"},{source:"Tổng thu nhập",target:"GROSS_INCOME",rule:"Bắt buộc, số không âm"},{source:"Thu nhập chịu thuế",target:"TAXABLE_INCOME",rule:"Bắt buộc, số không âm"},{source:"Tổng khấu trừ",target:"TOTAL_DEDUCTIONS",rule:"Bắt buộc, số không âm"},{source:"Thực lĩnh",target:"NET_SALARY",rule:"Bắt buộc, đối soát tổng"},{source:"Tiêu chí: … [CODE]",target:"SALARY_ITEM",rule:"Dynamic salary criteria"}],
    rules:{extensions:[".xlsx",".html","Thủ công"],maxFileSizeMb:10,maxFiles:1,duplicate:"SHA-256 theo kỳ lương",commitMode:"STRICT_TRANSACTION",requiredFields:6},refreshedAt:new Date().toISOString()};
}

export async function getPayrollImportAuditCenter(filters={}){
 const limit=[20,50,100].includes(Number(filters.limit))?Number(filters.limit):20;
 const raw=await payrollImportRepository.getImportAuditCenter({...filters,limit});
 const map=r=>({id:Number(r.id),jobCode:`IMP-${String(r.id).padStart(6,"0")}`,fileName:r.file_name,fileType:r.file_type||"excel",mimeType:r.mime_type,checksum:r.file_checksum,periodCode:r.period_code,uploader:r.uploader_name||r.uploaded_by,uploaderId:r.uploaded_by,committer:r.committer_name||r.committed_by,committedAt:r.committed_at,totalRows:Number(r.total_rows||0),successRows:Number(r.valid_rows||0),errorRows:Number(r.error_count||r.invalid_rows||0),invalidRows:Number(r.invalid_rows||0),status:r.status,startedAt:r.created_at,finishedAt:r.committed_at||r.updated_at,durationSeconds:Math.max(0,Math.round((new Date(r.committed_at||r.updated_at)-new Date(r.created_at))/1000))});
 return {jobs:raw.rows.map(map),kpis:Object.fromEntries(Object.entries(raw.kpis).map(([k,v])=>[k,Number(v||0)])),analytics:{days:raw.days.map(d=>({day:d.import_day,success:Number(d.success),validated:Number(d.validated),failed:Number(d.failed)})),errors:raw.errors.map(e=>({code:e.error_code,count:Number(e.count),message:e.message})),sources:raw.sources.map(s=>({type:s.file_type,count:Number(s.count)}))},filters:{uploaders:raw.uploaders,periods:raw.periods},pagination:{page:raw.page,limit:raw.limit,total:Number(raw.total||0),totalPages:Math.ceil(Number(raw.total||0)/raw.limit)},refreshedAt:new Date().toISOString()};
}

export default {
  uploadAndValidatePayrollExcel,
  uploadAndValidatePayrollFile,
  createAndValidatePayrollManual,
  getPayrollImportPreview,
  commitPayrollImport,
  cancelPayrollImport,
  getPayrollImportControlCenter,
  getPayrollImportAuditCenter,
};
