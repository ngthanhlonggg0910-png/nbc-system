import {
  getPayrollImportDetail as getPayrollImportDetailService,
  getPayrollImportErrors as getPayrollImportErrorsService,
  getPayrollImports as getPayrollImportsService,
} from "../../services/payroll/import/payrollImportPreview.service.js";

import {
  buildPayrollImportTemplate,
  buildPayrollImportHtmlTemplate,
} from "../../services/payroll/import/payrollImportTemplate.service.js";

import {
  uploadAndValidatePayrollFile,
  createAndValidatePayrollManual,
  getPayrollImportPreview as getPayrollImportPreviewService,
  commitPayrollImport as commitPayrollImportService,
  cancelPayrollImport as cancelPayrollImportService,
  getPayrollImportControlCenter as getPayrollImportControlCenterService,
  getPayrollImportAuditCenter as getPayrollImportAuditCenterService,
} from "../../services/payroll/payrollImport.service.js";

export async function getPayrollImportControlCenter(req,res,next){try{return res.status(200).json({success:true,data:await getPayrollImportControlCenterService(req.query)});}catch(error){return next(error);}}
export async function getPayrollImportAuditCenter(req,res,next){try{return res.status(200).json({success:true,data:await getPayrollImportAuditCenterService(req.query)});}catch(error){return next(error);}}

/**
 * POST /api/payroll/imports
 *
 * Content-Type:
 * multipart/form-data
 *
 * Form data:
 * - payrollPeriodId: 1
 * - file: bang-luong-2026-07.xlsx
 *
 * Luồng:
 * - Nhận file từ multer.
 * - Đọc Excel.
 * - Kiểm tra từng dòng.
 * - Lưu staging.
 * - Lưu danh sách lỗi.
 * - Trả bản preview.
 */
export async function uploadPayrollImport(
  req,
  res,
  next,
) {
  try {
    const payrollPeriodId = Number(
      req.body.payrollPeriodId,
    );

    const uploadedBy =
      req.user.staff_id;

    const result =
      await uploadAndValidatePayrollFile({
        payrollPeriodId,
        file: req.file,
        uploadedBy,
        fileType: req.payrollImportFileType,
      });

    const hasErrors =
      result.import.counts.invalid > 0;

    return res.status(201).json({
      success: true,

      message: hasErrors
        ? "Đã kiểm tra file. File còn dòng lỗi và chưa thể lưu chính thức."
        : "Đã kiểm tra file thành công. Dữ liệu sẵn sàng để xác nhận lưu.",

      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function createManualPayrollImport(req, res, next) {
  try {
    const result = await createAndValidatePayrollManual({
      payrollPeriodId: Number(req.body?.payrollPeriodId),
      rows: req.body?.rows,
      uploadedBy: req.user.staff_id,
    });
    const hasErrors = result.import.counts.invalid > 0;
    return res.status(201).json({
      success: true,
      message: hasErrors
        ? "Đã kiểm tra dữ liệu thủ công. Vẫn còn dòng cần sửa."
        : "Dữ liệu thủ công hợp lệ và sẵn sàng để xác nhận lưu.",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/payroll/imports/:importId/preview
 *
 * Query:
 * - page=1
 * - limit=50
 *
 * Trả:
 * - Thông tin lần import.
 * - Các dòng staging.
 * - Danh sách lỗi.
 * - Thống kê lỗi.
 */
export async function getPayrollImportPreview(
  req,
  res,
  next,
) {
  try {
    const importId = Number(
      req.params.importId,
    );

    const page = req.query.page
      ? Number(req.query.page)
      : 1;

    const limit = req.query.limit
      ? Number(req.query.limit)
      : 50;

    const result =
      await getPayrollImportPreviewService({
        importId,
        page,
        limit,
      });

    return res.status(200).json({
      success: true,
      message:
        "Lấy bản xem trước dữ liệu import thành công",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/payroll/imports/:importId/commit
 *
 * Body:
 * {
 *   "confirmed": true
 * }
 *
 * Middleware validation đã kiểm tra confirmed.
 *
 * Luồng:
 * - Kiểm tra import đã validated.
 * - Kiểm tra không có dòng lỗi.
 * - Đọc dòng staging hợp lệ.
 * - Ghi employee_payslips.
 * - Ghi payslip_details.
 * - Đánh dấu committed.
 */
export async function commitPayrollImport(
  req,
  res,
  next,
) {
  try {
    const importId = Number(
      req.params.importId,
    );

    const committedBy =
      req.user.staff_id;

    const result =
      await commitPayrollImportService({
        importId,
        committedBy,
      });

    return res.status(200).json({
      success: true,
      message:
        `Đã lưu chính thức ${result.committedRows} phiếu lương`,

      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/payroll/imports/:importId/cancel
 *
 * Body không bắt buộc:
 * {
 *   "reason": "Chọn nhầm file"
 * }
 *
 * Schema hiện tại chưa lưu cancel_reason.
 * Sau này reason có thể được ghi vào audit_logs.
 */
export async function cancelPayrollImport(
  req,
  res,
  next,
) {
  try {
    const importId = Number(
      req.params.importId,
    );

    const result =
      await cancelPayrollImportService(
        importId,
      );

    return res.status(200).json({
      success: true,
      message:
        "Đã hủy lần import bảng lương",

      data: {
        ...result,

        cancelledBy:
          req.user.staff_id,

        reason:
          req.body?.reason?.trim() ??
          null,
      },
    });
  } catch (error) {
    return next(error);
  }
}
/**
 * GET /api/payroll/imports
 */
export async function getPayrollImports(
  req,
  res,
  next,
) {
  try {
    const result =
      await getPayrollImportsService({
        payrollPeriodId:
          req.query.payrollPeriodId ??
          null,

        status:
          req.query.status ??
          null,

        uploadedBy:
          req.query.uploadedBy ??
          null,

        fileType:
          req.query.fileType ??
          null,

        page:
          req.query.page
            ? Number(req.query.page)
            : 1,

        limit:
          req.query.limit
            ? Number(req.query.limit)
            : 20,
      });

    return res.status(200).json({
      success: true,
      message:
        "Lấy lịch sử import bảng lương thành công",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/payroll/imports/:importId
 */
export async function getPayrollImportDetail(
  req,
  res,
  next,
) {
  try {
    const result =
      await getPayrollImportDetailService({
        importId:
          Number(
            req.params.importId,
          ),
      });

    return res.status(200).json({
      success: true,
      message:
        "Lấy thông tin lần import thành công",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/payroll/imports/:importId/errors
 */
export async function getPayrollImportErrors(
  req,
  res,
  next,
) {
  try {
    const result =
      await getPayrollImportErrorsService({
        importId:
          Number(
            req.params.importId,
          ),

        page:
          req.query.page
            ? Number(req.query.page)
            : 1,

        limit:
          req.query.limit
            ? Number(req.query.limit)
            : 50,
      });

    return res.status(200).json({
      success: true,
      message:
        "Lấy danh sách lỗi import thành công",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/payroll/imports/template
 */
export async function downloadPayrollImportTemplate(
  req,
  res,
  next,
) {
    try {
      const templateType =
        String(
          req.query?.type ?? "",
        ).toLowerCase() === "html"
          ? "html"
          : "excel";

      const { fileName, buffer } =
        templateType === "html"
          ? await buildPayrollImportHtmlTemplate()
          : await buildPayrollImportTemplate();

      res.setHeader(
        "Content-Type",
        templateType === "html"
          ? "text/html; charset=utf-8"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`,
    );

    res.setHeader(
      "Content-Length",
      buffer.length,
    );

    res.setHeader(
      "Cache-Control",
      "no-store",
    );

    return res
      .status(200)
      .send(buffer);
  } catch (error) {
    return next(error);
  }
}
