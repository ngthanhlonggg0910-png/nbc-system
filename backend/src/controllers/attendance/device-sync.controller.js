import {
  syncAttendanceDeviceLogs,
  syncAllAttendanceDevicesLogs,
} from "../../services/attendance/device-sync.service.js";

export async function syncAttendanceDevice(req, res) {
  try {
    const deviceId = Number(req.params.device_id);

    if (!Number.isInteger(deviceId) || deviceId <= 0) {
      return res.status(400).json({
        success: false,
        message: "device_id không hợp lệ",
      });
    }

    const result = await syncAttendanceDeviceLogs(deviceId);

    return res.status(200).json({
      success: true,
      message: "Đồng bộ log từ máy chấm công thành công",
      data: result,
    });
  } catch (error) {
    console.error("Lỗi đồng bộ máy chấm công:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

export async function syncAllAttendanceDevices(req, res) {
  try {
    const results = await syncAllAttendanceDevicesLogs();

    const succeeded = results.filter((item) => item.success).length;
    const failed = results.length - succeeded;

    return res.status(200).json({
      success: true,
      message: `Đã đồng bộ ${succeeded}/${results.length} máy chấm công.`,
      data: {
        total: results.length,
        succeeded,
        failed,
        devices: results,
      },
    });
  } catch (error) {
    console.error("Lỗi đồng bộ tất cả máy chấm công:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Không thể đồng bộ danh sách máy chấm công",
    });
  }
}
