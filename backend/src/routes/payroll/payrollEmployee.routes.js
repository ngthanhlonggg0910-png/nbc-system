import { Router } from "express";

import {
  compareMyPayslipVersions,
  confirmMyPayslip,
  getMyPayroll12MonthReport,
  getMyPayslipDetail,
  getMyPayslips,
  getMyPayslipVersions,
} from "../../controllers/payroll/payrollEmployee.controller.js";

import { isAuthenticated } from "../../middleware/authMiddleware.js";

import {
  validateConfirmPayslip,
  validatePayrollReportQuery,
  validatePayrollYearQuery,
  validatePayslipComparisonQuery,
  validatePayslipIdParam,
} from "../../../validates/payroll.validate.js";

const router = Router();

/*
 * Tất cả API trong file này đều yêu cầu người dùng đăng nhập.
 *
 * Sau khi isAuthenticated chạy thành công:
 *
 * req.user = {
 *   staff_id: "NBC012345",
 *   role: "employee",
 *   ...
 * }
 *
 * Controller và service phải sử dụng req.user.staff_id.
 * Không lấy staffId từ query/body để quyết định phiếu lương của ai.
 */
router.use(isAuthenticated);

/*
 * GET /api/payroll/me
 *
 * Lấy danh sách phiếu lương của nhân viên đang đăng nhập.
 *
 * Query:
 *   year=2026
 *   page=1
 *   limit=12
 *
 * Ví dụ:
 *   GET /api/payroll/me?year=2026
 */
router.get(
  "/me",
  validatePayrollYearQuery,
  getMyPayslips,
);

/*
 * GET /api/payroll/me/12-month
 *
 * Báo cáo lương lũy kế và bình quân 12 tháng.
 *
 * Query:
 *   year=2026
 *
 * Ví dụ:
 *   GET /api/payroll/me/12-month?year=2026
 *
 * Route này phải đặt trước "/me/:payslipId".
 * Nếu đặt sau, Express có thể hiểu "12-month" là payslipId.
 */
router.get(
  "/me/12-month",
  validatePayrollReportQuery,
  getMyPayroll12MonthReport,
);

/*
 * GET /api/payroll/me/:payslipId/versions
 *
 * Lấy lịch sử phiên bản của phiếu lương.
 *
 * Ví dụ:
 *   GET /api/payroll/me/125/versions
 */
router.get(
  "/me/:payslipId/versions",
  validatePayslipIdParam,
  getMyPayslipVersions,
);

/*
 * GET /api/payroll/me/:payslipId/comparison
 *
 * So sánh hai phiên bản phiếu lương.
 *
 * Query:
 *   fromVersion=1
 *   toVersion=2
 *
 * Ví dụ:
 *   GET /api/payroll/me/125/comparison?fromVersion=1&toVersion=2
 */
router.get(
  "/me/:payslipId/comparison",
  validatePayslipIdParam,
  validatePayslipComparisonQuery,
  compareMyPayslipVersions,
);

/*
 * POST /api/payroll/me/:payslipId/confirm
 *
 * Nhân viên xác nhận phiếu lương.
 *
 * Body:
 * {
 *   "confirmed": true
 * }
 *
 * Backend cập nhật:
 *   status = "confirmed"
 *   signed_at = CURRENT_TIMESTAMP
 */
router.post(
  "/me/:payslipId/confirm",
  validatePayslipIdParam,
  validateConfirmPayslip,
  confirmMyPayslip,
);

/*
 * GET /api/payroll/me/:payslipId
 *
 * Lấy chi tiết một phiếu lương:
 *
 * - Thông tin kỳ lương.
 * - Thông tin nhân viên.
 * - Ngày công.
 * - Thu nhập chịu thuế.
 * - Tổng thu nhập.
 * - Từng khoản thu nhập.
 * - Từng khoản khấu trừ.
 * - Tổng khấu trừ.
 * - Thực lĩnh.
 * - Trạng thái.
 * - Phiên bản hiện tại.
 *
 * Ví dụ:
 *   GET /api/payroll/me/125
 *
 * Route động này nên đặt cuối cùng.
 */
router.get(
  "/me/:payslipId",
  validatePayslipIdParam,
  getMyPayslipDetail,
);

export default router;
