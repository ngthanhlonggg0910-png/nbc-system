import { ErrorHandler } from "../../../middleware/errorMiddleware.js";
import {
  PAYROLL_EXCEL_HEADER_ROW_NUMBER,
  REQUIRED_COLUMNS,
  parseSalaryColumnHeader,
} from "../../../shared/payroll/payrollExcelColumns.js";
import { normalizeHeader } from "../../../shared/payroll/payrollNormalizer.js";
import {
  validateDuplicateHeaders,
  validateRequiredHeaders,
} from "./payrollExcelReader.service.js";

const MAX_HTML_LENGTH = 5 * 1024 * 1024;

function decodeEntities(value) {
  const decodeCodePoint = (code, radix = 10) => {
    const number = Number.parseInt(code, radix);
    return Number.isInteger(number) && number >= 0 && number <= 0x10ffff
      ? String.fromCodePoint(number)
      : "";
  };
  return String(value ?? "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => decodeCodePoint(code))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => decodeCodePoint(code, 16));
}

function textContent(fragment) {
  return normalizeHeader(decodeEntities(String(fragment ?? "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")));
}

function tableRows(html) {
  const tables = String(html).match(/<table\b[\s\S]*?<\/table>/gi) || [];
  for (const table of tables) {
    const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) =>
      [...match[1].matchAll(/<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((cell) => textContent(cell[2])),
    ).filter((row) => row.some(Boolean));
    if (rows.length >= 2) return rows;
  }
  return [];
}

export function readPayrollHtml(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw new ErrorHandler("File HTML không có dữ liệu", 400);
  }
  if (buffer.length > MAX_HTML_LENGTH) {
    throw new ErrorHandler("File HTML không được vượt quá 5 MB", 400);
  }

  const html = buffer.toString("utf8").replace(/^\uFEFF/, "");
  if (!/<table\b/i.test(html)) {
    throw new ErrorHandler("File HTML phải chứa bảng dữ liệu lương", 400);
  }
  const parsedRows = tableRows(html);
  if (parsedRows.length < 2) {
    throw new ErrorHandler("Không tìm thấy bảng HTML có dòng tiêu đề và dữ liệu", 400);
  }

  const normalizedRows = parsedRows.map((row) => row.map(normalizeHeader));
  const headerIndex = normalizedRows.findIndex((row) =>
    REQUIRED_COLUMNS.every((required) => row.includes(required)),
  );
  if (headerIndex < 0) {
    throw new ErrorHandler(
      `Bảng HTML thiếu dòng tiêu đề chuẩn. Cần có: ${REQUIRED_COLUMNS.join(", ")}`,
      400,
    );
  }
  const headers = normalizedRows[headerIndex];
  validateDuplicateHeaders(headers);
  validateRequiredHeaders(headers);
  const salaryColumns = headers.map((header, index) => {
    const parsed = parseSalaryColumnHeader(header);
    return parsed ? { columnNumber: index + 1, ...parsed } : null;
  }).filter(Boolean);
  const rows = parsedRows.slice(headerIndex + 1).map((values, index) => {
    const rowData = {};
    headers.forEach((header, column) => { if (header) rowData[header] = values[column] ?? ""; });
    return { rowNumber: headerIndex + index + PAYROLL_EXCEL_HEADER_ROW_NUMBER + 1, rowData };
  }).filter(({ rowData }) => Object.values(rowData).some((value) => String(value).trim()));

  if (!rows.length) throw new ErrorHandler("File HTML không có dòng dữ liệu lương", 400);
  if (rows.length > 10000) throw new ErrorHandler("File HTML vượt quá 10.000 dòng dữ liệu", 400);
  return { worksheetName: "HTML Table", headerRowNumber: PAYROLL_EXCEL_HEADER_ROW_NUMBER, headers, salaryColumns, rows };
}
