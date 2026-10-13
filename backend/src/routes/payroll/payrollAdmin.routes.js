import { Router } from "express";

import {
  getPayrollReleaseControlCenter,
  exportPayrollReleaseReconciliation,
  compareAdminPayslipVersions,
  getAdminPayslipVersionDetail,
  getAdminPayslipVersions,
  getPayrollPublishPreview,
  publishPayrollPeriod,
  republishAdjustedPayslip,
} from "../../controllers/payroll/payrollAdmin.controller.js";

import {
  authorizeRoles,
  isAuthenticated,
} from "../../middleware/authMiddleware.js";

import {
  validatePayslipComparisonQuery,
  validatePayslipIdParam,
  validatePayslipVersionParam,
} from "../../../validates/payroll.validate.js";
import {
  deleteThirteenthMonthOverride,
  getThirteenthMonthPolicy,
  putThirteenthMonthOverride,
  putThirteenthMonthPolicy,
} from "../../controllers/payroll/payrollThirteenthMonth.controller.js";

const router = Router();

/**
 * Tất cả API quản trị lương đều yêu cầu:
 * - Đã đăng nhập.
 * - Có quyền admin hoặc HR.
 */
router.use(isAuthenticated);
router.use(
  authorizeRoles("admin", "hr"),
);

router.get("/releases/control-center", getPayrollReleaseControlCenter);
router.get("/releases/reconciliation/export", exportPayrollReleaseReconciliation);

router.get("/thirteenth-month-policy", getThirteenthMonthPolicy);
router.put("/thirteenth-month-policy/:year", putThirteenthMonthPolicy);
router.put("/thirteenth-month-policy/:year/employees/:staffId", putThirteenthMonthOverride);
router.delete("/thirteenth-month-policy/:year/employees/:staffId", deleteThirteenthMonthOverride);

/**
 * GET
 * /api/payroll/admin/periods/:periodId/publish-preview
 *
 * Kiểm tra kỳ lương trước khi phát hành:
 * - Có bao nhiêu phiếu.
 * - Có phiếu sai dữ liệu không.
 * - Có phản hồi chưa xử lý không.
 * - Tổng thu nhập, khấu trừ và thực lĩnh.
 */
router.get(
  "/periods/:periodId/publish-preview",
  getPayrollPublishPreview,
);

/**
 * POST
 * /api/payroll/admin/periods/:periodId/publish
 *
 * Body:
 * {
 *   "confirmed": true
 * }
 *
 * Phát hành tất cả phiếu lương trong kỳ và
 * tạo thông báo cho từng nhân viên.
 */
router.post(
  "/periods/:periodId/publish",
  publishPayrollPeriod,
);


/**
 * GET
 * /api/payroll/admin/payslips/:payslipId/versions
 *
 * HR/Admin xem toàn bộ lịch sử phiên bản.
 */
router.get(
  "/payslips/:payslipId/versions",
  validatePayslipIdParam,
  getAdminPayslipVersions,
);


/**
 * GET
 * /api/payroll/admin/payslips/:payslipId/comparison
 *
 * Query:
 * fromVersion=1
 * toVersion=2
 */
router.get(
  "/payslips/:payslipId/comparison",
  validatePayslipIdParam,
  validatePayslipComparisonQuery,
  compareAdminPayslipVersions,
);

/**
 * GET
 * /api/payroll/admin/payslips/:payslipId/versions/:versionNumber
 *
 * HR/Admin xem snapshot chi tiết của một phiên bản.
 */
router.get(
  "/payslips/:payslipId/versions/:versionNumber",
  validatePayslipIdParam,
  validatePayslipVersionParam,
  getAdminPayslipVersionDetail,
);

/**
 * POST
 * /api/payroll/admin/payslips/:payslipId/republish
 *
 * Body:
 * {
 *   "confirmed": true,
 *   "message": "Đã điều chỉnh tiền tăng ca."
 * }
 *
 * Gửi lại một phiếu lương sau khi HR điều chỉnh.
 */
router.post(
  "/payslips/:payslipId/republish",
  validatePayslipIdParam,
  republishAdjustedPayslip,
);

export default router;
