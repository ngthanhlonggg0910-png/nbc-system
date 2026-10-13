import { Router } from "express";

import {
  acceptPayrollFeedback,
  createMyPayrollFeedback,
  deleteMyPayrollFeedback,
  downloadPayrollFeedbackAttachment,
  getMyPayrollFeedbackDetail,
  getMyPayrollFeedbacks,
  getPayrollFeedbackDetailForAdmin,
  getPayrollFeedbackStatisticsForAdmin,
  getPayrollFeedbacksForAdmin,
  rejectPayrollFeedback,
  resolvePayrollFeedback,
  reviewPayrollFeedback,
} from "../../controllers/payroll/payrollFeedback.controller.js";

import {
  authorizeRoles,
  isAuthenticated,
} from "../../middleware/authMiddleware.js";
import { uploadPayrollFeedbackAttachment } from "../../middleware/payroll-feedback-upload.middleware.js";

import {
  validateAcceptPayrollFeedback,
  validateAdminFeedbackListQuery,
  validateCreatePayrollFeedback,
  validateDeletePayrollFeedback,
  validateEmployeeFeedbackListQuery,
  validateFeedbackIdParam,
  validateFeedbackPayslipIdParam,
  validateRejectPayrollFeedback,
  validateResolvePayrollFeedback,
  validateStartFeedbackReview,
} from "../../../validates/payrollFeedback.validate.js";

const router = Router();

/**
 * Tất cả API phản hồi lương đều yêu cầu đăng nhập.
 */
router.use(isAuthenticated);

/* =========================================================
 * API DÀNH CHO NHÂN VIÊN
 * ========================================================= */

/**
 * GET /api/payroll/me/feedbacks
 *
 * Query:
 * status=pending
 * year=2026
 * page=1
 * limit=20
 *
 * Route này đặt trước route có :feedbackId.
 */
router.get(
  "/me/feedbacks",
  validateEmployeeFeedbackListQuery,
  getMyPayrollFeedbacks,
);

/**
 * GET /api/payroll/me/feedbacks/:feedbackId
 *
 * Nhân viên xem chi tiết một phản hồi của chính mình.
 */
router.get(
  "/me/feedbacks/:feedbackId",
  validateFeedbackIdParam,
  getMyPayrollFeedbackDetail,
);

/**
 * Tải tệp minh chứng. Service kiểm tra chủ sở hữu hoặc quyền HR/Admin.
 */
router.get(
  "/feedbacks/:feedbackId/attachment",
  validateFeedbackIdParam,
  downloadPayrollFeedbackAttachment,
);

/**
 * DELETE /api/payroll/me/feedbacks/:feedbackId
 *
 * Body:
 * {
 *   "confirmed": true
 * }
 *
 * Chỉ xóa được khi phản hồi còn pending.
 */
router.delete(
  "/me/feedbacks/:feedbackId",
  validateFeedbackIdParam,
  validateDeletePayrollFeedback,
  deleteMyPayrollFeedback,
);

/**
 * POST /api/payroll/me/:payslipId/feedbacks
 *
 * Body:
 * {
 *   "category": "deduction",
 *   "content": "Khoản BHXH chưa chính xác.",
 *   "attachmentUrl": "/uploads/minh-chung.png"
 * }
 */
router.post(
  "/me/:payslipId/feedbacks",
  validateFeedbackPayslipIdParam,
  uploadPayrollFeedbackAttachment,
  validateCreatePayrollFeedback,
  createMyPayrollFeedback,
);

/* =========================================================
 * API DÀNH CHO HR VÀ ADMIN
 * ========================================================= */

/**
 * Tất cả route phía dưới đều yêu cầu quyền HR/Admin.
 */
router.use(
  "/admin/feedbacks",
  authorizeRoles("admin", "hr"),
);

/**
 * GET /api/payroll/admin/feedbacks/statistics
 *
 * Query không bắt buộc:
 * periodId=1
 *
 * Phải đặt trước "/admin/feedbacks/:feedbackId",
 * nếu không Express có thể hiểu "statistics" là feedbackId.
 */
router.get(
  "/admin/feedbacks/statistics",
  getPayrollFeedbackStatisticsForAdmin,
);

/**
 * GET /api/payroll/admin/feedbacks
 *
 * Query:
 * status=pending
 * category=deduction
 * periodId=1
 * staffId=NBC012345
 * keyword=Nguyen Van An
 * page=1
 * limit=20
 */
router.get(
  "/admin/feedbacks",
  validateAdminFeedbackListQuery,
  getPayrollFeedbacksForAdmin,
);

/**
 * GET /api/payroll/admin/feedbacks/:feedbackId
 *
 * HR xem chi tiết phản hồi.
 */
router.get(
  "/admin/feedbacks/:feedbackId",
  validateFeedbackIdParam,
  getPayrollFeedbackDetailForAdmin,
);

/**
 * POST /api/payroll/admin/feedbacks/:feedbackId/review
 *
 * HR tiếp nhận xử lý phản hồi.
 */
router.post(
  "/admin/feedbacks/:feedbackId/review",
  validateFeedbackIdParam,
  validateStartFeedbackReview,
  reviewPayrollFeedback,
);

/**
 * POST /api/payroll/admin/feedbacks/:feedbackId/accept
 *
 * Body:
 * {
 *   "confirmed": true,
 *   "hrReply": "HR xác nhận phản hồi là chính xác."
 * }
 *
 * Sau khi thành công, frontend chuyển sang màn
 * điều chỉnh phiếu lương theo nextAction.
 */
router.post(
  "/admin/feedbacks/:feedbackId/accept",
  validateFeedbackIdParam,
  validateAcceptPayrollFeedback,
  acceptPayrollFeedback,
);

/**
 * POST /api/payroll/admin/feedbacks/:feedbackId/reject
 *
 * Body:
 * {
 *   "confirmed": true,
 *   "hrReply": "Số liệu hiện tại đúng theo dữ liệu nguồn."
 * }
 */
router.post(
  "/admin/feedbacks/:feedbackId/reject",
  validateFeedbackIdParam,
  validateRejectPayrollFeedback,
  rejectPayrollFeedback,
);

/**
 * POST /api/payroll/admin/feedbacks/:feedbackId/resolve
 *
 * Body:
 * {
 *   "confirmed": true,
 *   "hrReply": "Đã điều chỉnh và phát hành lại phiếu lương."
 * }
 *
 * Chỉ hoàn tất khi phiếu đã điều chỉnh và phát hành lại.
 */
router.post(
  "/admin/feedbacks/:feedbackId/resolve",
  validateFeedbackIdParam,
  validateResolvePayrollFeedback,
  resolvePayrollFeedback,
);

export default router;
