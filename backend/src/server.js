import "dotenv/config";
import { config } from "./config/index.js";
import app from "./app.js";
import { startAttendanceProcessJob } from "./jobs/attendance-processing.job.js";
import { startAttendanceSyncScheduleJob } from "./jobs/attendance-sync-schedule.job.js";
import { startNotificationPublishJob } from "./jobs/notification-publish.job.js";

// app.listen(config.port, () => {
//   console.log(`Server running at http://${config.host}:${config.port}`);
//   startAttendanceProcessJob();
//   startAttendanceSyncScheduleJob();
//   startNotificationPublishJob();
// });
app.listen(process.env.PORT, () => {
  console.log(`Example app listening on port ${process.env.PORT}`);

  startAttendanceProcessJob();
  startAttendanceSyncScheduleJob();
});
