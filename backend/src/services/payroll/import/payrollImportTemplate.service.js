import ExcelJS from "exceljs";

import * as salaryMasterRepository from
  "../../../repositories/payroll/salaryMaster.repository.js";

const PAYROLL_TEMPLATE_HEADERS = [
  "Tháng",
  "Mã nhân viên",
  "Họ tên",
  "Phòng ban",
  "Trạng thái",
  "Tổng thu nhập",
  "Thu nhập chịu thuế",
  "Tổng khấu trừ",
  "Thực lĩnh",
];

function buildSalaryHeader(
  salaryItem,
) {
  return (
    `Tiêu chí: ` +
    `${salaryItem.label} ` +
    `[${salaryItem.code}]`
  );
}

async function resolveTemplateHeaders() {
  const salaryItems =
    await salaryMasterRepository
      .findEnabledSalaryItems();

  return [
    ...PAYROLL_TEMPLATE_HEADERS,
    ...salaryItems.map(
      buildSalaryHeader,
    ),
  ];
}

const escapeHtmlValue = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/**
 * Tạo file HTML mẫu cho import bảng lương
 * (cùng cấu trúc cột với file Excel).
 */
export async function buildPayrollImportHtmlTemplate() {
  const headers =
    await resolveTemplateHeaders();

  const headerCells = headers
    .map(
      (header) =>
        `<th>${escapeHtmlValue(header)}</th>`,
    )
    .join("");

  const blankRow = `<tr>${headers
    .map(() => "<td></td>")
    .join("")}</tr>`;

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>Mẫu import bảng lương</title>
<style>
body{font-family:Arial,sans-serif;margin:24px;color:#1c3550}
h1{font-size:18px}
p{font-size:12px;color:#5a7186}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #b9cbd8;padding:6px 8px;font-size:12px;text-align:left}
th{background:#eef4f8}
</style>
</head>
<body>
<h1>Mẫu import bảng lương</h1>
<p>Lưu ý: không đổi tên các cột trong bảng dưới đây. Tháng định dạng YYYY-MM (ví dụ 2026-11). Các cột tiền chỉ nhập số.</p>
<table>
<thead><tr>${headerCells}</tr></thead>
<tbody>${blankRow}${blankRow}${blankRow}</tbody>
</table>
</body>
</html>`;

  return {
    fileName:
      "payroll-import-template.html",

    buffer:
      Buffer.from(
        html,
        "utf-8",
      ),
  };
}

/**
 * Tạo file Excel mẫu cho import bảng lương.
 */
export async function buildPayrollImportTemplate() {
  const headers =
    await resolveTemplateHeaders();

  const workbook =
    new ExcelJS.Workbook();

  workbook.creator =
    "NBC Payroll System";

  workbook.created =
    new Date();

  const worksheet =
    workbook.addWorksheet(
      "BangLuong",
    );

  worksheet.addRow(
    headers,
  );

  worksheet.views = [
    {
      state: "frozen",
      ySplit: 1,
    },
  ];

  worksheet.getRow(1).font = {
    bold: true,
  };

  worksheet.getRow(1).alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };

  worksheet.getRow(1).height = 32;

  worksheet.columns =
    headers.map(
      (header, index) => ({
        key:
          `column_${index + 1}`,

        width:
          Math.min(
            Math.max(
              String(header).length + 4,
              14,
            ),
            40,
          ),
      }),
    );

  const instructionSheet =
    workbook.addWorksheet(
      "HuongDan",
    );

  instructionSheet.addRows([
    [
      "HƯỚNG DẪN IMPORT BẢNG LƯƠNG",
    ],

    [
      "1.",
      "Không đổi tên các cột trong sheet BangLuong.",
    ],

    [
      "2.",
      "Tháng sử dụng định dạng YYYY-MM, ví dụ 2026-11.",
    ],

    [
      "3.",
      "Mã nhân viên phải tồn tại trong hệ thống.",
    ],

    [
      "4.",
      "Các cột tiền chỉ nhập số, không nhập ký hiệu tiền tệ.",
    ],

    [
      "5.",
      "Các cột Tiêu chí được tạo theo cấu hình salary_master_items đang bật.",
    ],
  ]);

  instructionSheet.getColumn(1).width =
    10;

  instructionSheet.getColumn(2).width =
    80;

  instructionSheet.getRow(1).font = {
    bold: true,
  };

  const arrayBuffer =
    await workbook.xlsx.writeBuffer();

  return {
    fileName:
      "payroll-import-template.xlsx",

    buffer:
      Buffer.from(
        arrayBuffer,
      ),
  };
}

export default {
  buildPayrollImportTemplate,
  buildPayrollImportHtmlTemplate,
};