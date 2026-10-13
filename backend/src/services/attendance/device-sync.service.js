import {
  findById,
  updateDeviceSyncError,
  updateDeviceSyncSuccess,
  findEnabled,
} from "../../repositories/attendance/device.repository.js";

import { getLogsFromAttendanceDevice } from "./device.client.js";
import { saveAttendanceLogs } from "./log.service.js";

export async function syncAttendanceDeviceLogs(deviceId) {
  const device = await findById(deviceId);

  if (!device) {
    throw new Error(`Không tìm thấy máy chấm công có id = ${deviceId}`);
  }

  if (!device.enabled) {
    throw new Error(`Máy chấm công "${device.name}" đang bị vô hiệu hóa`);
  }

  try {
    const rawLogs = await getLogsFromAttendanceDevice(device);

    const logs = rawLogs.map((log, index) =>
      normalizeAttendanceLog(log, index),
    );

    const saveResult = await saveAttendanceLogs({
      device_id: device.id,
      logs,
    });

    await updateDeviceSyncSuccess(device.id);

    return {
      device_id: device.id,
      device_code: device.code,
      device_name: device.name,
      ...saveResult,
    };
  } catch (error) {
    await updateDeviceSyncError(device.id, error.message);

    throw error;
  }
}

function normalizeAttendanceLog(log, index) {
  const deviceRecordId = log.device_record_id ?? log.record_id ?? log.id;

  const deviceUserId = log.device_user_id ?? log.user_id ?? log.uid;

  const timestamp = log.timestamp ?? log.time ?? log.punch_time;

  if (deviceRecordId === undefined || deviceRecordId === null) {
    throw new Error(`Log thứ ${index + 1} thiếu device_record_id`);
  }

  if (deviceUserId === undefined || deviceUserId === null) {
    throw new Error(`Log thứ ${index + 1} thiếu device_user_id`);
  }

  if (!timestamp) {
    throw new Error(`Log thứ ${index + 1} thiếu timestamp`);
  }

  const parsedTimestamp = new Date(timestamp);

  if (Number.isNaN(parsedTimestamp.getTime())) {
    throw new Error(`Timestamp của log thứ ${index + 1} không hợp lệ`);
  }

  return {
    device_record_id: String(deviceRecordId),
    device_user_id: String(deviceUserId),
    timestamp: parsedTimestamp.toISOString(),
  };
}

export async function syncAllAttendanceDevicesLogs() {
  const devices = await findEnabled();
  const results = [];

  for (const device of devices) {
    try {
      results.push({
        success: true,
        data: await syncAttendanceDeviceLogs(device.id),
      });
    } catch (error) {
      results.push({
        success: false,
        device_id: device.id,
        device_name: device.name,
        error: error.message,
      });
    }
  }

  return results;
}
