import apiClient from "./apiClient";

/**
 * Lấy dữ liệu tổng quan cho trang chủ (Home Dashboard).
 */
export const getDashboardSummary = async () => {
    const response = await apiClient.get("/dashboard/summary");
    return response.data;
};
