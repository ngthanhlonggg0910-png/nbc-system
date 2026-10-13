import axios from "axios";

const RAW_API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ||
  "http://localhost:3001";

const API_URL = RAW_API_URL.endsWith("/api")
  ? RAW_API_URL
  : `${RAW_API_URL}/api`;

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,

  // Cho phép gửi và nhận cookie httpOnly từ backend.
  withCredentials: true,

  headers: {
    Accept: "application/json",
  },
});

/**
 * Gắn Bearer Token nếu ứng dụng có lưu token.
 *
 * Backend hiện hỗ trợ cả:
 * - Authorization: Bearer <token>
 * - Cookie httpOnly tên "token"
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("nbc-access-token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    /*
     * Không tự đặt Content-Type cho FormData.
     * Axios cần tự tạo multipart boundary khi upload Excel/HTML.
     */
    if (
      config.data instanceof FormData &&
      config.headers["Content-Type"]
    ) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * Chuẩn hóa xử lý response.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const responseData = error.response?.data;

    const normalizedError = {
      status: status ?? 0,
      message:
        responseData?.message ||
        error.message ||
        "Không thể kết nối đến máy chủ.",
      errors: responseData?.errors ?? null,
      code: responseData?.code ?? null,
      details: responseData?.details ?? null,
      data: responseData ?? null,
      originalError: error,
    };

    if (status === 401) {
      localStorage.removeItem("nbc-access-token");

      window.dispatchEvent(
        new CustomEvent("nbc:unauthorized", {
          detail: normalizedError,
        }),
      );
    }

    return Promise.reject(normalizedError);
  },
);

export const setAccessToken = (token) => {
  if (!token) {
    localStorage.removeItem("nbc-access-token");
    return;
  }

  localStorage.setItem("nbc-access-token", token);
};

export const getAccessToken = () =>
  localStorage.getItem("nbc-access-token");

export const clearAccessToken = () => {
  localStorage.removeItem("nbc-access-token");
};

export default apiClient;
