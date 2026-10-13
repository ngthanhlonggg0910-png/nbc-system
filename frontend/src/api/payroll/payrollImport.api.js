import apiClient from "../apiClient";
export const getPayrollImportControlCenter=async(params={},config={})=>(await apiClient.get("/payroll/imports/control-center",{params,...config})).data;
export const getPayrollImportAuditCenter=async(params={},config={})=>(await apiClient.get("/payroll/imports/audit-center",{params,...config})).data;

/**
 * Lấy danh sách các lần import lương.
 *
 * params ví dụ:
 * {
 *   page: 1,
 *   limit: 20,
 *   payrollPeriodId: 4,
 *   status: "validated",
 * }
 */
export const getPayrollImports = async (
  params = {},
) => {
  const response = await apiClient.get(
    "/payroll/imports",
    {
      params,
    },
  );

  return response.data;
};

/**
 * Upload file Excel bảng lương.
 *
 * payload:
 * {
 *   payrollPeriodId: 4,
 *   file: File,
 * }
 *
 * Backend yêu cầu:
 * - multipart/form-data
 * - field payrollPeriodId
 * - field file
 * - file .xlsx
 * - tối đa 10 MB
 *
 * Không tự set Content-Type.
 * Browser/Axios sẽ tự thêm multipart boundary.
 */
export const uploadPayrollImport = async ({
  payrollPeriodId,
  file,
  sourceType = "excel",
  rows = [],
}) => {
  if (sourceType === "manual") {
    const response = await apiClient.post(
      "/payroll/imports/manual",
      { payrollPeriodId, rows },
    );
    return response.data;
  }

  const formData =
    new FormData();

  formData.append(
    "payrollPeriodId",
    String(payrollPeriodId),
  );

  formData.append(
    "file",
    file,
  );

  const response = await apiClient.post(
    "/payroll/imports",
    formData,
  );

  return response.data;
};

/**
 * Lấy chi tiết một lần import.
 */
export const getPayrollImportDetail = async (
  importId,
) => {
  const response = await apiClient.get(
    `/payroll/imports/${importId}`,
  );

  return response.data;
};

/**
 * Preview dữ liệu của một lần import.
 *
 * params:
 * {
 *   page: 1,
 *   limit: 50,
 * }
 */
export const getPayrollImportPreview = async (
  importId,
  params = {},
) => {
  const response = await apiClient.get(
    `/payroll/imports/${importId}/preview`,
    {
      params,
    },
  );

  return response.data;
};

/**
 * Lấy danh sách các dòng lỗi của lần import.
 *
 * params:
 * {
 *   page: 1,
 *   limit: 50,
 * }
 */
export const getPayrollImportErrors = async (
  importId,
  params = {},
) => {
  const response = await apiClient.get(
    `/payroll/imports/${importId}/errors`,
    {
      params,
    },
  );

  return response.data;
};

/**
 * Commit dữ liệu Excel đã validate
 * thành phiếu lương chính thức.
 *
 * Backend hiện yêu cầu:
 * {
 *   confirmed: true,
 * }
 */
export const commitPayrollImport = async (
  importId,
  data = {
    confirmed: true,
  },
) => {
  const response = await apiClient.post(
    `/payroll/imports/${importId}/commit`,
    data,
  );

  return response.data;
};

/**
 * Hủy một lần import.
 *
 * Có thể truyền thêm dữ liệu như:
 * {
 *   reason: "Import nhầm file",
 * }
 *
 * nếu backend hỗ trợ.
 */
export const cancelPayrollImport = async (
  importId,
  data = {},
) => {
  const response = await apiClient.post(
    `/payroll/imports/${importId}/cancel`,
    data,
  );

  return response.data;
};

/**
 * Tải file Excel mẫu do backend cung cấp.
 *
 * Trả về toàn bộ axios response
 * để phía UI có thể đọc:
 * - response.data
 * - response.headers
 * và tạo file download.
 */
export const downloadPayrollImportTemplate =
  async (type = "excel") => {
    const query =
      String(type).toLowerCase() === "html"
        ? "?type=html"
        : "";

    const response =
      await apiClient.get(
        `/payroll/imports/template${query}`,
        {
          responseType: "blob",
        },
      );

    return response;
  };
