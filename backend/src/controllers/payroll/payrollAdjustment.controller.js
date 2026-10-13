import {
  adjustPayrollPayslip as adjustPayrollPayslipService,
  getAdminPayrollAdjustmentContext as getAdminPayrollAdjustmentContextService,
  getAdminPayslipAdjustments as getAdminPayslipAdjustmentsService,
  getEmployeePayslipAdjustments as getEmployeePayslipAdjustmentsService,
  getFeedbackAdjustments as getFeedbackAdjustmentsService,
  previewPayrollAdjustment as previewPayrollAdjustmentService,
} from "../../services/payroll/payrollAdjustment.service.js";

/**
 * GET
 * /api/payroll/admin/payslips/:payslipId/adjustment-context
 *
 * HR/Admin lấy phiếu lương và toàn bộ salary items
 * để chuẩn bị form điều chỉnh.
 *
 * READ ONLY.
 */
export async function getAdminPayrollAdjustmentContext(
  req,
  res,
  next,
) {
  try {
    const payslipId = Number(
      req.params.payslipId,
    );

    const result =
      await getAdminPayrollAdjustmentContextService(
        payslipId,
      );

    return res.status(200).json({
      success: true,
      message:
        "Lấy dữ liệu điều chỉnh phiếu lương thành công",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST
 * /api/payroll/admin/payslips/:payslipId/adjustments/preview
 *
 * Xem trước thay đổi nhưng chưa ghi database.
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
 */
export async function previewPayrollAdjustment(
  req,
  res,
  next,
) {
  try {
    const payslipId = Number(
      req.params.payslipId,
    );

    const { adjustments } =
      req.body;

    const result =
      await previewPayrollAdjustmentService({
        payslipId,
        adjustments,
      });

    return res.status(200).json({
      success: true,

      message:
        result.changedItems > 0
          ? `Có ${result.changedItems} khoản lương sẽ được thay đổi`
          : "Không có khoản lương nào thay đổi",

      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST
 * /api/payroll/admin/payslips/:payslipId/adjustments
 *
 * Lưu chính thức việc điều chỉnh phiếu lương.
 *
 * Body:
 * {
 *   "confirmed": true,
 *   "feedbackId": 7,
 *   "changeReason": "Điều chỉnh theo phản hồi của nhân viên",
 *   "adjustments": [
 *     {
 *       "salaryItemId": 1,
 *       "newAmount": 9904000,
 *       "quantity": 26,
 *       "rate": null,
 *       "description": "Lương sau điều chỉnh",
 *       "reason": "Bổ sung ngày công bị thiếu"
 *     }
 *   ]
 * }
 */
export async function adjustPayrollPayslip(
  req,
  res,
  next,
) {
  try {
    const payslipId = Number(
      req.params.payslipId,
    );

    const adjustedBy =
      req.user.staff_id;

    const {
      feedbackId = null,
      changeReason,
      adjustments,
    } = req.body;

    const result =
      await adjustPayrollPayslipService({
        payslipId,
        feedbackId,
        adjustments,
        adjustedBy,
        changeReason,
      });

    return res.status(200).json({
      success: true,
      message:
        `Đã điều chỉnh ${result.adjustments.length} khoản lương và tạo phiên bản ${result.payslip.currentVersion}`,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET
 * /api/payroll/admin/payslips/:payslipId/adjustments
 *
 * HR/Admin xem toàn bộ lịch sử điều chỉnh
 * của một phiếu lương.
 */
export async function getAdminPayslipAdjustments(
  req,
  res,
  next,
) {
  try {
    const payslipId = Number(
      req.params.payslipId,
    );

    const result =
      await getAdminPayslipAdjustmentsService(
        payslipId,
      );

    return res.status(200).json({
      success: true,
      message:
        "Lấy lịch sử điều chỉnh phiếu lương thành công",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET
 * /api/payroll/me/:payslipId/adjustments
 *
 * Nhân viên xem các khoản đã được điều chỉnh
 * trong phiếu lương của chính mình.
 */
export async function getEmployeePayslipAdjustments(
  req,
  res,
  next,
) {
  try {
    const payslipId = Number(
      req.params.payslipId,
    );

    /*
     * Luôn lấy staffId từ JWT.
     * Không nhận staffId từ query hoặc body.
     */
    const staffId =
      req.user.staff_id;

    const result =
      await getEmployeePayslipAdjustmentsService({
        payslipId,
        staffId,
      });

    return res.status(200).json({
      success: true,

      message:
        result.adjustments.length > 0
          ? "Lấy chi tiết các khoản điều chỉnh thành công"
          : "Phiếu lương chưa có khoản điều chỉnh",

      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET
 * /api/payroll/admin/feedbacks/:feedbackId/adjustments
 *
 * HR xem các khoản điều chỉnh phát sinh từ
 * một phản hồi cụ thể.
 */
export async function getFeedbackAdjustments(
  req,
  res,
  next,
) {
  try {
    const feedbackId = Number(
      req.params.feedbackId,
    );

    const result =
      await getFeedbackAdjustmentsService(
        feedbackId,
      );

    return res.status(200).json({
      success: true,

      message:
        result.adjustments.length > 0
          ? "Lấy các khoản điều chỉnh theo phản hồi thành công"
          : "Phản hồi này chưa phát sinh khoản điều chỉnh",

      data: result,
    });
  } catch (error) {
    return next(error);
  }
}