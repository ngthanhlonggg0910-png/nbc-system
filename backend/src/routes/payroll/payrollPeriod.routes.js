import { Router } from "express";

import {
  cancelPayrollPeriod,
  createPayrollPeriod,
  getPayrollPeriodById,
  getPayrollPeriods,
  getPayrollPeriodStatistics,
  lockPayrollPeriod,
  updatePayrollPeriod,
  duplicatePayrollPeriod,
  getPayrollPeriodActivities,
  getPayrollPeriodAlerts,
  getPayrollPeriodLockPrecheck,
  getPayrollPeriodOperationDetail,
  getPayrollPeriodOperations,
  exportPayrollPeriodOperations,
  getPayrollPeriodOptions,
  getPayrollPeriodReadiness,
  getPayrollPeriodUnits,
  openPayrollPeriod,
  updatePayrollPeriodSettings,
} from "../../controllers/payroll/payrollPeriod.controller.js";

import {
  authorizeRoles,
  isAuthenticated,
} from "../../middleware/authMiddleware.js";

import {
  validateCancelPayrollPeriod,
  validateCreatePayrollPeriod,
  validatePayrollPeriodIdParam,
  validatePayrollPeriodListQuery,
  validateUpdatePayrollPeriod,
} from "../../../validates/payrollPeriod.validate.js";

const router = Router();

/**
 * Toàn bộ API quản lý kỳ lương yêu cầu:
 * - Người dùng đã đăng nhập.
 * - Có vai trò admin hoặc HR.
 */
router.use(isAuthenticated);
router.use(authorizeRoles("admin", "hr"));

/**
 * GET /api/payroll/admin/periods
 *
 * Lấy danh sách kỳ lương.
 *
 * Query:
 * {
 *   "year": 2026,
 *   "status": "draft",
 *   "page": 1,
 *   "limit": 20
 * }
 */
router.get(
  "/",
  validatePayrollPeriodListQuery,
  getPayrollPeriods,
);

router.get("/operations", getPayrollPeriodOperations);
router.get("/operations/options", getPayrollPeriodOptions);
router.get("/operations/export", exportPayrollPeriodOperations);

/**
 * POST /api/payroll/admin/periods
 *
 * Tạo kỳ lương mới.
 *
 * Body:
 * {
 *   "periodCode": "2026-08",
 *   "periodName": "Kỳ lương tháng 08/2026",
 *   "startDate": "2026-08-01",
 *   "endDate": "2026-08-31",
 *   "paymentDate": "2026-09-05"
 * }
 */
router.post(
  "/",
  validateCreatePayrollPeriod,
  createPayrollPeriod,
);

/**
 * GET /api/payroll/admin/periods/:periodId
 *
 * Xem chi tiết một kỳ lương.
 */
router.get(
  "/:periodId",
  validatePayrollPeriodIdParam,
  getPayrollPeriodById,
);

router.get("/:periodId/operations", validatePayrollPeriodIdParam, getPayrollPeriodOperationDetail);
router.get("/:periodId/readiness", validatePayrollPeriodIdParam, getPayrollPeriodReadiness);
router.get("/:periodId/units", validatePayrollPeriodIdParam, getPayrollPeriodUnits);
router.get("/:periodId/alerts", validatePayrollPeriodIdParam, getPayrollPeriodAlerts);
router.get("/:periodId/activities", validatePayrollPeriodIdParam, getPayrollPeriodActivities);
router.get("/:periodId/lock-precheck", validatePayrollPeriodIdParam, getPayrollPeriodLockPrecheck);
router.post("/:periodId/open", validatePayrollPeriodIdParam, openPayrollPeriod);
router.post("/:periodId/duplicate", validatePayrollPeriodIdParam, duplicatePayrollPeriod);
router.patch("/:periodId/settings", validatePayrollPeriodIdParam, updatePayrollPeriodSettings);

/**
 * PATCH /api/payroll/admin/periods/:periodId
 *
 * Cập nhật kỳ lương.
 *
 * Chỉ cho phép cập nhật kỳ đang ở trạng thái draft.
 *
 * Body có thể gồm:
 * {
 *   "periodName": "Kỳ lương tháng 08/2026",
 *   "startDate": "2026-08-01",
 *   "endDate": "2026-08-31",
 *   "paymentDate": "2026-09-05"
 * }
 */
router.patch(
  "/:periodId",
  validatePayrollPeriodIdParam,
  validateUpdatePayrollPeriod,
  updatePayrollPeriod,
);

/**
 * GET /api/payroll/admin/periods/:periodId/statistics
 *
 * Lấy thống kê của kỳ lương:
 * - Tổng số phiếu.
 * - Tổng thu nhập.
 * - Tổng khấu trừ.
 * - Tổng thực lĩnh.
 * - Số phiếu đã phát hành.
 * - Số phiếu đã xác nhận.
 * - Số phản hồi chưa xử lý.
 */
router.get(
  "/:periodId/statistics",
  validatePayrollPeriodIdParam,
  getPayrollPeriodStatistics,
);

/**
 * POST /api/payroll/admin/periods/:periodId/cancel
 *
 * Hủy kỳ lương.
 *
 * Chỉ cho phép hủy kỳ chưa phát hành.
 *
 * Body:
 * {
 *   "reason": "Tạo nhầm kỳ lương"
 * }
 */
router.post(
  "/:periodId/cancel",
  validatePayrollPeriodIdParam,
  validateCancelPayrollPeriod,
  cancelPayrollPeriod,
);

/**
 * POST /api/payroll/admin/periods/:periodId/lock
 *
 * Khóa kỳ lương sau khi toàn bộ nghiệp vụ đã hoàn tất.
 *
 * Body:
 * {
 *   "confirmed": true
 * }
 */
router.post(
  "/:periodId/lock",
  validatePayrollPeriodIdParam,
  lockPayrollPeriod,
);

export default router;
