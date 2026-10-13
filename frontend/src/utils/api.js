import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("nbc-access-token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) delete config.headers["Content-Type"];
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export const getData = async (url, config = {}) => {
  return apiClient.get(url, config);
};

export const postData = async (url, data = {}, config = {}) => {
  return apiClient.post(url, data, config);
};

export const putData = async (url, data = {}, config = {}) => {
  return apiClient.put(url, data, config);
};

export const patchData = async (url, data = {}, config = {}) => {
  return apiClient.patch(url, data, config);
};

export const deleteData = async (url, config = {}) => {
  return apiClient.delete(url, config);
};
