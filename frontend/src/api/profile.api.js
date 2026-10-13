import apiClient from "./apiClient";

export const getProfileMe = async () => {
    const response = await apiClient.get("/user/profile/me");
    return response.data;
};

export const updateProfileMe = async (data) => {
    const response = await apiClient.put("/user/profile/me", data);
    return response.data;
};

export const changePassword = async (data) => {
    const response = await apiClient.put("/user/profile/change-password", data);
    return response.data;
};

export const uploadAvatar = async (formData) => {
    const response = await apiClient.post("/user/profile/avatar", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    return response.data;
};
