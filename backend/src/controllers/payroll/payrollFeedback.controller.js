import {
  acceptPayrollFeedback as acceptPayrollFeedbackService,
  createEmployeePayrollFeedback,
  deleteEmployeePayrollFeedback,
  getPayrollFeedbackAttachment,
  getAdminPayrollFeedbackDetail,
  getAdminPayrollFeedbacks,
  getEmployeePayrollFeedbackDetail,
  getEmployeePayrollFeedbacks,
  getPayrollFeedbackStatistics,
  rejectPayrollFeedback as rejectPayrollFeedbackService,
  resolvePayrollFeedback as resolvePayrollFeedbackService,
  startPayrollFeedbackReview,
} from "../../services/payroll/payrollFeedback.service.js";

/**
 * POST /api/payroll/me/:payslipId/feedbacks
 *
 * Nhân viên gửi phản hồi phiếu lương.
 *
 * Body:
 * {
 *   "category": "deduction",
 *   "content": "Khoản BHXH chưa chính xác.",
 *   "attachmentUrl": "/uploads/minh-chung.png"
 * }
 */
export async function createMyPayrollFeedback(
  req,
  res,
  next,
) {
  try {
    const staffId =
      req.user.staff_id;

    const payslipId = Number(
      req.params.payslipId,
    );

    const {
      category,
      issueType,
      salaryItemId = null,
      proposedValue = null,
      priority = "normal",
      content,
    } = req.body;

    const result =
      await createEmployeePayrollFeedback({
        payslipId,
        staffId,
        category,
        issueType,
        salaryItemId,
        proposedValue,
        priority,
        content,
        attachmentFile: req.file ?? null,
      });

    return res.status(201).json({
      success: true,
      message:
        "Đã gửi phản hồi phiếu lương đến bộ phận nhân sự",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function downloadPayrollFeedbackAttachment(req, res, next) {
  try {
    const result = await getPayrollFeedbackAttachment({
      feedbackId: Number(req.params.feedbackId),
      staffId: req.user.staff_id,
      role: req.user.role,
    });

    res.setHeader("Content-Type", result.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(result.originalName)}`,
    );
    return res.sendFile(result.path);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/payroll/me/feedbacks
 *
 * Query:
 * status=pending
 * year=2026
 * page=1
 * limit=20
 */
export async function getMyPayrollFeedbacks(
  req,
  res,
  next,
) {
  try {
    const staffId =
      req.user.staff_id;

    const status =
      req.query.status || null;

    const year =
      req.query.year !== undefined
        ? Number(req.query.year)
        : null;

    const page =
      req.query.page !== undefined
        ? Number(req.query.page)
        : 1;

    const limit =
      req.query.limit !== undefined
        ? Number(req.query.limit)
        : 20;

    const result =
      await getEmployeePayrollFeedbacks({
        staffId,
        status,
        year,
        page,
        limit,
      });

    return res.status(200).json({
      success: true,
      message:
        "Lấy danh sách phản hồi lương thành công",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/payroll/me/feedbacks/:feedbackId
 *
 * Nhân viên xem chi tiết phản hồi của chính mình.
 */
export async function getMyPayrollFeedbackDetail(
  req,
  res,
  next,
) {
  try {
    const staffId =
      req.user.staff_id;

    const feedbackId = Number(
      req.params.feedbackId,
    );

    const result =
      await getEmployeePayrollFeedbackDetail({
        feedbackId,
        staffId,
      });

    return res.status(200).json({
      success: true,
      message:
        "Lấy chi tiết phản hồi lương thành công",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * DELETE /api/payroll/me/feedbacks/:feedbackId
 *
 * Body:
 * {
 *   "confirmed": true
 * }
 *
 * Chỉ xóa được phản hồi còn pending.
 */
export async function deleteMyPayrollFeedback(
  req,
  res,
  next,
) {
  try {
    const staffId =
      req.user.staff_id;

    const feedbackId = Number(
      req.params.feedbackId,
    );

    const result =
      await deleteEmployeePayrollFeedback({
        feedbackId,
        staffId,
      });

    return res.status(200).json({
      success: true,
      message:
        "Đã xóa phản hồi phiếu lương",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

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
export async function getPayrollFeedbacksForAdmin(
  req,
  res,
  next,
) {
  try {
    const status =
      req.query.status || null;

    const category =
      req.query.category || null;

    const periodId =
      req.query.periodId !== undefined
        ? Number(req.query.periodId)
        : null;

    const staffId =
      req.query.staffId || null;

    const keyword =
      req.query.keyword || null;

    const page =
      req.query.page !== undefined
        ? Number(req.query.page)
        : 1;

    const limit =
      req.query.limit !== undefined
        ? Number(req.query.limit)
        : 20;

    const result =
      await getAdminPayrollFeedbacks({
        status,
        category,
        periodId,
        staffId,
        keyword,
        page,
        limit,
      });

    return res.status(200).json({
      success: true,
      message:
        "Lấy danh sách phản hồi lương thành công",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/payroll/admin/feedbacks/statistics
 *
 * Query không bắt buộc:
 * periodId=1
 */
export async function getPayrollFeedbackStatisticsForAdmin(
  req,
  res,
  next,
) {
  try {
    const periodId =
      req.query.periodId !== undefined
        ? Number(req.query.periodId)
        : null;

    const result =
      await getPayrollFeedbackStatistics({
        periodId,
      });

    return res.status(200).json({
      success: true,
      message:
        "Lấy thống kê phản hồi lương thành công",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/payroll/admin/feedbacks/:feedbackId
 *
 * HR xem chi tiết phản hồi.
 */
export async function getPayrollFeedbackDetailForAdmin(
  req,
  res,
  next,
) {
  try {
    const feedbackId = Number(
      req.params.feedbackId,
    );

    const result =
      await getAdminPayrollFeedbackDetail(
        feedbackId,
      );

    return res.status(200).json({
      success: true,
      message:
        "Lấy chi tiết phản hồi lương thành công",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST
 * /api/payroll/admin/feedbacks/:feedbackId/review
 *
 * HR tiếp nhận phản hồi.
 */
export async function reviewPayrollFeedback(
  req,
  res,
  next,
) {
  try {
    const feedbackId = Number(
      req.params.feedbackId,
    );

    const handledBy =
      req.user.staff_id;

    const result =
      await startPayrollFeedbackReview({
        feedbackId,
        handledBy,
      });

    return res.status(200).json({
      success: true,
      message:
        "Đã tiếp nhận xử lý phản hồi lương",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST
 * /api/payroll/admin/feedbacks/:feedbackId/accept
 *
 * HR xác nhận phản hồi của nhân viên là đúng.
 *
 * Body:
 * {
 *   "confirmed": true,
 *   "hrReply": "HR xác nhận khoản khấu trừ có sai lệch."
 * }
 *
 * Response có nextAction để frontend chuyển tới
 * màn hình điều chỉnh phiếu lương.
 */
export async function acceptPayrollFeedback(
  req,
  res,
  next,
) {
  try {
    const feedbackId = Number(
      req.params.feedbackId,
    );

    const handledBy =
      req.user.staff_id;

    const { hrReply } = req.body;

    const result =
      await acceptPayrollFeedbackService({
        feedbackId,
        handledBy,
        hrReply,
      });

    return res.status(200).json({
      success: true,
      message:
        "Đã xác nhận phản hồi. Vui lòng thực hiện điều chỉnh phiếu lương.",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST
 * /api/payroll/admin/feedbacks/:feedbackId/reject
 *
 * HR từ chối phản hồi.
 *
 * Body:
 * {
 *   "confirmed": true,
 *   "hrReply": "Dữ liệu hiện tại đúng theo bảng chấm công."
 * }
 */
export async function rejectPayrollFeedback(
  req,
  res,
  next,
) {
  try {
    const feedbackId = Number(
      req.params.feedbackId,
    );

    const handledBy =
      req.user.staff_id;

    const { hrReply } = req.body;

    const result =
      await rejectPayrollFeedbackService({
        feedbackId,
        handledBy,
        hrReply,
      });

    return res.status(200).json({
      success: true,
      message:
        "Đã từ chối phản hồi và gửi lý do cho nhân viên",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST
 * /api/payroll/admin/feedbacks/:feedbackId/resolve
 *
 * Hoàn tất phản hồi sau khi:
 * - Đã điều chỉnh số liệu.
 * - Đã phát hành lại phiếu lương.
 *
 * Body:
 * {
 *   "confirmed": true,
 *   "hrReply": "Đã điều chỉnh và phát hành lại phiếu lương."
 * }
 */
export async function resolvePayrollFeedback(
  req,
  res,
  next,
) {
  try {
    const feedbackId = Number(
      req.params.feedbackId,
    );

    const handledBy =
      req.user.staff_id;

const {
  confirmed,
  hrReply = null,
} = req.body;

if (confirmed !== true) {
  return res.status(400).json({
    success: false,
    message:
      "Bạn phải xác nhận trước khi hoàn tất phản hồi",
  });
}

    const result =
      await resolvePayrollFeedbackService({
        feedbackId,
        handledBy,
        hrReply,
      });

    return res.status(200).json({
      success: true,
      message:
        "Đã hoàn tất phản hồi và thông báo cho nhân viên",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}
