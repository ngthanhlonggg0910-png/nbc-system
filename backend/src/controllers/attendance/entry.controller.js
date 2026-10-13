import { processPendingAttendanceLogs } from "../../services/attendance/entry.service.js";
import { getAttendanceEntries } from "../../services/attendance/entry.service.js";
import * as entryService from "../../services/attendance/entry.service.js";

export async function getAllAttendanceEntries(req, res) {
  try {
    const entries = await getAttendanceEntries();

    return res.status(200).json({
      success: true,
      data: entries,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function processAttendanceLogs(req, res) {
  try {
    const result = await processPendingAttendanceLogs();

    return res.status(200).json({
      success: true,
      message: "Xử lý log chấm công thành công",
      data: result,
    });
  } catch (error) {
    console.error("Lỗi xử lý log chấm công:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getMonthlyEntriesByEmployeeId(req, res) {
  try {
    const { staffId, month } = req.query;

    if (!staffId || !month) {
      return res.status(400).json({
        success: false,
        message: "staffId và month là bắt buộc.",
      });
    }

    const entries = await entryService.getMonthlyEntriesByEmployeeId(
      staffId,
      month,
    );

    return res.status(200).json({
      success: true,
      data: entries,
    });
  } catch (error) {
    console.error("Lỗi lấy dữ liệu chấm công theo tháng:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
    });
  }
}
