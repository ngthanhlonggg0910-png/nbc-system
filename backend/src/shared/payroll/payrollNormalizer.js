/**
 * Các hàm chuẩn hóa dữ liệu dùng chung
 * trong nghiệp vụ import bảng lương.
 *
 * File này chỉ chứa các hàm thuần:
 * - Không truy vấn database.
 * - Không đọc request/response.
 * - Không xử lý nghiệp vụ validation.
 */

/**
 * Chuyển giá trị của một ô Excel thành text.
 *
 * Hỗ trợ:
 * - Chuỗi.
 * - Số.
 * - Boolean.
 * - Công thức ExcelJS.
 * - Rich text.
 * - Hyperlink/text object.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function cellText(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  /*
   * ExcelJS có thể trả về ô công thức dạng:
   *
   * {
   *   formula: "SUM(A1:A5)",
   *   result: 15000000
   * }
   */
  if (
    typeof value === "object" &&
    value.result !== undefined
  ) {
    return cellText(value.result);
  }

  /*
   * ExcelJS rich text:
   *
   * {
   *   richText: [
   *     { text: "Lương " },
   *     { text: "cơ bản" }
   *   ]
   * }
   */
  if (
    typeof value === "object" &&
    Array.isArray(value.richText)
  ) {
    return value.richText
      .map((item) =>
        String(item?.text ?? ""),
      )
      .join("")
      .trim();
  }

  /*
   * ExcelJS hyperlink hoặc text object:
   *
   * {
   *   text: "NBC001",
   *   hyperlink: "..."
   * }
   */
  if (
    typeof value === "object" &&
    value.text !== undefined
  ) {
    return String(
      value.text ?? "",
    ).trim();
  }

  return String(value).trim();
}

/**
 * Chuyển giá trị Excel thành số.
 *
 * Hỗ trợ:
 * - 1000000
 * - 1.000.000
 * - 1000000,50
 * - Ô công thức có thuộc tính result
 *
 * Giá trị trống được xem là 0.
 * Giá trị không hợp lệ trả về Number.NaN.
 *
 * @param {unknown} value
 * @returns {number}
 */
export function toNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  if (
    typeof value === "object" &&
    value.result !== undefined
  ) {
    return toNumber(value.result);
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : Number.NaN;
  }

  const normalizedValue = cellText(
    value,
  )
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");

  if (!normalizedValue) {
    return 0;
  }

  const numberValue = Number(
    normalizedValue,
  );

  return Number.isFinite(numberValue)
    ? numberValue
    : Number.NaN;
}

/**
 * Chuẩn hóa tiêu đề cột Excel.
 *
 * Ví dụ:
 *
 * "  Mã   nhân viên  "
 * thành:
 * "Mã nhân viên"
 *
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeHeader(value) {
  return cellText(value)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Chuẩn hóa mã nhân viên.
 *
 * Ví dụ:
 *
 * " nbc001 "
 * thành:
 * "NBC001"
 *
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeStaffId(value) {
  return cellText(value)
    .trim()
    .toUpperCase();
}

/**
 * Chuẩn hóa mã kỳ lương.
 *
 * Ví dụ:
 *
 * " 2026-10 "
 * thành:
 * "2026-10"
 *
 * Hàm này chỉ chuẩn hóa text.
 * Việc kiểm tra định dạng YYYY-MM thuộc validator.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function normalizePeriodCode(
  value,
) {
  return cellText(value).trim();
}

/**
 * Chuẩn hóa mã tiêu chí lương.
 *
 * Ví dụ:
 *
 * " base_salary "
 * thành:
 * "BASE_SALARY"
 *
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeSalaryItemCode(
  value,
) {
  return cellText(value)
    .trim()
    .toUpperCase();
}

/**
 * Chuẩn hóa một chuỗi văn bản thông thường.
 *
 * Dùng cho:
 * - Họ tên.
 * - Phòng ban.
 * - Trạng thái nguồn.
 * - Nội dung mô tả.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeText(value) {
  return cellText(value)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Kiểm tra giá trị Excel có trống hay không.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isBlankExcelValue(
  value,
) {
  return cellText(value) === "";
}

/**
 * Lấy một giá trị trong object dữ liệu Excel.
 *
 * @param {Record<string, unknown> | null | undefined} rowData
 * @param {string} columnName
 * @returns {unknown}
 */
export function getCellValue(
  rowData,
  columnName,
) {
  if (
    !rowData ||
    typeof rowData !== "object"
  ) {
    return null;
  }

  return rowData[columnName] ?? null;
}

export default {
  cellText,

  toNumber,

  normalizeHeader,

  normalizeStaffId,

  normalizePeriodCode,

  normalizeSalaryItemCode,

  normalizeText,

  isBlankExcelValue,

  getCellValue,
};