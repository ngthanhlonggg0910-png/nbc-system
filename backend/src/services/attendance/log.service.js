import * as logRepositories from "../../repositories/attendance/log.repository.js";

export async function getAllLogs() {
  return await logRepositories.getAllLogs();
}

export async function saveAttendanceLog({
  device_id,
  device_user_id,
  device_record_id,
  timestamp,
}) {
  if (!device_id) {
    throw new Error("Thiếu device_id");
  }

  if (!device_user_id) {
    throw new Error("Thiếu device_user_id");
  }

  if (!device_record_id) {
    throw new Error("Thiếu device_record_id");
  }

  if (!timestamp) {
    throw new Error("Thiếu timestamp");
  }

  // 1. Tìm mapping user trên máy -> employee
  const mapping = await logRepositories.findStaffByDeviceUser(
    device_id,
    String(device_user_id),
  );

  if (!mapping) {
    return {
      unmapped: true,
      device_user_id,
    };
  }

  // 2. staff_id lấy từ bảng employees
  const staff_id = mapping.staff_id;

  // 3. Lưu log
  return logRepositories.insertAttendanceLog({
    staff_id,
    device_id,
    device_user_id,
    device_record_id,
    timestamp: new Date(timestamp),
  });
}

export async function saveAttendanceLogs({ device_id, logs }) {
  const result = {
    total: logs.length,
    inserted: 0,
    duplicated: 0,
    unmapped: 0,
    failed: 0,
    errors: [],
  };

  for (const log of logs) {
    try {
      const row = await saveAttendanceLog({
        device_id,
        device_user_id: log.device_user_id,
        device_record_id: log.device_record_id,
        timestamp: log.timestamp,
      });

      if (row?.unmapped) {
        result.unmapped += 1;
      } else if (row) {
        result.inserted += 1;
      } else {
        result.duplicated += 1;
      }
    } catch (error) {
      result.failed += 1;

      result.errors.push({
        device_record_id: log.device_record_id,
        device_user_id: log.device_user_id,
        message: error.message,
        code: error.code,
        detail: error.detail,
      });

      console.error("Lỗi lưu log chấm công:", error);
    }
  }

  console.log(result);
  return result;
}

export async function getAllLogDetails(page = 1, limit = 20) {
  const offset = (page - 1) * limit;

  const [logsResult, totalResult] = await Promise.all([
    logRepositories.findAllLogDetails(limit, offset),
    logRepositories.countLogDetails(),
  ]);

  const total = totalResult.rows[0].total;

  return {
    data: logsResult.rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
