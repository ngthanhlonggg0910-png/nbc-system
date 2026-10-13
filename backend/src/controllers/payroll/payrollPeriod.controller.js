import {
  cancelPayrollPeriod as cancelPayrollPeriodService,
  createPayrollPeriod as createPayrollPeriodService,
  getPayrollPeriodById as getPayrollPeriodByIdService,
  getPayrollPeriods as getPayrollPeriodsService,
  getPayrollPeriodStatistics as getPayrollPeriodStatisticsService,
  lockPayrollPeriod as lockPayrollPeriodService,
  updatePayrollPeriod as updatePayrollPeriodService,
} from "../../services/payroll/payrollPeriod.service.js";
import * as operationsService from "../../services/payroll/payrollPeriodOperations.service.js";
import {
  buildPayrollPeriodExcelReport,
  buildPayrollPeriodPdfReport,
} from "../../services/payroll/export/payrollPeriodReport.exporter.js";

const sendData = (res, data, message = "Thao tác thành công") =>
  res.status(200).json({ success: true, message, data });

export async function getPayrollPeriodOperations(req, res, next) {
  try { return sendData(res, await operationsService.getOperations(req.query), "Lấy trung tâm vận hành kỳ lương thành công"); }
  catch (error) { return next(error); }
}

export async function exportPayrollPeriodOperations(req, res, next) {
  try {
    const format = String(req.query.format || "xlsx").toLowerCase();
    if (!["xlsx", "pdf"].includes(format)) {
      return res.status(400).json({ success: false, message: "Định dạng xuất không được hỗ trợ" });
    }
    const report = await operationsService.getOperationsReport(req.query);
    const fileName = `danh-sach-ky-luong-${report.year}.${format}`;
    const buffer = format === "pdf"
      ? await buildPayrollPeriodPdfReport(report)
      : await buildPayrollPeriodExcelReport(report);
    res.setHeader("Content-Type", format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", buffer.length);
    return res.send(buffer);
  } catch (error) {
    return next(error);
  }
}

export async function getPayrollPeriodOperationDetail(req, res, next) {
  try { return sendData(res, await operationsService.getOperationDetail(Number(req.params.periodId)), "Lấy chi tiết vận hành kỳ lương thành công"); }
  catch (error) { return next(error); }
}

export async function getPayrollPeriodReadiness(req, res, next) {
  try { return sendData(res, await operationsService.getReadiness(Number(req.params.periodId)), "Lấy mức độ sẵn sàng thành công"); }
  catch (error) { return next(error); }
}

export async function getPayrollPeriodUnits(req, res, next) {
  try { return sendData(res, await operationsService.getUnits(Number(req.params.periodId), req.query), "Lấy trạng thái đơn vị thành công"); }
  catch (error) { return next(error); }
}

export async function getPayrollPeriodAlerts(req, res, next) {
  try { return sendData(res, await operationsService.getAlerts(Number(req.params.periodId)), "Lấy cảnh báo kỳ lương thành công"); }
  catch (error) { return next(error); }
}

export async function getPayrollPeriodActivities(req, res, next) {
  try { return sendData(res, await operationsService.getActivities(Number(req.params.periodId)), "Lấy lịch sử kỳ lương thành công"); }
  catch (error) { return next(error); }
}

export async function getPayrollPeriodOptions(req, res, next) {
  try { return sendData(res, await operationsService.getOptions(), "Lấy danh mục kỳ lương thành công"); }
  catch (error) { return next(error); }
}

export async function openPayrollPeriod(req, res, next) {
  try { return sendData(res, await operationsService.openPeriod(Number(req.params.periodId), req.user.staff_id), "Mở kỳ lương thành công"); }
  catch (error) { return next(error); }
}

export async function duplicatePayrollPeriod(req, res, next) {
  try { return sendData(res, await operationsService.duplicatePeriod(Number(req.params.periodId), req.body, req.user.staff_id), "Nhân bản kỳ lương thành công"); }
  catch (error) { return next(error); }
}

export async function updatePayrollPeriodSettings(req, res, next) {
  try { return sendData(res, await operationsService.updateSettings(Number(req.params.periodId), req.body), "Cập nhật cấu hình kỳ lương thành công"); }
  catch (error) { return next(error); }
}

export async function getPayrollPeriodLockPrecheck(req, res, next) {
  try { return sendData(res, await operationsService.getLockPrecheck(Number(req.params.periodId)), "Kiểm tra điều kiện khóa kỳ thành công"); }
  catch (error) { return next(error); }
}

/**
 * GET /api/payroll/admin/periods
 *
 * Lấy danh sách kỳ lương.
 *
 * Query:
 * - year
 * - status
 * - page
 * - limit
 */
export async function getPayrollPeriods(
  req,
  res,
  next,
) {
  try {
    const status = req.query.status
      ? String(req.query.status).trim()
      : null;

    const year = req.query.year
      ? Number(req.query.year)
      : null;

    const page = req.query.page
      ? Number(req.query.page)
      : 1;

    const limit = req.query.limit
      ? Number(req.query.limit)
      : 20;

    const result =
      await getPayrollPeriodsService({
        status,
        year,
        page,
        limit,
      });

    return res.status(200).json({
      success: true,
      message:
        "Lấy danh sách kỳ lương thành công",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/payroll/admin/periods/:periodId
 *
 * Lấy chi tiết một kỳ lương.
 */
export async function getPayrollPeriodById(
  req,
  res,
  next,
) {
  try {
    const periodId = Number(
      req.params.periodId,
    );

    const result =
      await getPayrollPeriodByIdService(
        periodId,
      );

    return res.status(200).json({
      success: true,
      message:
        "Lấy chi tiết kỳ lương thành công",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

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
export async function createPayrollPeriod(
  req,
  res,
  next,
) {
  try {
    const {
      periodCode,
      periodName,
      startDate,
      endDate,
      paymentDate = null,
      managerId = null,
      approverId = null,
      description = null,
      scopeType = "enterprise",
      unitIds = [],
    } = req.body;

    const createdBy = req.user.staff_id;

    const result =
      await createPayrollPeriodService({
        periodCode,
        periodName,
        startDate,
        endDate,
        paymentDate:
          paymentDate || null,
        createdBy,
        managerId,
        approverId,
        description,
        scopeType,
        unitIds,
      });

    return res.status(201).json({
      success: true,
      message:
        "Tạo kỳ lương thành công",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /api/payroll/admin/periods/:periodId
 *
 * Cập nhật kỳ lương đang ở trạng thái draft.
 */
export async function updatePayrollPeriod(
  req,
  res,
  next,
) {
  try {
    const periodId = Number(
      req.params.periodId,
    );

    const {
      periodName,
      startDate,
      endDate,
      paymentDate = null,
    } = req.body;

    const result =
      await updatePayrollPeriodService({
        periodId,
        periodName,
        startDate,
        endDate,
        paymentDate:
          paymentDate || null,
      });

    return res.status(200).json({
      success: true,
      message:
        "Cập nhật kỳ lương thành công",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/payroll/admin/periods/:periodId/cancel
 *
 * Hủy kỳ lương bản nháp.
 *
 * Hiện tại service chỉ cho phép hủy kỳ draft chưa có
 * phiếu lương.
 */
export async function cancelPayrollPeriod(
  req,
  res,
  next,
) {
  try {
    const periodId = Number(
      req.params.periodId,
    );

    const result =
      await cancelPayrollPeriodService(
        periodId,
      );

    return res.status(200).json({
      success: true,
      message:
        "Hủy kỳ lương thành công",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/payroll/admin/periods/:periodId/lock
 *
 * Khóa kỳ lương đã hoàn tất.
 *
 * Body:
 * {
 *   "confirmed": true
 * }
 */
export async function lockPayrollPeriod(
  req,
  res,
  next,
) {
  try {
    const periodId = Number(
      req.params.periodId,
    );

    const { confirmed } = req.body;

    if (confirmed !== true) {
      return res.status(400).json({
        success: false,
        message:
          "Bạn phải xác nhận trước khi khóa kỳ lương",
      });
    }

    const lockedBy = req.user.staff_id;

    const result =
      await lockPayrollPeriodService({
        periodId,
        lockedBy,
      });

    return res.status(200).json({
      success: true,
      message:
        "Khóa kỳ lương thành công",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/payroll/admin/periods/:periodId/statistics
 *
 * Lấy thống kê:
 * - Số phiếu theo trạng thái.
 * - Tổng thu nhập.
 * - Tổng khấu trừ.
 * - Tổng thực lĩnh.
 */
export async function getPayrollPeriodStatistics(
  req,
  res,
  next,
) {
  try {
    const periodId = Number(
      req.params.periodId,
    );

    const result =
      await getPayrollPeriodStatisticsService(
        periodId,
      );

    return res.status(200).json({
      success: true,
      message:
        "Lấy thống kê kỳ lương thành công",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}
