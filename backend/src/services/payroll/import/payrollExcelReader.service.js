import { createHash } from "node:crypto";
import ExcelJS from "exceljs";

import { ErrorHandler } from
  "../../../middleware/errorMiddleware.js";

import {
  PAYROLL_EXCEL_HEADER_ROW_NUMBER,
  REQUIRED_COLUMNS,
  parseSalaryColumnHeader,
} from "../../../shared/payroll/payrollExcelColumns.js";

import {
  cellText,
  normalizeHeader,
} from "../../../shared/payroll/payrollNormalizer.js";

/**
 * Tạo checksum SHA-256 cho file Excel.
 *
 * Checksum dùng để:
 * - Chống upload trùng file trong cùng kỳ lương.
 * - Đối chiếu file đã upload.
 * - Phục vụ audit log sau này.
 *
 * @param {Buffer} buffer
 * @returns {string}
 */
export function calculateChecksum(buffer) {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length === 0
  ) {
    throw new ErrorHandler(
      "Dữ liệu file Excel không hợp lệ",
      400,
    );
  }

  return createHash("sha256")
    .update(buffer)
    .digest("hex");
}

/**
 * Kiểm tra các tiêu đề cột bị trùng.
 *
 * Cột không có tên sẽ được bỏ qua.
 *
 * @param {string[]} headers
 * @returns {void}
 */
export function validateDuplicateHeaders(
  headers,
) {
  const observedHeaders = new Set();
  const duplicatedHeaders = new Set();

  for (const rawHeader of headers) {
    const header = normalizeHeader(
      rawHeader,
    );

    if (!header) {
      continue;
    }

    if (observedHeaders.has(header)) {
      duplicatedHeaders.add(header);
    }

    observedHeaders.add(header);
  }

  if (duplicatedHeaders.size > 0) {
    throw new ErrorHandler(
      `File Excel có cột bị trùng: ${
        [...duplicatedHeaders].join(", ")
      }`,
      400,
    );
  }
}

/**
 * Kiểm tra file có đầy đủ các cột bắt buộc.
 *
 * @param {string[]} headers
 * @returns {void}
 */
export function validateRequiredHeaders(
  headers,
) {
  const headerSet = new Set(
    headers.filter(Boolean),
  );

  const missingColumns =
    REQUIRED_COLUMNS.filter(
      (requiredColumn) =>
        !headerSet.has(requiredColumn),
    );

  if (missingColumns.length > 0) {
    throw new ErrorHandler(
      `File Excel thiếu cột: ${
        missingColumns.join(", ")
      }`,
      400,
    );
  }
}

/**
 * Tìm các cột tiêu chí lương động.
 *
 * Ví dụ:
 *
 * Tiêu chí: Lương cơ bản [BASE_SALARY]
 * Tiêu chí: BHXH [SOCIAL_INSURANCE]
 *
 * @param {string[]} headers
 *
 * @returns {Array<{
 *   columnNumber: number,
 *   header: string,
 *   label: string,
 *   code: string
 * }>}
 */
export function extractSalaryColumns(
  headers,
) {
  return headers
    .map((header, index) => {
      const salaryColumn =
        parseSalaryColumnHeader(header);

      if (!salaryColumn) {
        return null;
      }

      return {
        columnNumber: index + 1,

        header:
          salaryColumn.header,

        label:
          salaryColumn.label,

        code:
          salaryColumn.code,
      };
    })
    .filter(Boolean);
}

/**
 * Đọc hàng tiêu đề trong worksheet.
 *
 * @param {ExcelJS.Worksheet} worksheet
 * @returns {string[]}
 */
export function readWorksheetHeaders(
  worksheet,
) {
  const headers = [];

  for (
    let columnNumber = 1;
    columnNumber <= worksheet.columnCount;
    columnNumber += 1
  ) {
    const cellValue =
      worksheet.getCell(
        PAYROLL_EXCEL_HEADER_ROW_NUMBER,
        columnNumber,
      ).value;

    headers.push(
      normalizeHeader(cellValue),
    );
  }

  return headers;
}

/**
 * Chuyển một hàng Excel thành object theo tên cột.
 *
 * @param {ExcelJS.Row} excelRow
 * @param {string[]} headers
 *
 * @returns {Record<string, unknown>}
 */
export function mapExcelRowToObject(
  excelRow,
  headers,
) {
  const rowData = {};

  headers.forEach(
    (header, columnIndex) => {
      if (!header) {
        return;
      }

      rowData[header] =
        excelRow.getCell(
          columnIndex + 1,
        ).value;
    },
  );

  return rowData;
}

/**
 * Kiểm tra một dòng có dữ liệu hay không.
 *
 * @param {Record<string, unknown>} rowData
 * @returns {boolean}
 */
export function hasExcelRowData(
  rowData,
) {
  return Object.values(rowData).some(
    (value) => cellText(value) !== "",
  );
}

/**
 * Đọc file Excel bảng lương.
 *
 * Reader chỉ chịu trách nhiệm đọc cấu trúc file.
 * Không kiểm tra:
 * - Nhân viên có tồn tại hay không.
 * - Kỳ lương có hợp lệ hay không.
 * - Tổng tiền có khớp hay không.
 *
 * Các kiểm tra nghiệp vụ đó thuộc
 * payrollImportValidator.service.js.
 *
 * @param {Buffer} buffer
 *
 * @returns {Promise<{
 *   worksheetName: string,
 *   headerRowNumber: number,
 *   headers: string[],
 *   salaryColumns: Array<{
 *     columnNumber: number,
 *     header: string,
 *     label: string,
 *     code: string
 *   }>,
 *   rows: Array<{
 *     rowNumber: number,
 *     rowData: Record<string, unknown>
 *   }>
 * }>}
 */
export async function readPayrollExcel(
  buffer,
) {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length === 0
  ) {
    throw new ErrorHandler(
      "File Excel không có dữ liệu",
      400,
    );
  }

  const workbook =
    new ExcelJS.Workbook();

  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw new ErrorHandler(
      "Không thể đọc file Excel",
      400,
    );
  }

  const worksheet =
    workbook.worksheets[0];

  if (!worksheet) {
    throw new ErrorHandler(
      "File Excel không có worksheet dữ liệu",
      400,
    );
  }

  if (
    worksheet.rowCount <
    PAYROLL_EXCEL_HEADER_ROW_NUMBER
  ) {
    throw new ErrorHandler(
      "Worksheet Excel không có dữ liệu",
      400,
    );
  }

  const headers =
    readWorksheetHeaders(worksheet);

  if (
    headers.every(
      (header) => !header,
    )
  ) {
    throw new ErrorHandler(
      "File Excel không có dòng tiêu đề",
      400,
    );
  }

  validateDuplicateHeaders(headers);
  validateRequiredHeaders(headers);

  const salaryColumns =
    extractSalaryColumns(headers);

  const rows = [];

  worksheet.eachRow(
    {
      includeEmpty: false,
    },
    (excelRow, rowNumber) => {
      if (
        rowNumber ===
        PAYROLL_EXCEL_HEADER_ROW_NUMBER
      ) {
        return;
      }

      const rowData =
        mapExcelRowToObject(
          excelRow,
          headers,
        );

      if (!hasExcelRowData(rowData)) {
        return;
      }

      rows.push({
        rowNumber,
        rowData,
      });
    },
  );

  if (rows.length === 0) {
    throw new ErrorHandler(
      "File Excel không có dòng dữ liệu lương",
      400,
    );
  }

  return {
    worksheetName: worksheet.name,

    headerRowNumber:
      PAYROLL_EXCEL_HEADER_ROW_NUMBER,

    headers,

    salaryColumns,

    rows,
  };
}

/**
 * Alias tạm thời để những file cũ vẫn có thể sử dụng.
 *
 * Sau khi toàn bộ code chuyển sang readPayrollExcel(),
 * alias này có thể được xóa.
 */
export const parseExcelFile =
  readPayrollExcel;

export default {
  calculateChecksum,

  validateDuplicateHeaders,

  validateRequiredHeaders,

  extractSalaryColumns,

  readWorksheetHeaders,

  mapExcelRowToObject,

  hasExcelRowData,

  readPayrollExcel,

  parseExcelFile,
};