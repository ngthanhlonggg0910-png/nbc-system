/**
 * Cấu hình cấu trúc cột của file Excel bảng lương.
 *
 * File này chỉ chứa:
 * - Tên worksheet mặc định.
 * - Vị trí dòng tiêu đề.
 * - Tên các cột cố định.
 * - Danh sách cột bắt buộc.
 * - Quy tắc cột tiêu chí lương động.
 *
 * Không đặt logic đọc Excel hoặc truy vấn database tại đây.
 */

/**
 * Tên worksheet được sử dụng khi hệ thống tạo file mẫu.
 *
 * Reader vẫn có thể đọc worksheet đầu tiên,
 * không bắt buộc file upload phải dùng đúng tên này.
 */
export const PAYROLL_EXCEL_DEFAULT_WORKSHEET_NAME =
  "BangLuong";

/**
 * Dòng chứa tiêu đề cột trong file Excel.
 *
 * ExcelJS đánh số dòng bắt đầu từ 1.
 */
export const PAYROLL_EXCEL_HEADER_ROW_NUMBER = 1;

/**
 * Tên các cột cố định của bảng lương.
 *
 * Dùng object thay vì viết chuỗi trực tiếp ở nhiều file để:
 * - Tránh sai chính tả.
 * - Tránh một file dùng tên khác file còn lại.
 * - Dễ thay đổi định dạng Excel sau này.
 */
export const PAYROLL_EXCEL_COLUMNS =
  Object.freeze({
    PERIOD_CODE: "Tháng",

    STAFF_ID: "Mã nhân viên",

    EMPLOYEE_NAME: "Họ tên",

    DEPARTMENT_NAME: "Phòng ban",

    GROSS_INCOME: "Tổng thu nhập",

    TAXABLE_INCOME:
      "Thu nhập chịu thuế",

    TOTAL_DEDUCTIONS:
      "Tổng khấu trừ",

    NET_SALARY: "Thực lĩnh",

    STATUS: "Trạng thái",
  });

/**
 * Những cột bắt buộc phải xuất hiện trong file Excel.
 *
 * Họ tên và phòng ban không bắt buộc vì dữ liệu chính thức
 * của nhân viên phải được đối chiếu bằng Mã nhân viên.
 */
export const REQUIRED_COLUMNS =
  Object.freeze([
    PAYROLL_EXCEL_COLUMNS.PERIOD_CODE,

    PAYROLL_EXCEL_COLUMNS.STAFF_ID,

    PAYROLL_EXCEL_COLUMNS.GROSS_INCOME,

    PAYROLL_EXCEL_COLUMNS.TAXABLE_INCOME,

    PAYROLL_EXCEL_COLUMNS.TOTAL_DEDUCTIONS,

    PAYROLL_EXCEL_COLUMNS.NET_SALARY,
  ]);

/**
 * Các cột tổng hợp tiền lương.
 *
 * Danh sách này phục vụ:
 * - Validator.
 * - Template Excel.
 * - Preview dữ liệu import.
 */
export const PAYROLL_SUMMARY_COLUMNS =
  Object.freeze([
    PAYROLL_EXCEL_COLUMNS.GROSS_INCOME,

    PAYROLL_EXCEL_COLUMNS.TAXABLE_INCOME,

    PAYROLL_EXCEL_COLUMNS.TOTAL_DEDUCTIONS,

    PAYROLL_EXCEL_COLUMNS.NET_SALARY,
  ]);

/**
 * Tiền tố của cột tiêu chí lương động.
 *
 * Ví dụ:
 * Tiêu chí: Lương cơ bản [BASE_SALARY]
 */
export const SALARY_COLUMN_PREFIX =
  "Tiêu chí:";

/**
 * Định dạng cột chi tiết lương động.
 *
 * Ví dụ hợp lệ:
 *
 * Tiêu chí: Lương cơ bản [BASE_SALARY]
 * Tiêu chí: BHXH [SOCIAL_INSURANCE]
 *
 * Nhóm 1: label hiển thị.
 * Nhóm 2: code của tiêu chí lương.
 */
export const SALARY_COLUMN_PATTERN =
  /^Tiêu chí:\s*(.*?)\s*\[([^\]]+)\]\s*$/i;

/**
 * Tạo tên cột tiêu chí lương theo đúng định dạng hệ thống.
 *
 * @param {object} salaryItem
 * @param {string} salaryItem.label
 * @param {string} salaryItem.code
 *
 * @returns {string}
 *
 * @example
 * buildSalaryColumnHeader({
 *   label: "Lương cơ bản",
 *   code: "BASE_SALARY",
 * });
 *
 * // "Tiêu chí: Lương cơ bản [BASE_SALARY]"
 */
export function buildSalaryColumnHeader({
  label,
  code,
}) {
  const normalizedLabel = String(
    label ?? "",
  ).trim();

  const normalizedCode = String(
    code ?? "",
  )
    .trim()
    .toUpperCase();

  if (
    !normalizedLabel ||
    !normalizedCode
  ) {
    return "";
  }

  return (
    `${SALARY_COLUMN_PREFIX} ` +
    `${normalizedLabel} ` +
    `[${normalizedCode}]`
  );
}

/**
 * Kiểm tra một tiêu đề có phải cột tiêu chí lương hay không.
 *
 * @param {unknown} header
 * @returns {boolean}
 */
export function isSalaryColumnHeader(
  header,
) {
  const normalizedHeader = String(
    header ?? "",
  ).trim();

  if (!normalizedHeader) {
    return false;
  }

  return SALARY_COLUMN_PATTERN.test(
    normalizedHeader,
  );
}

/**
 * Phân tích tiêu đề cột tiêu chí lương.
 *
 * @param {unknown} header
 *
 * @returns {{
 *   header: string,
 *   label: string,
 *   code: string
 * } | null}
 */
export function parseSalaryColumnHeader(
  header,
) {
  const normalizedHeader = String(
    header ?? "",
  ).trim();

  const match =
    normalizedHeader.match(
      SALARY_COLUMN_PATTERN,
    );

  if (!match) {
    return null;
  }

  return {
    header: normalizedHeader,

    label: match[1].trim(),

    code: match[2]
      .trim()
      .toUpperCase(),
  };
}

export default {
  PAYROLL_EXCEL_DEFAULT_WORKSHEET_NAME,

  PAYROLL_EXCEL_HEADER_ROW_NUMBER,

  PAYROLL_EXCEL_COLUMNS,

  REQUIRED_COLUMNS,

  PAYROLL_SUMMARY_COLUMNS,

  SALARY_COLUMN_PREFIX,

  SALARY_COLUMN_PATTERN,

  buildSalaryColumnHeader,

  isSalaryColumnHeader,

  parseSalaryColumnHeader,
};