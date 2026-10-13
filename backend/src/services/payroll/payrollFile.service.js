import crypto from "node:crypto";
import path from "node:path";
import {
  mkdir,
  readFile,
  writeFile,
  unlink,
} from "node:fs/promises";
import sanitizeHtml from "sanitize-html";

import pool from "../../config/db.js";
import AppError from "../../middleware/errorMiddleware.js";
import * as payrollFileRepository from "../../repositories/payroll/payrollFile.repository.js";

const MAX_HTML_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_PAYSLIP_STATUSES = [
  "published",
  "confirmed",
  "adjusted",
];

const PAYROLL_STORAGE_ROOT = path.resolve(
  process.env.PAYROLL_STORAGE_PATH || "storage/payroll",
);

const HTML_CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'none'",
  "style-src 'unsafe-inline'",
  "img-src data:",
  "font-src data:",
  "frame-src 'none'",
  "object-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join("; ");

const normalizeId = (value, fieldName = "id") => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(`${fieldName} không hợp lệ.`, 400);
  }

  return id;
};

const normalizeStaffId = (value) => {
  const staffId = String(value || "").trim();

  if (!staffId) {
    throw new AppError("Không xác định được mã nhân viên.", 400);
  }

  return staffId;
};

const sanitizeFileName = (fileName) => {
  const normalized = String(fileName || "payslip.html")
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 180);

  return normalized || "payslip.html";
};

const calculateChecksum = (buffer) =>
  crypto.createHash("sha256").update(buffer).digest("hex");

const assertHtmlFile = (file) => {
  if (!file) {
    throw new AppError("Vui lòng chọn file HTML phiếu lương.", 400);
  }

  if (!Buffer.isBuffer(file.buffer)) {
    throw new AppError(
      "Hệ thống không đọc được nội dung file tải lên.",
      400,
    );
  }

  if (file.buffer.length === 0) {
    throw new AppError("File HTML đang trống.", 400);
  }

  if (file.buffer.length > MAX_HTML_FILE_SIZE) {
    throw new AppError(
      "File HTML không được vượt quá 5 MB.",
      413,
    );
  }

  const extension = path.extname(file.originalname || "").toLowerCase();

  if (![".html", ".htm"].includes(extension)) {
    throw new AppError(
      "Chỉ chấp nhận file có định dạng .html hoặc .htm.",
      400,
    );
  }

  const mimeType = String(file.mimetype || "").toLowerCase();

  const acceptedMimeTypes = [
    "text/html",
    "application/xhtml+xml",
    "application/octet-stream",
  ];

  if (mimeType && !acceptedMimeTypes.includes(mimeType)) {
    throw new AppError(
      `Loại file ${mimeType} không được hỗ trợ.`,
      400,
    );
  }
};

const sanitizePayslipHtml = (rawHtml) => {
  if (!rawHtml || !String(rawHtml).trim()) {
    throw new AppError("Nội dung file HTML đang trống.", 400);
  }

  const cleanedHtml = sanitizeHtml(String(rawHtml), {
    allowedTags: [
      "html",
      "head",
      "meta",
      "title",
      "style",
      "body",
      "main",
      "section",
      "article",
      "header",
      "footer",
      "div",
      "span",
      "p",
      "br",
      "hr",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "small",
      "sub",
      "sup",
      "ul",
      "ol",
      "li",
      "table",
      "thead",
      "tbody",
      "tfoot",
      "tr",
      "th",
      "td",
      "colgroup",
      "col",
      "img",
    ],

    allowedAttributes: {
      "*": [
        "id",
        "class",
        "style",
        "title",
        "role",
        "aria-label",
        "aria-hidden",
        "data-label",
      ],
      html: ["lang"],
      meta: ["charset", "name", "content"],
      table: [
        "border",
        "cellpadding",
        "cellspacing",
        "width",
        "align",
      ],
      th: ["colspan", "rowspan", "width", "align"],
      td: ["colspan", "rowspan", "width", "align"],
      col: ["span", "width"],
      img: ["src", "alt", "width", "height"],
    },

    allowedSchemes: ["data"],
    allowedSchemesByTag: {
      img: ["data"],
    },

    allowProtocolRelative: false,
    disallowedTagsMode: "discard",

    exclusiveFilter(frame) {
      if (frame.tag === "img") {
        const src = frame.attribs?.src || "";
        return src !== "" && !src.startsWith("data:image/");
      }

      return false;
    },
  });

  const secureHtml = cleanedHtml
    // Ngăn CSS gọi tài nguyên bên ngoài.
    .replace(/@import\s+[^;]+;?/gi, "")
    .replace(/url\s*\([^)]*\)/gi, "none")
    // Loại bỏ các thuộc tính sự kiện còn sót.
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .trim();

  if (!secureHtml) {
    throw new AppError(
      "File HTML không còn nội dung hợp lệ sau khi kiểm tra bảo mật.",
      400,
    );
  }

  if (/<html[\s>]/i.test(secureHtml)) {
    return secureHtml;
  }

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >
  <title>Phiếu lương</title>
</head>
<body>
${secureHtml}
</body>
</html>`;
};

const findPayslipContext = async (payslipId, client = pool) => {
  const result = await client.query(
    `
      SELECT
        ps.id,
        ps.staff_id,
        ps.status,
        ps.current_version,
        pp.period_code
      FROM employee_payslips ps
      INNER JOIN payroll_periods pp
        ON pp.id = ps.payroll_period_id
      WHERE ps.id = $1
      LIMIT 1
    `,
    [payslipId],
  );

  return result.rows[0] || null;
};

const assertPayslipExists = async (payslipId, client = pool) => {
  const payslip = await findPayslipContext(payslipId, client);

  if (!payslip) {
    throw new AppError("Không tìm thấy phiếu lương.", 404);
  }

  return payslip;
};

const assertEmployeeOwnsPayslip = (payslip, staffId) => {
  if (payslip.staff_id !== staffId) {
    throw new AppError(
      "Bạn không có quyền truy cập file phiếu lương này.",
      403,
    );
  }

  if (!ALLOWED_PAYSLIP_STATUSES.includes(payslip.status)) {
    throw new AppError(
      "Phiếu lương chưa được phát hành cho nhân viên.",
      403,
    );
  }
};

const buildStorageKey = ({
  periodCode,
  staffId,
  payslipId,
  checksum,
}) => {
  const safePeriod = String(periodCode || "unknown")
    .replace(/[^0-9-]/g, "");

  const safeStaffId = String(staffId || "unknown")
    .replace(/[^a-zA-Z0-9_-]/g, "");

  const uniqueName = [
    Date.now(),
    crypto.randomUUID(),
    checksum.slice(0, 12),
  ].join("-");

  return path.posix.join(
    safePeriod || "unknown",
    safeStaffId || "unknown",
    String(payslipId),
    `${uniqueName}.html`,
  );
};

const resolveStoragePath = (storageKey) => {
  const normalizedStorageKey = String(storageKey || "")
    .replaceAll("\\", "/")
    .replace(/^\/+/, "");

  if (!normalizedStorageKey) {
    throw new AppError("Đường dẫn lưu trữ file không hợp lệ.", 500);
  }

  const absolutePath = path.resolve(
    PAYROLL_STORAGE_ROOT,
    normalizedStorageKey,
  );

  const relativePath = path.relative(
    PAYROLL_STORAGE_ROOT,
    absolutePath,
  );

  if (
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath)
  ) {
    throw new AppError(
      "Phát hiện đường dẫn file không an toàn.",
      400,
    );
  }

  return absolutePath;
};

const readStoredHtmlFile = async (fileRecord) => {
  const absolutePath = resolveStoragePath(fileRecord.storage_key);

  try {
    return await readFile(absolutePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new AppError(
        "File phiếu lương không còn tồn tại trên hệ thống lưu trữ.",
        404,
      );
    }

    throw error;
  }
};

export const uploadPayslipHtml = async ({
  payslipId,
  file,
  uploadedBy,
  payrollImportId = null,
}) => {
  const normalizedPayslipId = normalizeId(
    payslipId,
    "Mã phiếu lương",
  );

  const normalizedUploadedBy = normalizeStaffId(uploadedBy);

  assertHtmlFile(file);

  const payslip = await assertPayslipExists(normalizedPayslipId);

  const rawHtml = file.buffer.toString("utf8");
  const sanitizedHtml = sanitizePayslipHtml(rawHtml);
  const sanitizedBuffer = Buffer.from(sanitizedHtml, "utf8");
  const checksum = calculateChecksum(sanitizedBuffer);

  const duplicateFile =
    await payrollFileRepository.findByChecksum(
      checksum,
      normalizedPayslipId,
    );

  if (duplicateFile) {
    throw new AppError(
      "File HTML này đã được tải lên cho phiếu lương.",
      409,
    );
  }

  const storageKey = buildStorageKey({
    periodCode: payslip.period_code,
    staffId: payslip.staff_id,
    payslipId: payslip.id,
    checksum,
  });

  const absolutePath = resolveStoragePath(storageKey);

  await mkdir(path.dirname(absolutePath), {
    recursive: true,
  });

  await writeFile(absolutePath, sanitizedBuffer, {
    flag: "wx",
  });

  try {
    return await payrollFileRepository.createPayslipFile({
      payslipId: normalizedPayslipId,
      payrollImportId:
        payrollImportId === null ||
        payrollImportId === undefined
          ? null
          : normalizeId(
              payrollImportId,
              "Mã phiên nhập lương",
            ),
      fileType: "html",
      fileName: sanitizeFileName(file.originalname),
      mimeType: "text/html; charset=utf-8",
      storageKey,
      fileChecksum: checksum,
      uploadedBy: normalizedUploadedBy,
    });
  } catch (error) {
    await unlink(absolutePath).catch(() => {});
    throw error;
  }
};

export const getEmployeeLatestHtml = async ({
  payslipId,
  staffId,
}) => {
  const normalizedPayslipId = normalizeId(
    payslipId,
    "Mã phiếu lương",
  );

  const normalizedStaffId = normalizeStaffId(staffId);

  const payslip = await assertPayslipExists(normalizedPayslipId);

  assertEmployeeOwnsPayslip(payslip, normalizedStaffId);

  const fileRecord =
    await payrollFileRepository.findEmployeeLatestPayslipFile(
      normalizedPayslipId,
      normalizedStaffId,
      "html",
    );

  if (!fileRecord) {
    throw new AppError(
      "Phiếu lương này chưa có file HTML.",
      404,
    );
  }

  const content = await readStoredHtmlFile(fileRecord);

  return {
    file: fileRecord,
    content,
    contentType: "text/html; charset=utf-8",
    contentSecurityPolicy: HTML_CONTENT_SECURITY_POLICY,
  };
};

export const getEmployeeHtmlByFileId = async ({
  fileId,
  staffId,
}) => {
  const normalizedFileId = normalizeId(
    fileId,
    "Mã file phiếu lương",
  );

  const normalizedStaffId = normalizeStaffId(staffId);

  const fileRecord =
    await payrollFileRepository.findEmployeePayslipFile(
      normalizedFileId,
      normalizedStaffId,
    );

  if (!fileRecord) {
    throw new AppError(
      "Không tìm thấy file hoặc bạn không có quyền truy cập.",
      404,
    );
  }

  if (fileRecord.file_type !== "html") {
    throw new AppError(
      "File được yêu cầu không phải phiếu lương HTML.",
      400,
    );
  }

  if (!ALLOWED_PAYSLIP_STATUSES.includes(fileRecord.status)) {
    throw new AppError(
      "Phiếu lương chưa được phát hành.",
      403,
    );
  }

  const content = await readStoredHtmlFile(fileRecord);

  return {
    file: fileRecord,
    content,
    contentType: "text/html; charset=utf-8",
    contentSecurityPolicy: HTML_CONTENT_SECURITY_POLICY,
  };
};

export const getAdminHtmlByFileId = async (fileId) => {
  const normalizedFileId = normalizeId(
    fileId,
    "Mã file phiếu lương",
  );

  const fileRecord =
    await payrollFileRepository.findById(normalizedFileId);

  if (!fileRecord) {
    throw new AppError(
      "Không tìm thấy file phiếu lương.",
      404,
    );
  }

  if (fileRecord.file_type !== "html") {
    throw new AppError(
      "File được yêu cầu không phải file HTML.",
      400,
    );
  }

  const content = await readStoredHtmlFile(fileRecord);

  return {
    file: fileRecord,
    content,
    contentType: "text/html; charset=utf-8",
    contentSecurityPolicy: HTML_CONTENT_SECURITY_POLICY,
  };
};

export const getPayslipFileHistory = async ({
  payslipId,
  fileType = "html",
}) => {
  const normalizedPayslipId = normalizeId(
    payslipId,
    "Mã phiếu lương",
  );

  await assertPayslipExists(normalizedPayslipId);

  return payrollFileRepository.findFilesByPayslipId(
    normalizedPayslipId,
    fileType,
  );
};

export const getFilesByImportId = async (payrollImportId) => {
  const normalizedImportId = normalizeId(
    payrollImportId,
    "Mã phiên nhập lương",
  );

  return payrollFileRepository.findFilesByImportId(
    normalizedImportId,
  );
};

export const deleteDraftHtmlFile = async ({
  fileId,
  deletedBy,
}) => {
  const normalizedFileId = normalizeId(
    fileId,
    "Mã file phiếu lương",
  );

  normalizeStaffId(deletedBy);

  const fileRecord =
    await payrollFileRepository.findById(normalizedFileId);

  if (!fileRecord) {
    throw new AppError(
      "Không tìm thấy file phiếu lương.",
      404,
    );
  }

  if (fileRecord.file_type !== "html") {
    throw new AppError(
      "Chỉ hỗ trợ xóa file phiếu lương HTML.",
      400,
    );
  }

  const absolutePath = resolveStoragePath(
    fileRecord.storage_key,
  );

  const deletedRecord =
    await payrollFileRepository.deleteDraftPayslipFile(
      normalizedFileId,
    );

  if (!deletedRecord) {
    throw new AppError(
      "Chỉ được xóa file của phiếu lương đang ở trạng thái bản nháp.",
      409,
    );
  }

  await unlink(absolutePath).catch((error) => {
    if (error.code !== "ENOENT") {
      console.error(
        `[Payroll file] Không thể xóa ${absolutePath}:`,
        error,
      );
    }
  });

  return deletedRecord;
};

export const getStorageConfiguration = () => ({
  driver: "local",
  root: PAYROLL_STORAGE_ROOT,
  maxHtmlFileSize: MAX_HTML_FILE_SIZE,
  allowedExtensions: [".html", ".htm"],
});

export {
  HTML_CONTENT_SECURITY_POLICY,
  MAX_HTML_FILE_SIZE,
};