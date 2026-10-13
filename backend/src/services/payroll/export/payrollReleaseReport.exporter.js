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
  amber: "D9860B", red: "D64550", ink: "19324F", muted: "71869A",
  line: "D8E5EE", soft: "F5F9FC", white: "FFFFFF", paleBlue: "EAF5FF",
  paleTeal: "E9F8F5", paleGreen: "EAF7EF", paleAmber: "FFF5E3", paleRed: "FFF0F1",
};

const moneyFormat = '#,##0 "₫";[Red]-#,##0 "₫";–';
const numberFormat = new Intl.NumberFormat("vi-VN");
const dateTimeFormat = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
});

function gateLabel(value) {
  return ({
    READY: "Sẵn sàng phát hành", READY_WITH_WARNINGS: "Sẵn sàng, có cảnh báo",
    BLOCKED: "Chưa đủ điều kiện", RELEASED: "Đã phát hành", LOCKED: "Đã khóa",
  })[value] || value || "Chưa xác định";
}

function formatDate(value) {
  if (!value) return "–";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "–" : dateTimeFormat.format(date);
}

function border(cell, color = C.line) {
  cell.border = {
    top: { style: "thin", color: { argb: color } }, left: { style: "thin", color: { argb: color } },
    bottom: { style: "thin", color: { argb: color } }, right: { style: "thin", color: { argb: color } },
  };
}

function fill(cell, color) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
}

function styleRange(sheet, range, { background = C.white, color = C.ink, bold = false, size = 10, align = "left" } = {}) {
  const [from, to] = range.split(":").map((address) => sheet.getCell(address));
  for (let row = from.row; row <= to.row; row += 1) for (let column = from.col; column <= to.col; column += 1) {
    const cell = sheet.getCell(row, column);
    fill(cell, background); border(cell); cell.font = { color: { argb: color }, bold, size };
    cell.alignment = { vertical: "middle", horizontal: align, wrapText: true };
  }
}

function addMetric(sheet, range, label, value, note, background, color) {
  const [from, to] = range.split(":").map((address) => sheet.getCell(address));
  sheet.mergeCells(from.row, from.col, from.row, to.col);
  sheet.mergeCells(from.row + 1, from.col, from.row + 1, to.col);
  sheet.mergeCells(from.row + 2, from.col, from.row + 2, to.col);
  styleRange(sheet, `${sheet.getCell(from.row, from.col).address}:${sheet.getCell(from.row + 2, to.col).address}`, { background });
  sheet.getCell(from.row, from.col).value = label;
  sheet.getCell(from.row, from.col).font = { bold: true, size: 9, color: { argb: C.muted } };
  sheet.getCell(from.row + 1, from.col).value = value;
  sheet.getCell(from.row + 1, from.col).font = { bold: true, size: 18, color: { argb: color } };
  sheet.getCell(from.row + 2, from.col).value = note;
  sheet.getCell(from.row + 2, from.col).font = { size: 8, color: { argb: C.muted } };
}

export async function buildPayrollReleaseExcelReport(report) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "NBC Payroll";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Đối soát phát hành", { views: [{ state: "frozen", ySplit: 13 }] });
  sheet.showGridLines = false;
  sheet.columns = [
    { width: 15 }, { width: 29 }, { width: 13 }, { width: 13 }, { width: 18 },
    { width: 18 }, { width: 16 }, { width: 15 }, { width: 20 }, { width: 18 },
  ];

  sheet.mergeCells("A1:J2");
  sheet.getCell("A1").value = `ĐỐI SOÁT PHÁT HÀNH LƯƠNG · ${report.period?.code || "CHƯA CHỌN KỲ"}`;
  sheet.getCell("A1").font = { bold: true, size: 21, color: { argb: C.white } };
  sheet.getCell("A1").alignment = { vertical: "middle" }; fill(sheet.getCell("A1"), C.navy);
  sheet.mergeCells("A3:J3");
  sheet.getCell("A3").value = `${report.period?.name || "Kỳ lương"} · Ngày chi trả: ${formatDate(report.period?.paymentDate)} · Trạng thái: ${gateLabel(report.gate?.status)}`;
  sheet.getCell("A3").font = { color: { argb: C.muted }, size: 10 };
  sheet.mergeCells("A4:J4");
  sheet.getCell("A4").value = `Phạm vi: ${report.appliedFilters || "Toàn kỳ"} · Xuất lúc ${formatDate(report.generatedAt)}`;
  sheet.getCell("A4").font = { bold: true, color: { argb: C.teal }, size: 9 };

  addMetric(sheet, "A6:B8", "TỔNG PHIẾU", report.summary.totalSlips, "Trong kỳ lương", C.paleBlue, C.blue);
  addMetric(sheet, "C6:D8", "ĐỦ ĐIỀU KIỆN", report.summary.readySlips, `${report.releaseRate}% tổng phiếu`, C.paleTeal, C.teal);
  addMetric(sheet, "E6:G8", "TỔNG THỰC LĨNH", Number(report.summary.net), "Giá trị dự kiến chi trả", C.paleGreen, C.green);
  sheet.getCell("E7").numFmt = moneyFormat;
  addMetric(sheet, "H6:J8", "NGOẠI LỆ", report.riskCount, report.riskCount ? "Cần xử lý hoặc rà soát" : "Không có điều kiện chặn", report.riskCount ? C.paleAmber : C.paleGreen, report.riskCount ? C.amber : C.green);

  sheet.mergeCells("A10:J10"); sheet.getCell("A10").value = "KIỂM TRA TRƯỚC PHÁT HÀNH";
  sheet.getCell("A10").font = { bold: true, size: 12, color: { argb: C.navy } };
  sheet.getRow(11).values = ["Điều kiện", "Hoàn thành", "Tổng", "Tỷ lệ", "Kết quả"];
  sheet.mergeCells("E11:J11");
  styleRange(sheet, "A11:J11", { background: C.navy, color: C.white, bold: true, align: "center" });
  report.readiness.forEach((item) => {
    const row = sheet.addRow([item.label, item.completed, item.total, item.percentage / 100, item.status === "complete" ? "Đạt" : item.status === "blocked" ? "Bị chặn" : "Cảnh báo"]);
    sheet.mergeCells(row.number, 5, row.number, 10);
    row.eachCell({ includeEmpty: true }, (cell) => { border(cell); cell.alignment = { vertical: "middle", wrapText: true }; });
    row.getCell(4).numFmt = "0%";
    row.getCell(5).font = { bold: true, color: { argb: item.status === "complete" ? C.green : item.status === "blocked" ? C.red : C.amber } };
  });

  const start = sheet.lastRow.number + 2;
  sheet.mergeCells(start, 1, start, 10); sheet.getCell(start, 1).value = "PHẠM VI THEO ĐƠN VỊ";
  sheet.getCell(start, 1).font = { bold: true, size: 12, color: { argb: C.navy } };
  const header = start + 1;
  sheet.getRow(header).values = ["Mã đơn vị", "Đơn vị", "Nhân sự", "Phiếu", "Tổng thu nhập", "Thực lĩnh", "Đủ điều kiện", "Đã phát hành", "Ngoại lệ", "Cập nhật cuối"];
  styleRange(sheet, `A${header}:J${header}`, { background: C.navy, color: C.white, bold: true, align: "center" });
  report.queue.forEach((unit) => {
    const row = sheet.addRow([unit.code, unit.name, unit.employees, unit.slips, unit.gross, unit.net, unit.ready, unit.released, unit.issues, unit.updatedAt ? new Date(unit.updatedAt) : null]);
    row.eachCell({ includeEmpty: true }, (cell) => { border(cell); cell.alignment = { vertical: "middle", wrapText: true }; });
    [5, 6].forEach((column) => { row.getCell(column).numFmt = moneyFormat; });
    row.getCell(10).numFmt = "dd/mm/yyyy hh:mm";
    if (unit.issues) { fill(row.getCell(9), C.paleRed); row.getCell(9).font = { bold: true, color: { argb: C.red } }; }
  });
  if (report.queue.length) sheet.autoFilter = { from: `A${header}`, to: `J${header + report.queue.length}` };

  const riskStart = sheet.lastRow.number + 2;
  sheet.mergeCells(riskStart, 1, riskStart, 10); sheet.getCell(riskStart, 1).value = "RỦI RO & NGOẠI LỆ";
  sheet.getCell(riskStart, 1).font = { bold: true, size: 12, color: { argb: C.navy } };
  sheet.getRow(riskStart + 1).values = ["Mã", "Nội dung", "Số lượng"];
  sheet.mergeCells(riskStart + 1, 2, riskStart + 1, 9);
  styleRange(sheet, `A${riskStart + 1}:J${riskStart + 1}`, { background: C.navy, color: C.white, bold: true, align: "center" });
  (report.risks.length ? report.risks : [{ code: "OK", label: "Không có ngoại lệ được phát hiện", count: 0 }]).forEach((risk) => {
    const row = sheet.addRow([risk.code, risk.label, risk.count]); sheet.mergeCells(row.number, 2, row.number, 9);
    row.eachCell({ includeEmpty: true }, (cell) => { border(cell); cell.alignment = { vertical: "middle", wrapText: true }; });
    row.getCell(1).font = { bold: true, color: { argb: risk.count ? C.red : C.green } };
  });

  sheet.pageSetup = { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  sheet.headerFooter.oddFooter = "&LNBC · Đối soát phát hành&CTrang &P / &N&R&D";
  return workbook.xlsx.writeBuffer();
}

function bufferDocument(doc) {
  return new Promise((resolve, reject) => {
    const chunks = []; doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject);
  });
}

function text(doc, value, x, y, options = {}) {
  doc.font(options.bold ? "Bold" : "Regular").fontSize(options.size || 9).fillColor(`#${options.color || C.ink}`)
    .text(String(value ?? "–"), x, y, { width: options.width, align: options.align || "left", lineBreak: options.lineBreak !== false });
}

export async function buildPayrollReleasePdfReport(report) {
  const doc = new PDFDocument({ size: "A4", margin: 30, layout: "landscape", bufferPages: true });
  doc.registerFont("Regular", FONT_REGULAR); doc.registerFont("Bold", FONT_BOLD);
  const result = bufferDocument(doc);
  doc.roundedRect(30, 26, 782, 65, 9).fill(`#${C.navy}`);
  text(doc, `ĐỐI SOÁT PHÁT HÀNH LƯƠNG · ${report.period?.code || "–"}`, 50, 40, { bold: true, size: 19, color: C.white, width: 600 });
  text(doc, `${report.period?.name || "Kỳ lương"} · ${gateLabel(report.gate?.status)} · Xuất ${formatDate(report.generatedAt)}`, 50, 68, { size: 8, color: "D9E7F2", width: 690 });
  const cards = [
    ["TỔNG PHIẾU", numberFormat.format(report.summary.totalSlips), C.paleBlue, C.blue],
    ["ĐỦ ĐIỀU KIỆN", numberFormat.format(report.summary.readySlips), C.paleTeal, C.teal],
    ["TỔNG THỰC LĨNH", `${numberFormat.format(report.summary.net)} ₫`, C.paleGreen, C.green],
    ["NGOẠI LỆ", numberFormat.format(report.riskCount), report.riskCount ? C.paleAmber : C.paleGreen, report.riskCount ? C.amber : C.green],
  ];
  cards.forEach(([label, value, background, color], index) => {
    const x = 30 + index * 199; doc.roundedRect(x, 104, 187, 58, 8).fillAndStroke(`#${background}`, `#${C.line}`);
    text(doc, label, x + 13, 116, { bold: true, size: 7.5, color: C.muted, width: 160 });
    text(doc, value, x + 13, 135, { bold: true, size: value.length > 16 ? 13 : 17, color, width: 160 });
  });
  text(doc, "KIỂM TRA TRƯỚC PHÁT HÀNH", 30, 184, { bold: true, size: 11, color: C.navy, width: 400 });
  let y = 206;
  report.readiness.forEach((item) => {
    doc.roundedRect(30, y, 380, 31, 5).fillAndStroke(`#${C.soft}`, `#${C.line}`);
    text(doc, item.label, 42, y + 10, { bold: true, size: 8, width: 220 });
    text(doc, `${item.completed}/${item.total} · ${item.percentage}%`, 270, y + 10, { bold: true, size: 8, color: item.status === "complete" ? C.green : item.status === "blocked" ? C.red : C.amber, width: 120, align: "right" });
    y += 36;
  });
  text(doc, "RỦI RO & NGOẠI LỆ", 432, 184, { bold: true, size: 11, color: C.navy, width: 350 });
  let riskY = 206;
  (report.risks.length ? report.risks : [{ code: "OK", label: "Không có ngoại lệ được phát hiện", count: 0 }]).slice(0, 7).forEach((risk) => {
    doc.roundedRect(432, riskY, 380, 38, 5).fillAndStroke(`#${risk.count ? C.paleRed : C.paleGreen}`, `#${C.line}`);
    text(doc, risk.code, 444, riskY + 7, { bold: true, size: 7, color: risk.count ? C.red : C.green, width: 90 });
    text(doc, risk.label, 530, riskY + 7, { size: 7.5, width: 220 });
    text(doc, numberFormat.format(risk.count), 765, riskY + 7, { bold: true, size: 9, color: risk.count ? C.red : C.green, width: 30, align: "right" });
    riskY += 43;
  });
  const tableY = Math.max(y, riskY) + 22;
  text(doc, "PHẠM VI THEO ĐƠN VỊ", 30, tableY, { bold: true, size: 11, color: C.navy, width: 400 });
  const headers = ["Đơn vị", "Nhân sự", "Phiếu", "Gross", "Thực lĩnh", "Sẵn sàng", "Ngoại lệ"];
  const widths = [215, 70, 65, 120, 120, 90, 80]; let x = 30;
  headers.forEach((header, index) => { doc.rect(x, tableY + 20, widths[index], 26).fill(`#${C.navy}`); text(doc, header, x + 6, tableY + 29, { bold: true, size: 7, color: C.white, width: widths[index] - 12, align: index ? "right" : "left" }); x += widths[index]; });
  let rowY = tableY + 46;
  report.queue.slice(0, 10).forEach((unit, rowIndex) => {
    x = 30; const values = [`${unit.code} · ${unit.name}`, unit.employees, unit.slips, `${numberFormat.format(unit.gross)} ₫`, `${numberFormat.format(unit.net)} ₫`, `${unit.readiness}%`, unit.issues];
    values.forEach((value, index) => { doc.rect(x, rowY, widths[index], 25).fillAndStroke(rowIndex % 2 ? "#FAFCFD" : "#FFFFFF", `#${C.line}`); text(doc, value, x + 6, rowY + 8, { bold: index === 0 || index === 6, size: 7, color: index === 6 && unit.issues ? C.red : C.ink, width: widths[index] - 12, align: index ? "right" : "left", lineBreak: false }); x += widths[index]; });
    rowY += 25;
  });
  doc.end();
  return result;
}
