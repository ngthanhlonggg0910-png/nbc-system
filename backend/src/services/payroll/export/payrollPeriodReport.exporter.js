import { createRequire } from "node:module";
import path from "node:path";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

const require = createRequire(import.meta.url);
const fontDir = path.dirname(require.resolve("dejavu-fonts-ttf/package.json"));
const FONT_REGULAR = path.join(fontDir, "ttf", "DejaVuSans.ttf");
const FONT_BOLD = path.join(fontDir, "ttf", "DejaVuSans-Bold.ttf");

const C = {
  navy: "173F6D", blue: "0878D1", teal: "0A9B9A", green: "148957",
  amber: "D9860B", red: "D64550", purple: "7555C5", ink: "19324F",
  muted: "71869A", line: "D8E5EE", soft: "F5F9FC", white: "FFFFFF",
  paleBlue: "EAF5FF", paleTeal: "E9F8F5", paleGreen: "EAF7EF",
  paleAmber: "FFF5E3", paleRed: "FFF0F1", palePurple: "F2EEFF",
};

const STATUS = {
  draft: ["Bản nháp", C.muted, "EDF2F6"],
  open: ["Đã mở", C.blue, C.paleBlue],
  importing: ["Đang nhập dữ liệu", C.blue, C.paleBlue],
  reconciling: ["Đang đối soát", C.amber, C.paleAmber],
  ready_to_release: ["Sẵn sàng phát hành", C.teal, C.paleTeal],
  released: ["Đã phát hành", C.green, C.paleGreen],
  adjusting: ["Đang điều chỉnh", C.purple, C.palePurple],
  locked: ["Đã khóa", C.navy, "EAF0F7"],
};

const moneyFormat = '#,##0 "₫";[Red]-#,##0 "₫";–';
const integerFormat = '#,##0;[Red]-#,##0;–';
const dateFormat = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });
const numberFormat = new Intl.NumberFormat("vi-VN");

function meta(status) {
  return STATUS[status] || [status || "Chưa xác định", C.muted, "EDF2F6"];
}

function asDate(value) {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = value instanceof Date ? value : asDate(value);
  return date ? dateFormat.format(date) : "–";
}

function formatDateTime(value) {
  if (!value) return "–";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "–"
    : new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh",
    }).format(date);
}

function formatMoney(value) {
  return `${numberFormat.format(Number(value) || 0)} ₫`;
}

function applyBorder(cell, color = C.line) {
  cell.border = {
    top: { style: "thin", color: { argb: color } },
    left: { style: "thin", color: { argb: color } },
    bottom: { style: "thin", color: { argb: color } },
    right: { style: "thin", color: { argb: color } },
  };
}

function styleCells(sheet, startRow, endRow, startColumn, endColumn, style = {}) {
  for (let row = startRow; row <= endRow; row += 1) {
    for (let column = startColumn; column <= endColumn; column += 1) {
      const cell = sheet.getCell(row, column);
      if (style.fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: style.fill } };
      if (style.font) cell.font = { ...cell.font, ...style.font };
      if (style.alignment) cell.alignment = { ...cell.alignment, ...style.alignment };
      if (style.border !== false) applyBorder(cell, style.border || C.line);
    }
  }
}

function addKpi(sheet, range, label, value, note, fill, color) {
  const [start, end] = range.split(":");
  const a = sheet.getCell(start);
  const b = sheet.getCell(end);
  sheet.mergeCells(a.row, a.col, a.row, b.col);
  sheet.mergeCells(a.row + 1, a.col, a.row + 1, b.col);
  sheet.mergeCells(a.row + 2, a.col, a.row + 2, b.col);
  styleCells(sheet, a.row, b.row, a.col, b.col, { fill });
  sheet.getCell(a.row, a.col).value = label;
  sheet.getCell(a.row + 1, a.col).value = value;
  sheet.getCell(a.row + 2, a.col).value = note;
  sheet.getCell(a.row, a.col).font = { bold: true, color: { argb: C.muted }, size: 9 };
  sheet.getCell(a.row + 1, a.col).font = { bold: true, color: { argb: color }, size: 19 };
  sheet.getCell(a.row + 2, a.col).font = { color: { argb: C.muted }, size: 8 };
  [a.row, a.row + 1, a.row + 2].forEach((row) => { sheet.getCell(row, a.col).alignment = { vertical: "middle", horizontal: "left" }; });
}

function filterDescription(report) {
  const parts = [report.appliedFilters.unit];
  if (report.appliedFilters.month) parts.push(`Tháng ${String(report.appliedFilters.month).padStart(2, "0")}`);
  if (report.appliedFilters.status) parts.push(meta(report.appliedFilters.status)[0]);
  if (report.appliedFilters.manager) parts.push(`Phụ trách: ${report.appliedFilters.manager}`);
  if (report.appliedFilters.search) parts.push(`Tìm kiếm: “${report.appliedFilters.search}”`);
  return parts.filter(Boolean).join("  ·  ");
}

export async function buildPayrollPeriodExcelReport(report) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "NBC Payroll";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.calcProperties.fullCalcOnLoad = false;

  const sheet = workbook.addWorksheet("Danh sách kỳ lương", {
    views: [{ state: "frozen", ySplit: 11 }],
    properties: { tabColor: { argb: C.teal } },
  });
  sheet.showGridLines = false;
  sheet.columns = [
    { key: "code", width: 13 }, { key: "name", width: 28 }, { key: "status", width: 22 },
    { key: "start", width: 14 }, { key: "end", width: 14 }, { key: "payment", width: 15 },
    { key: "manager", width: 23 }, { key: "employees", width: 12 }, { key: "payslips", width: 12 },
    { key: "gross", width: 20 }, { key: "deductions", width: 19 }, { key: "net", width: 20 },
    { key: "average", width: 19 }, { key: "progress", width: 13 }, { key: "issues", width: 12 },
  ];

  sheet.mergeCells("A1:O2");
  sheet.getCell("A1").value = `DANH SÁCH KỲ LƯƠNG NĂM ${report.year}`;
  sheet.getCell("A1").font = { bold: true, size: 22, color: { argb: C.white } };
  sheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.navy } };
  sheet.getRow(1).height = 30;
  sheet.getRow(2).height = 22;
  sheet.mergeCells("A3:O3");
  sheet.getCell("A3").value = "Báo cáo vận hành kỳ lương theo đúng phạm vi và bộ lọc đang chọn trên hệ thống.";
  sheet.getCell("A3").font = { color: { argb: C.muted }, size: 10 };
  sheet.mergeCells("A4:O4");
  sheet.getCell("A4").value = `Phạm vi: ${filterDescription(report)}   ·   Xuất lúc: ${formatDateTime(report.generatedAt)}`;
  sheet.getCell("A4").font = { bold: true, color: { argb: C.teal }, size: 9 };

  addKpi(sheet, "A6:D8", "TỔNG KỲ", report.summary.total, "Trong phạm vi lọc", C.paleBlue, C.blue);
  addKpi(sheet, "E6:H8", "ĐANG XỬ LÝ", report.summary.processing, "Đang vận hành", C.paleTeal, C.teal);
  addKpi(sheet, "I6:L8", "CHỜ PHÁT HÀNH", report.summary.ready, "Dữ liệu sẵn sàng", C.paleGreen, C.green);
  addKpi(sheet, "M6:O8", "CÓ VẤN ĐỀ", report.summary.issues, "Kỳ cần kiểm tra", C.paleAmber, C.amber);

  sheet.mergeCells("A10:O10");
  sheet.getCell("A10").value = "CHI TIẾT VẬN HÀNH";
  sheet.getCell("A10").font = { bold: true, color: { argb: C.navy }, size: 12 };
  const headers = ["Kỳ", "Tên kỳ", "Trạng thái", "Từ ngày", "Đến ngày", "Ngày chi trả", "Người phụ trách", "Nhân sự", "Phiếu lương", "Tổng thu nhập", "Tổng khấu trừ", "Thực lĩnh", "Lương bình quân", "Tiến độ", "Vấn đề"];
  sheet.getRow(11).values = headers;
  sheet.getRow(11).height = 29;
  sheet.getRow(11).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: C.white }, size: 9 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.navy } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    applyBorder(cell, C.navy);
  });

  report.items.forEach((item) => {
    const [statusLabel, statusColor, statusFill] = meta(item.operationalStatus);
    const row = sheet.addRow({
      code: item.periodCode.replace("-", "/"), name: item.periodName, status: statusLabel,
      start: asDate(item.startDate), end: asDate(item.endDate), payment: asDate(item.paymentDate),
      manager: item.manager.name, employees: item.summary.employees, payslips: item.summary.totalPayslips,
      gross: item.summary.grossIncome, deductions: item.summary.deductions, net: item.summary.netSalary,
      average: item.summary.averageSalary, progress: item.workflow.progress / 100, issues: item.issues,
    });
    row.height = 25;
    row.eachCell({ includeEmpty: true }, (cell) => {
      applyBorder(cell);
      cell.font = { color: { argb: C.ink }, size: 9 };
      cell.alignment = { vertical: "middle", horizontal: [8, 9, 10, 11, 12, 13, 14, 15].includes(cell.col) ? "right" : "left", wrapText: cell.col <= 7 };
      if (row.number % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FAFCFD" } };
    });
    [4, 5, 6].forEach((column) => { row.getCell(column).numFmt = "dd/mm/yyyy"; });
    [8, 9, 15].forEach((column) => { row.getCell(column).numFmt = integerFormat; });
    [10, 11, 12, 13].forEach((column) => { row.getCell(column).numFmt = moneyFormat; });
    row.getCell(14).numFmt = "0%";
    row.getCell(3).font = { bold: true, color: { argb: statusColor }, size: 9 };
    row.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: statusFill } };
    if (item.issues > 0) {
      row.getCell(15).font = { bold: true, color: { argb: C.red }, size: 9 };
      row.getCell(15).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.paleRed } };
    }
  });

  const lastRow = Math.max(12, 11 + report.items.length);
  sheet.autoFilter = { from: "A11", to: `O${lastRow}` };
  if (report.items.length) {
    sheet.addConditionalFormatting({
      ref: `N12:N${lastRow}`,
      rules: [{ type: "dataBar", priority: 1, color: { argb: C.teal }, gradient: true, cfvo: [{ type: "num", value: 0 }, { type: "num", value: 1 }] }],
    });
  }
  sheet.pageSetup = { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.25, right: 0.25, top: 0.45, bottom: 0.45, header: 0.2, footer: 0.2 } };
  sheet.headerFooter.oddFooter = "&LNBC · Danh sách kỳ lương&CTrang &P / &N&R&D";
  sheet.pageSetup.printTitlesRow = "11:11";
  sheet.properties.defaultRowHeight = 20;
  sheet.getColumn(2).alignment = { wrapText: true };

  const notes = workbook.addWorksheet("Hướng dẫn", { properties: { tabColor: { argb: C.amber } } });
  notes.showGridLines = false;
  notes.columns = [{ width: 28 }, { width: 90 }];
  notes.mergeCells("A1:B1");
  notes.getCell("A1").value = "THÔNG TIN BÁO CÁO";
  notes.getCell("A1").font = { bold: true, size: 16, color: { argb: C.white } };
  notes.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.navy } };
  [["Phạm vi", filterDescription(report)], ["Năm dữ liệu", report.year], ["Số kỳ xuất", report.items.length], ["Nguồn", "Dữ liệu thật tại thời điểm xuất từ hệ thống NBC Payroll"], ["Lưu ý", "Các số tiền và ngày tháng là dữ liệu có kiểu; có thể lọc, sắp xếp và tiếp tục phân tích trong Excel."]].forEach((values, index) => {
    const row = notes.addRow(values);
    row.height = index === 4 ? 42 : 26;
    row.eachCell((cell) => { applyBorder(cell); cell.alignment = { vertical: "middle", wrapText: true }; cell.font = { color: { argb: C.ink }, size: 10 }; });
    row.getCell(1).font = { bold: true, color: { argb: C.teal }, size: 10 };
  });

  return workbook.xlsx.writeBuffer();
}

function pdfBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function fill(doc, color) {
  doc.fillColor(`#${color}`);
}

function pdfText(doc, text, x, y, options = {}) {
  doc.font(options.bold ? "Bold" : "Regular").fontSize(options.size || 8);
  fill(doc, options.color || C.ink);
  doc.text(String(text ?? "–"), x, y, { width: options.width, height: options.height, align: options.align || "left", ellipsis: true, lineBreak: false });
}

function addPdfHeader(doc, report, continuation = false) {
  doc.roundedRect(28, 24, 786, 66, 9).fill(`#${C.navy}`);
  pdfText(doc, `DANH SÁCH KỲ LƯƠNG NĂM ${report.year}`, 48, 38, { bold: true, size: 19, color: C.white, width: 500 });
  pdfText(doc, continuation ? "Trang tiếp theo · dữ liệu theo bộ lọc đã chọn" : filterDescription(report), 48, 66, { size: 8, color: "D9E7F2", width: 680 });
}

function addPdfKpis(doc, report) {
  const cards = [
    ["TỔNG KỲ", report.summary.total, C.paleBlue, C.blue],
    ["ĐANG XỬ LÝ", report.summary.processing, C.paleTeal, C.teal],
    ["CHỜ PHÁT HÀNH", report.summary.ready, C.paleGreen, C.green],
    ["CÓ VẤN ĐỀ", report.summary.issues, C.paleAmber, C.amber],
  ];
  cards.forEach(([label, value, background, color], index) => {
    const x = 28 + index * 199;
    doc.roundedRect(x, 102, 188, 56, 8).fillAndStroke(`#${background}`, `#${C.line}`);
    pdfText(doc, label, x + 14, 113, { bold: true, size: 7.5, color: C.muted, width: 155 });
    pdfText(doc, numberFormat.format(value), x + 14, 130, { bold: true, size: 17, color, width: 155 });
  });
}

const PDF_COLUMNS = [
  ["Kỳ", 53, "left"], ["Trạng thái", 99, "left"], ["Chi trả", 66, "left"], ["Phụ trách", 96, "left"],
  ["NS", 34, "right"], ["Phiếu", 38, "right"], ["Tổng TN", 83, "right"], ["Khấu trừ", 76, "right"],
  ["Thực lĩnh", 83, "right"], ["Tiến độ", 52, "right"], ["VĐ", 35, "right"],
];

function drawPdfTableHeader(doc, y) {
  let x = 28;
  PDF_COLUMNS.forEach(([label, width, align]) => {
    doc.rect(x, y, width, 25).fillAndStroke(`#${C.navy}`, `#${C.navy}`);
    pdfText(doc, label, x + 4, y + 8, { bold: true, size: 6.6, color: C.white, width: width - 8, align });
    x += width;
  });
  return y + 25;
}

function drawPdfRow(doc, item, y, index) {
  const [statusLabel, statusColor, statusFill] = meta(item.operationalStatus);
  const values = [
    item.periodCode.replace("-", "/"), statusLabel, formatDate(item.paymentDate), item.manager.name,
    numberFormat.format(item.summary.employees), numberFormat.format(item.summary.totalPayslips),
    formatMoney(item.summary.grossIncome), formatMoney(item.summary.deductions), formatMoney(item.summary.netSalary),
    `${item.workflow.progress}%`, numberFormat.format(item.issues),
  ];
  let x = 28;
  PDF_COLUMNS.forEach(([, width, align], column) => {
    const background = column === 1 ? statusFill : index % 2 ? "FAFCFD" : C.white;
    doc.rect(x, y, width, 25).fillAndStroke(`#${background}`, `#${C.line}`);
    pdfText(doc, values[column], x + 4, y + 8, { bold: column === 0 || column === 1 || (column === 10 && item.issues > 0), size: 6.3, color: column === 1 ? statusColor : column === 10 && item.issues > 0 ? C.red : C.ink, width: width - 8, align });
    x += width;
  });
  return y + 25;
}

export async function buildPayrollPeriodPdfReport(report) {
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0, bufferPages: true, info: { Title: `Danh sách kỳ lương năm ${report.year}`, Author: "NBC Payroll" } });
  doc.registerFont("Regular", FONT_REGULAR);
  doc.registerFont("Bold", FONT_BOLD);
  const promise = pdfBuffer(doc);

  addPdfHeader(doc, report);
  addPdfKpis(doc, report);
  pdfText(doc, "CHI TIẾT VẬN HÀNH", 28, 174, { bold: true, size: 10, color: C.navy, width: 300 });
  let y = drawPdfTableHeader(doc, 192);
  report.items.forEach((item, index) => {
    if (y + 25 > 555) {
      doc.addPage({ size: "A4", layout: "landscape", margin: 0 });
      addPdfHeader(doc, report, true);
      y = drawPdfTableHeader(doc, 108);
    }
    y = drawPdfRow(doc, item, y, index);
  });

  if (!report.items.length) {
    doc.rect(28, y, 715, 48).fillAndStroke(`#${C.soft}`, `#${C.line}`);
    pdfText(doc, "Không có kỳ lương phù hợp với bộ lọc đang chọn.", 48, y + 17, { bold: true, size: 9, color: C.muted, width: 650, align: "center" });
  }

  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    pdfText(doc, `NBC Payroll · Xuất ngày ${formatDate(report.generatedAt)}`, 28, 570, { size: 6.5, color: C.muted, width: 300 });
    pdfText(doc, `Trang ${index + 1} / ${range.count}`, 700, 570, { size: 6.5, color: C.muted, width: 110, align: "right" });
  }
  doc.end();
  return promise;
}
