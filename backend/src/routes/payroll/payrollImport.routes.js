import path from "node:path";

import { Router } from "express";
import multer from "multer";

import {
  cancelPayrollImport,
  commitPayrollImport,
  downloadPayrollImportTemplate,
  getPayrollImportDetail,
  getPayrollImportErrors,
  getPayrollImportPreview,
  getPayrollImports,
  uploadPayrollImport,
  createManualPayrollImport,
  getPayrollImportControlCenter,
  getPayrollImportAuditCenter,
} from "../../controllers/payroll/payrollImport.controller.js";

import {
  authorizeRoles,
  isAuthenticated,
} from "../../middleware/authMiddleware.js";

import { ErrorHandler } from "../../middleware/errorMiddleware.js";

import {
  validateCancelPayrollImport,
  validateCommitPayrollImport,
  validateImportErrorListQuery,
  validateImportIdParam,
  validatePayrollImportBody,
  validatePayrollImportListQuery,
  validatePayrollImportUpload,
} from "../../../validates/payroll/payrollImport.validate.js";

const router = Router();

const MAX_EXCEL_FILE_SIZE =
  10 * 1024 * 1024;

/**
 * Lưu file trong RAM.
 *
 * req.file.buffer sẽ được truyền vào ExcelJS.
 * Không tạo file tạm trong backend/uploads.
 */
const storage =
  multer.memoryStorage();

/**
 * Nhận bảng lương Excel hoặc HTML.
 *
 * Frontend hiện tại cũng đang tạo mẫu bằng ExcelJS
 * và xuất định dạng .xlsx.
 */
function payrollFileFilter(
  req,
  file,
  callback,
) {
  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  if (![".xlsx", ".html", ".htm"].includes(extension)) {
    return callback(
      new ErrorHandler(
        "Chỉ hỗ trợ file .xlsx, .html hoặc .htm",
        400,
      ),
    );
  }

  return callback(
    null,
    true,
  );
}

const upload = multer({
  storage,

  limits: {
    fileSize:
      MAX_EXCEL_FILE_SIZE,

    files: 1,

    fields: 10,
  },

  fileFilter:
    payrollFileFilter,
});

/**
 * Chuyển lỗi của multer sang error middleware dự án.
 */
function handlePayrollExcelUpload(
  req,
  res,
  next,
) {
  const uploadSingle =
    upload.single("file");

  uploadSingle(
    req,
    res,
    (error) => {
      if (!error) {
        return next();
      }

      if (
        error instanceof
        multer.MulterError
      ) {
        if (
          error.code ===
          "LIMIT_FILE_SIZE"
        ) {
          return next(
            new ErrorHandler(
              "File tải lên không được vượt quá 10 MB",
              400,
            ),
          );
        }

        if (
          error.code ===
          "LIMIT_FILE_COUNT"
        ) {
          return next(
            new ErrorHandler(
              "Mỗi lần chỉ được upload một file",
              400,
            ),
          );
        }

        if (
          error.code ===
          "LIMIT_UNEXPECTED_FILE"
        ) {
          return next(
            new ErrorHandler(
              'Tên trường file phải là "file"',
              400,
            ),
          );
        }

        return next(
          new ErrorHandler(
            `Lỗi upload file: ${error.message}`,
            400,
          ),
        );
      }

      return next(error);
    },
  );
}

/**
 * Tất cả API import lương đều yêu cầu:
 *
 * - Đã đăng nhập.
 * - Có quyền admin hoặc hr.
 */
router.use(
  isAuthenticated,
);

router.use(
  authorizeRoles(
    "admin",
    "hr",
  ),
);

/**
 * GET /api/payroll/imports/template
 *
 * Lưu ý:
 * /template phải đứng trước /:importId
 * để Express không hiểu "template" là importId.
 */
router.get(
  "/template",
  downloadPayrollImportTemplate,
);
router.get("/control-center", getPayrollImportControlCenter);
router.get("/audit-center", getPayrollImportAuditCenter);

/**
 * GET /api/payroll/imports
 *
 * Query ví dụ:
 * ?page=1
 * &limit=20
 * &payrollPeriodId=1
 * &status=validated
 */
router.get(
  "/",
  validatePayrollImportListQuery,
  getPayrollImports,
);

/**
 * POST /api/payroll/imports
 *
 * Content-Type:
 * multipart/form-data
 *
 * Fields:
 * payrollPeriodId = 1
 * file = bang-luong-2026-07.xlsx
 */
router.post(
  "/",
  handlePayrollExcelUpload,
  validatePayrollImportBody,
  validatePayrollImportUpload,
  uploadPayrollImport,
);

router.post(
  "/manual",
  createManualPayrollImport,
);

/**
 * GET /api/payroll/imports/:importId/errors
 *
 * Query:
 * page=1
 * limit=50
 */
router.get(
  "/:importId/errors",
  validateImportIdParam,
  validateImportErrorListQuery,
  getPayrollImportErrors,
);

/**
 * GET /api/payroll/imports/:importId/preview
 *
 * Query:
 * page=1
 * limit=50
 */
router.get(
  "/:importId/preview",
  validateImportIdParam,
  validateImportErrorListQuery,
  getPayrollImportPreview,
);

/**
 * GET /api/payroll/imports/:importId
 */
router.get(
  "/:importId",
  validateImportIdParam,
  getPayrollImportDetail,
);

/**
 * POST /api/payroll/imports/:importId/commit
 *
 * Body:
 * {
 *   "confirmed": true
 * }
 */
router.post(
  "/:importId/commit",
  validateImportIdParam,
  validateCommitPayrollImport,
  commitPayrollImport,
);

/**
 * POST /api/payroll/imports/:importId/cancel
 *
 * Body không bắt buộc:
 * {
 *   "reason": "Chọn nhầm file"
 * }
 */
router.post(
  "/:importId/cancel",
  validateImportIdParam,
  validateCancelPayrollImport,
  cancelPayrollImport,
);

export default router;
