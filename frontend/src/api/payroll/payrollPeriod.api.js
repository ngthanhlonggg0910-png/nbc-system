import apiClient from "../apiClient";

export const getPayrollReleaseControlCenter = async (params = {}, config = {}) =>
  (await apiClient.get("/payroll/admin/releases/control-center", { params, ...config })).data;

export const downloadPayrollReleaseReconciliation = (params = {}) =>
  apiClient.get("/payroll/admin/releases/reconciliation/export", {
    params,
    responseType: "blob",
  });

/**
 * Lấy danh sách kỳ lương.
 *
 * params:
 * {
 *   status,
 *   year,
 *   page,
 *   limit,
 * }
 */
export const getPayrollPeriods = async (
  params = {},
) => {
  const response = await apiClient.get(
    "/payroll/admin/periods",
    {
      params,
    },
  );

  return response.data;
};

/**
 * Tạo kỳ lương mới.
 *
 * data:
 * {
 *   periodCode,
 *   periodName,
 *   startDate,
 *   endDate,
 *   paymentDate,
 * }
 */
export const createPayrollPeriod = async (
  data,
) => {
  const response = await apiClient.post(
    "/payroll/admin/periods",
    data,
  );

  return response.data;
};

/**
 * Lấy chi tiết một kỳ lương.
 */
export const getPayrollPeriodDetail = async (
  periodId,
) => {
  const response = await apiClient.get(
    `/payroll/admin/periods/${periodId}`,
  );

  return response.data;
};

/**
 * Cập nhật thông tin kỳ lương.
 *
 * Chỉ kỳ draft mới được cập nhật.
 */
export const updatePayrollPeriod = async (
  periodId,
  data,
) => {
  const response = await apiClient.patch(
    `/payroll/admin/periods/${periodId}`,
    data,
  );

  return response.data;
};

/**
 * Hủy kỳ lương.
 */
export const cancelPayrollPeriod = async (
  periodId,
  data = {},
) => {
  const response = await apiClient.post(
    `/payroll/admin/periods/${periodId}/cancel`,
    data,
  );

  return response.data;
};

/**
 * Xem trước dữ liệu trước khi phát hành.
 *
 * Backend dùng endpoint này để xác định:
 * - Kỳ hiện tại có được phép phát hành hay không.
 * - Bao nhiêu phiếu có thể phát hành.
 * - Bao nhiêu phiếu lỗi / phản hồi.
 * - Tổng gross / deduction / net salary.
 */
export const getPayrollPublishPreview = async (
  periodId,
) => {
  const response = await apiClient.get(
    `/payroll/admin/periods/${periodId}/publish-preview`,
  );

  return response.data;
};

/**
 * Phát hành toàn bộ phiếu lương của một kỳ.
 *
 * Backend bắt buộc:
 * {
 *   confirmed: true
 * }
 */
export const publishPayrollPeriod = async (
  periodId,
) => {
  const response = await apiClient.post(
    `/payroll/admin/periods/${periodId}/publish`,
    {
      confirmed: true,
    },
  );

  return response.data;
};

/**
 * Khóa kỳ lương đã phát hành.
 *
 * Backend bắt buộc:
 * {
 *   confirmed: true
 * }
 */
export const lockPayrollPeriod = async (
  periodId,
) => {
  const response = await apiClient.post(
    `/payroll/admin/periods/${periodId}/lock`,
    {
      confirmed: true,
    },
  );

  return response.data;
};

/**
 * Lấy thống kê kỳ lương.
 */
export const getPayrollPeriodStatistics = async (
  periodId,
) => {
  const response = await apiClient.get(
    `/payroll/admin/periods/${periodId}/statistics`,
  );

  return response.data;
};

const periodOperationRequest = async (url, config = {}) =>
  (await apiClient({ url, ...config })).data;

export const getPayrollPeriodOperations = (params = {}) =>
  periodOperationRequest("/payroll/admin/periods/operations", { method: "get", params });

export const downloadPayrollPeriodOperationsReport = (params = {}) =>
  apiClient.get("/payroll/admin/periods/operations/export", {
    params,
    responseType: "blob",
  });

export const getPayrollPeriodOperationDetail = (periodId) =>
  periodOperationRequest(`/payroll/admin/periods/${periodId}/operations`, { method: "get" });

export const getPayrollPeriodReadiness = (periodId) =>
  periodOperationRequest(`/payroll/admin/periods/${periodId}/readiness`, { method: "get" });

export const getPayrollPeriodUnits = (periodId, params = {}) =>
  periodOperationRequest(`/payroll/admin/periods/${periodId}/units`, { method: "get", params });

export const getPayrollPeriodAlerts = (periodId) =>
  periodOperationRequest(`/payroll/admin/periods/${periodId}/alerts`, { method: "get" });

export const getPayrollPeriodActivities = (periodId) =>
  periodOperationRequest(`/payroll/admin/periods/${periodId}/activities`, { method: "get" });

export const getPayrollPeriodOperationOptions = () =>
  periodOperationRequest("/payroll/admin/periods/operations/options", { method: "get" });

export const openPayrollPeriod = (periodId) =>
  periodOperationRequest(`/payroll/admin/periods/${periodId}/open`, { method: "post" });

export const duplicatePayrollPeriod = (periodId, data) =>
  periodOperationRequest(`/payroll/admin/periods/${periodId}/duplicate`, { method: "post", data });

export const updatePayrollPeriodSettings = (periodId, data) =>
  periodOperationRequest(`/payroll/admin/periods/${periodId}/settings`, { method: "patch", data });

export const getPayrollPeriodLockPrecheck = (periodId) =>
  periodOperationRequest(`/payroll/admin/periods/${periodId}/lock-precheck`, { method: "get" });
