import cron from "node-cron";

import { processPendingAttendanceLogs } from "../services/attendance/entry.service.js";

let is_processing = false;

async function runAttendanceProcess() {
  if (is_processing) {
    console.log("[Attendance Process] Lần xử lý trước chưa xong, bỏ qua.");
    return;
  }

  is_processing = true;

  try {
    const result = await processPendingAttendanceLogs();

    if (result.total_logs === 0) {
      console.log("[Attendance Process] Không có log chờ xử lý.");
      return;
    }

    console.log("[Attendance Process] Xử lý thành công:", result);
  } catch (error) {
    console.error("[Attendance Process] Lỗi:", error);
  } finally {
    is_processing = false;
  }
}

// Đoạn code này có nhiệm vụ đăng ký (schedule) một Cron Job.
// Nó không xử lý chấm công ngay, mà chỉ nói với node-cron
// rằng: "Cứ mỗi 1 phút thì gọi hàm runAttendanceProcess()."
export function startAttendanceProcessJob() {
  cron.schedule("*/1 * * * *", runAttendanceProcess, {
    timezone: "Asia/Ho_Chi_Minh",
  });

  console.log("[Attendance Process] Job chạy mỗi 1 phút.");
}
