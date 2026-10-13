import { Router } from "express";
import {
  getAllAttendanceEntries,
  getMonthlyEntriesByEmployeeId,
} from "../../controllers/attendance/entry.controller.js";

const router = Router();

router.get("/", getAllAttendanceEntries);
router.get("/by-employee-and-month", getMonthlyEntriesByEmployeeId);

export default router;
