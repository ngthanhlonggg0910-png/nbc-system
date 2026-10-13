import * as services from "../../services/attendance/sync-schedule.service.js";

export async function getAllSyncSchedules(req, res, next) {
  try {
    const syncSchedules = await services.getAllSyncSchedules();

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách syncSchedules thành công",
      data: syncSchedules,
    });
  } catch (error) {
    next(error);
  }
}

// update lịch
export async function updateAttendanceSchedule(req, res) {
  try {
    const { id } = req.params;
    const { name, time, enabled } = req.body;

    const schedule = await services.updateAttendanceSchedule(id, {
      name,
      time,
      enabled,
    });

    return res.status(200).json({
      success: true,
      message: "Cập nhật lịch đồng bộ thành công.",
      data: schedule,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// Thêm lịch
export async function createAttendanceSchedule(req, res) {
  try {
    const schedule = await services.createAttendanceSchedule(req.body);

    return res.status(201).json({
      success: true,
      message: "Thêm lịch đồng bộ thành công.",
      data: schedule,
    });
  } catch (error) {
    console.error("[Attendance Schedule] Lỗi thêm lịch:", error);

    return res.status(error.statusCode ?? 500).json({
      success: false,
      message: error.message || "Không thể thêm lịch đồng bộ.",
    });
  }
}
