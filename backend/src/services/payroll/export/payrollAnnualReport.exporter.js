import { createRequire } from "node:module";
import path from "node:path";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

const require = createRequire(import.meta.url);
const fontPackageDir = path.dirname(require.resolve("dejavu-fonts-ttf/package.json"));
const FONT_REGULAR = path.join(fontPackageDir, "ttf", "DejaVuSans.ttf");
const FONT_BOLD = path.join(fontPackageDir, "ttf", "DejaVuSans-Bold.ttf");

const COLORS = {
  navy: "123A69",
  blue: "0878D1",
  teal: "0797A7",
  green: "12935A",
  amber: "E79113",
  red: "D84646",
  ink: "19324F",
  muted: "6B7F94",
  line: "D8E5EE",
  paleBlue: "EAF5FF",
  paleTeal: "E9F8F5",
  paleGreen: "EBF8F0",
  paleAmber: "FFF6E6",
  paleRed: "FFF0F0",
  white: "FFFFFF",
  soft: "F5F9FC",
};

const moneyFormat = '#,##0 "₫";[Red]-#,##0 "₫";–';
const integerFormat = '#,##0;[Red]-#,##0;–';
const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});

const STATUS_META = {
  not_created: { label: "Chưa tạo kỳ", color: COLORS.muted, fill: "EFF3F6" },
  draft: { label: "Chưa có dữ liệu", color: COLORS.muted, fill: "EFF3F6" },
  importing: { label: "Đang nhập dữ liệu", color: COLORS.blue, fill: COLORS.paleBlue },
  reconciling: { label: "Đang đối soát", color: COLORS.teal, fill: COLORS.paleTeal },
  published: { label: "Đã phát hành", color: COLORS.green, fill: COLORS.paleGreen },
  adjusting: { label: "Đang điều chỉnh", color: "7B4ACB", fill: "F3EEFF" },
  locked: { label: "Đã khóa", color: COLORS.navy, fill: "EAF0F7" },
  error: { label: "Có cảnh báo", color: COLORS.red, fill: COLORS.paleRed },
};

function statusMeta(status) {
  return STATUS_META[status] || STATUS_META.draft;
}

function formatDate(value) {
  if (!value) return "–";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "–" : dateFormatter.format(date);
}

function formatMoney(value) {
  return `${new Intl.NumberFormat("vi-VN").format(Number(value || 0))} ₫`;
}

function formatCompactMoney(value) {
  const amount = Number(value || 0);
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`;
  if (amount >= 1_000) return `${(amount / 1_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} nghìn`;
  return `${amount.toLocaleString("vi-VN")} ₫`;
}

function reportContext(data) {
  const unit = data.unitId
    ? data.filters?.units?.find((item) => Number(item.id) === Number(data.unitId))
    : null;
  return {
    scope: unit ? `${unit.code ? `${unit.code} · ` : ""}${unit.name}` : "Toàn doanh nghiệp",
    refreshedAt: formatDate(data.refreshedAt),
  };
}

function applyBorder(cell, color = COLORS.line) {
  cell.border = {
    top: { style: "thin", color: { argb: color } },
    left: { style: "thin", color: { argb: color } },
    bottom: { style: "thin", color: { argb: color } },
    right: { style: "thin", color: { argb: color } },
  };
}

function styleRange(sheet, range, { fill, font, alignment, border = true } = {}) {
  sheet.getCell(range.split(":")[0]);
  for (const row of sheet.getRows(
    sheet.getCell(range.split(":")[0]).row,
    sheet.getCell(range.split(":")[1] || range.split(":")[0]).row - sheet.getCell(range.split(":")[0]).row + 1,
  ) || []) {
    row.eachCell({ includeEmpty: true }, (cell) => {
      if (cell.col < sheet.getCell(range.split(":")[0]).col || cell.col > sheet.getCell(range.split(":")[1] || range.split(":")[0]).col) return;
      if (fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
      if (font) cell.font = { ...cell.font, ...font };
      if (alignment) cell.alignment = { ...cell.alignment, ...alignment };
      if (border) applyBorder(cell);
    });
  }
}

function addKpiCard(sheet, { range, label, valueCell, value, formula, numberFormat, note, fill, valueColor }) {
  const [start, end] = range.split(":");
  const startCell = sheet.getCell(start);
  const endCell = sheet.getCell(end);
  const valueRow = startCell.row + 1;
  const noteRow = endCell.row;
  sheet.mergeCells(startCell.row, startCell.col, startCell.row, endCell.col);
  sheet.mergeCells(valueRow, startCell.col, valueRow + 1, endCell.col);
  sheet.mergeCells(noteRow, startCell.col, noteRow, endCell.col);
  sheet.getCell(startCell.row, startCell.col).value = label;
  sheet.getCell(valueCell).value = formula ? { formula, result: value } : value;
  sheet.getCell(valueCell).numFmt = numberFormat;
  sheet.getCell(noteRow, startCell.col).value = note;
  styleRange(sheet, range, { fill, border: true });
  sheet.getCell(startCell.row, startCell.col).font = { bold: true, color: { argb: COLORS.muted }, size: 10 };
  sheet.getCell(valueCell).font = { bold: true, color: { argb: valueColor }, size: 20 };
  sheet.getCell(valueCell).alignment = { vertical: "middle", horizontal: "left" };
  sheet.getCell(noteRow, startCell.col).font = { color: { argb: COLORS.muted }, size: 9 };
}

function addAnnualDataSheet(workbook, data) {
  const sheet = workbook.addWorksheet("Dữ liệu tháng", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 4 }],
    properties: { tabColor: { argb: COLORS.teal } },
  });
  sheet.showGridLines = false;
  sheet.columns = [
    { key: "month", width: 13 },
    { key: "period", width: 14 },
    { key: "status", width: 22 },
    { key: "employees", width: 14 },
    { key: "income", width: 21 },
    { key: "deductions", width: 21 },
    { key: "net", width: 21 },
    { key: "average", width: 20 },
    { key: "progress", width: 14 },
    { key: "warnings", width: 13 },
    { key: "payment", width: 17 },
    { key: "periodStatus", width: 18, hidden: true },
  ];
  sheet.mergeCells("A1:K1");
  sheet.getCell("A1").value = `DỮ LIỆU BÁO CÁO LƯƠNG NĂM ${data.year}`;
  sheet.getCell("A1").font = { bold: true, size: 17, color: { argb: COLORS.white } };
  sheet.getCell("A1").alignment = { vertical: "middle" };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navy } };
  sheet.getRow(1).height = 32;
  sheet.mergeCells("A2:K2");
  sheet.getCell("A2").value = "Nguồn dữ liệu thật từ các kỳ lương trong năm đã chọn. Các cột tiền tệ giữ nguyên kiểu số để tiếp tục phân tích.";
  sheet.getCell("A2").font = { italic: true, color: { argb: COLORS.muted }, size: 10 };
  sheet.getCell("A2").alignment = { vertical: "middle" };
  sheet.getRow(2).height = 24;
  const headers = ["Tháng", "Mã kỳ", "Trạng thái", "Nhân sự", "Tổng thu nhập", "Tổng khấu trừ", "Thực lĩnh", "Lương bình quân", "Tiến độ", "Cảnh báo", "Ngày chi trả", "Trạng thái kỳ gốc"];
  sheet.getRow(4).values = headers;
  sheet.getRow(4).height = 28;
  sheet.getRow(4).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: COLORS.white }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.teal } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    applyBorder(cell, COLORS.teal);
  });
  data.months.forEach((month) => {
    const meta = statusMeta(month.status);
    const row = sheet.addRow({
      month: `${String(month.month).padStart(2, "0")}/${data.year}`,
      period: month.periodCode,
      status: meta.label,
      employees: Number(month.employeeCount || 0),
      income: Number(month.totalIncome || 0),
      deductions: Number(month.totalDeductions || 0),
      net: Number(month.netSalary || 0),
      average: Number(month.averageSalary || 0),
      progress: Number(month.progress || 0) / 100,
      warnings: Number(month.warningCount || 0),
      payment: month.paymentDate ? new Date(month.paymentDate) : null,
      periodStatus: month.periodStatus || "",
    });
    row.height = 24;
    row.eachCell({ includeEmpty: true }, (cell) => {
      applyBorder(cell);
      cell.font = { color: { argb: COLORS.ink }, size: 10 };
      cell.alignment = { vertical: "middle", horizontal: [4, 5, 6, 7, 8, 9, 10].includes(cell.col) ? "right" : "left" };
      if (row.number % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F9FBFD" } };
    });
    row.getCell(3).font = { bold: true, color: { argb: meta.color }, size: 10 };
    row.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: meta.fill } };
    [5, 6, 7, 8].forEach((column) => { row.getCell(column).numFmt = moneyFormat; });
    row.getCell(4).numFmt = integerFormat;
    row.getCell(9).numFmt = "0%";
    row.getCell(10).numFmt = integerFormat;
    row.getCell(11).numFmt = "dd/mm/yyyy";
    if (month.warningCount > 0) {
      row.getCell(10).font = { bold: true, color: { argb: COLORS.red } };
      row.getCell(10).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.paleRed } };
    }
  });
  sheet.autoFilter = { from: "A4", to: `K${4 + data.months.length}` };
  sheet.addConditionalFormatting({
    ref: `G5:G${4 + data.months.length}`,
    rules: [{ type: "dataBar", priority: 1, color: { argb: COLORS.blue }, gradient: true, cfvo: [{ type: "min" }, { type: "max" }] }],
  });
  sheet.addConditionalFormatting({
    ref: `I5:I${4 + data.months.length}`,
    rules: [{ type: "dataBar", priority: 2, color: { argb: COLORS.teal }, gradient: true, cfvo: [{ type: "num", value: 0 }, { type: "num", value: 1 }] }],
  });
  sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 1, paperSize: 9 };
  sheet.headerFooter.oddFooter = "&LNBC · Báo cáo quản lý lương&CTrang &P / &N&R&D";
  return sheet;
}

function addAnnualOverviewSheet(workbook, data) {
  const sheet = workbook.addWorksheet("Tổng quan", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 12 }],
    properties: { tabColor: { argb: COLORS.blue } },
  });
  sheet.showGridLines = false;
  sheet.columns = [
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 },
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 },
  ];
  const context = reportContext(data);
  sheet.mergeCells("A1:L2");
  sheet.getCell("A1").value = `BÁO CÁO QUẢN TRỊ LƯƠNG NĂM ${data.year}`;
  sheet.getCell("A1").font = { bold: true, size: 22, color: { argb: COLORS.white } };
  sheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navy } };
  sheet.getRow(1).height = 30;
  sheet.getRow(2).height = 22;
  sheet.mergeCells("A3:L3");
  sheet.getCell("A3").value = "Tổng hợp quỹ lương, nhân sự, tiến độ phát hành và các rủi ro cần theo dõi trong 12 tháng.";
  sheet.getCell("A3").font = { color: { argb: COLORS.muted }, size: 11 };
  sheet.getCell("A3").alignment = { vertical: "middle" };
  sheet.mergeCells("A4:L4");
  sheet.getCell("A4").value = `Phạm vi: ${context.scope}   ·   Cập nhật dữ liệu: ${context.refreshedAt}`;
  sheet.getCell("A4").font = { bold: true, color: { argb: COLORS.teal }, size: 10 };
  sheet.getCell("A4").alignment = { vertical: "middle" };
  sheet.getRow(4).height = 22;

  addKpiCard(sheet, {
    range: "A6:C9", label: "TỔNG QUỸ LƯƠNG", valueCell: "A7", value: data.summary.annualPayroll,
    formula: "SUM('Dữ liệu tháng'!G5:G16)", numberFormat: moneyFormat,
    note: "Tổng thực lĩnh trong năm", fill: COLORS.paleBlue, valueColor: COLORS.blue,
  });
  addKpiCard(sheet, {
    range: "D6:F9", label: "LƯƠNG BÌNH QUÂN", valueCell: "D7", value: data.summary.averageSalary,
    numberFormat: moneyFormat,
    note: "Bình quân trên kỳ có dữ liệu", fill: "F3F0FF", valueColor: "6A48D7",
  });
  addKpiCard(sheet, {
    range: "G6:I9", label: "NHÂN SỰ BÌNH QUÂN", valueCell: "G7", value: data.summary.averageEmployees,
    numberFormat: integerFormat,
    note: "Theo các kỳ có dữ liệu", fill: COLORS.paleTeal, valueColor: COLORS.teal,
  });
  addKpiCard(sheet, {
    range: "J6:L9", label: "SỐ KỲ ĐÃ PHÁT HÀNH", valueCell: "J7", value: data.summary.releasedPeriods,
    formula: "COUNTIF('Dữ liệu tháng'!L5:L16,\"published\")+COUNTIF('Dữ liệu tháng'!L5:L16,\"locked\")", numberFormat: '0 " / 12"',
    note: "Tiến độ phát hành năm", fill: COLORS.paleGreen, valueColor: COLORS.green,
  });

  sheet.mergeCells("A11:L11");
  sheet.getCell("A11").value = "XU HƯỚNG VÀ TRẠNG THÁI 12 THÁNG";
  sheet.getCell("A11").font = { bold: true, size: 12, color: { argb: COLORS.navy } };
  sheet.getCell("A11").alignment = { vertical: "middle" };
  sheet.getRow(11).height = 26;
  const overviewHeaders = ["Tháng", "Trạng thái", "Nhân sự", "Tổng thu nhập", "Khấu trừ", "Thực lĩnh", "Lương BQ", "Tiến độ", "Cảnh báo", "Chi trả", "Tỷ trọng quỹ", "Ghi chú quản trị"];
  sheet.getRow(12).values = overviewHeaders;
  sheet.getRow(12).height = 30;
  sheet.getRow(12).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: COLORS.white }, size: 9 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navy } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    applyBorder(cell, COLORS.navy);
  });
  const maxFund = Math.max(...data.months.map((month) => Number(month.netSalary || 0)), 1);
  data.months.forEach((month, index) => {
    const rowNumber = 13 + index;
    const meta = statusMeta(month.status);
    const share = data.summary.annualPayroll ? Number(month.netSalary || 0) / data.summary.annualPayroll : 0;
    const note = month.warningCount > 0
      ? `${month.warningCount} cảnh báo cần xử lý`
      : month.netSalary > 0
        ? month.netSalary === maxFund ? "Quỹ lương cao nhất năm" : "Dữ liệu ổn định"
        : "Chưa phát sinh dữ liệu";
    const row = sheet.getRow(rowNumber);
    row.values = [
      `${String(month.month).padStart(2, "0")}/${data.year}`, meta.label, Number(month.employeeCount || 0),
      Number(month.totalIncome || 0), Number(month.totalDeductions || 0), Number(month.netSalary || 0),
      Number(month.averageSalary || 0), Number(month.progress || 0) / 100, Number(month.warningCount || 0),
      month.paymentDate ? new Date(month.paymentDate) : null, share, note,
    ];
    row.height = 27;
    row.eachCell({ includeEmpty: true }, (cell) => {
      applyBorder(cell);
      cell.font = { color: { argb: COLORS.ink }, size: 9 };
      cell.alignment = { vertical: "middle", horizontal: [3, 4, 5, 6, 7, 8, 9, 11].includes(cell.col) ? "right" : "left", wrapText: true };
      if (rowNumber % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FBFD" } };
    });
    row.getCell(2).font = { bold: true, color: { argb: meta.color }, size: 9 };
    row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: meta.fill } };
    [4, 5, 6, 7].forEach((column) => { row.getCell(column).numFmt = moneyFormat; });
    row.getCell(3).numFmt = integerFormat;
    row.getCell(8).numFmt = "0%";
    row.getCell(9).numFmt = integerFormat;
    row.getCell(10).numFmt = "dd/mm/yyyy";
    row.getCell(11).numFmt = "0.0%";
    if (month.warningCount > 0) {
      row.getCell(9).font = { bold: true, color: { argb: COLORS.red } };
      row.getCell(12).font = { bold: true, color: { argb: COLORS.red } };
    }
  });
  sheet.addConditionalFormatting({
    ref: "F13:F24",
    rules: [{ type: "dataBar", priority: 1, color: { argb: COLORS.blue }, gradient: true, cfvo: [{ type: "min" }, { type: "max" }] }],
  });
  sheet.addConditionalFormatting({
    ref: "H13:H24",
    rules: [{ type: "dataBar", priority: 2, color: { argb: COLORS.teal }, gradient: true, cfvo: [{ type: "num", value: 0 }, { type: "num", value: 1 }] }],
  });

  const issueStart = 27;
  sheet.mergeCells(`A${issueStart}:F${issueStart}`);
  sheet.getCell(`A${issueStart}`).value = "ĐIỂM CẦN CHÚ Ý";
  sheet.getCell(`A${issueStart}`).font = { bold: true, color: { argb: COLORS.navy }, size: 12 };
  sheet.mergeCells(`G${issueStart}:L${issueStart}`);
  sheet.getCell(`G${issueStart}`).value = "THÔNG TIN KIỂM TOÁN";
  sheet.getCell(`G${issueStart}`).font = { bold: true, color: { argb: COLORS.navy }, size: 12 };
  const issues = data.issues?.length ? data.issues : [{ label: "Không có cảnh báo tồn đọng", count: 0, severity: "info" }];
  issues.slice(0, 4).forEach((issue, index) => {
    const row = issueStart + 1 + index;
    sheet.mergeCells(row, 1, row, 4);
    sheet.mergeCells(row, 5, row, 6);
    sheet.getCell(row, 1).value = issue.label;
    sheet.getCell(row, 5).value = Number(issue.count || 0);
    sheet.getCell(row, 5).numFmt = integerFormat;
    styleRange(sheet, `A${row}:F${row}`, { fill: issue.count ? COLORS.paleRed : COLORS.paleGreen });
    sheet.getCell(row, 1).font = { color: { argb: issue.count ? COLORS.red : COLORS.green }, bold: true };
    sheet.getCell(row, 5).font = { color: { argb: issue.count ? COLORS.red : COLORS.green }, bold: true };
  });
  const auditRows = [
    ["Phạm vi báo cáo", context.scope],
    ["Năm dữ liệu", data.year],
    ["Số tháng có dữ liệu", data.months.filter((month) => month.netSalary > 0 || month.employeeCount > 0).length],
    ["Cập nhật gần nhất", context.refreshedAt],
  ];
  auditRows.forEach(([label, value], index) => {
    const row = issueStart + 1 + index;
    sheet.mergeCells(row, 7, row, 9);
    sheet.mergeCells(row, 10, row, 12);
    sheet.getCell(row, 7).value = label;
    sheet.getCell(row, 10).value = value;
    styleRange(sheet, `G${row}:L${row}`, { fill: "F8FBFD" });
    sheet.getCell(row, 7).font = { color: { argb: COLORS.muted }, bold: true };
    sheet.getCell(row, 10).font = { color: { argb: COLORS.ink }, bold: true };
  });

  sheet.autoFilter = { from: "A12", to: "L24" };
  sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 2, paperSize: 9 };
  sheet.headerFooter.oddFooter = "&LNBC · Báo cáo quản trị lương&CTrang &P / &N&R&D";
  return sheet;
}

export async function buildAnnualExcelReport(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "NBC Payroll System";
  workbook.lastModifiedBy = "NBC Payroll System";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.company = "Nhabe Corporation";
  workbook.calcProperties.fullCalcOnLoad = true;
  addAnnualOverviewSheet(workbook, data);
  addAnnualDataSheet(workbook, data);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function drawPdfHeader(doc, data, subtitle) {
  const pageWidth = doc.page.width;
  const left = 36;
  doc.roundedRect(left, 28, pageWidth - 72, 68, 14).fill(`#${COLORS.navy}`);
  doc.font("NbcBold").fontSize(18).fillColor("white").text(`BÁO CÁO QUẢN TRỊ LƯƠNG NĂM ${data.year}`, left + 20, 44, { width: 500 });
  doc.font("NbcRegular").fontSize(9).fillColor("#DCEBFA").text(subtitle, left + 20, 72, { width: 590 });
  doc.font("NbcBold").fontSize(9).fillColor("white").text("NBC PAYROLL", pageWidth - 160, 53, { width: 104, align: "right" });
}

function drawPdfKpi(doc, x, y, width, label, value, note, color, fill) {
  doc.roundedRect(x, y, width, 75, 10).fillAndStroke(fill, `#${COLORS.line}`);
  doc.roundedRect(x + 12, y + 13, 7, 48, 3).fill(color);
  doc.font("NbcBold").fontSize(8).fillColor(`#${COLORS.muted}`).text(label, x + 29, y + 13, { width: width - 39 });
  doc.font("NbcBold").fontSize(15).fillColor(color).text(value, x + 29, y + 31, { width: width - 39, ellipsis: true });
  doc.font("NbcRegular").fontSize(7.5).fillColor(`#${COLORS.muted}`).text(note, x + 29, y + 56, { width: width - 39 });
}

function drawAnnualChart(doc, data, x, y, width, height) {
  const funds = data.months.map((month) => Number(month.netSalary || 0));
  const averages = data.months.map((month) => Number(month.averageSalary || 0));
  const maxValue = Math.max(...funds, ...averages, 1);
  const chartTop = y + 34;
  const chartBottom = y + height - 34;
  const chartHeight = chartBottom - chartTop;
  const slot = width / 12;
  doc.roundedRect(x, y, width, height, 12).fillAndStroke("#F8FBFD", `#${COLORS.line}`);
  doc.font("NbcBold").fontSize(10).fillColor(`#${COLORS.navy}`).text("Xu hướng quỹ lương và lương bình quân", x + 16, y + 12);
  doc.font("NbcRegular").fontSize(7.5).fillColor(`#${COLORS.muted}`).text("Đơn vị: VND · Cột: thực lĩnh · Đường: lương bình quân", x + width - 290, y + 14, { width: 274, align: "right" });
  for (let i = 0; i <= 4; i += 1) {
    const gridY = chartBottom - (chartHeight * i) / 4;
    doc.moveTo(x + 42, gridY).lineTo(x + width - 12, gridY).lineWidth(0.6).strokeColor("#DDE8F0").stroke();
    doc.font("NbcRegular").fontSize(6.8).fillColor(`#${COLORS.muted}`).text(formatCompactMoney((maxValue * i) / 4), x + 4, gridY - 4, { width: 34, align: "right" });
  }
  const points = [];
  data.months.forEach((month, index) => {
    const center = x + 42 + slot * index + slot / 2;
    const barWidth = Math.min(25, slot * 0.54);
    const amount = Number(month.netSalary || 0);
    const barHeight = amount ? Math.max(2, (amount / maxValue) * chartHeight) : 1;
    const meta = statusMeta(month.status);
    doc.roundedRect(center - barWidth / 2, chartBottom - barHeight, barWidth, barHeight, 3).fill(`#${meta.color}`);
    doc.font("NbcRegular").fontSize(6.8).fillColor(`#${COLORS.muted}`).text(String(month.month).padStart(2, "0"), center - slot / 2, chartBottom + 8, { width: slot, align: "center" });
    const avgY = chartBottom - (Number(month.averageSalary || 0) / maxValue) * chartHeight;
    points.push([center, avgY]);
  });
  if (points.some(([, pointY]) => pointY < chartBottom)) {
    doc.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach(([pointX, pointY]) => doc.lineTo(pointX, pointY));
    doc.lineWidth(2).strokeColor(`#${COLORS.green}`).stroke();
    points.forEach(([pointX, pointY]) => doc.circle(pointX, pointY, 2.5).fill(`#${COLORS.green}`));
  }
}

function drawPdfFooter(doc, data, pageNumber) {
  const context = reportContext(data);
  const y = doc.page.height - 45;
  doc.moveTo(36, y - 6).lineTo(doc.page.width - 36, y - 6).lineWidth(0.5).strokeColor("#D8E5EE").stroke();
  doc.font("NbcRegular").fontSize(7).fillColor(`#${COLORS.muted}`).text(`Nguồn: NBC Payroll · ${context.scope} · Cập nhật ${context.refreshedAt}`, 36, y, { width: 570 });
  doc.text(`Trang ${pageNumber} / 2`, doc.page.width - 110, y, { width: 74, align: "right" });
}

function drawPdfTable(doc, data) {
  const x = 36;
  const y = 118;
  const widths = [48, 95, 48, 95, 82, 95, 58, 45, 82];
  const headers = ["Tháng", "Trạng thái", "Nhân sự", "Thu nhập", "Khấu trừ", "Thực lĩnh", "Tiến độ", "Cảnh báo", "Ngày chi trả"];
  const headerHeight = 30;
  let cursorX = x;
  headers.forEach((header, index) => {
    doc.rect(cursorX, y, widths[index], headerHeight).fillAndStroke(`#${COLORS.navy}`, `#${COLORS.navy}`);
    doc.font("NbcBold").fontSize(7).fillColor("white").text(header, cursorX + 4, y + 9, { width: widths[index] - 8, align: index >= 2 && index <= 7 ? "right" : "left" });
    cursorX += widths[index];
  });
  data.months.forEach((month, rowIndex) => {
    const rowY = y + headerHeight + rowIndex * 28;
    const meta = statusMeta(month.status);
    const values = [
      `${String(month.month).padStart(2, "0")}/${data.year}`,
      meta.label,
      Number(month.employeeCount || 0).toLocaleString("vi-VN"),
      formatCompactMoney(month.totalIncome),
      formatCompactMoney(month.totalDeductions),
      formatCompactMoney(month.netSalary),
      `${Number(month.progress || 0)}%`,
      Number(month.warningCount || 0).toLocaleString("vi-VN"),
      formatDate(month.paymentDate),
    ];
    cursorX = x;
    values.forEach((value, columnIndex) => {
      const fill = rowIndex % 2 ? "#F8FBFD" : "#FFFFFF";
      doc.rect(cursorX, rowY, widths[columnIndex], 28).fillAndStroke(fill, `#${COLORS.line}`);
      const isStatus = columnIndex === 1;
      const isWarning = columnIndex === 7 && month.warningCount > 0;
      doc.font(isStatus || isWarning ? "NbcBold" : "NbcRegular")
        .fontSize(6.8)
        .fillColor(isStatus ? `#${meta.color}` : isWarning ? `#${COLORS.red}` : `#${COLORS.ink}`)
        .text(String(value), cursorX + 4, rowY + 9, { width: widths[columnIndex] - 8, align: columnIndex >= 2 && columnIndex <= 7 ? "right" : "left", ellipsis: true });
      cursorX += widths[columnIndex];
    });
  });
}

export async function buildAnnualPdfReport(data) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: "A4", layout: "landscape", margins: { top: 28, right: 36, bottom: 32, left: 36 }, info: { Title: `Báo cáo quản trị lương năm ${data.year}`, Author: "Nhabe Corporation", Subject: "Báo cáo tổng quan quản lý lương" } });
    const chunks = [];
    document.on("data", (chunk) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
    document.registerFont("NbcRegular", FONT_REGULAR);
    document.registerFont("NbcBold", FONT_BOLD);

    drawPdfHeader(document, data, "Tổng hợp quỹ lương, lương bình quân, nhân sự, tiến độ phát hành và cảnh báo trong 12 tháng.");
    const context = reportContext(data);
    document.font("NbcRegular").fontSize(8).fillColor(`#${COLORS.muted}`).text(`Phạm vi: ${context.scope}   ·   Dữ liệu cập nhật: ${context.refreshedAt}`, 40, 104);
    const cardGap = 10;
    const cardWidth = (document.page.width - 72 - cardGap * 3) / 4;
    drawPdfKpi(document, 36, 122, cardWidth, "TỔNG QUỸ LƯƠNG", formatCompactMoney(data.summary.annualPayroll), "Tổng thực lĩnh trong năm", `#${COLORS.blue}`, `#${COLORS.paleBlue}`);
    drawPdfKpi(document, 36 + (cardWidth + cardGap), 122, cardWidth, "LƯƠNG BÌNH QUÂN", formatCompactMoney(data.summary.averageSalary), "Trên các kỳ có dữ liệu", "#6A48D7", "#F3F0FF");
    drawPdfKpi(document, 36 + (cardWidth + cardGap) * 2, 122, cardWidth, "NHÂN SỰ BÌNH QUÂN", Number(data.summary.averageEmployees || 0).toLocaleString("vi-VN"), "Nhân sự / kỳ", `#${COLORS.teal}`, `#${COLORS.paleTeal}`);
    drawPdfKpi(document, 36 + (cardWidth + cardGap) * 3, 122, cardWidth, "KỲ ĐÃ PHÁT HÀNH", `${data.summary.releasedPeriods} / 12`, "Tiến độ phát hành năm", `#${COLORS.green}`, `#${COLORS.paleGreen}`);
    drawAnnualChart(document, data, 36, 214, document.page.width - 72, 302);
    drawPdfFooter(document, data, 1);

    document.addPage({ size: "A4", layout: "landscape", margins: { top: 28, right: 36, bottom: 32, left: 36 } });
    drawPdfHeader(document, data, "Chi tiết số liệu theo từng tháng · số tiền hiển thị rút gọn để đọc nhanh, dữ liệu đầy đủ có trong bản Excel.");
    document.font("NbcBold").fontSize(11).fillColor(`#${COLORS.navy}`).text("CHI TIẾT 12 KỲ LƯƠNG", 36, 106);
    drawPdfTable(document, data);
    const issueY = 478;
    document.roundedRect(36, issueY, document.page.width - 72, 54, 10).fillAndStroke("#F8FBFD", `#${COLORS.line}`);
    document.font("NbcBold").fontSize(8).fillColor(`#${COLORS.navy}`).text("ĐIỂM CẦN CHÚ Ý", 50, issueY + 10);
    const issues = data.issues?.length ? data.issues : [{ label: "Không có cảnh báo tồn đọng", count: 0 }];
    const issueText = issues.slice(0, 4).map((issue) => `${issue.label}: ${Number(issue.count || 0).toLocaleString("vi-VN")}`).join("   ·   ");
    document.font("NbcRegular").fontSize(8).fillColor(issues.some((issue) => issue.count > 0) ? `#${COLORS.red}` : `#${COLORS.green}`).text(issueText, 50, issueY + 29, { width: document.page.width - 100, ellipsis: true });
    drawPdfFooter(document, data, 2);
    document.end();
  });
}
