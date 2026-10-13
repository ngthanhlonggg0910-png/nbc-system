import apiClient from "../apiClient";

/**
 * Lấy dữ liệu tổng quan quản lý lương.
 *
 * params:
 * {
 *   periodCode
 * }
 *
 * Backend:
 * GET /api/payroll/admin/dashboard
 * GET /api/payroll/admin/dashboard?periodCode=2026-12
 */
export const getPayrollDashboard = async (
  params = {},
  config = {},
) => {
  const response = await apiClient.get(
    "/payroll/admin/dashboard",
    {
      params,
      ...config,
    },
  );

  return response.data;
};

export const getPayrollYearCalendar = async (params = {}, config = {}) =>
  (await apiClient.get("/payroll/admin/dashboard/year", { params, ...config })).data;

export const getPayrollMonthDetail = async (periodId, params = {}, config = {}) =>
  (await apiClient.get(`/payroll/admin/dashboard/periods/${periodId}`, { params, ...config })).data;

export const getPayrollPeriodEmployees = async (periodId, params = {}, config = {}) =>
  (await apiClient.get(`/payroll/admin/dashboard/periods/${periodId}/employees`, { params, ...config })).data;

export const getPayrollPeriodAnalytics = async (periodId, params = {}, config = {}) =>
  (await apiClient.get(`/payroll/admin/dashboard/periods/${periodId}/analytics`, { params, ...config })).data;

export const getPayrollPeriodHistory = async (periodId, config = {}) =>
  (await apiClient.get(`/payroll/admin/dashboard/periods/${periodId}/history`, config)).data;

export const getAdminPayrollPayslip = async (payslipId, config = {}) =>
  (await apiClient.get(`/payroll/admin/dashboard/payslips/${payslipId}`, config)).data;

export const downloadPayrollAnnualReport = (params = {}) => apiClient.get(
  "/payroll/admin/dashboard/reports/annual",
  { params, responseType: "blob" },
);

export const downloadPayrollEmployeeReport = (periodId, params = {}) => apiClient.get(
  `/payroll/admin/dashboard/periods/${periodId}/export`,
  { params, responseType: "blob" },
);
