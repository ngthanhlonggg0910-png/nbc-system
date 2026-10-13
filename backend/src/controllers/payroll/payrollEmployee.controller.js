import {
  getEmployeePayslips,
  getEmployeePayslipDetail,
  confirmEmployeePayslip,
  getEmployeePayroll12MonthReport,
  getEmployeePayslipVersions,
  compareEmployeePayslipVersions,
} from "../../services/payroll/payroll.service.js";

/**
 * GET /api/payroll/me
 *
 * Lấy danh sách phiếu lương thuộc nhân viên đang đăng nhập.
 */
export async function getMyPayslips(req, res, next) {
  try {
    const staffId = req.user.staff_id;

    const year = req.query.year
      ? Number(req.query.year)
      : new Date().getFullYear();

    const page = req.query.page
      ? Number(req.query.page)
      : 1;

    const limit = req.query.limit
      ? Number(req.query.limit)
      : 12;

    const result = await getEmployeePayslips({
      staffId,
      year,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách phiếu lương thành công",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/payroll/me/:payslipId
 *
 * Lấy chi tiết phiếu lương.
 *
 * Service bắt buộc kiểm tra:
 * - Phiếu lương tồn tại.
 * - Phiếu thuộc nhân viên đang đăng nhập.
 * - Phiếu đã được phát hành.
 */
export async function getMyPayslipDetail(req, res, next) {
  try {
    const staffId = req.user.staff_id;
    const payslipId = Number(req.params.payslipId);

    const payslip = await getEmployeePayslipDetail({
      staffId,
      payslipId,
    });

    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết phiếu lương thành công",
      data: payslip,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/payroll/me/:payslipId/confirm
 *
 * Nhân viên xác nhận phiếu lương.
 *
 * Body:
 * {
 *   "confirmed": true
 * }
 */
export async function confirmMyPayslip(req, res, next) {
  try {
    const staffId = req.user.staff_id;
    const payslipId = Number(req.params.payslipId);
    const { confirmed } = req.body;

    if (confirmed !== true) {
      return res.status(400).json({
        success: false,
        message: "Bạn phải xác nhận đồng ý với phiếu lương",
      });
    }

    const result = await confirmEmployeePayslip({
      staffId,
      payslipId,
    });

    return res.status(200).json({
      success: true,
      message: "Xác nhận phiếu lương thành công",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/payroll/me/12-month
 *
 * Lấy báo cáo lương lũy kế 12 tháng.
 *
 * Query:
 *   year=2026
 */
export async function getMyPayroll12MonthReport(req, res, next) {
  try {
    const staffId = req.user.staff_id;

    const year = req.query.year
      ? Number(req.query.year)
      : req.query.endMonth
        ? Number(String(req.query.endMonth).slice(0, 4))
        : new Date().getFullYear();

    const report = await getEmployeePayroll12MonthReport({
      staffId,
      year,
    });

    return res.status(200).json({
      success: true,
      message: "Lấy báo cáo lương 12 tháng thành công",
      data: report,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/payroll/me/:payslipId/versions
 *
 * Lấy lịch sử các phiên bản phiếu lương.
 */
export async function getMyPayslipVersions(req, res, next) {
  try {
    const staffId = req.user.staff_id;
    const payslipId = Number(req.params.payslipId);

    const versions = await getEmployeePayslipVersions({
      staffId,
      payslipId,
    });

    return res.status(200).json({
      success: true,
      message: "Lấy lịch sử điều chỉnh phiếu lương thành công",
      data: versions,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/payroll/me/:payslipId/comparison
 *
 * So sánh chi tiết hai phiên bản phiếu lương.
 *
 * Query:
 *   fromVersion=1
 *   toVersion=2
 */
export async function compareMyPayslipVersions(req, res, next) {
  try {
    const staffId = req.user.staff_id;
    const payslipId = Number(req.params.payslipId);

    const fromVersion = Number(req.query.fromVersion);
    const toVersion = Number(req.query.toVersion);

    if (fromVersion === toVersion) {
      return res.status(400).json({
        success: false,
        message: "Hai phiên bản cần đối chiếu phải khác nhau",
      });
    }

    const comparison = await compareEmployeePayslipVersions({
      staffId,
      payslipId,
      fromVersion,
      toVersion,
    });

    return res.status(200).json({
      success: true,
      message: "Đối chiếu phiên bản phiếu lương thành công",
      data: comparison,
    });
  } catch (error) {
    return next(error);
  }
}
