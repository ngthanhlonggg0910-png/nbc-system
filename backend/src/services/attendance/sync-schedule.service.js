import * as repository from "../../repositories/attendance/sync-schedule.repository.js";

import {
  syncAttendanceDeviceLogs,
  syncAllAttendanceDevicesLogs,
} from "./device-sync.service.js";

import { calculateNextRun } from "./sync-schedule-time.service.js";

export async function getAllSyncSchedules() {
  return await repository.findAll();
}

/*
 * Thực thi một lịch đồng bộ chấm công.
 * Tự động đồng bộ log của một máy hoặc tất cả máy theo cấu hình lịch,
 * sau đó cập nhật trạng thái thực hiện (thành công/thất bại) và thời gian chạy tiếp theo.
 */
export async function runSyncSchedule(schedule) {
  const nextRun = calculateNextRun(schedule, new Date(Date.now() + 1000));

  try {
    const syncResult = await syncAllAttendanceDevicesLogs();

    await repository.markSyncScheduleSuccess({
      id: schedule.id,
      nextRun,
      lastResult: syncResult,
    });

    return syncResult;
  } catch (error) {
    await repository.markSyncScheduleFailed({
      id: schedule.id,
      nextRun,
      errorMessage: error.message,
    });

    throw error;
  }
}

export async function processDueSyncSchedules() {
  const schedules = await repository.findDueSchedules();

  console.log("[Attendance Sync] Số lịch đến hạn:", schedules.length);

  for (const schedule of schedules) {
    try {
      console.log(`[Attendance Sync] Chạy lịch: ${schedule.name}`);

      await runSyncSchedule(schedule);
    } catch (error) {
      console.error(
        `[Attendance Sync] Lỗi lịch ${schedule.id}:`,
        error.message,
      );
    }
  }

  return {
    total: schedules.length,
  };
}

// Chức năng đồng bộ ngay ko cần lịch
export async function runSyncScheduleNow(id) {
  const schedule = await repository.findById(id);

  if (!schedule) {
    throw new Error("Không tìm thấy lịch đồng bộ");
  }

  return runSyncSchedule(schedule);
}

export async function changeSyncScheduleEnabled(id, enabled) {
  const schedule = await repository.findById(id);

  if (!schedule) {
    throw new Error("Không tìm thấy lịch đồng bộ");
  }

  if (typeof enabled !== "boolean") {
    throw new Error("enabled phải là true hoặc false");
  }

  return repository.updateEnabled(id, enabled);
}

// update lịch
export async function updateAttendanceSchedule(id, data) {
  const schedule = await repository.updateAttendanceSchedule(id, data);

  if (!schedule) {
    throw new Error("Không tìm thấy lịch đồng bộ.");
  }

  return schedule;
}

// Thêm lịch
function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;

  return error;
}

function isValidTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value);
}

export async function createAttendanceSchedule(data) {
  const name = String(data?.name ?? "").trim();
  const time = String(data?.time ?? "").trim();
  const frequency = String(data?.frequency ?? "Hàng ngày").trim();
  const enabled = data?.enabled ?? true;

  if (!name) {
    throw createHttpError("Tên lịch là bắt buộc.");
  }

  if (name.length > 150) {
    throw createHttpError("Tên lịch không được vượt quá 150 ký tự.");
  }

  if (!time) {
    throw createHttpError("Giờ chạy là bắt buộc.");
  }

  if (!isValidTime(time)) {
    throw createHttpError(
      "Giờ chạy không hợp lệ. Định dạng đúng là HH:mm hoặc HH:mm:ss.",
    );
  }

  if (typeof enabled !== "boolean") {
    throw createHttpError("Trạng thái enabled phải là true hoặc false.");
  }

  const schedule = await repository.createAttendanceSchedule({
    name,
    time,
    frequency: frequency || "Hàng ngày",
    enabled,
  });

  if (!schedule) {
    throw createHttpError("Không thể tạo lịch đồng bộ.", 500);
  }

  return schedule;
}
