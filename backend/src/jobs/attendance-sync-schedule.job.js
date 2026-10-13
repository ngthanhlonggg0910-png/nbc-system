import cron from "node-cron";
import { processDueSyncSchedules } from "../services/attendance/sync-schedule.service.js";

let isRunning = false;

export function startAttendanceSyncScheduleJob() {
    cron.schedule("* * * * *", async () => {
        if (isRunning) {
            console.log(
                "[Attendance Sync] Lần chạy trước chưa hoàn tất."
            );

            return;
        }

        isRunning = true;

        try {
            const result =
                await processDueSyncSchedules();

            if (result.total > 0) {
                console.log(
                    "[Attendance Sync] Kết quả:",
                    result
                );
            }
        } catch (error) {
            console.error(
                "[Attendance Sync] Job lỗi:",
                error.message
            );
        } finally {
            isRunning = false;
        }
    });

    console.log(
        "[Attendance Sync] Job kiểm tra lịch mỗi 1 phút."
    );
}