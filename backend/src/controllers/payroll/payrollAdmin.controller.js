import {
  getPayrollReleaseControlCenter as getPayrollReleaseControlCenterService,
  previewPayrollPublish as previewPayrollPublishService,
  publishPayrollPeriod as publishPayrollPeriodService,
  republishAdjustedPayslip as republishAdjustedPayslipService,
} from "../../services/payroll/payrollPublish.service.js";
import {
  buildPayrollReleaseExcelReport,
  buildPayrollReleasePdfReport,
} from "../../services/payroll/export/payrollReleaseReport.exporter.js";

export async function getPayrollReleaseControlCenter(req, res, next) {
  try {
    const data = await getPayrollReleaseControlCenterService(req.query);
    return res.status(200).json({ success: true, message: "Lấy trung tâm điều hành phát hành lương thành công", data });
  } catch (error) { return next(error); }
}

export async function exportPayrollReleaseReconciliation(req, res, next) {
  try {
    const data = await getPayrollReleaseControlCenterService({ ...req.query, page: 1, limit: 100 });
    if (!data.period) return res.status(404).json({ success: false, message: "Không tìm thấy kỳ lương để xuất đối soát" });
    const format = req.query.format === "pdf" ? "pdf" : "xlsx";
    const report = {
      ...data,
      appliedFilters: [
        req.query.unitId ? `Đơn vị #${req.query.unitId}` : "Toàn kỳ",
        req.query.status ? `Trạng thái ${req.query.status}` : null,
        req.query.search ? `Tìm kiếm “${req.query.search}”` : null,
      ].filter(Boolean).join(" · "),
      releaseRate: data.summary.totalSlips ? Math.round((data.summary.readySlips + data.summary.releasedSlips) / data.summary.totalSlips * 100) : 0,
      riskCount: data.risks.reduce((total, item) => total + Number(item.count || 0), 0),
      generatedAt: new Date().toISOString(),
    };
    const buffer = format === "pdf" ? await buildPayrollReleasePdfReport(report) : await buildPayrollReleaseExcelReport(report);
    const extension = format === "pdf" ? "pdf" : "xlsx";
    res.setHeader("Content-Type", format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(`doi-soat-phat-hanh-${data.period.code}.${extension}`)}`);
    return res.status(200).send(buffer);
  } catch (error) { return next(error); }
}

import {
  comparePayslipVersionsForAdmin as comparePayslipVersionsForAdminService,
  getPayslipVersionForAdmin as getPayslipVersionForAdminService,
  getPayslipVersionsForAdmin as getPayslipVersionsForAdminService,
} from "../../services/payroll/payrollVersion.service.js";

/**
 * GET /api/payroll/admin/periods/:periodId/publish-preview
 *
 * Kiểm tra kỳ lương trước khi phát hành:
 * - Số phiếu lương.
 * - Phiếu đủ điều kiện.
 * - Phiếu đang có phản hồi.
 * - Phiếu sai số liệu.
 * - Tổng thu nhập, khấu trừ và thực lĩnh.
 */
export async function getPayrollPublishPreview(
  req,
  res,
  next,
) {
  try {
    const periodId = Number(
      req.params.periodId,
    );

    const result =
      await previewPayrollPublishService(
        periodId,
      );

    let message =
      "Kỳ lương đã được kiểm tra thành công";

    if (!result.canPublish) {
      message =
        "Kỳ lương chưa đủ điều kiện phát hành";
    }

    return res.status(200).json({
      success: true,
      message,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/payroll/admin/periods/:periodId/publish
 *
 * Body:
 * {
 *   "confirmed": true
 * }
 *
 * Phát hành toàn bộ phiếu lương trong kỳ và gửi
 * thông báo đến từng nhân viên.
 */
export async function publishPayrollPeriod(
  req,
  res,
  next,
) {
  try {
    const periodId = Number(
      req.params.periodId,
    );

    const publishedBy =
      req.user.staff_id;

    const { confirmed } = req.body;

    if (confirmed !== true) {
      return res.status(400).json({
        success: false,
        message:
          "Bạn phải xác nhận trước khi phát hành bảng lương",
      });
    }

    const result =
      await publishPayrollPeriodService({
        periodId,
        publishedBy,
      });

    return res.status(200).json({
      success: true,
      message:
        `Đã phát hành ${result.summary.publishedPayslips} phiếu lương và gửi thông báo cho nhân viên`,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/payroll/admin/payslips/:payslipId/republish
 *
 * Gửi lại một phiếu lương sau khi HR điều chỉnh.
 *
 * Body:
 * {
 *   "confirmed": true,
 *   "message": "Đã điều chỉnh tiền tăng ca..."
 * }
 */
export async function republishAdjustedPayslip(
  req,
  res,
  next,
) {
  try {
    const payslipId = Number(
      req.params.payslipId,
    );

    const publishedBy =
      req.user.staff_id;

    const {
      confirmed,
      message = null,
    } = req.body;

    if (confirmed !== true) {
      return res.status(400).json({
        success: false,
        message:
          "Bạn phải xác nhận trước khi gửi lại phiếu lương",
      });
    }

    const normalizedMessage =
      typeof message === "string" &&
      message.trim()
        ? message.trim()
        : null;

    if (
      normalizedMessage &&
      normalizedMessage.length > 1000
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Nội dung thông báo không được vượt quá 1000 ký tự",
      });
    }

    const result =
      await republishAdjustedPayslipService({
        payslipId,
        publishedBy,
        message: normalizedMessage,
      });

    return res.status(200).json({
      success: true,
      message:
        "Đã phát hành lại phiếu lương và thông báo cho nhân viên",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/payroll/admin/payslips/:payslipId/versions
 *
 * HR/Admin xem toàn bộ lịch sử phiên bản,
 * bao gồm cả phiên bản chưa phát hành.
 */
export async function getAdminPayslipVersions(
  req,
  res,
  next,
) {
  try {
    const payslipId = Number(
      req.params.payslipId,
    );

    const versions =
      await getPayslipVersionsForAdminService(
        payslipId,
      );

    return res.status(200).json({
      success: true,
      message:
        "Lấy lịch sử phiên bản phiếu lương thành công",
      data: versions,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET
 * /api/payroll/admin/payslips/:payslipId/versions/:versionNumber
 *
 * HR/Admin xem chi tiết snapshot của một phiên bản.
 */
export async function getAdminPayslipVersionDetail(
  req,
  res,
  next,
) {
  try {
    const payslipId = Number(
      req.params.payslipId,
    );

    const versionNumber = Number(
      req.params.versionNumber,
    );

    const version =
      await getPayslipVersionForAdminService({
        payslipId,
        versionNumber,
      });

    return res.status(200).json({
      success: true,
      message:
        "Lấy chi tiết phiên bản phiếu lương thành công",
      data: version,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET
 * /api/payroll/admin/payslips/:payslipId/comparison
 *
 * Query:
 * fromVersion=1
 * toVersion=2
 */
export async function compareAdminPayslipVersions(
  req,
  res,
  next,
) {
  try {
    const payslipId = Number(
      req.params.payslipId,
    );

    const fromVersion = Number(
      req.query.fromVersion,
    );

    const toVersion = Number(
      req.query.toVersion,
    );

    const comparison =
      await comparePayslipVersionsForAdminService({
        payslipId,
        fromVersion,
        toVersion,
      });

    return res.status(200).json({
      success: true,
      message:
        "Đối chiếu phiên bản phiếu lương thành công",
      data: comparison,
    });
  } catch (error) {
    return next(error);
  }
}
