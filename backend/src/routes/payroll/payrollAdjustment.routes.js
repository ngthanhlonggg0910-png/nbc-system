import { Router } from "express";

import {
  adjustPayrollPayslip,
  getAdminPayrollAdjustmentContext,
  getAdminPayslipAdjustments,
  getEmployeePayslipAdjustments,
  getFeedbackAdjustments,
  previewPayrollAdjustment,
} from "../../controllers/payroll/payrollAdjustment.controller.js";

import {
  authorizeRoles,
  isAuthenticated,
} from "../../middleware/authMiddleware.js";

import {
  validateAdjustmentFeedbackIdParam,
  validateAdjustmentPayslipIdParam,
  validateCreatePayrollAdjustment,
  validatePreviewPayrollAdjustment,
} from "../../../validates/payrollAdjustment.validate.js";

const router = Router();

/**
 * Tất cả API điều chỉnh lương đều yêu cầu đăng nhập.
 */
router.use(isAuthenticated);

/* =========================================================
 * API DÀNH CHO NHÂN VIÊN
 * ========================================================= */

/**
 * GET /api/payroll/me/:payslipId/adjustments
 *
 * Nhân viên xem chi tiết các khoản đã thay đổi:
 * - Khoản lương.
 * - Giá trị cũ.
 * - Giá trị mới.
 * - Tăng hoặc giảm.
 * - Lý do điều chỉnh.
 */
router.get(
  "/me/:payslipId/adjustments",
  validateAdjustmentPayslipIdParam,
  getEmployeePayslipAdjustments,
);

/* =========================================================
 * API DÀNH CHO HR VÀ ADMIN
 * ========================================================= */

/**
 * Các API phía dưới yêu cầu quyền HR hoặc Admin.
 */
router.use(
  "/admin",
  authorizeRoles("admin", "hr"),
);

/**
 * GET
 * /api/payroll/admin/payslips/:payslipId/adjustment-context
 *
 * HR/Admin lấy context để mở form điều chỉnh.
 *
 * READ ONLY.
 */
router.get(
  "/admin/payslips/:payslipId/adjustment-context",
  validateAdjustmentPayslipIdParam,
  getAdminPayrollAdjustmentContext,
);

/**
 * POST
 * /api/payroll/admin/payslips/:payslipId/adjustments/preview
 *
 * Body:
 * {
 *   "adjustments": [
 *     {
 *       "salaryItemId": 1,
 *       "newAmount": 9904000,
 *       "reason": "Bổ sung ngày công bị thiếu"
 *     }
 *   ]
 * }
 *
 * Chỉ xem trước, chưa ghi database.
 */
router.post(
  "/admin/payslips/:payslipId/adjustments/preview",
  validateAdjustmentPayslipIdParam,
  validatePreviewPayrollAdjustment,
  previewPayrollAdjustment,
);

/**
 * POST
 * /api/payroll/admin/payslips/:payslipId/adjustments
 *
 * Body:
 * {
 *   "feedbackId": 7,
 *   "changeReason": "Điều chỉnh sau phản hồi của nhân viên",
 *   "adjustments": [
 *     {
 *       "salaryItemId": 1,
 *       "newAmount": 9904000,
 *       "quantity": 26,
 *       "rate": null,
 *       "description": "Lương công việc sau điều chỉnh",
 *       "reason": "Bổ sung ngày công bị thiếu"
 *     }
 *   ]
 * }
 *
 * Thao tác này:
 * - Lưu version cũ.
 * - Ghi nhật ký khoản cũ/mới.
 * - Cập nhật chi tiết phiếu lương.
 * - Tính lại tổng lương.
 * - Tạo version mới.
 * - Chuyển feedback sang adjusted.
 */
router.post(
  "/admin/payslips/:payslipId/adjustments",
  validateAdjustmentPayslipIdParam,
  validateCreatePayrollAdjustment,
  adjustPayrollPayslip,
);

/**
 * GET
 * /api/payroll/admin/payslips/:payslipId/adjustments
 *
 * HR xem toàn bộ lịch sử điều chỉnh của phiếu lương.
 */
router.get(
  "/admin/payslips/:payslipId/adjustments",
  validateAdjustmentPayslipIdParam,
  getAdminPayslipAdjustments,
);

/**
 * GET
 * /api/payroll/admin/feedbacks/:feedbackId/adjustments
 *
 * HR xem các khoản điều chỉnh phát sinh từ một phản hồi.
 */
router.get(
  "/admin/feedbacks/:feedbackId/adjustments",
  validateAdjustmentFeedbackIdParam,
  getFeedbackAdjustments,
);

export default router;