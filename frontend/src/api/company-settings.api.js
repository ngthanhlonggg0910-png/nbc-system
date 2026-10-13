import { getData, postData, putData } from "@/utils/api";

export async function getCompanySettings() {
  const response = await getData("/api/company-settings");
  return response.data?.data ?? null;
}

export async function updateCompanySettings(payload) {
  const response = await putData("/api/company-settings", payload);
  return response.data?.data ?? null;
}

export async function uploadCompanyLogo(file) {
  const formData = new FormData();
  formData.append("logo", file);

  const response = await postData("/api/company-settings/logo", formData);
  return response.data?.data ?? null;
}
