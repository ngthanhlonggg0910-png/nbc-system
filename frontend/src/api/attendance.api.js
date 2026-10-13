import { getData, patchData, postData, putData } from "@/utils/api";
import {
  getVietnamDateKey,
  mapAttendanceEntry,
} from "@/features/attendance/utils/attendance-entry.utils";

const authenticatedRequest = {
  withCredentials: true,
};

function normalizeAttendanceLog(row) {
  return {
    ...row,
    id: row.id,
    staffId: row.staffId ?? row.staff_id ?? "",
    name: row.name ?? row.employee_name ?? "Chưa xác định",
    deviceId: Number(row.deviceId ?? row.device_id) || null,
    deviceName: row.deviceName ?? row.device_name ?? "Chưa xác định",
    timestamp: row.timestamp,
    direction: row.direction ?? "Chưa xác định",
    status: row.status ?? "Chưa xác định",
  };
}

// =========================
// LOG CHẤM CÔNG
// =========================

export const getAttendanceLogs = async (signal) => {
  const response = await getData("/api/attendance-log/log-details-page", {
    ...authenticatedRequest,
    params: {
      page: 1,
      limit: 100,
    },
    signal,
  });

  const payload = response.data;
  const rows = payload?.data?.rows ?? payload?.data ?? [];

  return {
    ...payload,
    data: Array.isArray(rows) ? rows.map(normalizeAttendanceLog) : [],
  };
};

export const getAttendanceLogsDetails = async (
  page = 1,
  limit = 10,
  signal,
) => {
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);

  const safeLimit = Math.min(
    100,
    Math.max(1, Number.parseInt(limit, 10) || 10),
  );

  const response = await getData("/api/attendance-log/log-details-page", {
    ...authenticatedRequest,
    params: {
      page: safePage,
      limit: safeLimit,
    },
    signal,
  });

  const payload = response.data;

  return {
    ...payload,
    data: Array.isArray(payload?.data)
      ? payload.data.map(normalizeAttendanceLog)
      : [],
  };
};

// =========================
// MÁY CHẤM CÔNG
// =========================

export const getAttendanceDevices = async (signal) => {
  const response = await getData("/api/attendance-devices", {
    ...authenticatedRequest,
    signal,
  });

  return response.data;
};

export const getAttendanceDevice = async (deviceId) => {
  try {
    const response = await getData(
      `/api/attendance-devices/${deviceId}`,
      authenticatedRequest,
    );

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Không lấy được thông tin thiết bị",
    );
  }
};

export const createAttendanceDevice = async (device) => {
  try {
    const response = await postData(
      "/api/attendance-devices",
      {
        code: device.code,
        name: device.name,
        ip: device.ip,
        port: Number(device.port),
        protocol: device.protocol,
        location: device.location,
        enabled: device.enabled,
        password: device.password,
      },
      authenticatedRequest,
    );

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Không thể thêm máy chấm công",
    );
  }
};

export const updateAttendanceDevice = async (deviceId, device) => {
  try {
    const response = await patchData(
      `/api/attendance-devices/${deviceId}`,
      {
        code: device.code,
        name: device.name,
        ip: device.ip,
        port: Number(device.port),
        protocol: device.protocol,
        location: device.location,
        enabled: device.enabled,
      },
      authenticatedRequest,
    );

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Không thể cập nhật máy chấm công",
    );
  }
};

export const syncAttendanceDevice = async (deviceId) => {
  try {
    const response = await postData(
      `/api/attendance-devices/${deviceId}/sync`,
      {},
      authenticatedRequest,
    );

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Không thể đồng bộ máy chấm công",
    );
  }
};

// =========================
// LỊCH ĐỒNG BỘ
// =========================

export const getAttendanceSyncSchedules = async (signal) => {
  const response = await getData("/api/attendance-sync-schedules", {
    ...authenticatedRequest,
    signal,
  });

  const rows = response.data?.data ?? [];

  return Array.isArray(rows)
    ? rows.map((row) => ({
        ...row,
        id: row.id,
        deviceId: row.deviceId ?? row.device_id ?? null,
        lastRun: row.lastRun ?? row.last_run ?? null,
        nextRun: row.nextRun ?? row.next_run ?? null,
        lastResult: row.lastResult ?? row.last_result ?? null,
        lastError: row.lastError ?? row.last_error ?? null,
      }))
    : [];
};

export const getSchedules = async (signal) => {
  try {
    const response = await getData("/api/attendance-sync-schedules", {
      ...authenticatedRequest,
      signal,
    });

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Không lấy được thông tin lịch",
    );
  }
};

export const updateSchedule = async (id, payload) => {
  try {
    const response = await putData(
      `/api/attendance-sync-schedules/${id}`,
      payload,
      authenticatedRequest,
    );

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Không thể cập nhật lịch.",
    );
  }
};

export const createSchedule = async (payload, signal) => {
  try {
    const response = await postData("/api/attendance-sync-schedules", payload, {
      ...authenticatedRequest,
      signal,
    });

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Không thể thêm lịch đồng bộ.",
    );
  }
};

// =========================
// DOCUMENT REQUEST
// =========================

export const getDocuments = async (signal) => {
  try {
    const response = await getData("/api/document-requests", {
      ...authenticatedRequest,
      signal,
    });

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Không thể lấy danh sách đơn",
    );
  }
};

export const approveDocument = async (id) => {
  try {
    const response = await patchData(
      `/api/document-requests/${id}/approve`,
      {},
      authenticatedRequest,
    );

    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Duyệt đơn thất bại");
  }
};

export const rejectDocument = async (id) => {
  try {
    const response = await patchData(
      `/api/document-requests/${id}/reject`,
      {},
      authenticatedRequest,
    );

    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Không thể từ chối đơn");
  }
};

export const createDocumentRequest = async (documentData) => {
  try {
    const response = await postData(
      "/api/document-requests",
      documentData,
      authenticatedRequest,
    );

    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Không thể tạo đơn");
  }
};

export const getAttachmentUrl = async (id) => {
  const response = await getData(
    `/api/document-requests/attachments/${id}/url`,
    authenticatedRequest,
  );

  return response.data;
};

// =========================
// ATTENDANCE FEEDBACK
// =========================

export const getAttendanceFeedbackDetail = async (feedbackId) => {
  const response = await getData(
    `/api/attendance-feedbacks/${feedbackId}`,
    authenticatedRequest,
  );

  return response.data?.data ?? response.data;
};

export const getAttendanceFeedbacks = async () => {
  const response = await getData(
    "/api/attendance-feedbacks",
    authenticatedRequest,
  );

  return response.data?.data ?? [];
};

export const createAttendanceFeedback = async (payload) => {
  const response = await postData(
    "/api/attendance-feedbacks",
    payload,
    authenticatedRequest,
  );

  return response.data?.data ?? response.data;
};

export const resolveAttendanceFeedback = async (feedbackId, payload) => {
  try {
    const response = await postData(
      `/api/attendance-feedbacks/${feedbackId}/resolve`,
      payload,
      authenticatedRequest,
    );

    return response.data;
  } catch (error) {
    const backendMessage =
      error.response?.data?.message || error.response?.data?.error;

    throw new Error(backendMessage || "Không thể xử lý phản hồi chấm công.");
  }
};

export const getManagerPendingDocuments = async () => {
  return await getData("/api/document-requests/manager/pending");
};

export async function getMonthlyAttendance(staffId, month, signal) {
  if (!staffId || !month) {
    return [];
  }

  const response = await getData(
    "/api/attendance-entry/by-employee-and-month",
    {
      params: { staffId, month },
      signal,
    },
  );

  const entries = Array.isArray(response.data?.data) ? response.data.data : [];

  return entries
    .filter(
      (entry) =>
        String(entry.staff_id) === String(staffId) &&
        getVietnamDateKey(entry.date).slice(0, 7) === month,
    )
    .map(mapAttendanceEntry);
}
