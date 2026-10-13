import { Router } from "express";
import {
  getAllSyncSchedules,
  updateAttendanceSchedule,
  createAttendanceSchedule,
} from "../../controllers/attendance/sync-schedule.controller.js";

const router = Router();

router.get(`/`, getAllSyncSchedules);
router.put("/:id", updateAttendanceSchedule);
router.post("/", createAttendanceSchedule);

export default router;
