import { saveAttendanceLogs } from "../../services/attendance/log.service.js";
import * as logService from "../../services/attendance/log.service.js";

export async function getAllLogs(req, res) {
  try {
    const logs = await logService.getAllLogs();

    res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Lấy danh sách log thất bại",
    });
  }
}

export async function getAllLogDetails(req, res) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await logService.getAllLogDetails(page, limit);

    res.status(200).json(result);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Lấy danh sách log thất bại",
    });
  }
}
