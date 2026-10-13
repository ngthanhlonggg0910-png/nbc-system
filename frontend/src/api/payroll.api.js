import apiClient from "./apiClient";

/**
 * Lấy danh sách phiếu lương của nhân viên đang đăng nhập.
 */
export const getMyPayslips = async ({
  year,
  page = 1,
  limit = 12,
} = {}) => {
  const response = await apiClient.get("/payroll/me", {
    params: {
      year,
      page,
      limit,
    },
  });

  return response.data;
};

/**
 * Lấy chi tiết một phiếu lương.
 */
export const getMyPayslipDetail = async (payslipId) => {
  const response = await apiClient.get(
    `/payroll/me/${payslipId}`,
  );

  return response.data;
};

/**
 * Nhân viên xác nhận phiếu lương.
 */
export const confirmMyPayslip = async (
  payslipId,
  confirmed = true,
) => {
  const response = await apiClient.post(
    `/payroll/me/${payslipId}/confirm`,
    {
      confirmed,
    },
  );

  return response.data;
};

/**
 * Nhân viên gửi phản hồi gắn với đúng phiếu và khoản mục lương.
 */
export const createMyPayrollFeedback = async (
  payslipId,
  payload,
) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key === "attachmentFile" ? "attachment" : key, value);
    }
  });

  const response = await apiClient.post(
    `/payroll/me/${payslipId}/feedbacks`,
    formData,
  );

  return response.data;
};

export const downloadPayrollFeedbackAttachment = async (feedbackId, fileName) => {
  const response = await apiClient.get(`/payroll/feedbacks/${feedbackId}/attachment`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName || "minh-chung";
  anchor.click();
  URL.revokeObjectURL(url);
};

/**
 * Lấy lịch sử phiên bản của phiếu lương.
 */
export const getMyPayslipVersions = async (payslipId) => {
  const response = await apiClient.get(
    `/payroll/me/${payslipId}/versions`,
  );

  return response.data;
};

/**
 * So sánh hai phiên bản phiếu lương.
 */
export const compareMyPayslipVersions = async (
  payslipId,
  {
    fromVersion,
    toVersion,
  },
) => {
  const response = await apiClient.get(
    `/payroll/me/${payslipId}/comparison`,
    {
      params: {
        fromVersion,
        toVersion,
      },
    },
  );

  return response.data;
};

/**
 * Lấy báo cáo lương 12 tháng.
 */
export const getMyPayroll12MonthReport = async ({
  year,
} = {}) => {
  const response = await apiClient.get(
    "/payroll/me/12-month",
    {
      params: {
        year,
      },
    },
  );

  return response.data;
};

export const getThirteenthMonthPolicy = async (year) => {
  const response = await apiClient.get("/payroll/admin/thirteenth-month-policy", { params: { year } });
  return response.data;
};

export const saveThirteenthMonthPolicy = async (year, payload) => {
  const response = await apiClient.put(`/payroll/admin/thirteenth-month-policy/${year}`, payload);
  return response.data;
};

export const saveThirteenthMonthOverride = async (year, staffId, payload) => {
  const response = await apiClient.put(
    `/payroll/admin/thirteenth-month-policy/${year}/employees/${encodeURIComponent(staffId)}`,
    payload,
  );
  return response.data;
};

export const deleteThirteenthMonthOverride = async (year, staffId) => {
  const response = await apiClient.delete(
    `/payroll/admin/thirteenth-month-policy/${year}/employees/${encodeURIComponent(staffId)}`,
  );
  return response.data;
};
