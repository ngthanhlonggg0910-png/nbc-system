import express from "express";

import {
  getAllLogDetails,
  getAllLogs,
} from "../../controllers/attendance/log.controller.js";
import { processAttendanceLogs } from "../../controllers/attendance/entry.controller.js";

const router = express.Router();

router.post("/process", processAttendanceLogs);
router.get("/", getAllLogs);
router.get("/log-details-page", getAllLogDetails);

export default router;
