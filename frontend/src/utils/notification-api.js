const apiRoot = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

function authHeaders(token) {
  const accessToken = token || localStorage.getItem("nbc-access-token");
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

async function request(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${apiRoot}/api/notifications${path}`, {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...authHeaders(token),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || "Không thể xử lý thông báo");
    error.status = response.status;
    error.code = payload.code;
    throw error;
  }
  return payload.data;
}

export function fetchMyNotifications({ token, limit = 100 } = {}) {
  return request(`/?limit=${limit}&offset=0`, { token });
}

export async function fetchNotificationDetail(id, token) {
  const data = await request(`/${id}`, { token });
  return {
    ...data,
    attachments: (data.attachments ?? []).map((attachment) => ({
      ...attachment,
      file_url: attachment.file_url?.startsWith("/")
        ? `${apiRoot}${attachment.file_url}`
        : attachment.file_url,
    })),
  };
}

export function replyToNotification(id, message, token) {
  return request(`/${id}/responses`, {
    method: "POST",
    token,
    body: { message },
  });
}

export function createNotification(data, token) {
  return request("/", { method: "POST", token, body: data });
}

export function fetchSentNotifications({ token, limit = 100 } = {}) {
  return request(`/sent?limit=${limit}&offset=0`, { token });
}

export function fetchNotificationResponses(token) {
  return request("/responses", { token });
}

export function fetchNotificationAudiences(token) {
  return request("/audiences", { token });
}

export async function uploadNotificationAttachment(id, file, token) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${apiRoot}/api/notifications/${id}/attachments`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(token),
    body: form,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Không thể tải tệp đính kèm");
  return payload.data;
}

export async function downloadNotificationAttachment(attachment, token) {
  const response = await fetch(attachment.file_url, {
    credentials: "include",
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error("Không thể tải tệp đính kèm");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = attachment.original_name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function getNotificationAttachmentObjectUrl(attachment, token) {
  const response = await fetch(attachment.file_url, {
    credentials: "include",
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error("Không thể tải ảnh đính kèm");
  return URL.createObjectURL(await response.blob());
}

export function markNotificationRead(id, token) {
  return request(`/${id}/read`, { method: "PATCH", token });
}

export function markAllNotificationsRead(token) {
  return request("/read-all", { method: "PATCH", token });
}

export function archiveNotification(id, isArchived, token) {
  return request(`/${id}/archive`, {
    method: "PATCH",
    token,
    body: { is_archived: isArchived },
  });
}
