import apiClient from "../apiClient";

/**
 * ======================================
 * PAYROLL FEEDBACK - ADMIN / HR
 * ======================================
 */

/**
 * Lấy thống kê phản hồi lương.
 *
 * GET /api/payroll/admin/feedbacks/statistics
 */
export const getPayrollFeedbackStatistics =
  async () => {
    const response = await apiClient.get(
      "/payroll/admin/feedbacks/statistics",
    );

    return response.data;
  };

/**
 * Lấy danh sách phản hồi lương.
 *
 * params:
 * {
 *   status,
 *   category,
 *   periodId,
 *   staffId,
 *   keyword,
 *   page,
 *   limit,
 * }
 *
 * GET /api/payroll/admin/feedbacks
 */
export const getPayrollFeedbacks = async (
  params = {},
) => {
  const response = await apiClient.get(
    "/payroll/admin/feedbacks",
    {
      params,
    },
  );

  return response.data;
};

/**
 * Lấy chi tiết một phản hồi.
 *
 * GET /api/payroll/admin/feedbacks/:feedbackId
 */
export const getPayrollFeedbackDetail = async (
  feedbackId,
) => {
  const response = await apiClient.get(
    `/payroll/admin/feedbacks/${feedbackId}`,
  );

  return response.data;
};

/**
 * HR tiếp nhận phản hồi.
 *
 * pending -> reviewing
 *
 * POST /api/payroll/admin/feedbacks/:feedbackId/review
 */
export const reviewPayrollFeedback = async (
  feedbackId,
) => {
  const response = await apiClient.post(
    `/payroll/admin/feedbacks/${feedbackId}/review`,
    {},
  );

  return response.data;
};

/**
 * HR xác nhận phản hồi là hợp lệ
 * và cần điều chỉnh phiếu lương.
 *
 * reviewing/pending -> accepted
 *
 * Backend yêu cầu:
 * {
 *   confirmed: true,
 *   hrReply
 * }
 */
export const acceptPayrollFeedback = async (
  feedbackId,
  {
    hrReply = "",
  } = {},
) => {
  const response = await apiClient.post(
    `/payroll/admin/feedbacks/${feedbackId}/accept`,
    {
      confirmed: true,
      hrReply,
    },
  );

  return response.data;
};

/**
 * HR từ chối phản hồi.
 *
 * reviewing/pending -> rejected
 *
 * Backend yêu cầu confirmed = true.
 */
export const rejectPayrollFeedback = async (
  feedbackId,
  {
    hrReply = "",
  } = {},
) => {
  const response = await apiClient.post(
    `/payroll/admin/feedbacks/${feedbackId}/reject`,
    {
      confirmed: true,
      hrReply,
    },
  );

  return response.data;
};

/**
 * Hoàn tất phản hồi sau khi:
 *
 * feedback = adjusted
 * payslip  = published
 *
 * adjusted -> resolved
 */
export const resolvePayrollFeedback = async (
  feedbackId,
  {
    hrReply = "",
  } = {},
) => {
  const response = await apiClient.post(
    `/payroll/admin/feedbacks/${feedbackId}/resolve`,
    {
      confirmed: true,
      hrReply,
    },
  );

  return response.data;
};

/**
 * Lấy toàn bộ context cần thiết để HR/Admin
 * mở form điều chỉnh phiếu lương.
 *
 * Bao gồm:
 * - Thông tin payslip.
 * - Kỳ lương.
 * - Nhân viên.
 * - Toàn bộ salary items hiện tại.
 *
 * GET
 * /api/payroll/admin/payslips/:payslipId/adjustment-context
 */
export const getPayrollAdjustmentContext = async (
  payslipId,
) => {
  const response = await apiClient.get(
    `/payroll/admin/payslips/${payslipId}/adjustment-context`,
  );

  return response.data;
};

/**
 * ======================================
 * PAYROLL ADJUSTMENT
 * ======================================
 */

/**
 * Preview điều chỉnh.
 *
 * Không persist thay đổi xuống DB.
 *
 * data:
 * {
 *   adjustments: [
 *     {
 *       salaryItemId,
 *       newAmount,
 *       reason
 *     }
 *   ]
 * }
 *
 * POST
 * /api/payroll/admin/payslips/:payslipId/adjustments/preview
 */
export const previewPayrollAdjustment = async (
  payslipId,
  {
    adjustments = [],
  } = {},
) => {
  const response = await apiClient.post(
    `/payroll/admin/payslips/${payslipId}/adjustments/preview`,
    {
      adjustments,
    },
  );

  return response.data;
};

/**
 * Điều chỉnh phiếu lương thật.
 *
 * Backend yêu cầu:
 * {
 *   confirmed: true,
 *   feedbackId,
 *   changeReason,
 *   adjustments
 * }
 *
 * POST
 * /api/payroll/admin/payslips/:payslipId/adjustments
 */
export const createPayrollAdjustment = async (
  payslipId,
  {
    feedbackId = null,
    changeReason = "",
    adjustments = [],
  } = {},
) => {
  const response = await apiClient.post(
    `/payroll/admin/payslips/${payslipId}/adjustments`,
    {
      confirmed: true,
      feedbackId,
      changeReason,
      adjustments,
    },
  );

  return response.data;
};

/**
 * Lấy lịch sử điều chỉnh của một phiếu lương.
 *
 * GET
 * /api/payroll/admin/payslips/:payslipId/adjustments
 */
export const getPayrollPayslipAdjustments =
  async (payslipId) => {
    const response = await apiClient.get(
      `/payroll/admin/payslips/${payslipId}/adjustments`,
    );

    return response.data;
  };

/**
 * Lấy lịch sử điều chỉnh gắn với một feedback.
 *
 * GET
 * /api/payroll/admin/feedbacks/:feedbackId/adjustments
 */
export const getPayrollFeedbackAdjustments =
  async (feedbackId) => {
    const response = await apiClient.get(
      `/payroll/admin/feedbacks/${feedbackId}/adjustments`,
    );

    return response.data;
  };

/**
 * ======================================
 * REPUBLISH
 * ======================================
 */

/**
 * Phát hành lại phiếu lương đã điều chỉnh.
 *
 * adjusted -> published
 *
 * Backend yêu cầu:
 * {
 *   confirmed: true,
 *   message
 * }
 *
 * POST
 * /api/payroll/admin/payslips/:payslipId/republish
 */
export const republishPayrollPayslip = async (
  payslipId,
  {
    message = "",
  } = {},
) => {
  const response = await apiClient.post(
    `/payroll/admin/payslips/${payslipId}/republish`,
    {
      confirmed: true,
      message,
    },
  );

  return response.data;
};

/**
 * ======================================
 * PAYSLIP VERSION - ADMIN / HR
 * ======================================
 */

/**
 * Lấy toàn bộ lịch sử version của phiếu lương.
 *
 * GET
 * /api/payroll/admin/payslips/:payslipId/versions
 */
export const getAdminPayslipVersions = async (
  payslipId,
) => {
  const response = await apiClient.get(
    `/payroll/admin/payslips/${payslipId}/versions`,
  );

  return response.data;
};

/**
 * Lấy snapshot chi tiết một version.
 *
 * GET
 * /api/payroll/admin/payslips/:payslipId/versions/:versionNumber
 */
export const getAdminPayslipVersionDetail =
  async (
    payslipId,
    versionNumber,
  ) => {
    const response = await apiClient.get(
      `/payroll/admin/payslips/${payslipId}/versions/${versionNumber}`,
    );

    return response.data;
  };

/**
 * Đối chiếu hai version của phiếu lương.
 *
 * GET
 * /api/payroll/admin/payslips/:payslipId/comparison
 */
export const compareAdminPayslipVersions =
  async (
    payslipId,
    {
      fromVersion,
      toVersion,
    },
  ) => {
    const response = await apiClient.get(
      `/payroll/admin/payslips/${payslipId}/comparison`,
      {
        params: {
          fromVersion,
          toVersion,
        },
      },
    );

    return response.data;
  };
